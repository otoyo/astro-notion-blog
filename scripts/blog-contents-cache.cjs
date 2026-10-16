const { exec } = require('child_process');
const { Client } = require('@notionhq/client');
const cliProgress = require('cli-progress');
const { PromisePool } = require('@supercharge/promise-pool');

const notion = new Client({
  auth: process.env.NOTION_API_SECRET,
  notionVersion: '2026-03-11',
});

// レポートの文面と実際の値がずれないよう定数にする
const COMMAND_TIMEOUT_MS = 60000;

const getAllPages = async () => {
  const dbResponse = await notion.databases.retrieve({
    database_id: process.env.DATABASE_ID,
  });
  if (!dbResponse) {
    throw new Error('Failed to retrieve database information');
  }

  const dataSourceId =
    dbResponse.data_sources && dbResponse.data_sources.length > 0
      ? dbResponse.data_sources[0].id
      : null;
  if (!dataSourceId) {
    throw new Error('Database does not have a data source ID');
  }

  const params = {
    data_source_id: dataSourceId,
    filter: {
      and: [
        {
          property: 'Published',
          checkbox: {
            equals: true,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_before: new Date().toISOString(),
          },
        },
      ],
    },
  };

  let results = [];
  while (true) {
    const res = await notion.dataSources.query(params);

    results = results.concat(res.results);

    if (!res.has_more) {
      break;
    }

    params['start_cursor'] = res.next_cursor;
  }

  const pages = results.map((result) => {
    // rich_text が「存在するが空配列」のとき、配列は truthy なので
    // 以前の三項演算子は [0].plain_text に進んで TypeError になっていた。
    // slug は（id と違って）子プロセスには渡しておらず、下の失敗レポートの
    // 表示にしか使わないので、取れないときは落とさず空のままにする
    const slugRichText =
      result.properties.Slug && result.properties.Slug.rich_text;
    return {
      id: result.id,
      last_edited_time: result.last_edited_time,
      slug:
        slugRichText && slugRichText.length > 0
          ? slugRichText[0].plain_text
          : '',
    };
  });

  return pages;
};

// timeout で殺されたとき、err.message は "Command failed: <cmd>" だけで
// 理由が残らない（stderr も空になりやすい）。signal を見て区別する
const failureReason = (err) =>
  err.killed || err.signal
    ? `timed out after ${COMMAND_TIMEOUT_MS}ms (signal: ${err.signal})`
    : `exited with code ${err.code}`;

// err.message は "Command failed: <cmd>" のあとに stderr を丸ごと含むので、
// err と stderr の両方を出すと二重になり、stderr 側に掛けた上限も意味を
// 失う。さらに nx はタスクの出力を stdout に流すことがあるため stdout も
// 捨てられない。両方をまとめ、原因が出る末尾側を残して上限を掛ける
const formatOutput = (stdout, stderr) => {
  const text = [stdout, stderr]
    .map((chunk) => String(chunk || '').trim())
    .filter(Boolean)
    .join('\n');
  if (!text) {
    return null;
  }

  const lines = text.split('\n');
  const tail = lines.slice(-20);
  const omitted = lines.length - tail.length;

  return (omitted > 0 ? [`... (${omitted} more line(s))`] : [])
    .concat(tail)
    .map((line) => `    ${line}`)
    .join('\n');
};

(async () => {
  const pages = await getAllPages();

  // 0 件のまま成功すると、空の tmp/ が nx のキャッシュに乗った状態で
  // astro build が走り、記事が無いサイトが出来上がってしまう
  if (pages.length === 0) {
    throw new Error(
      'No pages matched the query. Check DATABASE_ID and the Published/Date filter.'
    );
  }

  const concurrency = parseInt(process.env.CACHE_CONCURRENCY || '1', 10);

  const progressBar = new cliProgress.SingleBar(
    { stopOnComplete: true },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(pages.length, 0);

  const failures = [];

  await PromisePool.withConcurrency(concurrency)
    .for(pages)
    .process(async (page) => {
      return new Promise((resolve) => {
        const command = `NX_BRANCH=main npx nx run astro-notion-blog:_fetch-notion-blocks --pageId=${page.id} --lastEditedTime=${page.last_edited_time}`;
        const options = { timeout: COMMAND_TIMEOUT_MS };

        exec(command, options, (err, stdout, stderr) => {
          if (err) {
            // 以前はここでログを出すだけで常に resolve しており、失敗した
            // ページも「処理済み」として数えられていた。終了コードにも
            // 出ないため、キャッシュが欠けたまま気づけなかった。
            // 失敗しても resolve するのは意図的で、残りのページを止めずに
            // 最後まで回してから全件まとめて報告する
            failures.push({ page, err, stdout, stderr });
          }
          progressBar.increment();
          return resolve();
        });
      });
    });

  // バーのタイマーを止めてから報告する。止めないと出力が混ざるうえ、
  // 残ったタイマーが下の exitCode による自然終了を妨げる
  progressBar.stop();

  if (failures.length > 0) {
    console.error(
      `Failed to cache ${failures.length} of ${pages.length} page(s):`
    );
    for (const { page, err, stdout, stderr } of failures) {
      console.error(`  - id: ${page.id}, slug: ${page.slug || '(none)'}`);
      console.error(`    ${failureReason(err)}`);

      const output = formatOutput(stdout, stderr);
      if (output) {
        console.error(output);
      }
    }

    // 不完全なキャッシュで後続のビルドを通さない（build:cached は
    // `cache:fetch && astro build` なので、ここで落とせば build に進まない）。
    // 件数に比例して長くなるこのレポートでは process.exit を使わない:
    // パイプ相手の stderr への書き込みは macOS では非同期で、直後に exit
    // すると末尾が落ちる（Linux と Windows は同期なので落ちない）
    process.exitCode = 1;
    return;
  }
})().catch((err) => {
  console.error('Failed to build the blog contents cache.');
  console.error(err);
  // ここは数行しか出さないので切り捨ての心配がない。逆にバーがまだ
  // 動いている可能性があり、タイマーが残ると exitCode では終了できない
  process.exit(1);
});
