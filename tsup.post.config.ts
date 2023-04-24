import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['extension/dist/contentScripts/index.js', 'extension/dist/contentScripts/inpage.js'],
  format: ['iife'],
  outDir: 'extension/dist/contentScripts',
  minify: true,
})
