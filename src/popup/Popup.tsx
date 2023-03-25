import { metamaskProvider } from './utils/index'

export function Popup() {
  const [count] = useState(0)

  const getAccount = async () => {
    const accounts = await metamaskProvider.request({ method: 'eth_requestAccounts' })
    console.log(accounts)
  }

  return (
    <div className="container w-358px h-600px flex-col-center">
      <p>
        <button
          type="button"
          onClick={() => {
            console.log('get')
            getAccount()
          }}
          className="w-120px px-2 py-4 rounded bg-blue-600 text-base text-white"
        >
          count is: {count}
        </button>
      </p>
    </div>
  )
}
