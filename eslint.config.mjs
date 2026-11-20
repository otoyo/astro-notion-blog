import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/*.astro',
      'dist/**',
      '.astro/**',
      'node_modules/**',
      '.nx/**',
      'public/scripts/**',
    ],
  },

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    ...eslint.configs.recommended,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,mts,cts}'],
  })),
];
