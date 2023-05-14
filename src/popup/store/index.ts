import { atom, useAtom } from 'jotai'

import { saveStorage } from '~/utils/storage'

const _urls = atom({
  turnUrl: '',
  nodeUrl: '',
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
    await saveStorage('serverUrls', [{ ...urls, ...data }])
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
