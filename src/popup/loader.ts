import JSZip from 'jszip'
import browser from 'webextension-polyfill'

async function listAllUpdates(): Promise<string[]> {
  const RINGS_KEY = 'RINGS_UPDATE'
  let ret = await browser.storage.local.get(RINGS_KEY)
  return ret[RINGS_KEY]
}

function sortUpdateKey(strings: string[]): string[] {
  function compareStrings(a: string, b: string): number {
    const partsA = a.split('_').map(Number)
    const partsB = b.split('_').map(Number)

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const valA = partsA[i] || 0
      const valB = partsB[i] || 0

      if (valA !== valB) {
        return valA - valB
      }
    }
    return 0
  }

  return strings.sort(compareStrings)
}

async function getLatestUpdate(): Promise<Record<string, any> | undefined> {
  let allUpdates = await listAllUpdates()
  if (allUpdates.length === 0) {
    return undefined
  }
  let latestKey = allUpdates[0]
  let ret = await browser.storage.local.get(latestKey)
  return ret[latestKey]
}

async function RecordUpdate(key: string) {
  const RINGS_KEY = 'RINGS_UPDATE'
  let ret: string[] = (await browser.storage.local.get(RINGS_KEY))[RINGS_KEY]
  ret.push(key)
  let sortedKey = sortUpdateKey(ret)
  await browser.storage.local.set({ [RINGS_KEY]: sortedKey })
}

function extractAndFormatVersionFromUrl(url: string): string | null {
  const versionRegex = /\/releases\/download\/([^\/]+)\//
  const match = url.match(versionRegex)

  if (match && match[1]) {
    let formattedVersion = match[1].replace(/\./g, '_')

    if (formattedVersion.endsWith('_01')) {
      formattedVersion = formattedVersion.substring(0, formattedVersion.length - 3)
    }

    return formattedVersion
  }

  return null
}

async function downloadAndStoreZip(url: string): Promise<void> {
  let storageKey = extractAndFormatVersionFromUrl(url)
  if (!storageKey) {
    return
  }
  try {
    const response = await fetch(url)
    const blob = await response.blob()

    const zip = new JSZip()
    const zipContents = await zip.loadAsync(blob)
    const extractedData: { [key: string]: string } = {}

    for (const fileName of Object.keys(zipContents.files)) {
      const fileData = await zipContents.files[fileName].async('string')
      extractedData[fileName] = fileData
    }

    await browser.storage.local.set({ [storageKey]: extractedData })
    await RecordUpdate(storageKey)
    console.log('source saved at: ', storageKey)
  } catch (error) {
    console.error('Error downloading or storing zip file:', error)
  }
}

function findValueByKeySubstring<T>(substring: string, obj: Record<string, T>): T | undefined {
  let foundKey: string | undefined
  let foundValue: T | undefined

  for (const key in obj) {
    if (obj.hasOwnProperty(key) && key.includes(substring)) {
      if (foundKey) {
        throw new Error('Multiple keys found containing the substring.')
      }
      foundKey = key
      foundValue = obj[key]
    }
  }

  if (foundValue === undefined) {
    return undefined
  }

  return foundValue
}

async function findLatestSrc(moduleName: string): Promise<string | undefined> {
  let latest = await getLatestUpdate()
  if (latest) {
    return findValueByKeySubstring(moduleName, latest)
  } else {
    return undefined
  }
}

// This function only for load js file, NOT ts or tsx
async function _customRequire(moduleName: string): Promise<any> {
  const moduleCode = await findLatestSrc(moduleName)

  if (moduleCode) {
    console.log('loading stored module')
    try {
      const module = { exports: {} }
      const executeModule = new Function('module', moduleCode)
      executeModule(module)
      return module.exports
    } catch (e) {
      throw new Error(`Error executing module ${moduleName}: e`)
    }
  } else {
    try {
      console.log('loading local module')
      const module = await import(/* @vite-ignore */ moduleName + '.js')
      return module
    } catch (e) {
      throw new Error(`Error loading module ${moduleName}: e`)
    }
  }
}
export const load = downloadAndStoreZip
export const require = _customRequire
