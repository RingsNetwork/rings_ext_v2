import { useAccount, useBlockNumber, useConnect, useDisconnect } from 'wagmi'
import { signMessage } from 'wagmi/actions'
import { onMessage, sendMessage } from 'webext-bridge/popup'

import { NetworkSwitcher } from './components/SwitchNetworks'

export function Popup() {
  const { data } = useBlockNumber({ watch: true })
  const { address, isConnected } = useAccount()
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()

  const { disconnect } = useDisconnect()

  useEffect(() => {
    onMessage('sign-message', async ({ data }) => {
      const signed = await signMessage({
        message: data.auth,
      })

      return {
        signed,
      }
    })
  }, [])

  return (
    <div
      style={{
        fontFamily: 'Dogica Pixel',
      }}
      className="container w-358px h-600px flex-col-center"
    >
      <div className="w-full h-full">
        <div className="text-base">Account: {address}</div>
        <div>Block number: {data}</div>
        <div>
          {connectors.map((connector) => (
            <button
              className="w-120px flex-col-center h-10 rounded bg-blue-600 text-sm text-white"
              disabled={!connector.ready}
              key={connector.id}
              onClick={() => connect({ connector })}
            >
              {connector.name}
              {isLoading && pendingConnector?.id === connector.id && ' (connecting)'}
            </button>
          ))}
          {isConnected && (
            <button
              className="w-100px flex-col-center h-10 rounded bg-red-600 text-sm text-white"
              onClick={() => {
                disconnect()
              }}
            >
              Disconnect
            </button>
          )}
        </div>

        {error && <div>{error.message}</div>}
      </div>

      <NetworkSwitcher />
      <button
        className="w-120px flex-col-center h-10 rounded bg-blue-600 text-sm text-white"
        onClick={async () => {
          if (address) {
            const data = await sendMessage('connect-metamask', {
              account: address,
              turnUrl: 'stun://stun.qq.com:3478',
            })

            console.log(data)
          }
        }}
      >
        Get bg
      </button>
    </div>
  )
}
