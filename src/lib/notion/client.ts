import fs from 'node:fs'
import {
  NOTION_API_SECRET,
  DATABASE_ID,
  NUMBER_OF_POSTS_PER_PAGE,
} from '../../server-constants'
import type * as responses from './responses'
import type * as requestParams from './request-params'
import type {
  Post,
  Block,
  Paragraph,
  Heading1,
  Heading2,
  Heading3,
  BulletedListItem,
  NumberedListItem,
  ToDo,
  Image,
  Code,
  Quote,
  Equation,
  Callout,
  Embed,
  Video,
  Bookmark,
  LinkPreview,
  SyncedBlock,
  SyncedFrom,
  Table,
  TableRow,
  TableCell,
  Toggle,
  ColumnList,
  Column,
  TableOfContents,
  RichText,
  Text,
  Annotation,
  SelectProperty,
} from '../interfaces'
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { Client } from '@notionhq/client'

const client = new Client({
  auth: NOTION_API_SECRET,
})

let cache: Post[] | null = null


export async function getAllPosts(): Promise<Post[]> {
  if (cache !== null) {
    return Promise.resolve(cache)
  }

  const params: requestParams.QueryDatabase = {
    database_id: DATABASE_ID,
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

  let results: responses.PageObject[] = []
  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await client.databases.query(params as any) as responses.QueryDatabaseResponse

    results = results.concat(res.results)

    if (!res.has_more) {
      break
    }

    params['start_cursor'] = res.next_cursor as string
  }

  cache = results
    .filter(pageObject => _validPageObject(pageObject))
    .map(pageObject => _buildPost(pageObject))
  return cache
}

export async function getPosts(pageSize = 10): Promise<Post[]> {
  const allPosts = await getAllPosts()
  return allPosts.slice(0, pageSize)
}

export async function getRankedPosts(pageSize = 10): Promise<Post[]> {
  const allPosts = await getAllPosts()
  return allPosts
    .filter(post => !!post.Rank)
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

export async function getPostBySlug(slug: string): Promise<Post|null> {
  const allPosts = await getAllPosts()
  return allPosts.find(post => post.Slug === slug) || null
}

export async function getPostsByTag(tagName: string, pageSize = 10): Promise<Post[]> {
  if (!tagName) return []

  const allPosts = await getAllPosts()
  return allPosts.filter(post => post.Tags.find((tag) => tag.name === tagName)).slice(0, pageSize)
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
export async function getPostsByTagAndPage(tagName: string, page: number): Promise<Post[]> {
  if (page < 1) {
    return []
  }

  const allPosts = await getAllPosts()
  const posts = allPosts.filter(post => post.Tags.find((tag) => tag.name === tagName))

  const startIndex = (page - 1) * NUMBER_OF_POSTS_PER_PAGE
  const endIndex = startIndex + NUMBER_OF_POSTS_PER_PAGE

  return posts.slice(startIndex, endIndex)
}

export async function getNumberOfPages(): Promise<number> {
  const allPosts = await getAllPosts()
  return Math.floor(allPosts.length / NUMBER_OF_POSTS_PER_PAGE) + (allPosts.length % NUMBER_OF_POSTS_PER_PAGE > 0 ? 1 : 0)
}

export async function getNumberOfPagesByTag(tagName: string): Promise<number> {
  const allPosts = await getAllPosts()
  const posts = allPosts.filter(post => post.Tags.find((tag) => tag.name === tagName))
  return Math.floor(posts.length / NUMBER_OF_POSTS_PER_PAGE) + (posts.length % NUMBER_OF_POSTS_PER_PAGE > 0 ? 1 : 0)
}

export async function getAllBlocksByBlockId(blockId: string): Promise<Block[]> {
  let results: responses.BlockObject[] = []

  if (fs.existsSync(`tmp/${blockId}.json`)) {
    results = JSON.parse(fs.readFileSync(`tmp/${blockId}.json`, 'utf-8'))
  } else {
    const params: requestParams.RetrieveBlockChildren = {
      block_id: blockId,
    }

    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await client.blocks.children.list(params as any) as responses.RetrieveBlockChildrenResponse

      results = results.concat(res.results)

      if (!res.has_more) {
        break
      }

      params['start_cursor'] = res.next_cursor as string
    }
  }

  const allBlocks = results.map(blockObject => _buildBlock(blockObject))

  for (let i = 0; i < allBlocks.length; i++) {
    const block = allBlocks[i]

    if (block.Type === 'table' && block.Table) {
      block.Table.Rows = await _getTableRows(block.Id)
    } else if (block.Type === 'column_list' && block.ColumnList) {
      block.ColumnList.Columns = await _getColumns(block.Id)
    } else if (block.Type === 'bulleted_list_item' && block.BulletedListItem && block.HasChildren) {
      block.BulletedListItem.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'numbered_list_item' && block.NumberedListItem && block.HasChildren) {
      block.NumberedListItem.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'to_do' && block.ToDo && block.HasChildren) {
      block.ToDo.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'synced_block' && block.SyncedBlock) {
      block.SyncedBlock.Children = await _getSyncedBlockChildren(block)
    } else if (block.Type === 'toggle' && block.Toggle) {
      block.Toggle.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'paragraph' && block.Paragraph && block.HasChildren) {
      block.Paragraph.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'heading_1' && block.Heading1 && block.HasChildren) {
      block.Heading1.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'heading_2' && block.Heading2 && block.HasChildren) {
      block.Heading2.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'heading_3' && block.Heading3 && block.HasChildren) {
      block.Heading3.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'quote' && block.Quote && block.HasChildren) {
      block.Quote.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'callout' && block.Callout && block.HasChildren) {
      block.Callout.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'image' && block.Image && block.Image.File && block.Image.File.ExpiryTime) {
      if (Date.parse(block.Image.File.ExpiryTime) < Date.now()) {
        block.Image = (await getBlock(block.Id)).Image
      }
    }
  }

  return allBlocks
}

export async function getBlock(blockId: string): Promise<Block> {
  const params: requestParams.RetrieveBlock = {
    block_id: blockId,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await client.blocks.retrieve(params as any) as responses.RetrieveBlockResponse

  return _buildBlock(res)
}

export async function getAllTags(): Promise<SelectProperty[]> {
  const allPosts = await getAllPosts()

  const tagNames: string[] = []
  return allPosts.flatMap(post => post.Tags).reduce((acc, tag) => {
    if (!tagNames.includes(tag.name)) {
      acc.push(tag)
      tagNames.push(tag.name)
    }
    return acc
  }, [] as SelectProperty[]).sort((a: SelectProperty, b: SelectProperty) => a.name.localeCompare(b.name))
}

function _buildBlock(blockObject: responses.BlockObject): Block {
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
    case 'bulleted_list_item':
      if (blockObject.bulleted_list_item) {
        const bulletedListItem: BulletedListItem = {
          RichTexts: blockObject.bulleted_list_item.rich_text.map(_buildRichText),
          Color: blockObject.bulleted_list_item.color,
        }
        block.BulletedListItem = bulletedListItem
      }
      break
    case 'numbered_list_item':
      if (blockObject.numbered_list_item) {
        const numberedListItem: NumberedListItem = {
          RichTexts: blockObject.numbered_list_item.rich_text.map(_buildRichText),
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
        if (blockObject.video.type === 'external' && blockObject.video.external) {
          video.External = { Url: blockObject.video.external.url }
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
        if (blockObject.image.type === 'external' && blockObject.image.external) {
          image.External = { Url: blockObject.image.external.url }
        } else if (blockObject.image.type === 'file' && blockObject.image.file) {
          image.File = { Url: blockObject.image.file.url, ExpiryTime: blockObject.image.file.expiry_time }
        }
        block.Image = image
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
        const callout: Callout = {
          RichTexts: blockObject.callout.rich_text.map(_buildRichText),
          Icon: {
            Emoji: blockObject.callout.icon.emoji,
          },
          Color: blockObject.callout.color,
        }
        block.Callout = callout
      }
      break
    case 'synced_block':
      if (blockObject.synced_block) {
        let syncedFrom: SyncedFrom | null = null
        if (blockObject.synced_block.synced_from && blockObject.synced_block.synced_from.block_id) {
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
    case 'column_list':
      const columnList: ColumnList = {
        Columns: [],
      }
      block.ColumnList = columnList
      break
    case 'table_of_contents':
      if (blockObject.table_of_contents) {
        const tableOfContents: TableOfContents = {
          Color: blockObject.table_of_contents.color,
        }
        block.TableOfContents = tableOfContents
      }
      break
  }

  return block
}

async function _getTableRows(blockId: string): Promise<TableRow[]> {
  let results: responses.BlockObject[] = []

  if (fs.existsSync(`tmp/${blockId}.json`)) {
    results = JSON.parse(fs.readFileSync(`tmp/${blockId}.json`, 'utf-8'))
  } else {
    const params: requestParams.RetrieveBlockChildren = {
      block_id: blockId,
    }

    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await client.blocks.children.list(params as any) as responses.RetrieveBlockChildrenResponse

      results = results.concat(res.results)

      if (!res.has_more) {
        break
      }

      params['start_cursor'] = res.next_cursor as string
    }
  }

  return results.map(blockObject => {
    const tableRow: TableRow = {
      Id: blockObject.id,
      Type: blockObject.type,
      HasChildren: blockObject.has_children,
      Cells: []
    }

    if (blockObject.type === 'table_row' && blockObject.table_row) {
      const cells: TableCell[] = blockObject.table_row.cells.map(cell => {
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
  let results: responses.BlockObject[] = []

  if (fs.existsSync(`tmp/${blockId}.json`)) {
    results = JSON.parse(fs.readFileSync(`tmp/${blockId}.json`, 'utf-8'))
  } else {
    const params: requestParams.RetrieveBlockChildren = {
      block_id: blockId,
    }

    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await client.blocks.children.list(params as any) as responses.RetrieveBlockChildrenResponse

      results = results.concat(res.results)

      if (!res.has_more) {
        break
      }

      params['start_cursor'] = res.next_cursor as string
    }
  }

  return await Promise.all(results.map(async blockObject => {
    const children = await getAllBlocksByBlockId(blockObject.id)

    const column: Column = {
      Id: blockObject.id,
      Type: blockObject.type,
      HasChildren: blockObject.has_children,
      Children: children,
    }

    return column
  }))
}

async function _getSyncedBlockChildren(block: Block): Promise<Block[]> {
  let originalBlock: Block = block
  if (block.SyncedBlock && block.SyncedBlock.SyncedFrom && block.SyncedBlock.SyncedFrom.BlockId) {
    try {
      originalBlock = await getBlock(block.SyncedBlock.SyncedFrom.BlockId)
    } catch (err) {
      console.log(`Could not retrieve the original synced_block. error: ${err}`)
      return []
    }
  }

  const children = await getAllBlocksByBlockId(originalBlock.Id)
  return children
}

function _validPageObject(pageObject: responses.PageObject): boolean {
  const prop = pageObject.properties
  return (
    !!prop.Page.title && prop.Page.title.length > 0 &&
    !!prop.Slug.rich_text && prop.Slug.rich_text.length > 0 &&
    !!prop.Date.date
  )
}

function _buildPost(pageObject: responses.PageObject): Post {
  const prop = pageObject.properties

  const post: Post = {
    PageId: pageObject.id,
    Title: prop.Page.title ? prop.Page.title[0].plain_text : '',
    Slug: prop.Slug.rich_text ? prop.Slug.rich_text[0].plain_text : '',
    Date: prop.Date.date ? prop.Date.date.start : '',
    Tags: prop.Tags.multi_select ? prop.Tags.multi_select : [],
    Excerpt:
      prop.Excerpt.rich_text && prop.Excerpt.rich_text.length > 0
        ? prop.Excerpt.rich_text.map(t => t.plain_text).join('')
        : '',
    FeaturedImage:
      prop.FeaturedImage.files && prop.FeaturedImage.files.length > 0 && prop.FeaturedImage.files[0].file
        ? prop.FeaturedImage.files[0].file.url
        : null,
    Rank: prop.Rank.number ? prop.Rank.number : 0,
  }

  return post
}

function _buildRichText(richTextObject: responses.RichTextObject): RichText {
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
  }

  return richText
}
