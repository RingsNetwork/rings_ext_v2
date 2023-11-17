import { shorten } from '@did-network/dapp-sdk'
import React from 'react'
import { useAccount, useConnect, useDisconnect, useNetwork } from 'wagmi'
import browser from 'webextension-polyfill'

import { RingsContext } from './App'
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
  const [currentTab, setCurrentTab] = useState('main')
  const [showModal, setShowModal] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const [switcherShow, setSwitcherShow] = useState(false)

  const forceReset = async () => {
    await browser.storage.local.clear()
    await browser.storage.sync.clear()
    await browser.runtime.reload()
  }

  // return status of connected node
  const connectedNodeStatus = (status: Record<string, any>) => {
    if (!status) return 'offline'
    if (!status.swarm) return 'offline'
    if (status.swarm?.connections == 0) return 'offline'
    return status.swarm.connections[0].state
  }

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
            onClick={(e) => {
              isConnected ? setShowModal(!showModal) : connect({ connector })
            }}
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
  const ConfigFields = React.memo(
    ({
      canChange,
      configUrls,
    }: {
      canChange: boolean
      configUrls: {
        turnUrl: string
        nodeUrl: string
      }
    }) => {
      console.log('re render config')
      return (
        <div className="relative p-4 bg-white shadow">
          <div className="text-center text-lg font-bold mb-4">
            <span>Configure</span>
          </div>
          <div className="overflow-auto max-h-100">
            <div className="mb-4">
              <div className="mb-2">
                <div className="font-semibold">
                  <label className="w-full text-sm block">ICE URL:</label>
                </div>
                <input
                  className="w-full h-8 px-2 mt-1 border border-gray-300 rounded outline-none disabled:opacity-60"
                  value={configUrls.turnUrl}
                  onInput={(e) => {
                    setUrls({
                      turnUrl: (e.target as HTMLInputElement).value,
                    })
                  }}
                  disabled={!canChange}
                />
              </div>
              <div className="bg-gray-100 text-sm px-2 py-2 rounded text-slate-600">
                ICE Url is a URL list for ICE protocol, this can be TURN or STUN URL
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2">
                <div className="font-semibold">
                  <label className="w-full text-sm block">SEEDS URL:</label>
                </div>
                <input
                  className="w-full h-8 px-2 mt-1 border border-gray-300 rounded outline-none disabled:opacity-60"
                  value={configUrls.nodeUrl}
                  onInput={(e) => {
                    setUrls({
                      nodeUrl: (e.target as HTMLInputElement).value,
                    })
                  }}
                  disabled={!canChange}
                />
              </div>
              <div className="bg-gray-100 text-sm px-2 py-2 rounded text-slate-600">
                Seeds url is a URL list, which are working as entrypoint of rings network
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2">
                <div className="font-semibold">
                  <label className="w-full text-sm block">Update Url:</label>
                </div>
                <input className="w-full h-8 px-2 mt-1 border border-gray-300 rounded outline-none disabled:opacity-60" />
                <button>Update</button>
              </div>
              <div className="bg-gray-100 text-sm px-2 py-2 rounded text-slate-600">
                You can find the update url on github
              </div>
            </div>
          </div>
        </div>
      )
    },
    (prevProps, nextProps) => {
      let shouldRerender =
        prevProps.canChange === nextProps.canChange &&
        prevProps.configUrls.turnUrl === nextProps.configUrls.turnUrl &&
        prevProps.configUrls.nodeUrl === nextProps.configUrls.nodeUrl
      console.log('shoud rerender?', shouldRerender)
      return shouldRerender
    }
  )

  const PeersStatusModal = React.memo(() => {
    const status = useContext(RingsContext)
    const peers = status.swarm?.connections ?? []
    return (
      <div
        ref={contentRef}
        className={`!absolute top-13 right-2.5 flex flex-col items-stretch w-300px h-300px -translate-y-1.5 bg-white border-angle fake-border overflow-hidden`}
      >
        <div className="p-2.5 flex items-center justify-between text-xs border-solid border-b border-gray-300">
          <span className={`scale-80 origin-left`}>
            Network Status:{' '}
            <span className={`${clients.length ? 'text-#15CD96' : 'text-#fb7185 '}`}>
              {connectedNodeStatus(status)}
            </span>
          </span>
          <span
            className="flex-1 text-right scale-80 origin-right cursor-pointer transition-all hover:translate-x-.25 underline underline-current"
            onClick={async () => {
              if (clients.length > 0) {
                await destroyClient()
                setShowModal(false)
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
              setShowModal(false)
            }}
            className="cursor-pointer scale-80 origin-right transition-all hover:translate-x-.25 underline underline-current"
          >
            Disconnect
          </span>
        </div>
        <div className="p-2.5 flex items-center justify-between text-xs border-solid border-t border-gray-300">
          <span
            onClick={() => {
              setCurrentTab('config')
              setShowModal(false)
            }}
            className="cursor-pointer scale-80 origin-left transition-all hover:translate-x-.25 underline underline-current"
          >
            Configure
          </span>
        </div>
        <div className="p-2.5 flex items-center justify-between text-xs border-solid border-t border-gray-300">
          <span
            onClick={() => {
              forceReset()
            }}
            className="cursor-pointer scale-80 origin-left transition-all hover:translate-x-.25 underline underline-current"
          >
            Force Reset
          </span>
        </div>
      </div>
    )
  })

  const Nav = () => {
    return (
      <nav className="relative p-2.5 flex justify-between items-center border-solid border-b border-gray-300">
        <div className="flex-1 text-xs">Rings Network</div>
        <PKIConnectStatus className={'h-7 border-angle fake-border bg-white'} />
        <div className="relative ml-2.5 w-7 h-7 flex-col-center border-angle">
          <span
            className={`absolute w-6 h-6 cursor-pointer transition-all ${
              clients.length ? 'text-red i-eos-icons:molecules' : 'text-gray i-eos-icons:molecules-outlined'
            } ${loading ? 'scale-x-0' : ''}`}
            onClick={() => {
              setShowModal(!showModal)
            }}
          ></span>
          <span
            className={`absolute w-6 h-6 cursor-pointer transition-all text-#15CD96 i-eos-icons:loading ${
              loading ? '' : 'scale-x-0'
            }`}
          ></span>
        </div>
      </nav>
    )
  }

  const RingsBtn = React.memo(
    ({ clients, ringsBtnCallback }: { clients: any[]; ringsBtnCallback: () => Promise<void> }) => {
      return (
        <div>
          <CircProgressBar
            labels={[]}
            index={clients.length}
            lineLength={50}
            segmentProportion={0.3} // For example, 60% of the line is the first segment
            onClick={ringsBtnCallback}
          />
        </div>
      )
    }
  )

  const TabBar = () => {
    return (
      <div className="fixed bottom-0 w-full flex justify-center items-end bg-white p-4 shadow-md border-solid border-gray-200 border-t">
        <button
          className="text-xl flex-grow"
          onClick={() => {
            setCurrentTab('status')
          }}
        >
          🌐
        </button>
        <button
          className="text-3xl text-red-500 mx-4 flex-grow"
          onClick={() => {
            setCurrentTab('main')
          }}
        >
          ⭕
        </button>
        <button
          className="text-3xl flex-grow"
          onClick={() => {
            setCurrentTab('config')
          }}
        >
          ⚙
        </button>
      </div>
    )
  }
  const ConnectStatus = () => {
    const status = useContext(RingsContext)
    return (
      <div className="p-4 relative">
        <div className="text-center text-lg font-bold mb-4">
          <span>Status</span>
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-2">
            <label>Connected Peers:</label>
          </div>
          {status.swarm?.connections?.map((c: Record<any, any>, index: number) => (
            <div key={index} className="mb-1">
              <span className="mr-2">{shorten(c.did, 15)}</span>
              <span>{c.state}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="font-semibold mb-2">
            <label>DHT Status:</label>
          </div>
          <div className="mb-1">
            <label>DID: </label>
            <span>{shorten(status.swarm?.dht?.did, 20)}</span>
          </div>
          <div className="mt-4">
            <label>Successors: </label>
            {status.swarm?.dht?.successors?.map((c: string, index: number) => (
              <div key={index} className="mb-1">
                <span>{shorten(c, 25)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label>Predecessor: </label>
            <div className="mb-1">
              <span>{shorten(status.swarm?.dht?.predecessor, 25)}</span>
            </div>
          </div>
          <div className="font-semibold mt-2">
            <label>Rings Version:</label>
          </div>
          <div className="mb-1">
            <span className="mr-2">{status.version}</span>
          </div>
        </div>
      </div>
    )
  }
  console.log('rerender status')
  return (
    <div className="w-358px h-550px flex-col-center font-pixel antialiased">
      <div className="w-full h-full">
        <Nav />
        {currentTab === 'main' && <RingsBtn clients={clients} ringsBtnCallback={ringsBtnCallback} />}
        {currentTab === 'config' && <ConfigFields canChange={clients.length > 0 ? false : true} configUrls={urls} />}
        {currentTab === 'status' && <ConnectStatus />}
        <TabBar />
      </div>
      {/* <!-- modal --> */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 bg-gray/10 block ${showModal ? 'block' : '!hidden'} `}
        onClick={(e) => {
          !contentRef.current?.contains(e.target as Node) && setShowModal(false)
        }}
      >
        <PeersStatusModal />
      </div>
    </div>
  )
}
