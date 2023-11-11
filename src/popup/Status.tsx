import { shorten } from '@did-network/dapp-sdk'
import { useAccount, useConnect, useDisconnect, useNetwork } from 'wagmi'
import { sendMessage } from 'webext-bridge/popup'

import type { Peer } from '../background/utils'
import CircProgressBar from './CircProgressBar'
import { NetworkSwitcher } from './components/SwitchNetworks'

export const Status = ({
  urls,
  setUrls,
  clients,
  connectHandler,
  loading,
  destroyClient,
  ringsBtnCallback,
}: {
  urls: {
    turnUrl: string
    nodeUrl: string
  }
  setUrls: ({ turnUrl, nodeUrl }: { turnUrl?: string | undefined; nodeUrl?: string | undefined }) => Promise<void>
  clients: any[]
  connectHandler: () => Promise<void>
  loading: boolean
  destroyClient: () => Promise<void>
  ringsBtnCallback: () => Promise<void>
}) => {
  const { connect, connectors, isLoading, pendingConnector } = useConnect()
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()
  const { disconnect } = useDisconnect()

  const [show, setShow] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const [switcherShow, setSwitcherShow] = useState(false)

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

  // This function will read global values.
  // connect status of PKI (E.g Metamask)
  const PKIConnectStatus = ({ className }: { className: string }) => {
    return (
      <div className={className}>
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
    )
  }

  const ConfigFields = () => {
    return (
      <div className="relative p-2.5">
        <div className="flex justify-between items-center">
          <span className="w-100px text-xs scale-90 origin-left">ICE URL:</span>
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
        <div className="bg-gray-100 text-xs px-1 py-1 leading-3 text-slate-600">
          ICE Url is a URL list for ICE protocol, this can be TURN or STUN URL
        </div>
        <div className="mt-2.5 flex justify-between items-center">
          <span className="w-100px text-xs scale-90 origin-left">SEEDS URL:</span>
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
        <div className="bg-gray-100 text-xs px-1 py-1 leading-3 text-slate-600">
          Seeds url is a URL list, which are working as entrypoint of rings network
        </div>
      </div>
    )
  }

  const PeersStatusModal = () => {
    return (
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
            onClick={async () => {
              if (clients.length > 0) {
                await destroyClient()
                setShow(false)
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
    )
  }
  return (
    <div className="w-358px h-400px flex-col-center font-pixel antialiased">
      <div className="w-full h-full">
        <div className="relative p-2.5 flex justify-between items-center border-solid border-b border-gray-300">
          <div className="flex-1 text-xs">RingsNetwork</div>
          <PKIConnectStatus className={'h-7 border-angle fake-border bg-white'} />
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
        <CircProgressBar
          labels={['offer', 'answer', 'handshake', 'connected']}
          index={4}
          lineLength={50}
          segmentProportion={0.3} // For example, 60% of the line is the first segment
          onClick={ringsBtnCallback}
        />
        <ConfigFields />
      </div>

      {/* <!-- modal --> */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 bg-gray/10 block ${show ? 'block' : '!hidden'} `}
        onClick={(e) => {
          !contentRef.current?.contains(e.target as Node) && setShow(false)
        }}
      >
        <PeersStatusModal />
      </div>
    </div>
  )
}
