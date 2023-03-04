import type { AstroIntegration } from 'astro'
import { getDatabase } from '../lib/notion/client'

export default (): AstroIntegration => ({
  name: 'blog-metadata-setter',
  hooks: {
    'astro:config:setup': async () => {
      const database = await getDatabase()

      process.env.SITE_TITLE = database.Title
      process.env.SITE_DESCRIPTION = database.Description
    },
  },
})
