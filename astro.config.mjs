import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import { CUSTOM_DOMAIN, BASE_PATH } from './src/server-constants';
import CoverImageDownloader from './src/integrations/cover-image-downloader';
import CustomIconDownloader from './src/integrations/custom-icon-downloader';
import FeaturedImageDownloader from './src/integrations/featured-image-downloader';
import PublicNotionCopier from './src/integrations/public-notion-copier';

const getSite = function () {
  if (!process.env.VERCEL_URL) {
    return new URL(BASE_PATH, 'http://localhost:3000').toString();
  }

  if (CUSTOM_DOMAIN) {
    return new URL(BASE_PATH, `https://${CUSTOM_DOMAIN}`).toString();
  }

  return new URL(
    BASE_PATH,
    `https://${process.env.VERCEL_URL}`
  ).toString();
};

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: getSite(),
  base: BASE_PATH,
  integrations: [
    CoverImageDownloader(),
    CustomIconDownloader(),
    FeaturedImageDownloader(),
    PublicNotionCopier(),
  ],
});
