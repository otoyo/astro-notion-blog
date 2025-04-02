import type { AstroIntegration } from 'astro'
import { getAllPosts, downloadFile } from '../lib/notion/client'
export default (): AstroIntegration => ({
  name: 'cover-image-downloader',
  hooks: {
    'astro:build:start': async () => {
      const posts = await getAllPosts()

      await Promise.all(
        posts.map((post) => {
          if (!post.Cover || !post.Cover.Url) {
            console.log('No Cover image URL: ', post.Cover?.Url)
            return Promise.resolve()
          }

          let url!: URL
          try {
            url = new URL(post.Cover.Url)
            console.log('set Cover URL: ', post.Cover?.Url)
          } catch {
            console.log('Invalid Cover URL: ', post.Cover?.Url)
            return Promise.resolve()
          }

          return downloadFile(url)
        })
      )
    }
  }
})
