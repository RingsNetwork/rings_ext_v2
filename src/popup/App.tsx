import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { useAccount, useConnect } from 'wagmi'
import { signMessage } from 'wagmi/actions'
import { onMessage, sendMessage } from 'webext-bridge/popup'

import { getStorage } from '~/utils/storage'

import { NotificationPage } from './Notification'
import { Status } from './Status'
import { useConfig } from './store'

export function App() {
  const { address } = useAccount()
  const { connectors, connectAsync } = useConnect()
  const [clients, setClients] = useState<any[]>([])
  const [ringsStatus, setRingsStatus] = useState<any[]>([])

  useEffect(() => {
    // get client from background
    ;(async () => {
      const data = await sendMessage('get-client', null)
      console.log(data.clients)
      setClients(data.clients)
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
      setRingsStatus(data.result)
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

  const connectHandler = useCallback(async () => {
    if (!clients.length) {
      await createClient()
    }
  }, [clients, createClient])

  const connectSeed = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      if (!clients.length) {
        await createClient()
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
  }, [loading, urls, clients, createClient])

  const destroyClient = useCallback(async () => {
    if (!clients.length) {
      return
    }
    setLoading(true)
    setClients([])
    await sendMessage('destroy-client', null)
    setRingsStatus([])
    setLoading(false)
  }, [clients])

  return new URLSearchParams(location.search).get('notification') ? (
    <NotificationPage connectHandler={connectHandler} loading={loading} />
  ) : (
    <Router>
      <div>
        <Routes>
          <Route
            path="/*"
            element={
              <Status
                status={ringsStatus}
                urls={urls}
                setUrls={setUrls}
                clients={clients}
                connectHandler={connectHandler}
                loading={loading}
                destroyClient={destroyClient}
                ringsBtnCallback={async () => {
                  console.log('click', clients.length)
                  if (!clients.length) {
                    connectSeed()
                  } else {
                    destroyClient()
                  }
                }}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  )
}
