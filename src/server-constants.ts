export const NOTION_API_SECRET = import.meta.env.NOTION_API_SECRET
export const DATABASE_ID = import.meta.env.DATABASE_ID
export const PUBLIC_GA_TRACKING_ID = import.meta.env.PUBLIC_GA_TRACKING_ID
export const NUMBER_OF_POSTS_PER_PAGE = 10
export const REQUEST_TIMEOUT_MS = parseInt(import.meta.env.REQUEST_TIMEOUT_MS || '10000', 10)

export const PUBLIC_SITE_TITLE = 'astro-notion-blog'
export const PUBLIC_SITE_DESCRIPTION = 'astro-notion-blog is generated statically by Astro'
