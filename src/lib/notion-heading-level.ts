import type { Block } from './interfaces'

/**
 * Notion の見出しブロックを HTML の見出しタグに割り当てる。
 *
 * 記事タイトルが h1 になった（Issue #98）ので、本文の見出しは h2 から
 * 始めなければならない。変更前は heading_1 → h3、heading_2 → h4、
 * heading_3 → h5 の固定割り当てで、サイト名の h1 → 記事タイトルの h2 →
 * 本文の h3 と続いていたため辻褄が合っていた。
 *
 * ここで «固定で 1 段ずつ上げる»（heading_1→h2 / heading_2→h3 /
 * heading_3→h4）だけにできないのは、Notion 側が heading_1 を使わずに
 * 書いている記事があるため。実測で Notion 記事 23 本のうち
 * /posts/privacy だけが heading_2 から始まっており（本文の見出しは
 * heading_2 が 8 個、heading_1 と heading_3 は 0 個）、固定割り当てだと
 * h1（記事タイトル）の次がいきなり h3 になって段が飛ぶ。
 * 変更前も h2（記事タイトル）→ h4 で同じように飛んでいた。
 *
 * そこで «その記事で実際に使われている見出しの種類» を数えて、
 * 浅い方から h2, h3, h4, h5 と詰めて割り当てる。
 * ・heading_1 / 2 / 3 / 4 を使う記事 → h2 / h3 / h4 / h5
 * ・heading_1 / 2 / 3 を使う記事 → h2 / h3 / h4
 * ・heading_2 / 3 だけの記事     → h2 / h3
 * ・heading_2 だけの記事         → h2
 * どの記事でも «最初の本文見出しが必ず h2» になり、間が空かない。
 *
 * 見た目は変わらない。Heading1/2/3/4.astro はそれぞれ自分の font-size と
 * margin を class で持っており、タグ名に依存する宣言
 * （layout-global.css の h2/h3 と Layout.astro の h2）は各コンポーネント側で
 * 打ち消してあるため。
 */

// 浅い順。Notion の見出しは 4 段まで（heading_4 は upstream の Heading4 対応で追加）
const NOTION_HEADING_TYPES = [
  'heading_1',
  'heading_2',
  'heading_3',
  'heading_4',
] as const

export type NotionHeadingType = (typeof NOTION_HEADING_TYPES)[number]

/**
 * @param type  そのブロック自身の見出し種別
 * @param headings 記事の見出しブロック一覧。NotionBlocks.astro が記事の
 *   ルートで集めて各見出しコンポーネントに渡しているものをそのまま使う
 *   （目次 TableOfContents.astro と同じ配列）
 */
export function notionHeadingTag(
  type: NotionHeadingType,
  headings: Block[]
): 'h2' | 'h3' | 'h4' | 'h5' {
  const present = new Set(headings.map((heading) => heading.Type))
  // 自分自身は必ず数える。headings は extractHeadings でトグルやカラムの
  // 中まで集めているが、記事のルート以外から描画された場合などに
  // «自分が一覧に無い» と段が決まらないので念のため入れておく
  present.add(type)

  const used = NOTION_HEADING_TYPES.filter((candidate) =>
    present.has(candidate)
  )
  const rank = used.indexOf(type)

  return `h${2 + rank}` as 'h2' | 'h3' | 'h4' | 'h5'
}
