import { atom, useAtom } from 'jotai'

import { saveStorage } from '~/utils/storage'

import { URL_STORE_KEY } from '../constants/storage-key'

// try load rings config from ENV
const _urls = atom({
  turnUrl: import.meta.env.RINGS_ICE_URL || '',
  nodeUrl: import.meta.env.RINGS_PUBLIC_NODE_SEED_URL || '',
})

const inUndef = (value: any) => typeof value === 'undefined'

export const useServerUrls = () => {
  const [urls, _setUrls] = useAtom(_urls)

  const setUrls = async ({ turnUrl, nodeUrl }: { turnUrl?: string; nodeUrl?: string }) => {
    const data = {
      ...(!inUndef(turnUrl) ? { turnUrl } : {}),
      ...(!inUndef(nodeUrl) ? { nodeUrl } : {}),
    }
    _setUrls((prev) => ({
      ...prev,
      ...data,
    }))
    await saveStorage(URL_STORE_KEY, [{ ...urls, ...data }])
  }

  return {
    urls,
    setUrls,
  }
}

const _connectLoading = atom(false)

export const useConnectLoading = () => {
  const [connectLoading, setConnectLoading] = useAtom(_connectLoading)

  return {
    connectLoading,
    setConnectLoading,
  }
}
