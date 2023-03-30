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
    if (type === 'request') {
      let _promise = promiseMap.get(payload['requestId'])
      if (payload.success) {
        _promise.resolve(payload.data)
      } else {
        _promise.reject(payload.data)
      }
    }

    if (type === 'accountChange') {
      // do something
    }

    if (type === 'connected') {
    }

    if (type === 'disconnected') {
    }

    if (type === 'onMessage') {
      // do something
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
