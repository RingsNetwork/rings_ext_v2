import React from 'react'
import { useAccount, useConnect } from 'wagmi'
import { signMessage } from 'wagmi/actions'
import { onMessage, sendMessage } from 'webext-bridge/popup'

import { getStorage } from '~/utils/storage'

import { NotificationPage } from './Notification'
import { Status } from './Status'
import { useConfig } from './store'

const RingsContext = React.createContext<Record<string, any>>({})

export function App() {
  const { address } = useAccount()
  const { connectors, connectAsync } = useConnect()
  const [providers, setProviders] = useState<any[]>([])
  const [ringsStatus, setRingsStatus] = useState<Record<string, any>>({})

  useEffect(() => {
    // get provider from background
    ;(async () => {
      const data = await sendMessage('get-provider', null)
      setProviders(data.providers)
    })()

    // handle sign messge from background
    onMessage('sign-message', async ({ data }) => {
      const signed = await signMessage({
        message: data.auth,
      })
      return {
        signed,
      }
    })

    onMessage('node-status-change', async ({ data }) => {
      if (JSON.stringify(data.result) !== JSON.stringify(ringsStatus)) {
        if (data.result) {
          setRingsStatus(data.result)
        }
      }
    })
  }, [ringsStatus])

  const [loading, setLoading] = useState(false)

  // load turnUrl and nodeUrl
  const { urls, setUrls } = useConfig()

  // Watch storage and change configs.
  useEffect(() => {
    ;(async () => {
      const turnUrl = await getStorage('turnUrl')
      const nodeUrl = await getStorage('nodeUrl')
      // local setting can overrite default setting
      if (turnUrl && turnUrl) {
        setUrls({ turnUrl: turnUrl[0] })
      }

      if (nodeUrl && nodeUrl[0]) {
        setUrls({ nodeUrl: nodeUrl[0] })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createProvider = useCallback(async () => {
    if (loading) return
    try {
      let address_ = address
      setLoading(true)
      if (!address) {
        const data = await connectAsync({ connector: connectors[0] })
        address_ = data.account
      }
      if (address_) {
        let _urls = {}

        const data = await sendMessage('init-background', {
          account: address_,
          ...urls,
          ..._urls,
        })

        setProviders(data.providers)
      }
    } catch (error) {
      console.error(error)
      throw Error(JSON.stringify(error))
    } finally {
      setLoading(false)
    }
  }, [address, connectAsync, connectors, loading, urls])

  const connectHandler = useCallback(async () => {
    if (!providers.length) {
      await createProvider()
    }
  }, [providers, createProvider])

  const connectSeed = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      if (!providers.length) {
        await createProvider()
      }
      console.log('connecting seed node')
      await sendMessage('connect-node', { url: urls.nodeUrl })
    } catch (e) {
      console.error('failed on connect seed node: ', urls.nodeUrl)
      throw Error(JSON.stringify(e))
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }, [loading, urls, providers, createProvider])

  const destroyProvider = useCallback(async () => {
    if (!providers.length) {
      return
    }
    setLoading(true)
    setProviders([])
    await sendMessage('destroy-provider', null)
    console.log('set', ringsStatus.version)
    let newStatus_ = {}
    if (ringsStatus.version) {
      newStatus_ = { version: ringsStatus.version }
    }
    setRingsStatus(newStatus_)
    setLoading(false)
  }, [providers, ringsStatus])

  return new URLSearchParams(location.search).get('notification') ? (
    <NotificationPage connectHandler={connectHandler} loading={loading} />
  ) : (
    <RingsContext.Provider value={ringsStatus}>
      <Status
        urls={urls}
        setUrls={setUrls}
        providers={providers}
        connectHandler={connectHandler}
        loading={loading}
        destroyProvider={destroyProvider}
        ringsBtnCallback={async () => {
          console.log('click', providers.length)
          if (!providers.length) {
            connectSeed()
          } else {
            destroyProvider()
          }
        }}
      />
    </RingsContext.Provider>
  )
}

export { RingsContext }
