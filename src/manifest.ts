import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'

import type PkgType from '../package.json'
import { isDev, port, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = (await fs.readJSON(r('package.json'))) as typeof PkgType

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 2,
    // @ts-expect-error -- use pkg displayName if available
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    browser_action: {
      default_icon: './assets/waiting_icon.png',
      default_popup: './dist/popup/index.html',
    },
    options_ui: {
      page: './dist/options/index.html',
      open_in_tab: true,
      chrome_style: false,
    },
    background: {
      scripts: ['./dist/background/index.global.js'],
      persistent: true,
    },
    icons: {
      16: './assets/active_icon_16.png',
      48: './assets/active_icon_48.png',
      128: './assets/active_icon_128.png',
      512: './assets/active_icon_512.png',
    },
    permissions: ['tabs', 'storage', 'activeTab', 'http://*/', 'https://*/'],
    // host_permissions: ['*://*/*'],
    content_scripts: [
      {
        matches: ['http://*/*', 'https://*/*'],
        js: ['./dist/contentScripts/index.global.js'],
      },
    ],
    web_accessible_resources: [
      'dist/contentScripts/style.css',
      'dist/contentScripts/inpage.global.js',
      'dist/background/rings_node_bg.wasm',
    ],
    content_security_policy: isDev
      ? // this is required on dev for Vite script to load
        `script-src 'self' 'unsafe-eval' http://localhost:${port}; object-src 'self' http://localhost:${port}`
      : "script-src 'self' 'unsafe-eval'; object-src 'self'",
  }

  if (isDev) {
    manifest.permissions?.push('webNavigation')
  }

  return manifest
}
