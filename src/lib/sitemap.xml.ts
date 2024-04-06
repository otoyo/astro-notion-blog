import { generateSitemap } from '../lib/generate-sitemap'
import { getAllPosts } from '../lib/notion/client'
import { getPostLink } from '../lib/blog-helpers'

export async function GET() {
  const [posts] = await Promise.all([getAllPosts()])

  const sitemapItems = posts.map((post) => {
    const updateDate = post.UpdateDate ? new Date(post.UpdateDate) : null
    const lastmod = updateDate || new Date(post.Date)

    return {
      loc: new URL(getPostLink(post.Slug), import.meta.env.SITE).toString(),
      lastmod,
    }
  })

  const sitemap = generateSitemap(sitemapItems)

  const res = new Response(sitemap)
  res.headers.set('Content-Type', 'text/xml')

  return res
}
