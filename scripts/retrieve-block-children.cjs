const fs = require('fs');
const { setTimeout } = require('timers/promises');
const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_SECRET,
  notionVersion: '2026-03-11',
});

const requestDuration = 300;
const maxRetries = 3;

const pageId = process.argv
  .find((arg) => arg.startsWith('--pageId='))
  .replace('--pageId=', '');

const outputDir = `tmp/${pageId}`;
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const retry = (retriesLeft, fn) => {
  return fn().catch(function (err) {
    if (retriesLeft <= 0) {
      throw err;
    }

    // 途中の失敗を完全に飲み込んでいたため、毎回レート制限に当たって
    // いてもログからは分からなかった。最終的に成功した場合でも残す
    console.error(
      `Retrying a failed Notion request (${retriesLeft} left): ${err}`
    );

    // 間隔を置かずに投げ直すと、429 のときは制限を悪化させるだけで
    // リトライ回数を無駄に使い切る。回を追って待ち時間を伸ばす
    return setTimeout((maxRetries - retriesLeft + 1) * requestDuration).then(
      () => retry(retriesLeft - 1, fn)
    );
  });
};

const retrieveAndWriteBlockChildren = async (blockId) => {
  const params = { block_id: blockId };

  let results = [];

  while (true) {
    // For Notion API Requests limits
    // See https://developers.notion.com/reference/request-limits
    await setTimeout(requestDuration);

    const res = await retry(maxRetries, () =>
      notion.blocks.children.list(params)
    );

    results = results.concat(res.results);

    if (!res.has_more) {
      break;
    }

    params['start_cursor'] = res.next_cursor;
  }

  fs.writeFileSync(`${outputDir}/${blockId}.json`, JSON.stringify(results));

  // forEach(async ...) だとコールバックの Promise が await されないため、
  // この関数が子や synced_block の取得を待たずに返っていた。つまり
  // 呼び出し側の `await retrieveAndWriteBlockChildren(...)` が「取得し
  // 終えた」ことを意味しない。加えて兄弟の取得が同時に走るので、下の
  // 300ms スリープでレート制限を避ける意図も壊れていた。
  // （Node 15 以降は未処理の rejection は致命的なので終了コード自体は
  //   1 になる。ただし走っている他の兄弟を巻き込んで途中で落ちる）
  // 直列の for...of にする。各呼び出しの中でレート制限のために sleep して
  // いるので、並列化せず順に回すのが正しい
  for (const block of results) {
    if (
      block.type === 'synced_block' &&
      block.synced_block.synced_from &&
      block.synced_block.synced_from.block_id
    ) {
      try {
        await retrieveAndWriteBlock(block.synced_block.synced_from.block_id);
      } catch (err) {
        console.error(
          `Could not retrieve the original synced_block. block_id: ${block.id}, synced_from: ${block.synced_block.synced_from.block_id}`
        );
        throw err;
      }
    } else if (block.has_children) {
      try {
        await retrieveAndWriteBlockChildren(block.id);
      } catch (err) {
        // ここで block.id を残さないと、末尾の catch が出す process.argv[2]
        // （ページ直下のルート）しか手がかりが無く、入れ子の奥で失敗した
        // 実際の位置が分からない
        console.error(`Failed while descending into block_id: ${block.id}`);
        throw err;
      }
    }
  }
};

const retrieveAndWriteBlock = async (blockId) => {
  const params = { block_id: blockId };

  // For Notion API Requests limits
  // See https://developers.notion.com/reference/request-limits
  await setTimeout(requestDuration);

  const block = await retry(maxRetries, () => notion.blocks.retrieve(params));

  fs.writeFileSync(`${outputDir}/${blockId}.json`, JSON.stringify(block));

  if (block.has_children) {
    await retrieveAndWriteBlockChildren(block.id);
  }
};

(async () => {
  await retrieveAndWriteBlockChildren(pageId);
})().catch((err) => {
  // 取得に失敗したままキャッシュが不完全な状態で「成功」として扱われると、
  // その後のビルドが古い内容や欠けた内容で通ってしまう。
  // 途中の catch は文脈（block_id）だけを出して再スローするので、
  // エラー本体は再帰の段数ぶん重複させずここで一度だけ出す
  console.error(`Failed to cache block children. block_id: ${pageId}`);
  console.error(err);
  process.exit(1);
});
