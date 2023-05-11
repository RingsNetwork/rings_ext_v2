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
          include: [r('src/contentScripts/**/*')],
        }
      : undefined,
    outDir: r('extension/dist/contentScripts'),
    cssCodeSplit: false,
    emptyOutDir: false,
    sourcemap: isDev ? 'inline' : false,
    lib: {
      entry: r('src/contentScripts/inpage.ts'),
      formats: ['iife'],
      name: 'ringsNode',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'inpage.global.js',
      },
    },
  },
  plugins: [...sharedConfig.plugins!],
})
