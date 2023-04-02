import init, { Client, MessageCallbackInstance, UnsignedInfo } from '@ringsnetwork/rings-node'
import { onMessage, sendMessage } from 'webext-bridge/background'
import browser from 'webextension-polyfill'

import { hexToBytes } from '~/utils'

import { ADDRESS_TYPE, getAddressWithType, handlerError } from './utils'

browser.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log('Extension installed')
})

let wasmInit: any = null
let currentClient: Client | null = null
let clients: Client[] = []
let currentAccount: string | undefined
let serviceNodes = new Map<string, any[]>()

/**
 * inpage provider request method map
 */
const requestHandlerMap: Record<string, any> = {
  fetchPeers,
  sendMessage: sendRingsMessage,
  connectByAddress,
  createOffer,
  answerOffer,
  acceptAnswer,
  disconnect,
  getNodeInfo,
  getServiceNodes,
}

onMessage('check-status', async () => {
  return {
    clients,
    currentAccount,
  }
})

onMessage('destroy-client', destroyClient)

onMessage('request-handler', async ({ data }) => {
  const requestId = data.requestId
  const method = data.method
  if (requestHandlerMap[method]) {
    try {
      const data = await requestHandlerMap[method]()
      return {
        success: true,
        requestId,
        data,
      }
    } catch (error) {
      return { requestId, ...handlerError(error) }
    }
  }

  return {
    success: true,
    currentAccount,
    requestId,
  }
})

export interface Peer {
  address: string
  state: string | undefined
  transport_pubkey: string
  transport_id: string
  name: string
  bns: string
  ens: string
  type: ADDRESS_TYPE
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

// init background client
onMessage('init-background', async ({ data }) => {
  if (currentClient) {
    return {
      clients,
      address: currentClient!.address,
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

  const promises = data.nodeUrl.split(';').map(async (url: string) => await client_?.connect_peer_via_http(url))
  await Promise.any(promises)

  invokeFindServiceNode()

  const info = await client_?.get_node_info()
  console.log(info)

  return {
    clients,
    address: client_!.address,
  }
})

/**
 * inpage methods
 */

async function fetchPeers(): Promise<Peer[]> {
  if (!currentClient) return []
  return currentClient.list_peers()
}

async function sendRingsMessage(to: string, message: string) {
  if (currentClient) {
    return await currentClient.send_message(to, new TextEncoder().encode(message))
  }
}

async function connectByAddress(address: string) {
  if (currentClient && currentAccount) {
    return await currentClient.connect_with_address(address, getAddressWithType(currentAccount).type)
  }
}

async function createOffer() {
  if (currentClient) {
    return (await currentClient.create_offer()) as string
  }
}

async function answerOffer(offer: string) {
  if (currentClient && offer) {
    return await currentClient.answer_offer(offer)
  }
}

async function acceptAnswer(transportId: any, answer: any) {
  if (currentClient && transportId) {
    return await currentClient.accept_answer(transportId, answer)
  }
}

async function disconnect(address: string, addr_type?: number) {
  if (currentClient && address) {
    return await currentClient.disconnect(address, addr_type)
  }
}

async function getNodeInfo() {
  if (currentClient) {
    return await currentClient.get_node_info()
  }
}

function invokeFindServiceNode(serviceType = 'ipfs_provider', duration = 3000) {
  findServiceNode()

  console.log(serviceNodes.get(serviceType))

  const timer = setInterval(() => {
    console.log('findServiceNode', serviceNodes.get(serviceType))

    if (serviceNodes.get(serviceType)?.length || !currentClient) {
      clearInterval(timer)
      return
    }
    findServiceNode()
  }, duration)
}

async function findServiceNode(serviceType = 'ipfs_provider') {
  if (currentClient && !serviceNodes.get(serviceType)?.length) {
    const nodes = await currentClient.lookup_service(serviceType)
    serviceNodes.set(serviceType, nodes)
  }
}

function getServiceNodes(serviceType = 'ipfs_provider') {
  return serviceNodes.get(serviceType)
}

function destroyClient() {
  if (currentClient) {
    clients.includes(currentClient) &&
      clients.splice(
        clients.findIndex((c) => currentClient === c),
        1
      )
    currentClient = null
  }

  if (currentAccount) {
    currentAccount = undefined
  }
}

async function createRingsNodeClient({ turnUrl, account }: { turnUrl: string; account: string }) {
  if (currentClient && currentAccount === account) {
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
  currentAccount = account
  currentClient = client_
  clients.push(client_)
  return client_
}
