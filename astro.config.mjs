import { defineConfig } from 'astro/config'


const CUSTOM_DOMAIN = '' // <- Set your costom domain if you have. e.g. alpacat.com


const getSite = function() {
  if (!process.env.CF_PAGES) {
    return 'http://localhost:3000'
  }

  if (process.env.CF_PAGES_BRANCH !== 'main') {
    return process.env.CF_PAGES_URL
  }

  if (CUSTOM_DOMAIN) {
    return `https://${CUSTOM_DOMAIN}`
  }

  return `https://${new URL(process.env.CF_PAGES_URL).host.split('.').slice(1).join('.')}`
}

// https://astro.build/config
export default defineConfig({
  site: getSite(),
})
