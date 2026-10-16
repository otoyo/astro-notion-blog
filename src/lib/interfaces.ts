export interface Database {
  Title: string
  Description: string
  Icon: FileObject | Emoji | Unsupported | null
  Cover: FileObject | Unsupported | null
}

export interface Post {
  PageId: string
  Title: string
  Icon: FileObject | Emoji | Unsupported | null
  Cover: FileObject | Unsupported | null
  Slug: string
  Date: string
  Tags: SelectProperty[]
  Excerpt: string
  FeaturedImage: FileObject | null
  Rank: number
}

export interface Block {
  Id: string
  Type: string
  HasChildren: boolean

  Paragraph?: Paragraph
  Heading1?: Heading1
  Heading2?: Heading2
  Heading3?: Heading3
  Heading4?: Heading4
  BulletedListItem?: BulletedListItem
  NumberedListItem?: NumberedListItem
  ToDo?: ToDo
  Image?: Image
  File?: File
  Code?: Code
  Quote?: Quote
  Equation?: Equation
  Callout?: Callout
  SyncedBlock?: SyncedBlock
  Toggle?: Toggle
  Embed?: Embed
  Video?: Video
  Bookmark?: Bookmark
  LinkPreview?: LinkPreview
  Table?: Table
  ColumnList?: ColumnList
  TableOfContents?: TableOfContents
  LinkToPage?: LinkToPage
}

export interface Paragraph {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export interface Heading1 {
  RichTexts: RichText[]
  Color: string
  IsToggleable: boolean
  Children?: Block[]
  AnchorId?: string
}

export interface Heading2 {
  RichTexts: RichText[]
  Color: string
  IsToggleable: boolean
  Children?: Block[]
  AnchorId?: string
}

export interface Heading3 {
  RichTexts: RichText[]
  Color: string
  IsToggleable: boolean
  Children?: Block[]
  AnchorId?: string
}

export interface Heading4 {
  RichTexts: RichText[]
  Color: string
  IsToggleable: boolean
  Children?: Block[]
  AnchorId?: string
}

export interface BulletedListItem {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export interface NumberedListItem {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export interface ToDo {
  RichTexts: RichText[]
  Checked: boolean
  Color: string
  Children?: Block[]
}

export interface Image {
  Caption: RichText[]
  Type: string
  File?: FileObject
  External?: External
  Width?: number
  Height?: number
}

/**
 * File? があるのは、Notion にアップロードした動画（type: 'file'）を
 * 扱うため。Image と同じく、file タイプの URL は署名付きで失効するので
 * ビルド時にローカルへ落とす必要があり、そのために URL を保持する
 */
export interface Video {
  Caption: RichText[]
  Type: string
  File?: FileObject
  External?: External
}

export interface File {
  Caption: RichText[]
  Type: string
  File?: FileObject
  External?: External
}

/**
 * Type をリテラル型にしているのは、FileObject | Emoji | Unsupported を
 * 判別可能 union として機能させるため。
 *
 * Type: string のままだと `icon.Type === 'emoji'` と書いても TypeScript は
 * どのメンバーかを絞り込めず、`.Url` / `.Emoji` を読むだけで型エラーになる
 * （判別子はリテラル型でなければならない）。Unsupported.Type: 'unsupported'
 * と揃えて、union の全メンバーが判別子を持つ状態にしている。
 */
export interface FileObject {
  Type: 'file' | 'external'
  Url: string
  ExpiryTime?: string
}

/**
 * Notion が SDK 未対応の新しい種別を返したことを表すセンチネル。
 *
 * 「未設定」も「未対応」も null にしてしまうと、サイトからアイコンが
 * 消えたときに、Notion 側で種別が増えたせいなのか元から設定が無いのかを
 * 呼び出し側で区別できない。値として返すことで型レベルで区別できるようにする。
 * RawType には Notion が返した生の type を入れ、原因を辿れるようにしておく。
 */
export interface Unsupported {
  Type: 'unsupported'
  RawType: string
}

export interface External {
  Url: string
}

export interface Code {
  Caption: RichText[]
  RichTexts: RichText[]
  Language: string
}

export interface Quote {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export interface Equation {
  Expression: string
}

export interface Callout {
  RichTexts: RichText[]
  Icon: FileObject | Emoji | Unsupported | null
  Color: string
  Children?: Block[]
}

export interface SyncedBlock {
  SyncedFrom: SyncedFrom | null
  Children?: Block[]
}

export interface SyncedFrom {
  BlockId: string
}

export interface Toggle {
  RichTexts: RichText[]
  Color: string
  Children: Block[]
}

export interface Embed {
  Url: string
}

export interface Bookmark {
  Caption: RichText[]
  Url: string
}

export interface LinkPreview {
  Url: string
}

export interface Table {
  TableWidth: number
  HasColumnHeader: boolean
  HasRowHeader: boolean
  Rows: TableRow[]
}

export interface TableRow {
  Id: string
  Type: string
  HasChildren: boolean
  Cells: TableCell[]
}

export interface TableCell {
  RichTexts: RichText[]
}

export interface ColumnList {
  Columns: Column[]
}

export interface Column {
  Id: string
  Type: string
  HasChildren: boolean
  Children: Block[]
}

export interface List {
  Type: string
  ListItems: Block[]
}

export interface TableOfContents {
  Color: string
}

export interface RichText {
  Text?: Text
  Annotation: Annotation
  PlainText: string
  // SDK / API は値が無いとき null を返す（undefined ではない）
  Href?: string | null
  Equation?: Equation
  Mention?: Mention
}

export interface Text {
  Content: string
  Link?: Link
}

// FileObject と同じ理由で、判別子として使えるようリテラル型にしている
export interface Emoji {
  Type: 'emoji'
  Emoji: string
}

export interface Annotation {
  Bold: boolean
  Italic: boolean
  Strikethrough: boolean
  Underline: boolean
  Code: boolean
  Color: string
}

export interface Link {
  Url: string
}

export interface SelectProperty {
  id: string
  name: string
  color: string
}

export interface LinkToPage {
  Type: string
  PageId: string
}

export interface Mention {
  Type: string
  Page?: Reference
}

export interface Reference {
  Id: string
}
