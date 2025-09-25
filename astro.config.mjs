import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import CoverImageDownloader from './src/integrations/cover-image-downloader';
import CustomIconDownloader from './src/integrations/custom-icon-downloader';
import FeaturedImageDownloader from './src/integrations/featured-image-downloader';
import PublicNotionCopier from './src/integrations/public-notion-copier';

// Use exact GitHub Pages URL and repo-base path
const SITE = 'https://yaw31.github.io/astro-notion-blog/';

export default defineConfig({
  site: SITE,
  base: '/astro-notion-blog/',
  integrations: [
    icon(),
    CoverImageDownloader(),
    CustomIconDownloader(),
    FeaturedImageDownloader(),
    PublicNotionCopier(),
  ],
});
