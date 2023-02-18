import { defineConfig } from 'astro/config';
import { BASE_PATH } from './src/server-constants';
import OGImageUploader from './src/integrations/og-image-uploader';

const CUSTOM_DOMAIN = ''; // <- Set your costom domain if you have. e.g. alpacat.com

const getSite = function () {
  if (!process.env.CF_PAGES) {
    return new URL(BASE_PATH, 'http://localhost:3000').toString();
  }

  if (process.env.CF_PAGES_BRANCH !== 'main') {
    return new URL(BASE_PATH, process.env.CF_PAGES_URL).toString();
  }

  if (CUSTOM_DOMAIN) {
    return new URL(BASE_PATH, `https://${CUSTOM_DOMAIN}`);
  }

  return new URL(
    BASE_PATH,
    `https://${new URL(process.env.CF_PAGES_URL).host
      .split('.')
      .slice(1)
      .join('.')}`
  ).toString();
};

// https://astro.build/config
export default defineConfig({
  site: getSite(),
  base: BASE_PATH,
  integrations: [OGImageUploader()],
});
