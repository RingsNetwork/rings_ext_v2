import { ProtocolWithReturn } from 'webext-bridge'

declare module 'webext-bridge' {
  export interface ProtocolMap {
    // define message protocol types
    // see https://github.com/antfu/webext-bridge#type-safe-protocols
    'tab-prev': { title: string | undefined }
    'get-current-tab': ProtocolWithReturn<{ tabId: number }, { title: string }>
    'init-background': ProtocolWithReturn<
      {
        account: string
        turnUrl: string
        nodeUrl: string
      },
      {
        address: string
        clients: any[]
      }
    >
    'sign-message': ProtocolWithReturn<{ auth: string }, { signed: string }>
    'check-status': ProtocolWithReturn<
      any,
      {
        clients: any[]
        currentAccount: string | undefined
      }
    >
    'request-handler': ProtocolWithReturn<
      {
        type: string
        requestId: number
      } & Record<string, any>,
      {
        success?: boolean
        requestId: number
      } & Record<string, any>
    >
    'destroy-client': any
  }
}

declare module '@metamask/post-message-stream' {
  interface WindowPostMessageStream<P = any, D = any> {
    on: (type: 'data' | 'error', cb: (data: D) => void) => void
    write: (data: P) => boolean
  }
}

declare global {
  interface Window {
    rings: any
  }
}
