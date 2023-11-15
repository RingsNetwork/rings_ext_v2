import { atom, useAtom } from 'jotai'

import { saveStorage } from '~/utils/storage'

import { URL_STORE_KEY } from '../constants/storage-key'

// try load rings config from ENV
// _urls is a atomic ref
const _urls = atom({
  turnUrl: import.meta.env.RINGS_ICE_URL || 'stun://stun.l.google.com:19302',
  nodeUrl: import.meta.env.RINGS_PUBLIC_NODE_SEED_URL || 'https://test41.rings.rs',
})

// check a ref is undefined
const inUndef = (value: any) => typeof value === 'undefined'

// This function returns a atomic ref, and it's setter
export const useConfig = () => {
  // load config from ENV
  const [urls, _setUrls] = useAtom(_urls)

  // override setter here
  const setUrls = async ({ turnUrl, nodeUrl }: { turnUrl?: string; nodeUrl?: string }) => {
    const data = {
      ...(!inUndef(turnUrl) ? { turnUrl } : {}),
      ...(!inUndef(nodeUrl) ? { nodeUrl } : {}),
    }
    _setUrls((prev) => ({
      ...prev,
      ...data,
    }))
    // save config to storage
    await saveStorage(URL_STORE_KEY, [{ ...urls, ...data }])
  }

  return {
    urls,
    setUrls,
  }
}

const _connectLoading = atom(false)

// This function return atomic ref, and it's setter
export const useConnectLoading = () => {
  const [connectLoading, setConnectLoading] = useAtom(_connectLoading)

  return {
    connectLoading,
    setConnectLoading,
  }
}
