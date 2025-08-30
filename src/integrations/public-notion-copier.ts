import fs from 'node:fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { AstroIntegration } from 'astro'

const copyFiles = (src: string, dest: string) => {
  const entries = fs.readdirSync(src, { withFileTypes: true })
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyFiles(srcPath, destPath)
    } else {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
}

export default (): AstroIntegration => ({
  name: 'public-notion-copier',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const dirPath = fileURLToPath(dir)
      const outDir = path.join(dirPath, 'notion')
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
      }

      copyFiles('public/notion', outDir)
      console.log('Finished copying notion files to root!')
    },
  },
})
