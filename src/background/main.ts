import init, { Client, MessageCallbackInstance, UnsignedInfo } from '@ringsnetwork/rings-node'
import { onMessage, sendMessage } from 'webext-bridge/background'
import browser from 'webextension-polyfill'

import { hexToBytes } from '~/utils'

import {
  connected,
  connectedServiceNode,
  connecting,
  disconnected,
  initFailed,
  initSuccess,
  receiveMessage,
} from './emits'
import { handlerNotification } from './notification'
import { ADDRESS_TYPE, getAddressWithType, handlerError, HttpMessageProps, Peer } from './utils'

browser.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log('Extension installed')
})

function toggleIcon(type = 'active') {
  browser.browserAction.setIcon({
    path: {
      16: `./assets/${type}_icon_16.png`,
      48: `./assets/${type}_icon_48.png`,
      128: `./assets/${type}_icon_128.png`,
      512: `./assets/${type}_icon_512.png`,
    },
  })
}

let wasmInit: any = null
let currentClient: Client | null = null
let clients: Client[] = []
let currentAccount: string | undefined
let serviceNodes = new Map<string, any[]>()

let messagePromiseMap = new Map<string, { resolve: Function; reject: Function }>()
let messageStatusMap = new Map<string, string | Record<string, any>>()
let messageIntervalMap = new Map<string, number>()

/**
 * inpage provider request method map
 */
const requestHandlerMap: Record<string, any> = {
  connectRings,
  setUrls,
  fetchPeers,
  sendMessage: sendRingsMessage,
  asyncSendMessage,
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

onMessage('destroy-client', () => {
  destroyClient()
  toggleIcon('waiting')
})

onMessage('get-peers', async () => {
  const data = await Promise.all([fetchPeers(), getServiceNodes()])
  return data
})

onMessage('request-handler', async ({ data }) => {
  const { requestId, method, params } = data

  if (method && requestHandlerMap[method]) {
    try {
      const data = await requestHandlerMap[method](params)
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

      receiveMessage({
        peer: from,
        message: {
          from,
          to,
          // message: new TextDecoder().decode(message),
        },
      })
    },
    // http response message
    async (response: any, message: any) => {
      const { tx_id } = response
      if (messageStatusMap.get(tx_id) === 'pending' && message) {
        const { body, headers, ...rest }: { body: any; headers: Map<string, string> } = message
        const parsedHeaders: { [key: string]: string } = {}

        for (const [key, value] of headers.entries()) {
          parsedHeaders[key] = value
        }

        const parsedBody = new TextDecoder().decode(new Uint8Array(body))

        console.log(`parsed`, { ...rest, headers: parsedHeaders, body: parsedBody })

        messageStatusMap.set(
          tx_id,
          JSON.stringify({ ...rest, headers: parsedHeaders, body: parsedBody, rawBody: body })
        )
      }
    },
    async (relay: any, prev: String) => {}
  )

  await client_?.listen(callback)

  const promises = data.nodeUrl.split(';').map(async (url: string) => await client_?.connect_peer_via_http(url))
  await Promise.any(promises)

  connected()
  invokeFindServiceNode()

  const info = await client_?.get_node_info()
  console.log(info)
  toggleIcon()

  return {
    clients,
    address: client_!.address,
  }
})

/**
 * inpage methods
 */

/**
 * extension method
 */

async function connectRings(query: Record<string, string> = {}) {
  return await handlerNotification('connect', query)
}

async function setUrls(urls: { turnUrl: string; nodeUrl: string }) {
  return await handlerNotification('setUrls', urls)
}

/**
 * client instance methods
 */

async function fetchPeers(): Promise<Peer[]> {
  if (!currentClient) return []
  return await currentClient.list_peers()
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
    return await currentClient.accept_answer(answer)
  }
}

async function disconnect(address: string, addr_type?: ADDRESS_TYPE) {
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

    if (nodes && nodes.length) {
      connectedServiceNode({
        nodes,
      })
    }
  }
}

function getServiceNodes(serviceType = 'ipfs_provider') {
  return serviceNodes.get(serviceType)
}

async function asyncSendMessage(message: HttpMessageProps) {
  if (!currentClient) return Promise.reject('Not Connected to Node')

  const { destination, method, path, headers } = message
  const txId = (await currentClient.send_http_request(
    destination,
    'ipfs',
    method,
    path,
    BigInt(5000),
    headers
  )) as string

  console.log('txId', txId)

  messageStatusMap.set(txId, 'pending')

  const timer = window.setInterval(() => {
    if (messageStatusMap.get(txId) && messageStatusMap.get(txId) !== 'pending') {
      clearInterval(messageIntervalMap.get(txId))

      messagePromiseMap.get(txId)?.resolve(messageStatusMap.get(txId))
      messageIntervalMap.delete(txId)
      messageStatusMap.delete(txId)
    }
  }, 1000)
  messageIntervalMap.set(txId, timer)

  const promise = new Promise<{ success: boolean }>((resolve, reject) => {
    messagePromiseMap.set(txId, { resolve, reject })
  })

  try {
    return await promise
  } catch (error) {
    Promise.reject(error)
  } finally {
    messagePromiseMap.delete(txId)
  }
}

/**
 * client methods
 */

async function destroyClient() {
  if (currentClient) {
    await currentClient.disconnect_all()
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

  serviceNodes.clear()

  disconnected()
}

async function createRingsNodeClient({
  turnUrl,
  account,
  nodeUrl,
}: {
  turnUrl: string
  account: string
  nodeUrl: string
}) {
  if (currentClient && currentAccount === account) {
    return
  }
  // init wasm
  if (!wasmInit) {
    try {
      wasmInit = await init(browser.runtime.getURL('dist/background/rings_node_bg.wasm'))
      initSuccess()
    } catch (error) {
      initFailed()
    }
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
    nodeUrl,
    signed,
    auth: unsignedInfo.auth,
    signature,
  })

  connecting()

  let client_: Client = await Client.new_client(unsignedInfo, signature, turnUrl)
  currentAccount = account
  currentClient = client_
  clients.push(client_)
  return client_
}
