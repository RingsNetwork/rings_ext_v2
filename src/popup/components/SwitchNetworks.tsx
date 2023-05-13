import { useNetwork, useSwitchNetwork } from 'wagmi'

export function NetworkSwitcher() {
  const { switchNetwork } = useSwitchNetwork()
  const { chains, chain } = useNetwork()

  if (!chain) return null

  return (
    <div className="py-1 px-1.5 text-xs">
      {switchNetwork && (
        <div className="flex flex-col gap-1">
          {chains.map((x) =>
            x.id === chain?.id ? null : (
              <button
                className="relative flex-col-center px-1.5 h-6 rounded text-xs scale-90 border-angle fake-border"
                key={x.id}
                onClick={() => switchNetwork(x.id)}
              >
                {x.name.split(' ')[0]}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
