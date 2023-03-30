import { ProtocolWithReturn } from 'webext-bridge'

declare module 'webext-bridge' {
  export interface ProtocolMap {
    // define message protocol types
    // see https://github.com/antfu/webext-bridge#type-safe-protocols
    'tab-prev': { title: string | undefined }
    'get-current-tab': ProtocolWithReturn<{ tabId: number }, { title: string }>
    'connect-metamask': ProtocolWithReturn<
      {
        account: string
        turnUrl: string
      },
      {
        address: string
      } | null
    >
    'sign-message': ProtocolWithReturn<{ auth: string }, { signed: string }>
    'check-status': ProtocolWithReturn<
      any,
      {
        clients: any[]
        currentAccount: string | undefined
      }
    >
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
