import { WindowPostMessageStream } from '@metamask/post-message-stream'
import mitt from 'mitt'

interface RequestArguments {
  method: string
  params?: unknown[] | object
}

const CONTENT_SCRIPT = 'rings-contentscript'
const INPAGE = 'rings-inpage'

/**
 * tiny-provider
 * @returns {
 *  request: () => void
 * }
 */
export function createProvider() {
  const emitter = mitt()
  const inpageStream = new WindowPostMessageStream<
    RequestArguments & {
      requestId: number
      type: string
    },
    {
      type: string
      payload: Record<string, any>
    }
  >({
    name: INPAGE,
    target: CONTENT_SCRIPT,
  })

  let promiseMap = new Map()
  let requestId = -1

  async function request(args: RequestArguments) {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw new Error('Invalid request params')
    }

    const { method, params } = args
    if (typeof method !== 'string' || !method) {
      throw new Error('Invalid request params. Should be like { method, params } ')
    }

    console.log(method, params)

    const payload = { type: 'request', method, params, requestId: ++requestId }
    inpageStream.write(payload)

    const promise = new Promise<{ success: boolean }>((resolve, reject) => {
      promiseMap.set(requestId, { resolve, reject })
    })

    const response = await promise
    return response.success ? response : Promise.reject(response)
  }

  inpageStream.on('data', async ({ type, payload }) => {
    switch (type) {
      case 'request':
        requestHandler(payload, promiseMap)
        break
      case 'accountChange':
        // do something
        break
      case 'connected':
        // do something
        break
      case 'disconnected':
        // do something
        break
      case 'onMessage':
        // do something
        break
      default:
        break
    }
  })

  const on = emitter.on.bind(emitter)
  const off = emitter.off.bind(emitter)

  return {
    on,
    off,
    request,
    help,
    [Symbol('__getEmitter__')]: () => emitter,
    [Symbol('__getInpageStream__')]: () => inpageStream,
  }
}

function requestHandler(payload: Record<string, any>, promiseMap: Map<any, any>) {
  const { requestId, success } = payload
  const _promise = promiseMap.get(payload['requestId'])
  _promise[success ? 'resolve' : 'reject'](payload)
  promiseMap.delete(requestId)
}

function help() {
  console.log(`Support request methods:
fetchPeers,
sendMessage,
connectByAddress,
createOffer,
answerOffer,
acceptAnswer,
disconnect,
getNodeInfo,
getServiceNodes`)
}
