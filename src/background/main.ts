import init, { Client, MessageCallbackInstance, UnsignedInfo } from '@ringsnetwork/rings-node'
import { onMessage, sendMessage } from 'webext-bridge/background'
import browser from 'webextension-polyfill'

import { hexToBytes } from '~/utils'

browser.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log('Extension installed')
})

let wasmInit: any = null
let client: Client | null = null
let currentAccount: string | undefined

onMessage('check-status', async () => {
  return {
    clients: client ? [client] : [],
    currentAccount,
  }
})

onMessage('request-handler', async ({ data }) => {
  return {
    success: true,
    currentAccount,
    requestId: data.requestId,
  }
})

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
  if (!data.account) return null
  if (client) {
    return {
      address: client!.address,
    }
  }
  const client_ = await createRingsNodeClient(data)
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

  await client_?.listen(callback)

  await client_?.connect_peer_via_http('https://41d.1n.gs')

  const info = await client_?.get_node_info()
  console.log(info)

  return {
    address: client_!.address,
  }
})

async function createRingsNodeClient({ turnUrl, account }: { turnUrl: string; account: string }) {
  if (client && currentAccount === account) {
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

  console.log({
    account,
    turnUrl,
    signed,
    auth: unsignedInfo.auth,
    signature,
  })

  let client_: Client = await Client.new_client(unsignedInfo, signature, turnUrl)
  client = client_
  return client_
}
