import fs from 'fs-extra'

import { getManifest } from '../src/manifest'
import { log, r } from './utils'

export async function writeManifest() {
  if (!fs.existsSync(r('extension/manifest.json'))) {
    fs.outputFileSync(r('extension/manifest.json'), '')
  }
  await fs.writeJSON(r('extension/manifest.json'), await getManifest(), { spaces: 2 })
  log('PRE', 'write manifest.json')

  if (!fs.existsSync(r('extension/background/rings_node_bg.wasm'))) {
    fs.copySync(
      r('node_modules/@ringsnetwork/rings-node/rings_node_bg.wasm'),
      r('extension/dist/background/rings_node_bg.wasm')
    )
    log('PRE', 'copy rings_node_bg.wasm')
  }
}

writeManifest()
