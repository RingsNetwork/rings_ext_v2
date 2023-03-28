import { defineConfig } from 'vite'

import { isDev, r } from './scripts/utils'
import { sharedConfig } from './vite.config'

// bundling the content script using Vite
export default defineConfig({
  ...sharedConfig,
  build: {
    // target: 'es2020',
    watch: isDev
      ? {
          include: [r('src/background/**/*')],
        }
      : undefined,
    outDir: r('extension/dist/background'),
    cssCodeSplit: false,
    emptyOutDir: false,
    sourcemap: isDev ? 'inline' : false,
    lib: {
      entry: r('src/background/main.ts'),
      formats: ['iife'],
      name: 'ringsNode',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'index.global.js',
      },
    },
  },
  plugins: [...sharedConfig.plugins!],
})
