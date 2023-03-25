import { createWalletClient, custom } from 'viem'
import { mainnet } from 'viem/chains'

import { metamaskProvider } from './utils/index'

const walletClient = createWalletClient({
  chain: mainnet,
  transport: custom(metamaskProvider),
})

export function Popup() {
  const [account, setAccount] = useState('')

  const getAccount = async () => {
    const accounts = await walletClient.requestAddresses()

    if (accounts?.[0]) {
      setAccount(accounts[0])
    }
  }

  return (
    <div className="container w-358px h-600px flex-col-center">
      <div className="w-full h-full">
        <div>{account}</div>
        <button
          type="button"
          onClick={() => {
            console.log('get')
            getAccount()
          }}
          className="w-120px px-2 py-2 rounded bg-blue-600 text-base text-white"
        >
          Get Account
        </button>
      </div>
    </div>
  )
}
