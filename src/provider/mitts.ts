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

  const getEmitter = () => emitter
  const getInpageStream = () => inpageStream

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

    inpageStream.write({
      type: 'request',
      method,
      params,
      requestId: ++requestId,
    })

    return new Promise((resolve, reject) => {
      promiseMap.set(requestId, {
        reject,
        resolve,
      })
    })
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

  const on = (eventName: string, cb: any) => {
    emitter.on(eventName, cb)
  }

  const off = (eventName: string) => {
    emitter.off(eventName)
  }

  return {
    on,
    off,
    request,
    [Symbol('__getEmitter__')]: getEmitter,
    [Symbol('__getInpageStream__')]: getInpageStream,
  }
}

function requestHandler(payload: Record<string, any>, promiseMap: Map<any, any>) {
  let _promise = promiseMap.get(payload['requestId'])
  payload.success ? _promise.resolve(payload) : _promise.reject(payload)
}
