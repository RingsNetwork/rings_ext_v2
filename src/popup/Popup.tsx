import { shorten } from '@did-network/dapp-sdk'
import { useAccount, useConnect, useDisconnect, useNetwork } from 'wagmi'
import { signMessage } from 'wagmi/actions'
import { onMessage, sendMessage } from 'webext-bridge/popup'

import { getStorage } from '~/utils/storage'

import type { Peer } from '../background/utils'
import { NetworkSwitcher } from './components/SwitchNetworks'
import { NotificationPage } from './Notification'
import { useServerUrls } from './store'

export function Popup() {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()
  const { connect, connectors, isLoading, pendingConnector, connectAsync } = useConnect()
  const { disconnect } = useDisconnect()

  const [show, setShow] = useState(false)
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

    setShow(false)
    const data = await sendMessage('check-status', null)
    setClients(data.clients)
  }, [])

  const connectHandler = useCallback(async () => {
    if (!clients.length) {
      await createClient()
    }
  }, [clients, createClient])

  const [peers, setPeers] = useState<Peer[]>([])
  const [serviceNodes, setServiceNodes] = useState<string[]>([])
  const getPeers = useCallback(async () => {
    const res = await sendMessage('get-peers', null)

    setPeers(res[0] ?? [])
    setServiceNodes(res[1] ?? [])
  }, [])

  useEffect(() => {
    getPeers()
    const timer = window.setInterval(() => {
      getPeers()
    }, 5000)

    return () => {
      clearInterval(timer)
    }
  }, [getPeers])

  const contentRef = useRef<HTMLDivElement | null>(null)

  const [switcherShow, setSwitcherShow] = useState(false)

  return new URLSearchParams(location.search).get('notification') ? (
    <NotificationPage connectHandler={connectHandler} />
  ) : (
    <div className="w-358px h-400px flex-col-center font-pixel antialiased">
      <div className="w-full h-full">
        <div className="relative p-2.5 flex justify-between items-center border-solid border-b border-gray-300">
          <div className="flex-1 text-xs">RingsNetwork</div>
          <div className="h-7 border-angle fake-border bg-white">
            {connectors.map((connector) => (
              <button
                className="px-4 h-full flex-center text-xs text-black  active:bg-#2E2E3A active:bg-opacity-5"
                disabled={!connector.ready}
                key={connector.id}
                onClick={() => (isConnected ? setShow(!show) : connect({ connector }))}
              >
                {isLoading && pendingConnector?.id === connector.id && (
                  <span className="w-4 h-4 i-eos-icons:loading"></span>
                )}
                {!isConnected ? 'Connect' : shorten(address)}
              </button>
            ))}
          </div>
          <div className="relative ml-2.5 w-7 h-7 flex-col-center border-angle">
            <span
              className={`absolute w-6 h-6 cursor-pointer transition-all ${
                clients.length
                  ? 'text-#15CD96 i-eos-icons:network-policy'
                  : 'text-#fb7185 i-eos-icons:network-policy-outlined'
              } ${loading ? 'scale-x-0' : ''}`}
              onClick={() => {
                if (!clients.length) {
                  connectHandler()
                } else {
                  setShow(!show)
                }
              }}
            ></span>
            <span
              className={`absolute w-6 h-6 cursor-pointer transition-all text-#15CD96 i-eos-icons:loading ${
                loading ? '' : 'scale-x-0'
              }`}
            ></span>
          </div>
        </div>

        <div className="relative p-2.5">
          <div className="flex justify-between items-center">
            <span className="w-80px text-xs scale-90 origin-left">TurnUrl:</span>
            <input
              className="h-7 px-1 flex-1 fake-border outline-none scale-90 origin-right disabled:opacity-60"
              value={urls.turnUrl}
              onInput={(e) => {
                setUrls({
                  turnUrl: (e.target as HTMLInputElement).value,
                })
              }}
              disabled={clients.length > 0}
            />
          </div>
          <div className="mt-2.5 flex justify-between items-center">
            <span className="w-80px text-xs scale-90 origin-left">NodeUrl:</span>
            <input
              className="h-7 px-1 flex-1 fake-border outline-none scale-90 origin-right disabled:opacity-60"
              value={urls.nodeUrl}
              onInput={(e) => {
                setUrls({
                  nodeUrl: (e.target as HTMLInputElement).value,
                })
              }}
              disabled={clients.length > 0}
            />
          </div>
        </div>
      </div>

      {/* <!-- modal --> */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 bg-gray/10 ${show ? 'block' : '!hidden'} `}
        onClick={(e) => {
          !contentRef.current?.contains(e.target as Node) && setShow(false)
        }}
      >
        <div
          ref={contentRef}
          className={`!absolute top-13 right-2.5 flex flex-col items-stretch w-300px h-300px -translate-y-1.5 bg-white border-angle fake-border overflow-hidden`}
        >
          <div className="p-2.5 flex items-center justify-between text-xs border-solid border-b border-gray-300">
            <span className={`scale-80 origin-left`}>
              Network Status:{' '}
              <span className={`${clients.length ? 'text-#15CD96' : 'text-#fb7185 '}`}>
                {clients.length ? `online` : 'offline'}
              </span>
            </span>
            <span
              className="flex-1 text-right scale-80 origin-right cursor-pointer transition-all hover:translate-x-.25 underline underline-current"
              onClick={() => {
                if (clients.length > 0) {
                  destroyClient()
                }
              }}
            >
              {clients.length ? `offline` : '--'}
            </span>
          </div>
          <div className="flex-1">
            <div className="p-2.5 pt-0 flex items-center justify-between text-xs first:pt-2.5">
              <span className="scale-80 origin-left">Peers:</span>
              <span className="flex-1 text-right scale-80 origin-right">{peers.length}</span>
            </div>
            <div className="p-2.5 pt-0 flex items-center justify-between text-xs">
              <span className="scale-80 origin-left">ServiceNodes:</span>
              <span className="flex-1 text-right scale-80 origin-right">{serviceNodes.length}</span>
            </div>
          </div>
          <div className="relative p-2.5 flex items-center justify-between text-xs border-solid border-t border-gray-300">
            <span className="scale-80 origin-left">Chain: {chain?.name}</span>
            <span
              onClick={() => {
                setSwitcherShow(!switcherShow)
              }}
              className="h-full cursor-pointer scale-80 origin-right transition-all hover:translate-x-.25 underline underline-current select-none"
            >
              Switch
            </span>
            <div
              className={`no-underline absolute bottom-90% right-0 animate-fade-in-right !animate-duration-100 ${
                switcherShow ? 'block' : 'hidden'
              }`}
              onClick={() => {
                setSwitcherShow(false)
              }}
            >
              <NetworkSwitcher />
            </div>
          </div>
          <div className="p-2.5 flex items-center justify-between text-xs border-solid border-t border-gray-300">
            <span className="scale-80 origin-left">Wallet: {shorten(address)}</span>
            <span
              onClick={() => {
                disconnect()
                setShow(false)
              }}
              className="cursor-pointer scale-80 origin-right transition-all hover:translate-x-.25 underline underline-current"
            >
              Disconnect
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
