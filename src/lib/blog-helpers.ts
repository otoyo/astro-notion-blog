import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { BASE_PATH, REQUEST_TIMEOUT_MS } from '../server-constants'
import type {
  Block,
  Database,
  Emoji,
  FileObject,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  RichText,
  Column,
  Unsupported,
} from './interfaces'
import { pathJoin } from './utils'
import { displayUrl, safeFetch, UnsafeFetchError } from './safe-fetch'

export const filePath = (url: URL): string => {
  const [dir, filename] = url.pathname.split('/').slice(-2)
  return pathJoin(BASE_PATH, `/notion/${dir}/${filename}`)
}

// OGP 用に生成した 1200x630 画像の名前。
// `og-` と `.jpg` は ASCII なので、エンコード済みの名前に付けてから
// デコードしても、デコードしてから付けても同じ結果になる。
// そのため URL 用とディスク用で同じ関数を使い回せる。
// ただし拡張子のドットがパーセントエンコード（%2E）されている場合は
// 拡張子を剥がせず og-<名前>.jpg.jpg のような名前になる。
// encodeURIComponent はドットをエンコードしないので実際には起きないが、
// 「どんな名前でも同じ」ではないことは書いておく
const ogImageName = (filename: string): string =>
  `og-${filename.replace(/\.[^.]+$/, '')}.jpg`

/**
 * 生成した OGP 画像の URL パス。filePath() と同じ規約で、
 * Notion の URL に入っているエンコード済みの名前をそのまま使う。
 */
export const ogImageUrlPath = (url: URL): string => {
  const [dir, filename] = url.pathname.split('/').slice(-2)
  return pathJoin(BASE_PATH, `/notion/${dir}/${ogImageName(filename)}`)
}

/**
 * 生成した OGP 画像のディスク上のパス。
 * downloadFile() が decodeURIComponent した名前で保存するので、
 * こちらもデコードした名前に合わせる。BASE_PATH は付けない
 */
export const ogImageLocalPath = (url: URL): string => {
  const [dir, filename] = url.pathname.split('/').slice(-2)
  return `public/notion/${dir}/${decodeURIComponent(ogImageName(filename))}`
}

/**
 * external のカバー画像を WebP に変換して置くときのファイル名。
 *
 * URL から決まるようにしてあるので、Notion でカバーを差し替えれば別のファイルに
 * なり、古い変換結果を参照し続けることがない。external の URL は
 * app.notion.com のものとは限らず（Unsplash などクエリ付きのこともある）、
 * パスの末尾から名前を作ると衝突や使えない文字が出うるため、URL 全体の
 * sha256 の先頭 16 桁を使う
 */
const coverImageName = (url: string): string =>
  `${createHash('sha256').update(url).digest('hex').slice(0, 16)}.webp`

/**
 * 変換した external のカバー画像の URL パス。filePath() と同じく BASE_PATH 込み
 */
const coverImageUrlPath = (url: string): string =>
  pathJoin(BASE_PATH, `/notion/cover/${coverImageName(url)}`)

/**
 * 変換した external のカバー画像のディスク上のパス。BASE_PATH は付けない。
 * 書き込むのは src/integrations/cover-image-downloader.ts
 */
export const coverImageLocalPath = (url: string): string =>
  `public/notion/cover/${coverImageName(url)}`

/**
 * データベースのカバー画像とカスタムアイコンの URL を、表示に使える形で返す。
 *
 * 取得できなかったものは undefined を返し、呼び出し側で出し分ける。
 * Layout.astro と LayoutMd.astro に同じ導出がコピーされていたのをまとめたもの。
 */
export const getDatabaseImageURLs = (
  database: Database
): { coverImageURL?: string; customIconURL?: string } => {
  let coverImageURL: string | undefined
  if (database.Cover) {
    if (database.Cover.Type === 'external') {
      // ビルド時に cover-image-downloader が WebP に変換して置いていれば、
      // 自サイトから配信する。無ければ（取得や変換に失敗した、または
      // build:start が走らない astro dev）従来どおり外部 URL を使う
      coverImageURL = fs.existsSync(coverImageLocalPath(database.Cover.Url))
        ? coverImageUrlPath(database.Cover.Url)
        : database.Cover.Url
    } else if (database.Cover.Type === 'file') {
      try {
        coverImageURL = filePath(new URL(database.Cover.Url))
      } catch {
        console.error('Invalid DB cover image URL: ', database.Cover.Url)
      }
    }
  }

  let customIconURL: string | undefined
  const icon = database.Icon
  // Icon は FileObject | Emoji | Unsupported の判別可能 union なので、
  // Type === 'file' で FileObject（Url を持つ方）に絞り込める
  if (icon && icon.Type === 'file') {
    try {
      customIconURL = filePath(new URL(icon.Url))
    } catch {
      console.error('Invalid DB custom icon URL: ', icon.Url)
    }
  }

  return { coverImageURL, customIconURL }
}

/**
 * アイコンを <img> で表示するときの src を返す。表示できないものは undefined。
 *
 * file タイプ（Notion にアップロードされたファイル）の Url は署名付きで、
 * 時間が経つと失効する。ビルド時にダウンロードしたものをそのまま貼ると
 * しばらくして画像が壊れるため、ビルド時にローカルへ落としてある前提で
 * filePath() が返すローカルパスに差し替える。
 * external は Notion 外部のホストにある URL なのでそのまま使ってよい。
 *
 * emoji はテキストとして描画するもので <img> では出せない。unsupported と
 * 未設定も含め、そういうものは undefined を返して呼び出し側のフォールバック
 * （絵文字やタイトルのみの表示）に倒せるようにしている。
 *
 * context には呼び出し元の識別子（page_id / block_id）を渡す。アイコンは
 * 記事や callout の数だけあるので、どれが壊れているか分からないログでは
 * 追いようがない。client.ts の他のログと同じ方針。
 */
export const getIconImageURL = (
  icon: FileObject | Emoji | Unsupported | null,
  context: string
): string | undefined => {
  if (!icon) {
    return undefined
  }

  if (icon.Type === 'external') {
    return icon.Url
  }

  if (icon.Type === 'file') {
    try {
      return filePath(new URL(icon.Url))
    } catch {
      // URL が壊れているとローカルパスを導出できない。握り潰すと
      // 「アイコンだけ出ない」原因が追えなくなるのでログには残す。
      // 署名付き URL はクエリに署名を含み、ビルドログは保存されるので
      // クエリは落とす（client.ts の displayUrl と同じ理由）
      console.error(
        `Invalid icon URL. The icon will not be rendered. url: ${icon.Url.split('?')[0]}, ${context}`
      )
      return undefined
    }
  }

  return undefined
}

export const extractTargetBlocks = (
  blockType: string,
  blocks: Block[]
): Block[] => {
  return blocks
    .reduce((acc: Block[], block) => {
      if (block.Type === blockType) {
        acc.push(block)
      }

      if (block.ColumnList && block.ColumnList.Columns) {
        acc = acc.concat(
          _extractTargetBlockFromColums(blockType, block.ColumnList.Columns)
        )
      } else if (block.BulletedListItem && block.BulletedListItem.Children) {
        acc = acc.concat(
          extractTargetBlocks(blockType, block.BulletedListItem.Children)
        )
      } else if (block.NumberedListItem && block.NumberedListItem.Children) {
        acc = acc.concat(
          extractTargetBlocks(blockType, block.NumberedListItem.Children)
        )
      } else if (block.ToDo && block.ToDo.Children) {
        acc = acc.concat(extractTargetBlocks(blockType, block.ToDo.Children))
      } else if (block.SyncedBlock && block.SyncedBlock.Children) {
        acc = acc.concat(
          extractTargetBlocks(blockType, block.SyncedBlock.Children)
        )
      } else if (block.Toggle && block.Toggle.Children) {
        acc = acc.concat(extractTargetBlocks(blockType, block.Toggle.Children))
      } else if (block.Paragraph && block.Paragraph.Children) {
        acc = acc.concat(
          extractTargetBlocks(blockType, block.Paragraph.Children)
        )
      } else if (block.Heading1 && block.Heading1.Children) {
        acc = acc.concat(
          extractTargetBlocks(blockType, block.Heading1.Children)
        )
      } else if (block.Heading2 && block.Heading2.Children) {
        acc = acc.concat(
          extractTargetBlocks(blockType, block.Heading2.Children)
        )
      } else if (block.Heading3 && block.Heading3.Children) {
        acc = acc.concat(
          extractTargetBlocks(blockType, block.Heading3.Children)
        )
      } else if (block.Heading4 && block.Heading4.Children) {
        acc = acc.concat(
          extractTargetBlocks(blockType, block.Heading4.Children)
        )
      } else if (block.Quote && block.Quote.Children) {
        acc = acc.concat(extractTargetBlocks(blockType, block.Quote.Children))
      } else if (block.Callout && block.Callout.Children) {
        acc = acc.concat(extractTargetBlocks(blockType, block.Callout.Children))
      }

      return acc
    }, [])
    .flat()
}

const HEADING_TYPES = ['heading_1', 'heading_2', 'heading_3', 'heading_4']

const _getChildBlocks = (block: Block): Block[] => {
  if (block.ColumnList && block.ColumnList.Columns) {
    return block.ColumnList.Columns.flatMap((column) => column.Children || [])
  }
  return (
    (block.BulletedListItem && block.BulletedListItem.Children) ||
    (block.NumberedListItem && block.NumberedListItem.Children) ||
    (block.ToDo && block.ToDo.Children) ||
    (block.SyncedBlock && block.SyncedBlock.Children) ||
    (block.Toggle && block.Toggle.Children) ||
    (block.Paragraph && block.Paragraph.Children) ||
    (block.Heading1 && block.Heading1.Children) ||
    (block.Heading2 && block.Heading2.Children) ||
    (block.Heading3 && block.Heading3.Children) ||
    (block.Heading4 && block.Heading4.Children) ||
    (block.Quote && block.Quote.Children) ||
    (block.Callout && block.Callout.Children) ||
    []
  )
}

export const extractHeadings = (blocks: Block[]): Block[] => {
  return blocks.flatMap((block) => {
    const self = HEADING_TYPES.includes(block.Type) ? [block] : []
    return self.concat(extractHeadings(_getChildBlocks(block)))
  })
}

export const assignHeadingAnchorIds = (headings: Block[]): void => {
  const counts: { [key: string]: number } = {}
  headings.forEach((block) => {
    const heading =
      block.Heading1 || block.Heading2 || block.Heading3 || block.Heading4
    if (!heading) {
      return
    }
    const baseId = _buildBaseHeadingId(heading)
    const count = counts[baseId] || 0
    counts[baseId] = count + 1
    heading.AnchorId = count === 0 ? baseId : `${baseId}-${count + 1}`
  })
}

const _extractTargetBlockFromColums = (
  blockType: string,
  columns: Column[]
): Block[] => {
  return columns
    .reduce((acc: Block[], column) => {
      if (column.Children) {
        acc = acc.concat(extractTargetBlocks(blockType, column.Children))
      }
      return acc
    }, [])
    .flat()
}

// ブックマークのプレビュー用に取得する HTML の大きさの上限（展開後）。
// 2026-09-26 のビルドで取得できた 19 件のうち最大は play.google.com の 1,307,208 バイト
// （gzip を展開した後）で、ほかは 44 万バイト以下だった。最大の約 4 倍を上限にする。
// 上限を超えたら、エラーの応答と同じくプレビュー無しに倒れる
const MAX_BOOKMARK_HTML_BYTES = 5 * 1024 * 1024

export const buildURLToHTMLMap = async (
  urls: URL[]
): Promise<{ [key: string]: string }> => {
  const htmls: string[] = await Promise.all(
    urls.map(async (url: URL) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
      }, REQUEST_TIMEOUT_MS)

      return safeFetch(url, {
        signal: controller.signal,
        maxBytes: MAX_BOOKMARK_HTML_BYTES,
      })
        .then((res) => {
          if (!res.ok) {
            // エラーページの HTML をそのまま metascraper に渡すと、その
            // タイトルがブックマークのタイトルとして表示されてしまう。
            // 実際に aten.com (403) のカードが
            // 「ERROR: The request could not be satisfied」と表示されていた。
            // プレビュー無し（URL とファビコンだけ）に倒す
            console.error(
              `Skipped a bookmark preview because the site responded with an error status. url: ${displayUrl(url)}, status: ${res.status}`
            )
            return ''
          }
          // fetch の res.text() と同じく、charset に関わらず UTF-8 として読む
          // （先頭の BOM も res.text() と同じく落ちる）
          return new TextDecoder().decode(res.body)
        })
        .catch((err) => {
          if (err instanceof UnsafeFetchError) {
            // 取得を弾いた（プロトコル・アドレス・リダイレクト・大きさ）。
            // 理由のメッセージはクエリを落とした URL を含む
            console.error(
              `Skipped a bookmark preview: ${err.message}. url: ${displayUrl(url)}`
            )
            return ''
          }
          // ブックマークのプレビューは外部サイトの応答なのでビルドは止めない
          // （プレビューが出ないだけ）。ただし従来は原因を問わず
          // 「Request was aborted」と出していたため、タイムアウトなのか
          // ネットワークエラーなのか区別がつかなかった
          const timedOut = err instanceof Error && err.name === 'AbortError'
          console.error(
            `Failed to fetch a bookmark preview. url: ${displayUrl(url)}${
              timedOut ? ` (timed out after ${REQUEST_TIMEOUT_MS}ms)` : ''
            }`
          )
          // Node の fetch はネットワークエラーを `TypeError: fetch failed` に
          // 包み、実際の原因を cause に入れる。文字列化すると原因が消えるので
          // エラーオブジェクトをそのまま渡す
          console.error(err)
          return ''
        })
        .finally(() => {
          clearTimeout(timeout)
        })
    })
  )

  return urls.reduce((acc: { [key: string]: string }, url, i) => {
    if (htmls[i]) {
      acc[url.toString()] = htmls[i]
    }
    return acc
  }, {})
}

export const getStaticFilePath = (path: string): string => {
  return pathJoin(BASE_PATH, path)
}

// 引数 nav は「BASE_PATH を含まない生パス」（例: '/posts/foo'）。
// BASE_PATH を足すのはこの関数の仕事なので、getPostLink() や
// Markdown ページの frontmatter.url のような "すでに BASE_PATH 込み" の値を
// 渡してはいけない（二重に付いて /blog/blog/posts/foo になる）。
// 剥がしてから渡したい場合は stripBasePath() を使うこと
export const getNavLink = (nav: string): string => {
  // 以前はここで nav === '/' を特別扱いしていたが、withTrailingSlash を
  // 通すようになって不要になった（pathJoin('', '') が '/' を返すため）。
  // BASE_PATH と nav の組み合わせ 28 通りで戻り値が変わらないことを確認済み
  return withTrailingSlash(pathJoin(BASE_PATH, nav))
}

/**
 * ページの URL を、実際に 200 を返す形（末尾スラッシュ付き）に揃える。
 *
 * Astro は既定でページを <パス>/index.html として出力するため、配信側は
 * /archive/6474/ で 200 を返し、/archive/6474 は 308 で /archive/6474/ へ
 * 転送する。これまではリンクも canonical も転送される側を指していた。
 * sitemap だけが末尾スラッシュ付きを載せていたため、
 * canonical・sitemap・実 URL の 3 つが食い違っている状態だった。
 *
 * 渡すのはパス部分だけにすること。クエリやフラグメントを含む文字列だと
 * '/posts/foo?q=1/' のように末尾に付いてしまう。
 * 静的ファイル（getStaticFilePath）には使わないこと。
 */
export const withTrailingSlash = (url: string): string =>
  url.endsWith('/') ? url : `${url}/`

// BASE_PATH 込みのパスから BASE_PATH を取り除いて生パスに戻す。
// Astro が組み立てる Markdown ページの frontmatter.url は base 込みなので
// （node_modules/astro/dist/vite-plugin-utils/index.js の getFileInfo が
// pages/ より前を base に置き換えている）、getNavLink に渡す前にこれを通す。
// BASE_PATH が空（現状）のときは何もしないので既存の出力は変わらない
export const stripBasePath = (path: string): string => {
  if (!BASE_PATH) {
    return path
  }

  // BASE_PATH は '/blog' でも '/blog/' でも設定されうるので正規化しておく
  const base = pathJoin(BASE_PATH, '')
  if (path === base) {
    return '/'
  }
  if (path.startsWith(`${base}/`)) {
    return path.slice(base.length)
  }
  return path
}

export const getPostLink = (slug: string) => {
  return withTrailingSlash(pathJoin(BASE_PATH, `/posts/${slug}`))
}

export const getTagLink = (tag: string) => {
  return withTrailingSlash(
    pathJoin(BASE_PATH, `/posts/tag/${encodeURIComponent(tag)}`)
  )
}

export const getPageLink = (page: number, tag: string) => {
  if (page === 1) {
    // 1 ページ目にはページ番号が付かない。タグ無しならトップページ
    return tag ? getTagLink(tag) : getNavLink('/')
  }
  return withTrailingSlash(
    tag
      ? pathJoin(
          BASE_PATH,
          `/posts/tag/${encodeURIComponent(tag)}/page/${page.toString()}`
        )
      : pathJoin(BASE_PATH, `/posts/page/${page.toString()}`)
  )
}

export const getDateStr = (date: string) => {
  const dt = new Date(date)

  if (date.indexOf('T') !== -1) {
    // Consider timezone
    const elements = date.split('T')[1].split(/([+-])/)
    if (elements.length > 1) {
      const diff = parseInt(`${elements[1]}${elements[2]}`, 10)
      dt.setHours(dt.getHours() + diff)
    }
  }

  const y = dt.getFullYear()
  const m = ('00' + (dt.getMonth() + 1)).slice(-2)
  const d = ('00' + dt.getDate()).slice(-2)
  return y + '-' + m + '-' + d
}

export const buildHeadingId = (
  heading: Heading1 | Heading2 | Heading3 | Heading4
) => {
  if (heading.AnchorId) {
    return heading.AnchorId
  }
  return _buildBaseHeadingId(heading)
}

const _buildBaseHeadingId = (
  heading: Heading1 | Heading2 | Heading3 | Heading4
) => {
  return heading.RichTexts.map((richText: RichText) => {
    if (!richText.Text) {
      return ''
    }
    return richText.Text.Content
  })
    .join()
    .trim()
}

export const isTweetURL = (url: URL): boolean => {
  if (
    url.hostname !== 'twitter.com' &&
    url.hostname !== 'www.twitter.com' &&
    url.hostname !== 'x.com' &&
    url.hostname !== 'www.x.com'
  ) {
    return false
  }
  return /\/[^/]+\/status\/[\d]+/.test(url.pathname)
}

export const isTikTokURL = (url: URL): boolean => {
  if (url.hostname !== 'tiktok.com' && url.hostname !== 'www.tiktok.com') {
    return false
  }
  return /\/[^/]+\/video\/[\d]+/.test(url.pathname)
}

export const isInstagramURL = (url: URL): boolean => {
  if (
    url.hostname !== 'instagram.com' &&
    url.hostname !== 'www.instagram.com'
  ) {
    return false
  }
  return /\/p\/[^/]+/.test(url.pathname)
}

export const isPinterestURL = (url: URL): boolean => {
  if (
    url.hostname !== 'pinterest.com' &&
    url.hostname !== 'www.pinterest.com' &&
    url.hostname !== 'pinterest.jp' &&
    url.hostname !== 'www.pinterest.jp'
  ) {
    return false
  }
  return /\/pin\/[\d]+/.test(url.pathname)
}

export const isCodePenURL = (url: URL): boolean => {
  if (url.hostname !== 'codepen.io' && url.hostname !== 'www.codepen.io') {
    return false
  }
  return /\/[^/]+\/pen\/[^/]+/.test(url.pathname)
}

export const isGitHubURL = (url: URL): boolean => {
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
    return false
  }
  return /\/[^/]+\/[^/]+\/blob\/[^/]+\/.+/.test(url.pathname)
}

export const isCircuitSimulatorAppletURL = (url: URL): boolean => {
  if (url.hostname !== 'falstad.com' && url.hostname !== 'www.falstad.com') {
    return false
  }

  return url.pathname === '/circuit/circuitjs.html'
}

export const isShortAmazonURL = (url: URL): boolean => {
  if (url.hostname === 'amzn.to' || url.hostname === 'www.amzn.to') {
    return true
  }
  return false
}

export const isFullAmazonURL = (url: URL): boolean => {
  if (
    url.hostname === 'amazon.com' ||
    url.hostname === 'www.amazon.com' ||
    url.hostname === 'amazon.co.jp' ||
    url.hostname === 'www.amazon.co.jp'
  ) {
    return true
  }
  return false
}

export const isAmazonURL = (url: URL): boolean => {
  return isShortAmazonURL(url) || isFullAmazonURL(url)
}

export const isYouTubeURL = (url: URL): boolean => {
  if (['www.youtube.com', 'youtube.com', 'youtu.be'].includes(url.hostname)) {
    return true
  }
  return false
}

// Supported URL
//
// - https://youtu.be/0zM3nApSvMg
// - https://www.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index
// - https://www.youtube.com/watch?v=0zM3nApSvMg#t=0m10s
// - https://www.youtube.com/watch?v=0zM3nApSvMg
// - https://www.youtube.com/v/0zM3nApSvMg?fs=1&amp;hl=en_US&amp;rel=0
// - https://www.youtube.com/embed/0zM3nApSvMg?rel=0
// - https://youtube.com/live/uOLwqWlpKbA
export const parseYouTubeVideoId = (url: URL): string => {
  if (!isYouTubeURL(url)) return ''

  if (url.hostname === 'youtu.be') {
    return url.pathname.split('/')[1]
  } else if (url.pathname === '/watch') {
    return url.searchParams.get('v') || ''
  } else {
    const elements = url.pathname.split('/')

    if (elements.length < 2) return ''

    if (
      elements[1] === 'v' ||
      elements[1] === 'embed' ||
      elements[1] === 'live'
    ) {
      return elements[2]
    }
  }

  return ''
}
