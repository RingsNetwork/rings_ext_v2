import init, { Client, UnsignedInfo } from '@ringsnetwork/rings-node'
import { onMessage, sendMessage } from 'webext-bridge'
import type { Tabs } from 'webextension-polyfill'
import browser from 'webextension-polyfill'

import { hexToBytes } from '~/utils'

browser.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log('Extension installed')
})

let previousTabId = 0

// communication example: send previous tab title from background page
// see shim.d.ts for type declaration
browser.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!previousTabId) {
    previousTabId = tabId
    return
  }

  let tab: Tabs.Tab

  try {
    tab = await browser.tabs.get(previousTabId)
    previousTabId = tabId
  } catch {
    return
  }

  // eslint-disable-next-line no-console
  console.log('previous tab', tab)
  sendMessage('tab-prev', { title: tab.title }, { context: 'content-script', tabId })
})

onMessage('get-current-tab', async () => {
  try {
    const tab = await browser.tabs.get(previousTabId)
    return {
      title: `${tab?.id ?? ''}`,
    }
  } catch {
    return {
      title: '',
    }
  }
})

let wasmInit: any = null

const createRingsNodeClient = async ({ turnUrl, account }: { turnUrl: string; account: string }) => {
  // init wasm
  if (!wasmInit) {
    wasmInit = await init(browser.runtime.getURL('dist/background/rings_node_bg.wasm'))
  }

  // prepare auth & send to metamask for sign
  const unsignedInfo = new UnsignedInfo(account)
  const { signed } = await sendMessage(
    'sign-message',
    {
      auth: unsignedInfo.auth,
    },
    {
      context: 'popup',
      tabId: 1,
    }
  )
  const signature = new Uint8Array(hexToBytes(signed))

  return await Client.new_client(unsignedInfo, signature, turnUrl)
}

// Provider
// client: Client | null,
// fetchPeers: () => Promise<Peer[]>,
// sendMessage: (to: string, message: string) => Promise<void>,
// connectByAddress: (address: string) => Promise<void>,
// createOffer: () => Promise<void>,
// answerOffer: (offer: any) => Promise<void>,
// acceptAnswer: (transportId: any, answer: any) => Promise<void>,
// turnUrl: string,
// setTurnUrl: (turnUrl: string) => void,
// nodeUrl: string,
// setNodeUrl: (nodeUrl: string) => void,
// status: string,
// node: string,
// nodeStatus: string,
// setStatus: (status: string) => void,
// disconnect: () => void,
// state: StateProps,
// dispatch: React.Dispatch<any>,
// startChat: (peer: string) => void,
// endChat: (peer: string) => void,
// asyncSendMessage: (message: HttpMessageProps) => Promise<any>

// init client
onMessage('connect-metamask', async ({ data }) => {
  const client = await createRingsNodeClient(data)

  return client
})
