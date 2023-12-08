import init, {
  Provider,
  BackendContext,
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
let currentProvider: Provider | null = null
let providers: Provider[] = []
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
const gen_callback = (): BackendContext => {
  return new BackendContext(
    // service message handler
    async (provider: any, response: any, message: any) => {
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
    // plaintext message handler
    async (provider: any, response: any, message: any) => {
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

    async (relay: any, prev: String) => { }
  )
}


onMessage('get-provider', async () => {
  return {
    providers,
    currentAccount,
  }
})

onMessage('destroy-provider', () => {
  destroyProvider()
  toggleIcon('waiting')
})

onMessage('get-peers', async () => {
  const data = await Promise.all([fetchPeers(), getServiceNodes()])
  return data
})

onMessage('request-handler', async ({ data }) => {
  const { requestId, method, params } = data

  if (!currentProvider) return {
    success: false,
    requestId,
  }

  let provider_ = currentProvider;
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
      const resp = await provider_?.request(method, params)
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

// init background provider
onMessage('init-background', async ({ data }) => {
  if (currentProvider) {
    return {
      providers,
      address: currentProvider!.address,
    }
  }
  const provider_ = await createRingsNodeProvider(data)
  await provider_?.listen()
  await statusWatcher()
  toggleIcon('active')
  return {
    providers,
    address: provider_!.address,
  }
})

// connect node seed
onMessage("connect-node", async ({ data }) => {
  if (!currentProvider) return
  let provider_ = currentProvider;
  try {
    const promises = data.url.split(';').map(async (url: string) => {

      return await provider_?.connect_peer_via_http(url)

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
 * provider instance methods
 */

async function fetchPeers(): Promise<Peer[]> {
  if (!currentProvider) return []
  return await currentProvider.list_peers()
}

async function sendRingsMessage(to: string, message: string) {
  if (currentProvider) {
    return await currentProvider.send_message(to, new TextEncoder().encode(message))
  }
}

async function connectByAddress(address: string) {
  if (currentProvider && currentAccount) {
    return await currentProvider.connect_with_address(address, getAddressWithType(currentAccount).type)
  }
}

async function disconnect(address: string, addr_type?: ADDRESS_TYPE) {
  if (currentProvider && address) {
    return await currentProvider.disconnect(address, addr_type)
  }
}

async function getNodeInfo() {
  if (currentProvider) {
    return await currentProvider.get_node_info()
  }
}

function invokeFindServiceNode(serviceType = 'ipfs_provider', duration = 3000) {
  findServiceNode()

  console.log(serviceNodes.get(serviceType))

  const timer = setInterval(() => {
    console.log('findServiceNode', serviceNodes.get(serviceType))

    if (serviceNodes.get(serviceType)?.length || !currentProvider) {
      clearInterval(timer)
      return
    }
    findServiceNode()
  }, duration)
}

async function findServiceNode(serviceType = 'ipfs_provider') {
  if (currentProvider && !serviceNodes.get(serviceType)?.length) {
    const nodes = await currentProvider.lookup_service(serviceType)
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
  if (!currentProvider) return Promise.reject('Not Connected to Node')

  const { destination, method, path, headers } = message
  const txId = (await currentProvider.send_http_request(
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
 * provider methods
 */

async function destroyProvider() {
  if (currentProvider) {
    await currentProvider.disconnect_all()
    providers.includes(currentProvider) &&
      providers.splice(
        providers.findIndex((c) => currentProvider === c),
        1
      )
    currentProvider = null
    clearInterval(watcherId)
    watcherId = null;
  }

  if (currentAccount) {
    currentAccount = undefined
  }

  serviceNodes.clear()

  disconnected()
  console.log("successfully destory provider")
}

async function statusWatcher() {
  let interval = 1000
  watcherId = setInterval(() => {
    if (!currentProvider) return
    let provider_ = currentProvider;
    (async () => {
      const status = await provider_?.request('nodeInfo', []);
      if (status !== undefined) {
        try {
          await sendMessage("node-status-change", status!, "popup");
        } catch (e) {
        }
      }
    })()
  }, interval);
}


async function createRingsNodeProvider({
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
    if (currentProvider && currentAccount === account) {
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
    let provider_: Provider = await new Provider(
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
    console.log("successfully created provider")
    currentAccount = account
    currentProvider = provider_
    providers.push(provider_)
    return provider_
  } catch (e) {
    console.error(e)
  }
}
