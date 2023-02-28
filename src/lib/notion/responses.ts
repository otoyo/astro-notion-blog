// Query a database response
// https://developers.notion.com/reference/post-database-query
export type QueryDatabaseResponse = {
  object: string
  results: PageObject[]
  next_cursor: null | string
  has_more: boolean
  type: string
  page?: Record<string, never>
}

// Retrieve a database response
// https://developers.notion.com/reference/retrieve-a-database
export type RetrieveDatabaseResponse = DatabaseObject

// Retrieve a block response
// https://developers.notion.com/reference/retrieve-a-block
export type RetrieveBlockResponse = BlockObject

// Retrieve block children response
// https://developers.notion.com/reference/get-block-children
export type RetrieveBlockChildrenResponse = {
  object: string
  results: BlockObject[]
  next_cursor: null | string
  has_more: boolean
  type: string
  block?: Record<string, never>
}

// common types
type UserObject = {
  object: string
  id: string
}

type FileObject = {
  type: string
  name?: string
  external?: External
  file?: File
}

type File = {
  url: string
  expiry_time: string
}

type External = {
  url: string
}

export type Emoji = {
  type: string
  emoji: string
}

type Parent = {
  type: string
  database_id?: string
  page_id?: string
}

export type RichTextObject = {
  type: string
  plain_text: string
  annotations: Annotations
  href?: string

  text?: Text
  mention?: Mention
  equation?: Equation
}

type Annotations = {
  bold: boolean
  italic: boolean
  strikethrough: boolean
  underline: boolean
  code: boolean
  color: string
}

type Text = {
  content: string
  link?: Link
}

type Link = {
  type: string
  url: string
}

type Mention = {
  type: string

  user?: UserObject
  page?: Reference
  database?: Reference
  date?: DateProperty
  link_preview?: LinkPreview
}

type Reference = {
  id: string
}

type DateProperty = {
  start: string
  end?: null | string
  timezone?: null | string
}

type LinkPreview = {
  url: string
}

type Equation = {
  expression: string
}

// Database object
// https://developers.notion.com/reference/database
type DatabaseObject = {
  object: string
  id: string
  created_time: string
  created_by: UserObject
  last_edited_time: string
  last_edited_by: UserObject
  title: RichTextObject[]
  description: RichTextObject[]
  icon: FileObject | Emoji | null
  cover: FileObject
  properties: DatabaseProperties
  parent: Parent
  url: string
  archived: boolean
  is_inline: boolean
}

type DatabaseProperties = {
  [key: string]: DatabaseProperty
}

type DatabaseProperty = {
  id: string
  type: string

  title?: Record<string, never>
  rich_text?: Record<string, never>
  number?: NumberConfiguration
  select?: SelectConfiguration
  status?: StatusConfiguration
  multi_select?: SelectConfiguration
  date?: Record<string, never>
  people?: Record<string, never>
  files?: Record<string, never>
  checkbox?: Record<string, never>
  url?: Record<string, never>
  email?: Record<string, never>
  phone_number?: Record<string, never>
  formula?: FormulaConfiguration
  relation?: RelationConfiguration
  rollup?: RollupConfiguration
  created_time?: Record<string, never>
  created_by?: Record<string, never>
  last_edited_time?: Record<string, never>
  last_edited_by?: Record<string, never>
}

type NumberConfiguration = {
  format: string
}

type SelectConfiguration = {
  options: SelectOptionObject[]
}

type SelectOptionObject = {
  name: string
  id: string
  color: string
}

type StatusConfiguration = {
  options: StatusOptionObject[]
  groups: StatusGroupObject[]
}

type StatusOptionObject = {
  name: string
  id: string
  color: string
}

type StatusGroupObject = {
  name: string
  id: string
  color: string
  option_ids: string[]
}

type FormulaConfiguration = {
  expression: string
}

type RelationConfiguration = {
  database_id: string
  type: string

  single_property?: Record<string, never>
  dual_property?: DualPropertyRelationConfiguration
}

type DualPropertyRelationConfiguration = {
  synced_property_name: string
  synced_property_id: string
}

type RollupConfiguration = {
  relation_property_name: string
  relation_property_id: string
  rollup_property_name: string
  rollup_property_id: string
  function: string
}

// Page object
// https://developers.notion.com/reference/page
export type PageObject = {
  object: string
  id: string
  created_time: string
  created_by: UserObject
  last_edited_time: string
  last_edited_by: UserObject
  archived: boolean
  icon: FileObject | Emoji | null
  cover: FileObject
  properties: PageProperties
  parent: Parent
  url: string
}

type PageProperties = {
  [key: string]: PageProperty
}

type PageProperty = {
  id: string
  type: string

  title?: RichTextObject[]
  rich_text?: RichTextObject[]
  number?: number
  select?: SelectProperty
  status?: StatusProperty
  multi_select?: SelectProperty[]
  date?: DateProperty
  formula?: FormulaProperty
  relation?: RelationProperty[]
  rollup?: RollupProperty
  people?: UserObject[]
  files?: FileObject[]
  checkbox?: boolean
  url?: string
  email?: string
  phone_number?: string
  created_time?: string
  created_by?: UserObject
  last_edited_time?: string
  last_edited_by?: UserObject
}

type SelectProperty = {
  id: string
  name: string
  color: string
}

type StatusProperty = {
  id: string
  name: string
  color: string
}

type FormulaProperty = {
  type: string

  number?: number
  string?: string
  boolean?: boolean
  date?: DateProperty
}

type RelationProperty = {
  id: string
}

type RollupProperty = {
  type: string
  function: string

  number?: number
  string?: string
  date?: DateProperty
  results?: string[]
}

// Block object
// https://developers.notion.com/reference/block
export type BlockObject = {
  object: string
  id: string
  created_time: string
  created_by: UserObject
  last_edited_by: UserObject
  has_children: boolean
  archived: boolean
  type: string

  paragraph?: Paragraph
  heading_1?: Heading
  heading_2?: Heading
  heading_3?: Heading
  callout?: Callout
  quote?: Quote
  bulleted_list_item?: ListItem
  numbered_list_item?: ListItem
  to_do?: ToDo
  toggle?: Toggle
  code?: Code
  child_page?: ChildPage
  child_database?: ChildDatabase
  embed?: Embed
  image?: FileBlock
  video?: FileBlock
  file?: FileBlock
  pdf?: FileBlock
  bookmark?: Bookmark
  equation?: Equation
  divider?: Record<string, never>
  table_of_contents?: TableOfContents
  breadcrumb?: Record<string, never>
  column_list?: Record<string, never>
  column?: Record<string, never>
  link_preview?: LinkPreview
  template?: Template
  link_to_page?: LinkToPage
  synced_block?: SyncedBlock
  table?: Table
  table_row?: TableRow
}

type Paragraph = {
  rich_text: RichTextObject[]
  color: string
  children?: BlockObject[]
}

type Heading = {
  rich_text: RichTextObject[]
  color: string
  is_toggleable: boolean
}

type Callout = {
  rich_text: RichTextObject[]
  icon: Emoji
  color: string
  children?: BlockObject[]
}

type Quote = {
  rich_text: RichTextObject[]
  color: string
  children?: BlockObject[]
}

type ListItem = {
  rich_text: RichTextObject[]
  color: string
  children?: BlockObject[]
}

type ToDo = {
  rich_text: RichTextObject[]
  checked: boolean
  color: string
  children?: BlockObject[]
}

type Toggle = {
  rich_text: RichTextObject[]
  color: string
  children?: BlockObject[]
}

type Code = {
  rich_text: RichTextObject[]
  caption?: RichTextObject[]
  language: string
}

type ChildPage = {
  title: string
}

type ChildDatabase = {
  title: string
}

type Embed = {
  url: string
}

type FileBlock = {
  caption?: RichTextObject[]
  type: string
  name?: string
  external?: External
  file?: File
}

type Bookmark = {
  url: string
  caption?: RichTextObject[]
}

type TableOfContents = {
  color: string
}

type Template = {
  rich_text: RichTextObject[]
  children?: BlockObject[]
}

type LinkToPage = {
  type: string
  page_id?: string
  database_id?: string
}

type SyncedBlock = {
  synced_from: null | SyncedFrom
  children?: BlockObject[]
}

type SyncedFrom = {
  type: string
  block_id: string
}

type Table = {
  table_width: number
  has_column_header: boolean
  has_row_header: boolean
  children?: BlockObject[]
}

type TableRow = {
  cells: RichTextObject[][]
}
