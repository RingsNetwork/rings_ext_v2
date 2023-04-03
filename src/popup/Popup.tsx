import { shorten } from '@did-network/dapp-sdk'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { signMessage } from 'wagmi/actions'
import { onMessage, sendMessage } from 'webext-bridge/popup'

import type { Peer } from '../background/utils'

export function Popup() {
  const { address, isConnected } = useAccount()
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
  const [turnUrl] = useState('stun://stun.qq.com:3478')
  const [nodeUrl] = useState('https://41d.1n.gs')
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
        const data = await sendMessage('init-background', {
          account: address_,
          turnUrl,
          nodeUrl,
        })

        setClients(data.clients)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [address, connectAsync, connectors, loading, nodeUrl, turnUrl])

  const destroyClient = useCallback(async () => {
    sendMessage('destroy-client', null)

    setShow(false)
    const data = await sendMessage('check-status', null)
    setClients(data.clients)
  }, [])

  const [peers, setPeers] = useState<Peer[]>([])
  const getPeers = useCallback(async () => {
    const res = await sendMessage('get-peers', null)
    setPeers(res)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      getPeers()
    }, 5000)

    return () => {
      clearInterval(timer)
    }
  }, [getPeers])

  const contentRef = useRef<HTMLDivElement | null>(null)

  // h-600px
  return (
    <div className="w-358px h-400px flex-col-center font-pixel">
      <div className="w-full h-full">
        <div className="relative p-2.5 flex justify-between items-center border-solid border-b border-gray-300">
          <div className="flex-1 text-xs">RingsNetwork</div>
          <div className="">
            {connectors.map((connector) => (
              <button
                className="px-4 py-2 flex-center scale-90 origin-right bg-white text-xs text-black border-angle fake-border active:bg-#2E2E3A active:bg-opacity-5"
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
                  createClient()
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
              value={turnUrl}
              disabled={clients.length > 0}
            />
          </div>
          <div className="mt-2.5 flex justify-between items-center">
            <span className="w-80px text-xs scale-90 origin-left">NodeUrl:</span>
            <input
              className="h-7 px-1 flex-1 fake-border outline-none scale-90 origin-right disabled:opacity-60"
              value={nodeUrl}
              disabled={clients.length > 0}
            />
          </div>
        </div>
      </div>

      {/* <!-- modal --> */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 bg-transparent ${show ? 'block' : '!hidden'} `}
        onClick={(e) => {
          !contentRef.current?.contains(e.target as Node) && setShow(false)
        }}
      >
        <div
          ref={contentRef}
          className={`!absolute top-13 right-2.5 flex flex-col items-stretch w-300px h-300px -translate-y-1.5 bg-white border-angle fake-border`}
        >
          <div className="p-2.5 flex items-center justify-between text-xs border-solid border-b border-gray-300">
            <span className={`scale-80 origin-left`}>
              Network Status:{' '}
              <span className={`${clients.length ? 'text-#15CD96' : 'text-#fb7185 '}`}>
                {clients.length ? `online` : 'offline'}
              </span>
            </span>
            <span
              className="flex-1 text-right scale-80 origin-right cursor-pointer transition-all hover:translate-x-.25"
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
            <div className="p-2.5 flex items-center justify-between text-xs">
              <span className="scale-80 origin-left">Peers:</span>
              <span className="flex-1 text-right scale-80 origin-right">{peers.length}</span>
            </div>
          </div>
          <div className="p-2.5 flex items-center justify-between text-xs border-solid border-t border-gray-300">
            <span className="scale-80 origin-left">Wallet: {shorten(address)}</span>
            <span
              onClick={() => {
                disconnect()
                setShow(false)
              }}
              className="cursor-pointer scale-80 origin-right transition-all hover:translate-x-.25"
            >
              Disconnect
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
