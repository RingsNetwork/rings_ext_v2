import { useAccount, useConnect } from 'wagmi'
import { signMessage } from 'wagmi/actions'
import { onMessage, sendMessage } from 'webext-bridge/popup'

import { getStorage } from '~/utils/storage'

import { NotificationPage } from './Notification'
import { Profile } from './Profile'
import { useServerUrls } from './store'

export function App() {
  const { address } = useAccount()
  const { connectors, connectAsync } = useConnect()

  const [clients, setClients] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      const data = await sendMessage('check-status', null)
      console.log(data.clients)
      setClients(data.clients)
    })()

    onMessage('sign-message', async ({ data }) => {
      const signed = await signMessage({
        message: data.auth,
      })

      return {
        signed,
      }
    })
  }, [])

  const [loading, setLoading] = useState(false)

  const { urls, setUrls } = useServerUrls()
  useEffect(() => {
    ;(async () => {
      const data = await getStorage('serverUrls')
      console.log(data[0])
      if (data && data[0]) {
        setUrls(data[0])
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createClient = useCallback(async () => {
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
        if (!urls.nodeUrl) {
          _urls = (await getStorage('serverUrls'))[0]
        }

        const data = await sendMessage('init-background', {
          account: address_,
          ...urls,
          ..._urls,
        })

        setClients(data.clients)
      }
    } catch (error) {
      console.error(error)
      throw Error(JSON.stringify(error))
    } finally {
      setLoading(false)
    }
  }, [address, connectAsync, connectors, loading, urls])

  const destroyClient = useCallback(async () => {
    sendMessage('destroy-client', null)

    const data = await sendMessage('check-status', null)
    setClients(data.clients)
  }, [])

  const connectHandler = useCallback(async () => {
    if (!clients.length) {
      await createClient()
    }
  }, [clients, createClient])

  return new URLSearchParams(location.search).get('notification') ? (
    <NotificationPage connectHandler={connectHandler} loading={loading} />
  ) : (
    <Profile
      urls={urls}
      setUrls={setUrls}
      clients={clients}
      connectHandler={connectHandler}
      loading={loading}
      destroyClient={destroyClient}
    />
  )
}
