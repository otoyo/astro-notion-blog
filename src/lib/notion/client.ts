import {
  APIResponseError,
  Client,
  isFullBlock,
  isFullPage,
} from '@notionhq/client'
import retry from 'async-retry'
import ExifTransformer from 'exif-be-gone'
import fs, { createWriteStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import { pipeline } from 'node:stream/promises'
import sharp from 'sharp'
import { resizeDownloadedImage } from './resize-image'
import {
  DATABASE_ID,
  NOTION_API_SECRET,
  NUMBER_OF_POSTS_PER_PAGE,
  REQUEST_TIMEOUT_MS,
} from '../../server-constants'
import type {
  Annotation,
  Block,
  Bookmark,
  BulletedListItem,
  Callout,
  Code,
  Column,
  ColumnList,
  Database,
  Embed,
  Emoji,
  Equation,
  File,
  FileObject,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image,
  LinkPreview,
  LinkToPage,
  Mention,
  NumberedListItem,
  Paragraph,
  Post,
  Quote,
  Reference,
  RichText,
  SelectProperty,
  SyncedBlock,
  SyncedFrom,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  Text,
  ToDo,
  Toggle,
  Unsupported,
  Video,
} from '../interfaces'
// NOTE: リクエストパラメータの型は SDK のものを直接使う。
// upstream（otoyo/astro-notion-blog）にあった src/lib/notion/request-params.ts は
// これらと構造的に等価だったため削除した。upstream 側でパラメータ型が追加・変更
// されると `git merge upstream/main` で request-params.ts の modify/delete 衝突と
// この import 周りの衝突が起きる。その際はファイルを復活させるのではなく、
// 追加されたフィールドを対応する SDK の型の使い方に読み替えること。
import type {
  BlockObjectResponse,
  GetBlockParameters,
  GetDatabaseParameters,
  GetDataSourceParameters,
  GetDataSourceResponse,
  ListBlockChildrenParameters,
  ListBlockChildrenResponse,
  PageObjectResponse,
  QueryDataSourceParameters,
  QueryDataSourceResponse,
  RichTextItemResponse,
} from '@notionhq/client'

const client = new Client({
  auth: NOTION_API_SECRET,
  notionVersion: '2026-03-11',
})

let postsCache: Post[] | null = null
let dbCache: Database | null = null

const numberOfRetry = 2

export async function getAllPosts(): Promise<Post[]> {
  if (postsCache !== null) {
    return Promise.resolve(postsCache)
  }

  const dbResponse = await client.databases.retrieve({
    database_id: DATABASE_ID,
  })
  // isFullDatabase は object === 'database' しか見ておらず partial でも true を
  // 返すため使わない。full にしか存在しないフィールドで絞り込む
  if (!('in_trash' in dbResponse) || dbResponse.in_trash) {
    // 空配列を返すと記事 0 件のサイトがビルド成功として出てしまうため、
    // 設定ミスや DB の削除はビルドを止めて気づけるようにする。
    // in_trash が無い（partial な）レスポンスはゴミ箱以外の原因でも起きうる
    // ため、原因を断定しない文言にしてある
    throw new Error(
      `The database could not be read as a full object. It may not exist, be in trash, or the integration may lack access to it. database_id: ${DATABASE_ID}`
    )
  }

  const dataSouceId = dbResponse.data_sources[0]?.id
  if (!dataSouceId) {
    throw new Error(
      `No data source found for the database. Please add a data source to fetch posts. database_id: ${DATABASE_ID}`
    )
  }

  const params: QueryDataSourceParameters = {
    data_source_id: dataSouceId,
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
    sorts: [
      {
        property: 'Date',
        direction: 'descending',
      },
    ],
    page_size: 100,
  }

  let results: QueryDataSourceResponse['results'] = []
  while (true) {
    const res = await retry(
      async (bail) => {
        try {
          return await client.dataSources.query(params)
        } catch (error: unknown) {
          if (error instanceof APIResponseError) {
            if (error.status && error.status >= 400 && error.status < 500) {
              bail(error)
            }
          }
          throw error
        }
      },
      {
        retries: numberOfRetry,
      }
    )

    results = results.concat(res.results)

    if (!res.has_more) {
      break
    }

    params['start_cursor'] = res.next_cursor as string
  }

  postsCache = results
    .filter((pageObject) => _validPageObject(pageObject))
    .map((pageObject) => _buildPost(pageObject))
  return postsCache
}

export async function getPosts(pageSize = 10): Promise<Post[]> {
  const allPosts = await getAllPosts()
  return allPosts.slice(0, pageSize)
}

export async function getRankedPosts(pageSize = 10): Promise<Post[]> {
  const allPosts = await getAllPosts()
  return allPosts
    .filter((post) => !!post.Rank)
    .sort((a, b) => {
      if (a.Rank > b.Rank) {
        return -1
      } else if (a.Rank === b.Rank) {
        return 0
      }
      return 1
    })
    .slice(0, pageSize)
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const allPosts = await getAllPosts()
  return allPosts.find((post) => post.Slug === slug) || null
}

export async function getPostByPageId(pageId: string): Promise<Post | null> {
  const allPosts = await getAllPosts()
  return allPosts.find((post) => post.PageId === pageId) || null
}

export async function getPostsByTag(
  tagName: string,
  pageSize = 10
): Promise<Post[]> {
  if (!tagName) return []

  const allPosts = await getAllPosts()
  return allPosts
    .filter((post) => post.Tags.find((tag) => tag.name === tagName))
    .slice(0, pageSize)
}

// page starts from 1 not 0
export async function getPostsByPage(page: number): Promise<Post[]> {
  if (page < 1) {
    return []
  }

  const allPosts = await getAllPosts()

  const startIndex = (page - 1) * NUMBER_OF_POSTS_PER_PAGE
  const endIndex = startIndex + NUMBER_OF_POSTS_PER_PAGE

  return allPosts.slice(startIndex, endIndex)
}

// page starts from 1 not 0
export async function getPostsByTagAndPage(
  tagName: string,
  page: number
): Promise<Post[]> {
  if (page < 1) {
    return []
  }

  const allPosts = await getAllPosts()
  const posts = allPosts.filter((post) =>
    post.Tags.find((tag) => tag.name === tagName)
  )

  const startIndex = (page - 1) * NUMBER_OF_POSTS_PER_PAGE
  const endIndex = startIndex + NUMBER_OF_POSTS_PER_PAGE

  return posts.slice(startIndex, endIndex)
}

export async function getNumberOfPages(): Promise<number> {
  const allPosts = await getAllPosts()
  return (
    Math.floor(allPosts.length / NUMBER_OF_POSTS_PER_PAGE) +
    (allPosts.length % NUMBER_OF_POSTS_PER_PAGE > 0 ? 1 : 0)
  )
}

export async function getNumberOfPagesByTag(tagName: string): Promise<number> {
  const allPosts = await getAllPosts()
  const posts = allPosts.filter((post) =>
    post.Tags.find((tag) => tag.name === tagName)
  )
  return (
    Math.floor(posts.length / NUMBER_OF_POSTS_PER_PAGE) +
    (posts.length % NUMBER_OF_POSTS_PER_PAGE > 0 ? 1 : 0)
  )
}

let cacheFileIndex: Map<string, string> | null = null

function _buildCacheFileIndex(): Map<string, string> {
  const index = new Map<string, string>()
  const mtimes = new Map<string, number>()

  if (!fs.existsSync('tmp')) {
    return index
  }

  const addFile = (filePath: string, fileName: string) => {
    if (!fileName.endsWith('.json')) {
      return
    }
    const blockId = fileName.slice(0, -'.json'.length)
    const mtime = fs.statSync(filePath).mtimeMs
    if (!index.has(blockId) || mtime > (mtimes.get(blockId) || 0)) {
      index.set(blockId, filePath)
      mtimes.set(blockId, mtime)
    }
  }

  fs.readdirSync('tmp', { withFileTypes: true }).forEach((entry) => {
    const entryPath = `tmp/${entry.name}`
    if (entry.isDirectory()) {
      fs.readdirSync(entryPath).forEach((fileName) =>
        addFile(`${entryPath}/${fileName}`, fileName)
      )
    } else if (entry.isFile()) {
      addFile(entryPath, entry.name)
    }
  })

  return index
}

function _readCachedBlockChildren(
  blockId: string
): ListBlockChildrenResponse['results'] | null {
  if (cacheFileIndex === null) {
    cacheFileIndex = _buildCacheFileIndex()
  }
  const filePath = cacheFileIndex.get(blockId)
  if (!filePath) {
    return null
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

export async function getAllBlocksByBlockId(blockId: string): Promise<Block[]> {
  let results: ListBlockChildrenResponse['results'] = []

  const cachedResults = _readCachedBlockChildren(blockId)
  if (cachedResults) {
    results = cachedResults
  } else {
    const params: ListBlockChildrenParameters = {
      block_id: blockId,
    }

    while (true) {
      const res = await retry(
        async (bail) => {
          try {
            return await client.blocks.children.list(params)
          } catch (error: unknown) {
            if (error instanceof APIResponseError) {
              if (error.status && error.status >= 400 && error.status < 500) {
                bail(error)
              }
            }
            throw error
          }
        },
        {
          retries: numberOfRetry,
        }
      )

      results = results.concat(res.results)

      if (!res.has_more) {
        break
      }

      params['start_cursor'] = res.next_cursor as string
    }
  }

  const allBlocks = _filterReadableBlocks(blockId, results).map((blockObject) =>
    _buildBlock(blockObject)
  )

  for (let i = 0; i < allBlocks.length; i++) {
    const block = allBlocks[i]

    if (block.Type === 'table' && block.Table) {
      block.Table.Rows = await _getTableRows(block.Id)
    } else if (block.Type === 'column_list' && block.ColumnList) {
      block.ColumnList.Columns = await _getColumns(block.Id)
    } else if (
      block.Type === 'bulleted_list_item' &&
      block.BulletedListItem &&
      block.HasChildren
    ) {
      block.BulletedListItem.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'numbered_list_item' &&
      block.NumberedListItem &&
      block.HasChildren
    ) {
      block.NumberedListItem.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'to_do' && block.ToDo && block.HasChildren) {
      block.ToDo.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'synced_block' && block.SyncedBlock) {
      block.SyncedBlock.Children = await _getSyncedBlockChildren(block)
    } else if (block.Type === 'toggle' && block.Toggle) {
      block.Toggle.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'paragraph' &&
      block.Paragraph &&
      block.HasChildren
    ) {
      block.Paragraph.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'heading_1' &&
      block.Heading1 &&
      block.HasChildren
    ) {
      block.Heading1.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'heading_2' &&
      block.Heading2 &&
      block.HasChildren
    ) {
      block.Heading2.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'heading_3' &&
      block.Heading3 &&
      block.HasChildren
    ) {
      block.Heading3.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'heading_4' &&
      block.Heading4 &&
      block.HasChildren
    ) {
      block.Heading4.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'quote' && block.Quote && block.HasChildren) {
      block.Quote.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'callout' && block.Callout && block.HasChildren) {
      block.Callout.Children = await getAllBlocksByBlockId(block.Id)
    }
  }

  return allBlocks
}

export async function getBlock(blockId: string): Promise<Block> {
  const params: GetBlockParameters = {
    block_id: blockId,
  }

  const res = await retry(
    async (bail) => {
      try {
        return await client.blocks.retrieve(params)
      } catch (error: unknown) {
        if (error instanceof APIResponseError) {
          if (error.status && error.status >= 400 && error.status < 500) {
            bail(error)
          }
        }
        throw error
      }
    },
    {
      retries: numberOfRetry,
    }
  )

  if (!isFullBlock(res)) {
    // 一覧取得と違い、ここは呼び出し側が「このブロックが読める」前提で
    // 期限切れの署名付き URL を取り直すために呼ぶ。黙って空の Block を返すと
    // posts/[slug].astro で block.Image も block.File も undefined になり、
    // どのブロックかも分からない TypeError になるため、ここでは落とす
    throw new Error(
      `The block could not be read. Check the integration's access to it in Notion. block_id: ${blockId}`
    )
  }

  return _buildBlock(res)
}

export async function getAllTags(): Promise<SelectProperty[]> {
  const allPosts = await getAllPosts()

  const tagNames: string[] = []
  return allPosts
    .flatMap((post) => post.Tags)
    .reduce((acc, tag) => {
      if (!tagNames.includes(tag.name)) {
        acc.push(tag)
        tagNames.push(tag.name)
      }
      return acc
    }, [] as SelectProperty[])
    .sort((a: SelectProperty, b: SelectProperty) =>
      a.name.localeCompare(b.name)
    )
}

/**
 * Notion の署名付き URL はクエリ文字列に署名を含み、ビルドログは保存されるため、
 * ログやエラーメッセージにはクエリを落としたものを使う。
 */
const displayUrl = (url: URL): string => `${url.origin}${url.pathname}`

/**
 * resizeLabel を渡すと、書き終えた後に幅 1600px 超の画像を縮小する
 * （resize-image.ts。ログの接頭辞に使う）。縮小に失敗しても投げず、
 * 元の画像のまま残す
 */
export async function downloadFile(
  url: URL,
  { resizeLabel }: { resizeLabel?: string } = {}
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res!: Response
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    if (!res.body) {
      throw new Error('Response body is null')
    }
  } catch (err) {
    throw new Error(`Failed to fetch ${displayUrl(url)}`, { cause: err })
  } finally {
    // fetch が失敗した場合も必ずタイマーを解放する
    clearTimeout(timeoutId)
  }

  const dir = './public/notion/' + url.pathname.split('/').slice(-2)[0]
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const filename = decodeURIComponent(url.pathname.split('/').slice(-1)[0])
  const filepath = `${dir}/${filename}`

  const writeStream = createWriteStream(filepath)
  // fetch の Response.body は DOM の ReadableStream、Readable.fromWeb が受けるのは
  // node:stream/web の ReadableStream。同名だが別宣言で構造的に互換にならないため
  // ここだけ明示的に変換する（any で潰さない）
  const source = Readable.fromWeb(res.body as WebReadableStream<Uint8Array>)

  // ヘッダを受け取った時点で fetch の signal は本文の転送に効かなくなる。
  // 一定時間データが流れてこなければ中断しないと、転送が停止したときに
  // ビルドが無限に待ち続け、どの URL で止まったのかも分からなくなる。
  // 進んでいる限りタイマーを張り直すので、単に遅いだけの転送は中断しない
  let stallTimeoutId: NodeJS.Timeout | undefined
  const restartStallTimeout = () => {
    clearTimeout(stallTimeoutId)
    stallTimeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  }
  const stallGuard = new Transform({
    transform(chunk, _encoding, callback) {
      restartStallTimeout()
      callback(null, chunk)
    },
  })

  // sharp を先に stream.pipe() で繋ぐと転送元が pipeline の管理外になり、
  // 転送中のエラーが catch されず未処理例外になるため、全段を pipeline に渡す
  const stages =
    res.headers.get('content-type') === 'image/jpeg'
      ? [
          source,
          stallGuard,
          sharp().rotate(),
          new ExifTransformer(),
          writeStream,
        ]
      : [source, stallGuard, new ExifTransformer(), writeStream]

  restartStallTimeout()

  try {
    // pipeline は Promise を返すため await しないと書き込み時のエラーを捕捉できない
    await pipeline(stages, { signal: controller.signal })
  } catch (err) {
    // 途中まで書かれたファイルは public/notion に残り続け、後続のビルドで
    // public-notion-copier がそのまま dist にコピーしてしまうため削除する。
    // 後始末の失敗で本来のエラーを覆い隠さないよう、ここでは投げない
    try {
      fs.rmSync(filepath, { force: true })
    } catch (cleanupErr) {
      console.error(`Failed to remove partial file ${filepath}`)
      console.error(cleanupErr)
    }
    throw new Error(`Failed to write ${filepath} from ${displayUrl(url)}`, {
      cause: err,
    })
  } finally {
    clearTimeout(stallTimeoutId)
  }

  // 書き終えてから縮小する。pipeline の途中に縮小を挟まないのは、幅が分かるのは
  // ヘッダを読んだ後で、しかも縮小しない画像（大半）は今のバイト列のまま残したいため
  // （途中に挟むと全件が再エンコードされる）
  if (resizeLabel !== undefined) {
    await resizeDownloadedImage(filepath, resizeLabel)
  }
}

/**
 * 渡された URL をすべてダウンロードし、1 件でも失敗したらエラーを投げる。
 *
 * 最初の失敗で打ち切らず全件を試すので、この呼び出しに渡した URL については
 * 失敗したものを 1 回のビルドですべて列挙できる。不正な URL もダウンロード
 * できない以上は失敗として扱う（取りこぼすと本番に壊れた <img> が出るため）。
 *
 * shouldResize が true を返した URL は、ダウンロード後に幅 1600px 超なら縮小する
 * （resize-image.ts）。本文とアイキャッチの画像だけに使い、添付ファイルやカバーには
 * 使わない。添付ファイルは読者が元のファイルを落とすためのもので、DB のカバーは
 * 幅 1920px で表示しているため
 *
 * なお astro:build:start フックは integration ごとに直列に実行されるため、
 * 先に走った integration が投げた時点でビルドは止まり、後続の integration の
 * 失敗はそのビルドでは分からない。
 */
export async function downloadFiles(
  label: string,
  rawUrls: string[],
  { shouldResize }: { shouldResize?: (rawUrl: string) => boolean } = {}
): Promise<void> {
  const urls: URL[] = []
  const resize: boolean[] = []
  const failures: string[] = []
  // 同じファイルを指す URL が複数含まれていると、同一パスへ並行に書き込んで
  // ファイルが壊れる（失敗側の後始末が成功側の書き込みを消すこともある）。
  // 保存先パスは pathname の末尾 2 要素だけで決まるので、それをキーに重複を除く
  const seenPaths = new Set<string>()

  rawUrls.forEach((rawUrl) => {
    let url!: URL
    try {
      url = new URL(rawUrl)
    } catch (err) {
      console.error(`[${label}] invalid URL: ${rawUrl}`)
      console.error(err)
      failures.push(`${rawUrl} (invalid URL)`)
      return
    }

    const destPath = url.pathname.split('/').slice(-2).join('/')
    if (seenPaths.has(destPath)) {
      return
    }
    seenPaths.add(destPath)
    urls.push(url)
    resize.push(shouldResize?.(rawUrl) ?? false)
  })

  const results = await Promise.allSettled(
    urls.map((url, i) =>
      downloadFile(url, { resizeLabel: resize[i] ? label : undefined })
    )
  )

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[${label}] download failed: ${displayUrl(urls[i])}`)
      console.error(result.reason)
      failures.push(displayUrl(urls[i]))
    }
  })

  if (failures.length > 0) {
    throw new Error(
      `[${label}] ${failures.length} of ${rawUrls.length} files failed to download:\n` +
        failures.map((failure) => `  - ${failure}`).join('\n')
    )
  }
}

export async function getDatabase(): Promise<Database> {
  if (dbCache !== null) {
    return Promise.resolve(dbCache)
  }

  const params: GetDatabaseParameters = {
    database_id: DATABASE_ID,
  }

  const res = await retry(
    async (bail) => {
      try {
        return await client.databases.retrieve(params)
      } catch (error: unknown) {
        if (error instanceof APIResponseError) {
          if (error.status && error.status >= 400 && error.status < 500) {
            bail(error)
          }
        }
        throw error
      }
    },
    {
      retries: numberOfRetry,
    }
  )

  if (!('data_sources' in res)) {
    // partial なレスポンスは title / description / data_sources を持たない。
    // このまま進むと _getDataSource('') が Notion に 400 を返されるだけなので、
    // どのデータベースが読めなかったのかを示して止める
    throw new Error(
      `The database could not be read. Check the integration's access to it in Notion. database_id: ${DATABASE_ID}`
    )
  }

  if (res.in_trash) {
    // getAllPosts 側では弾いているが、この関数はサイトのタイトル・説明・
    // アイコンを作るために integration からも呼ばれ、getAllPosts より先に
    // 走る。判定を揃えておかないと、ゴミ箱の DB の情報でヘッダーを組み立てた
    // あと getAllPosts で落ちるという順序になる
    throw new Error(
      `The database is in trash. Please restore it. database_id: ${DATABASE_ID}`
    )
  }

  const dataSource = await _getDataSource(res.data_sources[0]?.id || '')

  // アイコンとカバーはデータソースとデータベースの両方に存在しうるため、
  // データソース側が未設定ならデータベース側にフォールバックする。
  // データソースが partial の場合は icon / cover を持たないため null 扱いにする
  const rawIcon = ('icon' in dataSource ? dataSource.icon : null) || res.icon
  const rawCover =
    ('cover' in dataSource ? dataSource.cover : null) || res.cover

  const icon = _buildIcon(rawIcon, `database_id: ${DATABASE_ID}`)
  const cover = _buildCover(rawCover, `database_id: ${DATABASE_ID}`)

  const database: Database = {
    Title: res.title.map((richText) => richText.plain_text).join(''),
    Description: res.description
      .map((richText) => richText.plain_text)
      .join(''),
    Icon: icon,
    Cover: cover,
  }

  dbCache = database
  return database
}

export async function _getDataSource(
  data_source_id: string
): Promise<GetDataSourceResponse> {
  const params: GetDataSourceParameters = {
    data_source_id: data_source_id,
  }

  return await retry(
    async (bail) => {
      try {
        return await client.dataSources.retrieve(params)
      } catch (error: unknown) {
        if (error instanceof APIResponseError) {
          if (error.status && error.status >= 400 && error.status < 500) {
            bail(error)
          }
        }
        throw error
      }
    },
    {
      retries: numberOfRetry,
    }
  )
}

/**
 * Notion のアイコンは emoji / external / file / icon（Notion 標準アイコン）/
 * custom_emoji の 5 種類がある。かつて分岐がデータベース・記事・callout の
 * 3 箇所に散り、記事と callout では file と custom_emoji が漏れてアイコンが
 * 消えていた。ここに集約したうえで、SDK の判別可能 union を使うことで
 * 分岐の漏れがコンパイルエラーになるようにしている。
 *
 * 戻り値は 3 通り。未設定なら null、SDK が知らない type が来たら Unsupported、
 * それ以外は FileObject / Emoji。未設定と未対応を同じ null にすると、
 * アイコンが消えた原因を呼び出し側から追えなくなるため分けている。
 *
 * context には呼び出し元の識別子（page_id / block_id / database_id）を渡す。
 * 未対応をログに出しても、どこで起きたか分からないと Notion 側を総当たりする
 * ことになるため。client.ts の他の「黙って落とした」系のログと同じ方針。
 */
function _buildIcon(
  rawIcon: PageObjectResponse['icon'] | undefined,
  context: string
): FileObject | Emoji | Unsupported | null {
  if (!rawIcon) {
    return null
  }

  switch (rawIcon.type) {
    case 'emoji':
      return {
        Type: rawIcon.type,
        Emoji: rawIcon.emoji,
      }
    case 'external':
      return {
        Type: rawIcon.type,
        Url: rawIcon.external.url,
      }
    case 'file':
      // NOTE: 記事と callout については、ここで値を返してもまだ表示されない。
      // PostTitle.astro / BlogPostsLink.astro / Callout.astro / Mention.astro に
      // Type === 'file' の分岐が無いため。分岐を足すだけでは不十分で、file 型の
      // URL は署名付きで失効するため、データベースのアイコン
      // (custom-icon-downloader) や FeaturedImage と同様にローカルへ
      // ダウンロードする仕組みが要る。別途対応する
      return {
        Type: rawIcon.type,
        Url: rawIcon.file.url,
      }
    case 'icon':
      // Notion 標準アイコンは名前と色で返るため、画像 URL を組み立てて
      // external として扱う (例: camera + gray -> camera_gray.svg)
      return {
        Type: 'external',
        Url: `https://www.notion.so/icons/${rawIcon.icon.name}_${rawIcon.icon.color}.svg`,
      }
    case 'custom_emoji':
      return {
        Type: 'external',
        Url: rawIcon.custom_emoji.url,
      }
    default: {
      // 未対応の type が union に増えたらここでコンパイルエラーになる。
      // throw はしない。Notion が SDK 更新前に新しい種類を返した場合に
      // アイコン 1 つでビルド全体を止めるのは過剰なため（他の握り潰し対策と
      // 同じ判断）。実行時はログを出したうえで、「未対応だった」ことを
      // Unsupported として値で返す。null（未設定）と混ざると、アイコンが
      // 消えたのが Notion の種別追加のせいなのか判別できなくなるため
      const unsupported: never = rawIcon
      const rawType = (unsupported as { type: string }).type
      console.error(
        `Unsupported icon type. The icon will not be rendered. type: ${rawType}, ${context}`
      )
      return { Type: 'unsupported', RawType: rawType }
    }
  }
}

/**
 * カバー画像は external と file の 2 種類。
 * SDK の PageCoverResponse は判別可能 union なので type で分岐する。
 */
function _buildCover(
  rawCover: PageObjectResponse['cover'] | undefined,
  context: string
): FileObject | Unsupported | null {
  if (!rawCover) {
    return null
  }

  switch (rawCover.type) {
    case 'external':
      return {
        Type: rawCover.type,
        Url: rawCover.external.url,
      }
    case 'file':
      return {
        Type: rawCover.type,
        Url: rawCover.file.url,
      }
    default: {
      // _buildIcon と同じ理由。未対応の type が増えたらコンパイルエラーにしつつ、
      // 実行時はログを出して Unsupported を返し、未設定（null）と区別できるようにする
      const unsupported: never = rawCover
      const rawType = (unsupported as { type: string }).type
      console.error(
        `Unsupported cover type. The cover will not be rendered. type: ${rawType}, ${context}`
      )
      return { Type: 'unsupported', RawType: rawType }
    }
  }
}

/**
 * 統合（integration）がそのブロックを読めない場合、Notion は id だけを持つ
 * partial なオブジェクトを返す（type も has_children も無い）。
 * 素通りさせると _buildBlock が Type: undefined の中身の無い Block を作り、
 * NotionBlocks.astro がどの case にも当たらず null を返して、記事から
 * ブロックが黙って消える。SDK の isFullBlock で弾いてログに出す。
 *
 * ビルドは止めない。Notion 側で共有が外れたブロックが 1 つあるだけで
 * サイト全体がビルド不能になってしまうため（_getSyncedBlockChildren と同じ判断）。
 * ただしどのブロックが落ちたかは分かるようにする。
 */
function _warnUnreadableBlocks(
  parentBlockId: string,
  blockObjects: ListBlockChildrenResponse['results']
): void {
  blockObjects.forEach((blockObject) => {
    if (!isFullBlock(blockObject)) {
      console.error(
        `A block could not be read. Check the integration's access to it in Notion. block_id: ${blockObject.id}, parent_block_id: ${parentBlockId}`
      )
    }
  })
}

function _filterReadableBlocks(
  parentBlockId: string,
  blockObjects: ListBlockChildrenResponse['results']
): BlockObjectResponse[] {
  _warnUnreadableBlocks(parentBlockId, blockObjects)
  return blockObjects.filter(isFullBlock)
}

function _buildBlock(blockObject: BlockObjectResponse): Block {
  const block: Block = {
    Id: blockObject.id,
    Type: blockObject.type,
    HasChildren: blockObject.has_children,
  }

  switch (blockObject.type) {
    case 'paragraph':
      if (blockObject.paragraph) {
        const paragraph: Paragraph = {
          RichTexts: blockObject.paragraph.rich_text.map(_buildRichText),
          Color: blockObject.paragraph.color,
        }
        block.Paragraph = paragraph
      }
      break
    case 'heading_1':
      if (blockObject.heading_1) {
        const heading1: Heading1 = {
          RichTexts: blockObject.heading_1.rich_text.map(_buildRichText),
          Color: blockObject.heading_1.color,
          IsToggleable: blockObject.heading_1.is_toggleable,
        }
        block.Heading1 = heading1
      }
      break
    case 'heading_2':
      if (blockObject.heading_2) {
        const heading2: Heading2 = {
          RichTexts: blockObject.heading_2.rich_text.map(_buildRichText),
          Color: blockObject.heading_2.color,
          IsToggleable: blockObject.heading_2.is_toggleable,
        }
        block.Heading2 = heading2
      }
      break
    case 'heading_3':
      if (blockObject.heading_3) {
        const heading3: Heading3 = {
          RichTexts: blockObject.heading_3.rich_text.map(_buildRichText),
          Color: blockObject.heading_3.color,
          IsToggleable: blockObject.heading_3.is_toggleable,
        }
        block.Heading3 = heading3
      }
      break
    case 'heading_4':
      if (blockObject.heading_4) {
        const heading4: Heading4 = {
          RichTexts: blockObject.heading_4.rich_text.map(_buildRichText),
          Color: blockObject.heading_4.color,
          IsToggleable: blockObject.heading_4.is_toggleable,
        }
        block.Heading4 = heading4
      }
      break
    case 'bulleted_list_item':
      if (blockObject.bulleted_list_item) {
        const bulletedListItem: BulletedListItem = {
          RichTexts:
            blockObject.bulleted_list_item.rich_text.map(_buildRichText),
          Color: blockObject.bulleted_list_item.color,
        }
        block.BulletedListItem = bulletedListItem
      }
      break
    case 'numbered_list_item':
      if (blockObject.numbered_list_item) {
        const numberedListItem: NumberedListItem = {
          RichTexts:
            blockObject.numbered_list_item.rich_text.map(_buildRichText),
          Color: blockObject.numbered_list_item.color,
        }
        block.NumberedListItem = numberedListItem
      }
      break
    case 'to_do':
      if (blockObject.to_do) {
        const toDo: ToDo = {
          RichTexts: blockObject.to_do.rich_text.map(_buildRichText),
          Checked: blockObject.to_do.checked,
          Color: blockObject.to_do.color,
        }
        block.ToDo = toDo
      }
      break
    case 'video':
      if (blockObject.video) {
        const video: Video = {
          Caption: blockObject.video.caption?.map(_buildRichText) || [],
          Type: blockObject.video.type,
        }
        if (
          blockObject.video.type === 'external' &&
          blockObject.video.external
        ) {
          video.External = { Url: blockObject.video.external.url }
        } else if (
          blockObject.video.type === 'file' &&
          blockObject.video.file
        ) {
          // アップロードした動画。image と同じく URL は署名付きで失効するため
          // ExpiryTime も持っておき、ビルド時のダウンロード経路で使う
          video.File = {
            Type: blockObject.video.type,
            Url: blockObject.video.file.url,
            ExpiryTime: blockObject.video.file.expiry_time,
          }
        }
        block.Video = video
      }
      break
    case 'image':
      if (blockObject.image) {
        const image: Image = {
          Caption: blockObject.image.caption?.map(_buildRichText) || [],
          Type: blockObject.image.type,
        }
        if (
          blockObject.image.type === 'external' &&
          blockObject.image.external
        ) {
          image.External = { Url: blockObject.image.external.url }
        } else if (
          blockObject.image.type === 'file' &&
          blockObject.image.file
        ) {
          image.File = {
            Type: blockObject.image.type,
            Url: blockObject.image.file.url,
            ExpiryTime: blockObject.image.file.expiry_time,
          }
        }
        block.Image = image
      }
      break
    case 'file':
      if (blockObject.file) {
        const file: File = {
          Caption: blockObject.file.caption?.map(_buildRichText) || [],
          Type: blockObject.file.type,
        }
        if (blockObject.file.type === 'external' && blockObject.file.external) {
          file.External = { Url: blockObject.file.external.url }
        } else if (blockObject.file.type === 'file' && blockObject.file.file) {
          file.File = {
            Type: blockObject.file.type,
            Url: blockObject.file.file.url,
            ExpiryTime: blockObject.file.file.expiry_time,
          }
        }
        block.File = file
      }
      break
    case 'code':
      if (blockObject.code) {
        const code: Code = {
          Caption: blockObject.code.caption?.map(_buildRichText) || [],
          RichTexts: blockObject.code.rich_text.map(_buildRichText),
          Language: blockObject.code.language,
        }
        block.Code = code
      }
      break
    case 'quote':
      if (blockObject.quote) {
        const quote: Quote = {
          RichTexts: blockObject.quote.rich_text.map(_buildRichText),
          Color: blockObject.quote.color,
        }
        block.Quote = quote
      }
      break
    case 'equation':
      if (blockObject.equation) {
        const equation: Equation = {
          Expression: blockObject.equation.expression,
        }
        block.Equation = equation
      }
      break
    case 'callout':
      if (blockObject.callout) {
        const icon = _buildIcon(
          blockObject.callout.icon,
          `block_id: ${blockObject.id}`
        )

        const callout: Callout = {
          RichTexts: blockObject.callout.rich_text.map(_buildRichText),
          Icon: icon,
          Color: blockObject.callout.color,
        }
        block.Callout = callout
      }
      break
    case 'synced_block':
      if (blockObject.synced_block) {
        let syncedFrom: SyncedFrom | null = null
        if (
          blockObject.synced_block.synced_from &&
          blockObject.synced_block.synced_from.block_id
        ) {
          syncedFrom = {
            BlockId: blockObject.synced_block.synced_from.block_id,
          }
        }

        const syncedBlock: SyncedBlock = {
          SyncedFrom: syncedFrom,
        }
        block.SyncedBlock = syncedBlock
      }
      break
    case 'toggle':
      if (blockObject.toggle) {
        const toggle: Toggle = {
          RichTexts: blockObject.toggle.rich_text.map(_buildRichText),
          Color: blockObject.toggle.color,
          Children: [],
        }
        block.Toggle = toggle
      }
      break
    case 'embed':
      if (blockObject.embed) {
        const embed: Embed = {
          Url: blockObject.embed.url,
        }
        block.Embed = embed
      }
      break
    case 'bookmark':
      if (blockObject.bookmark) {
        const bookmark: Bookmark = {
          Caption: blockObject.bookmark.caption?.map(_buildRichText) || [],
          Url: blockObject.bookmark.url,
        }
        block.Bookmark = bookmark
      }
      break
    case 'link_preview':
      if (blockObject.link_preview) {
        const linkPreview: LinkPreview = {
          Url: blockObject.link_preview.url,
        }
        block.LinkPreview = linkPreview
      }
      break
    case 'table':
      if (blockObject.table) {
        const table: Table = {
          TableWidth: blockObject.table.table_width,
          HasColumnHeader: blockObject.table.has_column_header,
          HasRowHeader: blockObject.table.has_row_header,
          Rows: [],
        }
        block.Table = table
      }
      break
    case 'column_list': {
      const columnList: ColumnList = {
        Columns: [],
      }
      block.ColumnList = columnList
      break
    }
    case 'table_of_contents':
      if (blockObject.table_of_contents) {
        const tableOfContents: TableOfContents = {
          Color: blockObject.table_of_contents.color,
        }
        block.TableOfContents = tableOfContents
      }
      break
    case 'link_to_page':
      // SDK のペイロードは page_id / database_id / comment_id の判別可能 union。
      // page_id を持つのは type === 'page_id' のときだけ
      if (blockObject.link_to_page.type === 'page_id') {
        const linkToPage: LinkToPage = {
          Type: blockObject.link_to_page.type,
          PageId: blockObject.link_to_page.page_id,
        }
        block.LinkToPage = linkToPage
      }
      break
  }

  return block
}

async function _getTableRows(blockId: string): Promise<TableRow[]> {
  let results: ListBlockChildrenResponse['results'] = []

  const cachedResults = _readCachedBlockChildren(blockId)
  if (cachedResults) {
    results = cachedResults
  } else {
    const params: ListBlockChildrenParameters = {
      block_id: blockId,
    }

    while (true) {
      const res = await retry(
        async (bail) => {
          try {
            return await client.blocks.children.list(params)
          } catch (error: unknown) {
            if (error instanceof APIResponseError) {
              if (error.status && error.status >= 400 && error.status < 500) {
                bail(error)
              }
            }
            throw error
          }
        },
        {
          retries: numberOfRetry,
        }
      )

      results = results.concat(res.results)

      if (!res.has_more) {
        break
      }

      params['start_cursor'] = res.next_cursor as string
    }
  }

  // 表だけは読めない行も取り除かない。Table.astro はヘッダー行を配列の位置
  // （j === 0）だけで判定しているため、先頭行を落とすと 2 行目がヘッダーに
  // 繰り上がってしまう。読めない行は Cells が空のまま空行として描画される
  _warnUnreadableBlocks(blockId, results)

  return results.map((blockObject) => {
    if (!isFullBlock(blockObject)) {
      // 読めない行も位置を保つため空行として残す（警告は上で出している）。
      // Type / HasChildren はリポジトリのどこからも読まれていないため、
      // 従来 undefined が入っていたのを型どおりの値にしても描画は変わらない
      return { Id: blockObject.id, Type: '', HasChildren: false, Cells: [] }
    }

    const tableRow: TableRow = {
      Id: blockObject.id,
      Type: blockObject.type,
      HasChildren: blockObject.has_children,
      Cells: [],
    }

    if (blockObject.type === 'table_row' && blockObject.table_row) {
      const cells: TableCell[] = blockObject.table_row.cells.map((cell) => {
        const tableCell: TableCell = {
          RichTexts: cell.map(_buildRichText),
        }

        return tableCell
      })

      tableRow.Cells = cells
    }

    return tableRow
  })
}

async function _getColumns(blockId: string): Promise<Column[]> {
  let results: ListBlockChildrenResponse['results'] = []

  const cachedResults = _readCachedBlockChildren(blockId)
  if (cachedResults) {
    results = cachedResults
  } else {
    const params: ListBlockChildrenParameters = {
      block_id: blockId,
    }

    while (true) {
      const res = await retry(
        async (bail) => {
          try {
            return await client.blocks.children.list(params)
          } catch (error: unknown) {
            if (error instanceof APIResponseError) {
              if (error.status && error.status >= 400 && error.status < 500) {
                bail(error)
              }
            }
            throw error
          }
        },
        {
          retries: numberOfRetry,
        }
      )

      results = results.concat(res.results)

      if (!res.has_more) {
        break
      }

      params['start_cursor'] = res.next_cursor as string
    }
  }

  return await Promise.all(
    _filterReadableBlocks(blockId, results).map(async (blockObject) => {
      const children = await getAllBlocksByBlockId(blockObject.id)

      const column: Column = {
        Id: blockObject.id,
        Type: blockObject.type,
        HasChildren: blockObject.has_children,
        Children: children,
      }

      return column
    })
  )
}

async function _getSyncedBlockChildren(block: Block): Promise<Block[]> {
  let originalBlock: Block = block
  if (
    block.SyncedBlock &&
    block.SyncedBlock.SyncedFrom &&
    block.SyncedBlock.SyncedFrom.BlockId
  ) {
    try {
      originalBlock = await getBlock(block.SyncedBlock.SyncedFrom.BlockId)
    } catch (err) {
      // ここはビルドを止めない。Notion 側で共有が外れた synced_block が
      // 1 つあるだけでサイト全体がビルド不能になってしまうため。
      // ただしどのブロックが落ちたかは分かるようにする
      console.error(
        `Could not retrieve the original synced_block. block_id: ${block.Id}, synced_from: ${block.SyncedBlock?.SyncedFrom?.BlockId}`
      )
      console.error(err)
      return []
    }
  }

  const children = await getAllBlocksByBlockId(originalBlock.Id)
  return children
}

/**
 * ページのプロパティを名前と型で取り出す。
 *
 * SDK の properties は `Record<string, PagePropertyValueWithIdResponse>` で、
 * 値は全プロパティ型の判別可能 union。名前で引いただけでは union のままなので、
 * 期待する型で絞り込んでから返す。
 *
 * 期待と違う型だった場合や存在しない場合は null を返す。手書き型の時代は
 * prop.Page.title のように無条件に参照しており、Notion 側でプロパティを
 * 消したり型を変えたりすると page_id も分からない TypeError でビルドが
 * 落ちていた。
 */
type PageProperty = PageObjectResponse['properties'][string]

function _pageProp<T extends PageProperty['type']>(
  properties: PageObjectResponse['properties'],
  name: string,
  type: T
): Extract<PageProperty, { type: T }> | null {
  const prop = properties[name]
  if (!prop || prop.type !== type) {
    return null
  }
  return prop as Extract<PageProperty, { type: T }>
}

function _validPageObject(
  pageObject: QueryDataSourceResponse['results'][number]
): pageObject is PageObjectResponse {
  // dataSources.query の results には、統合がそのページを読めない場合に
  // id だけの partial なページが混ざる（properties が無い）。
  // data_source のオブジェクトが混ざることも型の上ではありうる
  if (!isFullPage(pageObject)) {
    // results には partial なページのほか、型の上では data_source の
    // オブジェクトも混ざりうる。どちらだったか分かるよう object を出す
    console.error(
      `Skipped an entry that is not a readable page. Check the integration's access to it in Notion. id: ${pageObject.id}, object: ${pageObject.object}`
    )
    return false
  }

  const properties = pageObject.properties
  const missing: string[] = []

  const page = _pageProp(properties, 'Page', 'title')
  if (!page || page.title.length === 0) {
    missing.push('Page')
  }
  const slug = _pageProp(properties, 'Slug', 'rich_text')
  if (!slug || slug.rich_text.length === 0) {
    missing.push('Slug')
  }
  if (!_pageProp(properties, 'Date', 'date')?.date) {
    missing.push('Date')
  }

  if (missing.length > 0) {
    // Published にチェックが入っているのに必須プロパティが空の記事は、
    // ここで黙って除外されるとサイトから消えたことに気づけない。
    // ビルドは止めない（記事 1 件の記入漏れで全体を止めない）が、
    // どのページが落ちたかは分かるようにする
    console.error(
      `Skipped a published page with empty required properties. page_id: ${pageObject.id}, missing: ${missing.join(', ')}`
    )
    return false
  }

  return true
}

function _buildPost(pageObject: PageObjectResponse): Post {
  const properties = pageObject.properties

  const icon = _buildIcon(pageObject.icon, `page_id: ${pageObject.id}`)
  const cover = _buildCover(pageObject.cover, `page_id: ${pageObject.id}`)

  // NOTE: FeaturedImage は _buildIcon / _buildCover を通さないため、未対応の
  // type を Unsupported として区別する扱いの対象外にしている。消費側
  // (PostFeaturedImage.astro / featured-image-downloader.ts / [slug].astro) は
  // Type を見ず Url だけを使うので、Unsupported を混ぜると Url を持たない値が
  // 流れ込んで壊れるだけで得が無い
  const featuredImageProp = _pageProp(properties, 'FeaturedImage', 'files')
  const featuredFile = featuredImageProp?.files[0]
  let featuredImage: FileObject | null = null
  if (featuredFile) {
    // SDK の files の要素は external / file の判別可能 union なので type で分ける。
    // Type に入れるのは featuredImageProp.type ではなく featuredFile.type。
    // 前者はプロパティの型なので常に 'files' で、FileObject.Type が期待する
    // 'external' / 'file' ではない（元から値が誤っていた）。FileObject.Type を
    // リテラル型に絞ったことで型エラーとして表面化した。消費側は Url しか
    // 読まないため、表示上の挙動は変わらない
    if (featuredFile.type === 'external') {
      featuredImage = {
        Type: featuredFile.type,
        Url: featuredFile.external.url,
      }
    } else if (featuredFile.type === 'file') {
      featuredImage = {
        Type: featuredFile.type,
        Url: featuredFile.file.url,
        ExpiryTime: featuredFile.file.expiry_time,
      }
    }
  }

  const page = _pageProp(properties, 'Page', 'title')
  const slug = _pageProp(properties, 'Slug', 'rich_text')
  const date = _pageProp(properties, 'Date', 'date')
  const tags = _pageProp(properties, 'Tags', 'multi_select')
  const excerpt = _pageProp(properties, 'Excerpt', 'rich_text')
  const rank = _pageProp(properties, 'Rank', 'number')

  const post: Post = {
    PageId: pageObject.id,
    Title: page
      ? page.title.map((richText) => richText.plain_text).join('')
      : '',
    Icon: icon,
    Cover: cover,
    Slug: slug
      ? slug.rich_text.map((richText) => richText.plain_text).join('')
      : '',
    Date: date?.date ? date.date.start : '',
    Tags: tags ? tags.multi_select : [],
    Excerpt:
      excerpt && excerpt.rich_text.length > 0
        ? excerpt.rich_text.map((richText) => richText.plain_text).join('')
        : '',
    FeaturedImage: featuredImage,
    Rank: rank?.number ? rank.number : 0,
  }

  return post
}

function _buildRichText(richTextObject: RichTextItemResponse): RichText {
  const annotation: Annotation = {
    Bold: richTextObject.annotations.bold,
    Italic: richTextObject.annotations.italic,
    Strikethrough: richTextObject.annotations.strikethrough,
    Underline: richTextObject.annotations.underline,
    Code: richTextObject.annotations.code,
    Color: richTextObject.annotations.color,
  }

  const richText: RichText = {
    Annotation: annotation,
    PlainText: richTextObject.plain_text,
    Href: richTextObject.href,
  }

  if (richTextObject.type === 'text' && richTextObject.text) {
    const text: Text = {
      Content: richTextObject.text.content,
    }

    if (richTextObject.text.link) {
      text.Link = {
        Url: richTextObject.text.link.url,
      }
    }

    richText.Text = text
  } else if (richTextObject.type === 'equation' && richTextObject.equation) {
    const equation: Equation = {
      Expression: richTextObject.equation.expression,
    }
    richText.Equation = equation
  } else if (richTextObject.type === 'mention' && richTextObject.mention) {
    const mention: Mention = {
      Type: richTextObject.mention.type,
    }

    if (richTextObject.mention.type === 'page' && richTextObject.mention.page) {
      const reference: Reference = {
        Id: richTextObject.mention.page.id,
      }
      mention.Page = reference
    }

    richText.Mention = mention
  }

  return richText
}
