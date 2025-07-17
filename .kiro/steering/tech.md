# Technical Stack & Build System

## Core Technologies
- [Astro](https://astro.build/) - Main framework for static site generation
- [TypeScript](https://www.typescriptlang.org/) - Programming language
- [Notion API](https://developers.notion.com/) - Content source
- [React](https://reactjs.org/) - Used for interactive components
- [Node.js](https://nodejs.org/) - Runtime environment (v20.18.1 or higher required)

## Key Dependencies
- `@notionhq/client` - Official Notion API client
- `@astrojs/react` - React integration for Astro
- `@astrojs/rss` - RSS feed generation
- `astro-icon` - Icon management
- `katex` - Math formula rendering
- `mermaid` - Diagram rendering
- `prismjs` - Code syntax highlighting
- `sharp` - Image processing
- `nx` - Build system optimization

## Development Tools
- ESLint - Code linting
- Prettier - Code formatting
- NX Cloud - Build caching and optimization

## Environment Variables
```bash
# Required
NOTION_API_SECRET=your_notion_api_secret
DATABASE_ID=your_notion_database_id

# Optional
CUSTOM_DOMAIN=your_custom_domain
BASE_PATH=/optional_base_path
CACHE_CONCURRENCY=8  # Cache processing concurrency (default: 4)
PUBLIC_GA_TRACKING_ID=your_ga_id
ENABLE_LIGHTBOX=true
PUBLIC_ENABLE_COMMENTS=true
PUBLIC_GISCUS_REPO=username/repo
PUBLIC_GISCUS_REPO_ID=your_repo_id
PUBLIC_GISCUS_CATEGORY=Announcements
PUBLIC_GISCUS_CATEGORY_ID=your_category_id
```

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Format code
npm run format

# Lint code
npm run lint
```

### Build Commands
```bash
# Standard build
npm run build

# Build with cache
npm run build:cached

# Fast build (concurrency 8)
npm run build:fast

# Maximum parallel build (concurrency 12)
npm run build:parallel

# Stable build (concurrency 4)
npm run build:stable

# Skip cache build
npm run build:skip-cache
```

### Cache Management
```bash
# Fetch content cache
npm run cache:fetch

# Purge cache
npm run cache:purge

# Fetch Notion blocks (internal)
npm run _fetch-notion-blocks
```

### Preview
```bash
# Preview built site
npm run preview
```

## Build Optimization
For projects with many articles, use the cached build options. For maximum performance:

1. Set up Nx Cloud with `npx nx g @nrwl/nx-cloud:init`
2. Configure `NX_CLOUD_ACCESS_TOKEN` in your environment
3. Use `npm run build:cached` or `npm run build:fast` for builds