import fs from 'node:fs'
import { execSync } from 'child_process'
import type { AstroIntegration } from 'astro'

export default (): AstroIntegration => ({
  name: 'public-notion-copier',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const outDir = new URL('notion', dir.href).pathname
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir)
      }

      execSync(`cp -r public/notion/* ${outDir}`)
    },
  },
})
