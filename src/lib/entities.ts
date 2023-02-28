export type Post = {
  PageId: string
  Title: string
  Icon: Emoji
  Cover: FileObject | null
  Slug: string
  Date: string
  Tags: SelectProperty[]
  Excerpt: string
  FeaturedImage: FileObject | null
  Rank: number
}

export type Block = {
  Id: string
  Type: string
  HasChildren: boolean

  Paragraph?: Paragraph
  Heading1?: Heading1
  Heading2?: Heading2
  Heading3?: Heading3
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

export type Paragraph = {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export type Heading1 = {
  RichTexts: RichText[]
  Color: string
  IsToggleable: boolean
  Children?: Block[]
}

export type Heading2 = {
  RichTexts: RichText[]
  Color: string
  IsToggleable: boolean
  Children?: Block[]
}

export type Heading3 = {
  RichTexts: RichText[]
  Color: string
  IsToggleable: boolean
  Children?: Block[]
}

export type BulletedListItem = {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export type NumberedListItem = {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export type ToDo = {
  RichTexts: RichText[]
  Checked: boolean
  Color: string
  Children?: Block[]
}

export type Image = {
  Caption: RichText[]
  Type: string
  File?: FileObject
  External?: External
  Width?: number
  Height?: number
}

export type Video = {
  Caption: RichText[]
  Type: string
  External?: External
}

export type File = {
  Caption: RichText[]
  Type: string
  File?: FileObject
  External?: External
}

export type FileObject = {
  Url: string
  ExpiryTime?: string
}

export type External = {
  Url: string
}

export type Code = {
  Caption: RichText[]
  RichTexts: RichText[]
  Language: string
}

export type Quote = {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export type Equation = {
  Expression: string
}

export type Callout = {
  RichTexts: RichText[]
  Icon: Emoji
  Color: string
  Children?: Block[]
}

export type SyncedBlock = {
  SyncedFrom: SyncedFrom | null
  Children?: Block[]
}

export type SyncedFrom = {
  BlockId: string
}

export type Toggle = {
  RichTexts: RichText[]
  Color: string
  Children: Block[]
}

export type Embed = {
  Url: string
}

export type Bookmark = {
  Url: string
}

export type LinkPreview = {
  Url: string
}

export type Table = {
  TableWidth: number
  HasColumnHeader: boolean
  HasRowHeader: boolean
  Rows: TableRow[]
}

export type TableRow = {
  Id: string
  Type: string
  HasChildren: boolean
  Cells: TableCell[]
}

export type TableCell = {
  RichTexts: RichText[]
}

export type ColumnList = {
  Columns: Column[]
}

export type Column = {
  Id: string
  Type: string
  HasChildren: boolean
  Children: Block[]
}

export type List = {
  Type: string
  ListItems: Block[]
}

export type TableOfContents = {
  Color: string
}

export type RichText = {
  Text?: Text
  Annotation: Annotation
  PlainText: string
  Href?: string
  Equation?: Equation
}

export type Text = {
  Content: string
  Link?: Link
}

export type Emoji = {
  Emoji: string
}

export type Annotation = {
  Bold: boolean
  Italic: boolean
  Strikethrough: boolean
  Underline: boolean
  Code: boolean
  Color: string
}

export type Link = {
  Url: string
}

export type SelectProperty = {
  id: string
  name: string
  color: string
}

export type LinkToPage = {
  Type: string
  PageId: string
}
