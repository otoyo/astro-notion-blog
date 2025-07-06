import type { APIRoute } from 'astro'
import { getAllPosts, getAllTags } from '../lib/notion/client'
import { getPostLink } from '../lib/blog-helpers'

export const GET: APIRoute = async ({ site }) => {
  const posts = await getAllPosts()
  const tags = await getAllTags()
  
  const baseUrl = site?.toString() || 'https://midnight480.com'
  
  // Remove trailing slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${cleanBaseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Privacy Policy -->
  <url>
    <loc>${cleanBaseUrl}/privacy-policy</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <!-- Posts -->
  ${posts
    .map((post) => {
      const postUrl = `${cleanBaseUrl}${getPostLink(post.Slug)}`
      const lastmod = post.LastEditedTime || post.Date
      return `  <url>
    <loc>${postUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    })
    .join('\n')}
  
  <!-- Tag pages -->
  ${tags
    .map((tag) => {
      const tagUrl = `${cleanBaseUrl}/posts/tag/${encodeURIComponent(tag.name)}`
      return `  <url>
    <loc>${tagUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    })
    .join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
