import init, { Client, debug, MessageCallbackInstance, UnsignedInfo } from '@ringsnetwork/rings-node'
import { onMessage, sendMessage } from 'webext-bridge/background'
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
let client: Client | null = null

const createRingsNodeClient = async ({ turnUrl, account }: { turnUrl: string; account: string }) => {
  if (client) {
    return
  }
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
    'popup'
  )
  const signature = new Uint8Array(hexToBytes(signed))

  debug(true)
  let client_: Client = await Client.new_client(unsignedInfo, signature, turnUrl)
  client = client_
  return client_
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
  const callback = new MessageCallbackInstance(
    // custom message
    async (response: any, message: any) => {
      console.group('on custom message')
      const { relay } = response
      console.log(`relay`, relay)
      console.log(`destination`, relay.destination)
      console.log(message)
      console.log(new TextDecoder().decode(message))
      const to = relay.destination.replace(/^0x/, '')
      const from = relay.path[0].replace(/^0x/, '')
      console.log(`from`, from)
      console.log(`to`, to)
      console.groupEnd()

      // dispatch({
      //   type: RECEIVE_MESSAGE,
      //   payload: {
      //     peer: from,
      //     message: {
      //       from,
      //       to,
      //       // message: new TextDecoder().decode(message)
      //     },
      //   },
      // })
    },
    // http response message
    async (response: any, message: any) => {
      console.group('on http response message')
      const { tx_id } = response
      console.log(`txId`, tx_id)
      console.log(`message`, message)
      // if (MESSAGE.current[tx_id] === 'pending') {
      //   // const { http_server } = JSON.parse(new TextDecoder().decode(message))
      //   // console.log(`json`, http_server)
      //   if (message) {
      //     const { body, headers, ...rest }: { body: any; headers: Map<string, string> } = message
      //     const parsedHeaders: { [key: string]: string } = {}

      //     for (const [key, value] of headers.entries()) {
      //       parsedHeaders[key] = value
      //     }

      //     const parsedBody = new TextDecoder().decode(new Uint8Array(body))
      //     console.log(`parsed`, { ...rest, headers: parsedHeaders, body: parsedBody })

      //     MESSAGE.current[tx_id] = JSON.stringify({ ...rest, headers: parsedHeaders, body: parsedBody })
      //   }
      // }
      console.groupEnd()
    },
    async (relay: any, prev: String) => {
      // console.group('on builtin message')
      // console.log(relay)
      // console.log(prev)
      // console.groupEnd()
    }
  )
  console.log(callback)
  await client?.listen(callback)

  const connected = await client?.connect_peer_via_http('https://41d.1n.gs')
  console.log(connected)

  const info = await client?.get_node_info()
  console.log(info)
  return {
    address: client!.address,
  }
})
