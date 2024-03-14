/** @type {import('tailwindcss').Config} */

export default {
  content: [
    './src/**/*.astro',
    './node_modules/preline/dist/*.js',
  ],
  theme: {
    extend: {
    },
  },
  plugins: [
    require('preline/plugin'),
  ],
}
