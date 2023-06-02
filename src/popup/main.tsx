import ready from 'document-ready'
import { createRoot } from 'react-dom/client'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { arbitrum, bsc, mainnet, polygon } from 'wagmi/chains'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { publicProvider } from 'wagmi/providers/public'

import { metamaskProvider } from '~/provider'

import { App } from './App'

import '@unocss/reset/tailwind.css'
import 'uno.css'
import './assets/styles/index.css'

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [arbitrum, bsc, mainnet, polygon],
  [publicProvider()]
)

const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({
      chains,
      options: {
        getProvider: () => metamaskProvider,
        shimDisconnect: true,
        UNSTABLE_shimOnConnectSelectAccount: true,
      } as any,
    }),
  ],
  publicClient,
  webSocketPublicClient,
})

ready(() => {
  const root = createRoot(document.getElementById('root')!)

  root.render(
    <WagmiConfig config={config}>
      <App />
    </WagmiConfig>
  )
})
