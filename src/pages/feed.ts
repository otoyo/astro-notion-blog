import rss from '@astrojs/rss'
import { PUBLIC_SITE_TITLE, PUBLIC_SITE_DESCRIPTION } from '../server-constants'
import { getAllPosts } from '../lib/notion/client'
import { getPostLink } from '../lib/blog-helpers'

export async function get() {
  const posts = await getAllPosts()

  return rss({
    title: PUBLIC_SITE_TITLE,
    description: PUBLIC_SITE_DESCRIPTION,
    site: import.meta.env.SITE,
    items: posts.map((post) => ({
      link: new URL(getPostLink(post.Slug), import.meta.env.SITE).toString(),
      title: post.Title,
      description: post.Excerpt,
      pubDate: new Date(post.Date),
    })),
  })
}
