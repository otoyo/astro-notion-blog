import type { AstroIntegration } from 'astro'
import { getDatabase, downloadFile } from '../lib/notion/client'

export default (): AstroIntegration => ({
  name: 'cover-image-downloader',
  hooks: {
    'astro:build:start': async () => {
      const database = await getDatabase()

      if (!database.Cover || database.Cover.Type !== 'file') {
        return Promise.resolve()
      }

      let url!: URL
      try {
        url = new URL(database.Cover.Url)
      } catch {
        console.log('Invalid Cover image URL: ', database.Cover?.Url)
        return Promise.resolve()
      }

      return downloadFile(url)
    },
  },
})
