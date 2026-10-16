#!/usr/bin/env node
// Notion のブログ DB をコマンドラインから読むための CLI。
//
// MCP コネクタを使わずに記事の一覧・本文を確認できるようにするためのもの。
// ビルド（src/lib/notion/client.ts）とは独立していて、こちらを壊しても
// サイトのビルドには影響しない。逆に client.ts の実装を変えてもここは
// 追従しないので、ここでは SDK を直接叩く。
//
// 使い方:
//   npm run notion -- list                 公開済みの記事を新しい順に表示
//   npm run notion -- list --all           下書きも含めて全件
//   npm run notion -- list --tag Notion    タグで絞り込む
//   npm run notion -- get <slug|pageId>    本文を Markdown で表示
//   npm run notion -- tags                 タグと記事数
//   npm run notion -- props                DB のプロパティ定義
//
// どのコマンドにも --json を付けると生のデータを JSON で出せる。
//
// 読み取り専用。Notion 側を書き換えるコマンドは持たない。

import { Client } from '@notionhq/client';

// ビルド側（src/lib/notion/client.ts）と同じバージョンに合わせる。
// 2026-03-11 から database は data source に分割されたため、
// ここがずれると dataSources.query が使えなくなる。
const NOTION_VERSION = '2026-03-11';

const { NOTION_API_SECRET, DATABASE_ID } = process.env;

if (!NOTION_API_SECRET || !DATABASE_ID) {
  // 値そのものは絶対に出さない。未設定かどうかだけを伝える
  console.error(
    [
      '',
      'NOTION_API_SECRET と DATABASE_ID が必要です。',
      '.env に設定したうえで npm run notion -- <command> を使ってください。',
      '（npm run notion は node --env-file-if-exists=.env 経由で起動します）',
      '',
    ].join('\n')
  );
  process.exit(1);
}

const notion = new Client({
  auth: NOTION_API_SECRET,
  notionVersion: NOTION_VERSION,
});

// ---------------------------------------------------------------- 表示の補助

// 日本語の記事タイトルが多く、String#length で揃えると表が崩れる。
// 厳密な東アジア幅の判定までは要らないので、代表的な全角の範囲だけ 2 と数える
const displayWidth = (s) => {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    const wide =
      (c >= 0x1100 && c <= 0x115f) ||
      (c >= 0x2e80 && c <= 0xa4cf) ||
      (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0xf900 && c <= 0xfaff) ||
      (c >= 0xfe30 && c <= 0xfe6f) ||
      (c >= 0xff00 && c <= 0xff60) ||
      (c >= 0xffe0 && c <= 0xffe6) ||
      c >= 0x20000;
    w += wide ? 2 : 1;
  }
  return w;
};

const pad = (s, width) => s + ' '.repeat(Math.max(0, width - displayWidth(s)));

const truncate = (s, max) => {
  if (displayWidth(s) <= max) return s;
  let out = '';
  for (const ch of s) {
    if (displayWidth(out + ch) > max - 1) break;
    out += ch;
  }
  return out + '…';
};

// Notion のファイル URL は署名付きで、クエリに一時的な認証情報が入る。
// ログや標準出力に残らないようクエリを落とす（URL 自体は期限付きで失効する）
const stripQuery = (url) => {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
};

// --json は SDK の応答をそのまま出すため、Markdown 経路（fileUrl）の
// クエリ除去が効かず、署名付き URL がそのまま出てしまっていた。
// Notion の署名付きファイルは { url, expiry_time } という形をしていて、
// bookmark や embed の外部 URL（{ caption, url } など）には expiry_time が
// 無い。expiry_time の有無で見分ければ、外部 URL のクエリは壊さずに済む
const sanitizeSignedUrls = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeSignedUrls);
  if (value === null || typeof value !== 'object') return value;

  const out = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = sanitizeSignedUrls(child);
  }
  if (typeof out.url === 'string' && typeof out.expiry_time === 'string') {
    out.url = stripQuery(out.url);
  }
  return out;
};

// ---------------------------------------------------------- プロパティの読み

const plain = (richTexts) =>
  (richTexts ?? []).map((t) => t.plain_text).join('');

const propText = (page, name) => plain(page.properties?.[name]?.rich_text);

const postSummary = (page) => ({
  id: page.id,
  title: plain(page.properties?.Page?.title) || '(無題)',
  slug: propText(page, 'Slug'),
  date: page.properties?.Date?.date?.start ?? '',
  published: page.properties?.Published?.checkbox === true,
  tags: (page.properties?.Tags?.multi_select ?? []).map((t) => t.name),
  excerpt: propText(page, 'Excerpt'),
  rank: page.properties?.Rank?.number ?? null,
  url: page.url,
  lastEdited: page.last_edited_time,
});

// ------------------------------------------------------------ データソース

// この CLI が読むプロパティと、期待する型。
// Notion 側で名前や型を変えられると、下の表示は黙って空欄になるだけで
// 何も知らせない（src/lib/notion/client.ts の _validPageObject が
// ビルド側で同じ問題に対処している）。起動時に 1 回だけ突き合わせる
const EXPECTED_PROPERTIES = {
  Page: 'title',
  Slug: 'rich_text',
  Date: 'date',
  Published: 'checkbox',
  Tags: 'multi_select',
  Excerpt: 'rich_text',
  Rank: 'number',
};

let cachedDataSource = null;

const getDataSource = async () => {
  if (cachedDataSource) return cachedDataSource;

  const db = await notion.databases.retrieve({ database_id: DATABASE_ID });
  const ref = db.data_sources?.[0];
  if (!ref) {
    throw new Error('データベースに data source がありません。');
  }

  cachedDataSource = await notion.dataSources.retrieve({
    data_source_id: ref.id,
  });

  const mismatched = Object.entries(EXPECTED_PROPERTIES)
    .filter(([name, type]) => cachedDataSource.properties[name]?.type !== type)
    .map(([name, type]) => {
      const actual = cachedDataSource.properties[name]?.type;
      return actual
        ? `${name}（${type} のはずが ${actual}）`
        : `${name}（無し）`;
    });

  if (mismatched.length > 0) {
    // 止めはしない。読めるプロパティは読めるので、
    // 空欄の理由が分かる形で伝えるだけにする
    console.error(
      '警告: 期待するプロパティが見つかりません: ' +
        mismatched.join(', ') +
        '\nNotion 側で名前か型が変更された可能性があります。' +
        'この項目の表示は空欄になります。\n'
    );
  }

  return cachedDataSource;
};

const getDataSourceId = async () => (await getDataSource()).id;

// 全件取りたい場面（tags の集計など）があるので、ページングは必ず回し切る。
// 途中で失敗したら握りつぶさず投げる。部分的な結果を全件として
// 見せてしまうのが一番まずい
const paginateAll = async (fetchPage) => {
  const results = [];
  let start_cursor = undefined;

  for (;;) {
    const res = await fetchPage(start_cursor);
    results.push(...res.results);
    if (!res.has_more) break;
    start_cursor = res.next_cursor;
  }

  return results;
};

const queryAll = async (params) => {
  const data_source_id = await getDataSourceId();
  return paginateAll((start_cursor) =>
    notion.dataSources.query({ ...params, data_source_id, start_cursor })
  );
};

const fetchPosts = async ({ includeDrafts = false, tag = null } = {}) => {
  const and = [];
  if (!includeDrafts) {
    // ビルド側（blog-contents-cache.cjs）と同じ条件にそろえる。
    // 未来日の記事はまだ公開されていない扱いになる
    and.push({ property: 'Published', checkbox: { equals: true } });
    and.push({
      property: 'Date',
      date: { on_or_before: new Date().toISOString() },
    });
  }
  if (tag) {
    and.push({ property: 'Tags', multi_select: { contains: tag } });
  }

  return queryAll({
    filter: and.length > 0 ? { and } : undefined,
    sorts: [{ property: 'Date', direction: 'descending' }],
  });
};

// ------------------------------------------------------------ 本文の Markdown

const richText = (arr) =>
  (arr ?? [])
    .map((t) => {
      let s = t.plain_text;
      const a = t.annotations ?? {};
      // コードを先に囲む。** の内側に ` が来る方が Markdown として素直
      if (a.code) s = '`' + s + '`';
      if (a.bold) s = '**' + s + '**';
      if (a.italic) s = '*' + s + '*';
      if (a.strikethrough) s = '~~' + s + '~~';
      if (t.href) s = '[' + s + '](' + t.href + ')';
      return s;
    })
    .join('');

const fileUrl = (file) => {
  if (!file) return '';
  const url = file.type === 'external' ? file.external?.url : file.file?.url;
  return url ? stripQuery(url) : '';
};

const getChildren = async (blockId) =>
  paginateAll((start_cursor) =>
    notion.blocks.children.list({
      block_id: blockId,
      start_cursor,
      page_size: 100,
    })
  );

const renderBlocks = async (blockId, indent = '') => {
  const blocks = await getChildren(blockId);
  const lines = [];
  let numbering = 0; // 番号付きリストは連続している間だけ数える

  for (const block of blocks) {
    const type = block.type;
    const value = block[type];

    if (type !== 'numbered_list_item') numbering = 0;

    let head = null;
    let childIndent = indent + '  ';

    switch (type) {
      case 'paragraph':
        head = richText(value.rich_text);
        break;
      case 'heading_1':
        head = '# ' + richText(value.rich_text);
        break;
      case 'heading_2':
        head = '## ' + richText(value.rich_text);
        break;
      case 'heading_3':
        head = '### ' + richText(value.rich_text);
        break;
      case 'heading_4':
        head = '#### ' + richText(value.rich_text);
        break;
      case 'bulleted_list_item':
        head = '- ' + richText(value.rich_text);
        break;
      case 'numbered_list_item':
        numbering += 1;
        head = numbering + '. ' + richText(value.rich_text);
        break;
      case 'to_do':
        head =
          (value.checked ? '- [x] ' : '- [ ] ') + richText(value.rich_text);
        break;
      case 'toggle':
        head = '- ' + richText(value.rich_text);
        break;
      case 'quote':
        head = '> ' + richText(value.rich_text);
        break;
      case 'callout': {
        const icon = value.icon?.type === 'emoji' ? value.icon.emoji + ' ' : '';
        head = '> ' + icon + richText(value.rich_text);
        break;
      }
      case 'code':
        head =
          '```' +
          (value.language ?? '') +
          '\n' +
          plain(value.rich_text) +
          '\n```';
        break;
      case 'divider':
        head = '---';
        break;
      case 'image': {
        const caption = richText(value.caption);
        head = '![' + caption + '](' + fileUrl(value) + ')';
        break;
      }
      case 'video':
      case 'file':
      case 'pdf':
        head = '[' + type + '](' + fileUrl(value) + ')';
        break;
      case 'bookmark':
      case 'embed':
      case 'link_preview':
        head = '[' + type + '](' + (value.url ?? '') + ')';
        break;
      case 'equation':
        head = '$$' + (value.expression ?? '') + '$$';
        break;
      case 'table_of_contents':
        head = '<!-- 目次 -->';
        break;
      case 'child_page':
        head = '<!-- 子ページ: ' + (value.title ?? '') + ' -->';
        break;
      case 'child_database':
        head = '<!-- 子データベース: ' + (value.title ?? '') + ' -->';
        break;
      case 'table_row':
        head =
          '| ' + (value.cells ?? []).map((c) => richText(c)).join(' | ') + ' |';
        break;
      case 'table':
      case 'column_list':
      case 'column':
        // 入れ物なので自分自身は出力せず、中身だけを同じ深さで並べる
        childIndent = indent;
        break;
      default:
        head = '<!-- 未対応ブロック: ' + type + ' -->';
    }

    if (head !== null && head !== '') {
      for (const line of head.split('\n')) lines.push(indent + line);
    }

    if (block.has_children) {
      lines.push(...(await renderBlocks(block.id, childIndent)));
    }
  }

  return lines;
};

// ------------------------------------------------------------------ コマンド

// ハイフンの有無どちらの書き方でも Notion のページ ID として通る
const looksLikePageId = (key) =>
  /^[0-9a-f]{32}$/i.test(key.replace(/-/g, '')) && /^[0-9a-f-]+$/i.test(key);

const findPage = async (key) => {
  // まず slug として探す。見つからなければ pageId として扱う
  const bySlug = await queryAll({
    filter: { property: 'Slug', rich_text: { equals: key } },
  });
  if (bySlug.length > 0) return bySlug[0];

  // ID の形をしていないものを pages.retrieve に渡すと、SDK が
  // validation_error の警告をそのまま出してしまい、こちらの
  // 「記事が見つかりません」より目立つ。形を見てから投げる
  if (!looksLikePageId(key)) return null;

  try {
    return await notion.pages.retrieve({ page_id: key });
  } catch (err) {
    // 以前はすべての例外を null にしていたため、レート制限や
    // インテグレーションの権限切れまで「記事が見つかりません」と
    // 表示され、原因を取り違える。本当に無い場合だけ null を返す
    if (err.code === 'object_not_found') return null;
    throw err;
  }
};

const cmdList = async (opts) => {
  const posts = (
    await fetchPosts({ includeDrafts: opts.all, tag: opts.tag })
  ).map(postSummary);

  const shown = posts.slice(0, opts.limit);

  if (opts.json) {
    console.log(JSON.stringify(shown, null, 2));
    return;
  }

  const slugWidth = Math.min(
    36,
    Math.max(4, ...shown.map((p) => displayWidth(p.slug)))
  );

  console.log(
    pad('Date', 12) + pad('公開', 6) + pad('Slug', slugWidth + 2) + 'Title'
  );
  console.log('-'.repeat(12 + 6 + slugWidth + 2 + 30));

  for (const p of shown) {
    console.log(
      pad(p.date.slice(0, 10), 12) +
        pad(p.published ? '○' : '下書き', 6) +
        pad(truncate(p.slug, slugWidth), slugWidth + 2) +
        truncate(p.title, 40)
    );
  }

  console.log(
    '\n' +
      shown.length +
      ' 件表示 / 該当 ' +
      posts.length +
      ' 件' +
      (opts.all ? '（下書きを含む）' : '（公開済みのみ）')
  );
};

const cmdGet = async (key, opts) => {
  const page = await findPage(key);
  if (!page) {
    console.error('記事が見つかりません: ' + key);
    process.exitCode = 1;
    return;
  }

  const s = postSummary(page);

  if (opts.json) {
    const blocks = await getChildren(page.id);
    console.log(JSON.stringify(sanitizeSignedUrls({ page, blocks }), null, 2));
    return;
  }

  console.log('タイトル : ' + s.title);
  console.log('Slug     : ' + s.slug);
  console.log('日付     : ' + s.date);
  console.log('公開     : ' + (s.published ? '公開済み' : '下書き'));
  console.log('タグ     : ' + (s.tags.join(', ') || '(なし)'));
  if (s.rank !== null) console.log('Rank     : ' + s.rank);
  if (s.excerpt) console.log('抜粋     : ' + s.excerpt);
  console.log('最終更新 : ' + s.lastEdited);
  console.log('ページ   : ' + s.url);
  console.log('\n' + '-'.repeat(60) + '\n');

  const lines = await renderBlocks(page.id);
  console.log(lines.join('\n'));
};

const cmdTags = async (opts) => {
  const posts = (await fetchPosts({ includeDrafts: opts.all })).map(
    postSummary
  );

  const counts = new Map();
  for (const p of posts) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja')
  );

  if (opts.json) {
    console.log(
      JSON.stringify(
        sorted.map(([name, count]) => ({ name, count })),
        null,
        2
      )
    );
    return;
  }

  const width = Math.max(4, ...sorted.map(([name]) => displayWidth(name)));
  for (const [name, count] of sorted) {
    console.log(pad(name, width + 2) + String(count).padStart(4));
  }
  console.log('\n' + sorted.length + ' タグ / ' + posts.length + ' 記事');
};

const cmdProps = async (opts) => {
  const dataSource = await getDataSource();

  if (opts.json) {
    console.log(JSON.stringify(dataSource.properties, null, 2));
    return;
  }

  const names = Object.keys(dataSource.properties);
  const width = Math.max(4, ...names.map(displayWidth));
  for (const name of names) {
    const prop = dataSource.properties[name];
    // multi_select と select はどちらも options を持ち、
    // その入れ物の名前が type と同じなので 1 本で足りる
    let detail = '';
    if (prop.type === 'multi_select' || prop.type === 'select') {
      detail = ' (' + prop[prop.type].options.length + ' options)';
    }
    console.log(pad(name, width + 2) + prop.type + detail);
  }
};

// ------------------------------------------------------------------- 引数解析

const USAGE = `
Notion のブログ DB を読む CLI（読み取り専用）

  npm run notion -- list [--all] [--tag <名前>] [--limit <N>]
  npm run notion -- get <slug|pageId>
  npm run notion -- tags [--all]
  npm run notion -- props

共通オプション
  --json     生のデータを JSON で出力する
  --all      下書き・未来日の記事も含める（list / tags）
  --limit    list の表示件数（既定 20、--limit 0 で全件）
`;

const main = async () => {
  const argv = process.argv.slice(2);

  const tagIndex = argv.indexOf('--tag');
  const limitIndex = argv.indexOf('--limit');

  // 値を取るオプションの「値の位置」を覚えておく。こうしないと
  // `get --limit 5` の 5 を slug と取り違える
  const consumed = new Set(
    [tagIndex, limitIndex].filter((i) => i >= 0).map((i) => i + 1)
  );

  const positional = argv.filter(
    (a, i) => !a.startsWith('-') && !consumed.has(i)
  );
  const command = positional[0];
  const opts = {
    json: argv.includes('--json'),
    all: argv.includes('--all'),
    tag: null,
    limit: 20,
  };

  if (tagIndex >= 0) {
    const value = argv[tagIndex + 1];
    // --tag の次が無い／オプションだと、意図せず絞り込みなしで全件出てしまう
    if (!value || value.startsWith('-')) {
      console.error('--tag にはタグ名を指定してください。');
      process.exitCode = 1;
      return;
    }
    opts.tag = value;
  }

  if (limitIndex >= 0) {
    const n = Number(argv[limitIndex + 1]);
    // 数値でない指定を黙って既定値に落とすと、件数が違う理由が分からなくなる
    if (!Number.isInteger(n) || n < 0) {
      console.error(
        '--limit には 0 以上の整数を指定してください（0 で全件）。'
      );
      process.exitCode = 1;
      return;
    }
    opts.limit = n === 0 ? Infinity : n;
  }

  switch (command) {
    case 'list':
      return cmdList(opts);
    case 'get': {
      const key = positional[1];
      if (!key) {
        console.error('slug または pageId を指定してください。');
        process.exitCode = 1;
        return;
      }
      return cmdGet(key, opts);
    }
    case 'tags':
      return cmdTags(opts);
    case 'props':
      return cmdProps(opts);
    default:
      console.log(USAGE);
      if (command) process.exitCode = 1;
  }
};

main().catch((err) => {
  // Notion の API エラーは code と message に原因が入る。
  // スタックだけ出ても原因が分からないので、まず両方を出す
  if (err.code) {
    console.error('Notion API エラー: ' + err.code);
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
});
