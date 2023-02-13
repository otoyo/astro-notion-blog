import type { AstroIntegration } from 'astro'
import { getAllPosts } from '../lib/notion/client'
import { uploadImageWithKey } from '../lib/cloudinary/client'

export default (): AstroIntegration => ({
  name: 'og-image-uploader',
  hooks: {
    'astro:build:start': async () => {
      const posts = await getAllPosts()

      await Promise.all(
        posts.map((post) => {
          if (post.FeaturedImage) {
            return uploadImageWithKey(post.FeaturedImage, post.PageId)
          }
          return Promise.resolve()
        })
      )
    },
  },
})
