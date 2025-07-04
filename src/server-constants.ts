export const NOTION_API_SECRET =
  import.meta.env.NOTION_API_SECRET || process.env.NOTION_API_SECRET || ''
export const DATABASE_ID =
  import.meta.env.DATABASE_ID || process.env.DATABASE_ID || ''

export const CUSTOM_DOMAIN =
  import.meta.env.CUSTOM_DOMAIN || process.env.CUSTOM_DOMAIN || '' // <- Set your costom domain if you have. e.g. alpacat.com
export const BASE_PATH =
  import.meta.env.BASE_PATH || process.env.BASE_PATH || '' // <- Set sub directory path if you want. e.g. /docs/

export const PUBLIC_GA_TRACKING_ID = import.meta.env.PUBLIC_GA_TRACKING_ID
export const NUMBER_OF_POSTS_PER_PAGE = 10
export const REQUEST_TIMEOUT_MS = parseInt(
  import.meta.env.REQUEST_TIMEOUT_MS || '10000',
  10
)
export const ENABLE_LIGHTBOX = import.meta.env.ENABLE_LIGHTBOX

// コメント機能の設定
export const ENABLE_COMMENTS = import.meta.env.PUBLIC_ENABLE_COMMENTS === 'true'
export const GISCUS_REPO = import.meta.env.PUBLIC_GISCUS_REPO || ''
export const GISCUS_REPO_ID = import.meta.env.PUBLIC_GISCUS_REPO_ID || ''
export const GISCUS_CATEGORY =
  import.meta.env.PUBLIC_GISCUS_CATEGORY || 'Announcements'
export const GISCUS_CATEGORY_ID =
  import.meta.env.PUBLIC_GISCUS_CATEGORY_ID || ''
