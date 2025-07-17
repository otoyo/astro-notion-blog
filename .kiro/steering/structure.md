# Project Structure

## Root Directory
- `.astro/` - Astro build cache and configuration
- `.devcontainer/` - Development container configuration
- `.github/` - GitHub workflows and configuration
- `.kiro/` - Kiro AI assistant configuration
- `.nx/` - NX build cache and configuration
- `dist/` - Built static site output
- `node_modules/` - Node.js dependencies
- `public/` - Static assets served as-is
- `scripts/` - Build and utility scripts
- `src/` - Source code
- `tmp/` - Temporary files and Notion API cache

## Source Code Organization

### Core Structure
- `src/components/` - Reusable UI components
- `src/images/` - Image assets that require processing
- `src/integrations/` - Astro integrations for build process
- `src/layouts/` - Page layout templates
- `src/lib/` - Utility functions and core logic
- `src/pages/` - Page routes and endpoints
- `src/styles/` - Global CSS styles
- `src/server-constants.ts` - Server-side configuration constants

### Components
- `src/components/notion-blocks/` - Components for rendering Notion blocks
- `src/components/*.astro` - General UI components like headers, footers, etc.

### Pages
- `src/pages/index.astro` - Homepage
- `src/pages/posts/` - Blog post pages
- `src/pages/feed.ts` - RSS feed generator
- `src/pages/sitemap.xml.ts` - Sitemap generator

### Library
- `src/lib/notion/` - Notion API client and utilities
- `src/lib/blog-helpers.ts` - Blog-specific utility functions
- `src/lib/interfaces.ts` - TypeScript interfaces and types

### Integrations
- `src/integrations/cover-image-downloader.ts` - Downloads cover images from Notion
- `src/integrations/custom-icon-downloader.ts` - Downloads custom icons
- `src/integrations/featured-image-downloader.ts` - Downloads featured images
- `src/integrations/public-notion-copier.ts` - Copies Notion assets to public directory

## Data Flow
1. Notion database content is fetched via the Notion API
2. Content is processed and cached in the `tmp/` directory
3. Astro generates static pages from the processed content
4. Images and other assets are downloaded and optimized during build
5. Static site is output to the `dist/` directory for deployment

## Configuration Files
- `astro.config.mjs` - Astro configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Project dependencies and scripts
- `.env` - Environment variables (not committed to git)
- `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Prettier configuration

## Naming Conventions
- Components use PascalCase (e.g., `PostTitle.astro`)
- Utility functions use camelCase (e.g., `getPostLink`)
- Files for pages use kebab-case (e.g., `privacy-policy.astro`)
- Constants use UPPER_SNAKE_CASE (e.g., `DATABASE_ID`)