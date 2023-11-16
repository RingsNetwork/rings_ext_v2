import init, {
  Client,
  MessageCallbackInstance,
  debug
} from '@ringsnetwork/rings-node'

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
let watcherId: any = null

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
  disconnect,
  getNodeInfo,
  getServiceNodes,
}

// create callback for handle custom message
const gen_callback = (): MessageCallbackInstance => {
  return new MessageCallbackInstance(
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
    async (relay: any, prev: String) => { }
  )
}


onMessage('get-client', async () => {
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

  if (!currentClient) return {
    success: false,
    requestId,
  }

  let client_ = currentClient;
  if (method && requestHandlerMap[method]) {
    try {
      const data = await requestHandlerMap[method](params)
      return {
        success: true,
        requestId,
        ...data,
      }
    } catch (error) {
      return { requestId, ...handlerError(error) }
    }
  }

  if (method) {
    try {
      const resp = await client_?.request(method, params)
      return {
        success: true,
        requestId,
        native: true,
        result: resp.result,
      }
    } catch (error) {
      console.error(error)
      return { requestId, ...handlerError(error) }
    }
  }
  return {
    success: false,
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
  await client_?.listen()
  await statusWatcher()
  toggleIcon('active')
  return {
    clients,
    address: client_!.address,
  }
})

// connect node seed
onMessage("connect-node", async ({ data }) => {
  if (!currentClient) return
  let client_ = currentClient;
  try {
    const promises = data.url.split(';').map(async (url: string) => {

      return await client_?.connect_peer_via_http(url)

    })
    await Promise.any(promises)
    connected()
  } catch (e) {
    console.error('failed on connect seed node: ', data)
  }
  invokeFindServiceNode()

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
    clearInterval(watcherId)
    watcherId = null;
  }

  if (currentAccount) {
    currentAccount = undefined
  }

  serviceNodes.clear()

  disconnected()
  console.log("successfully destory client")
}

async function statusWatcher() {
  let interval = 1000
  watcherId = setInterval(() => {
    if (!currentClient) return
    let client_ = currentClient;
    (async () => {
      const status = await client_?.request('nodeInfo', []);
      if (status !== undefined) {
        try {
          await sendMessage("node-status-change", status!, "popup");
        } catch (e) {
        }
      }
    })()
  }, interval);
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
  try {
    console.log(turnUrl, nodeUrl, account)
    if (currentClient && currentAccount === account) {
      return
    }
    // init wasm
    if (!wasmInit) {
      try {
        wasmInit = await init(browser.runtime.getURL('dist/background/rings_node_bg.wasm'))
        initSuccess()
        debug(true)
        console.log("Successfuly init WASM module")
      } catch (error) {
        initFailed()
      }
    }
    connecting()

    let signer = async (proof: string): Promise<Uint8Array> => {
      const { signed } = await sendMessage(
        'sign-message',
        {
          auth: proof,
        },
        'popup'
      )
      return new Uint8Array(hexToBytes(signed));
    }
    let callback = gen_callback()
    let client_: Client = await new Client(
      // ice_servers
      turnUrl,
      // stable_timeout
      60,
      // account
      account,
      // account type
      "eip191",
      // signer
      signer,
      // callback
      callback
    )
    console.log("successfully created client")
    currentAccount = account
    currentClient = client_
    clients.push(client_)
    return client_
  } catch (e) {
    console.error(e)
  }
}
