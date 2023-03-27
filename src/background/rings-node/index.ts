import type { InitOutput } from '@ringsnetwork/rings-node'
import init, { Client, UnsignedInfo } from '@ringsnetwork/rings-node'
import { signMessage } from 'wagmi/actions'

import { hexToBytes } from '~/utils'

let wasmInitd: null | InitOutput = null

export const createSignedInfo = async ({ account }: { account: string }) => {
  const unsignedInfo = new UnsignedInfo(account)
  const signed = await signMessage({
    message: unsignedInfo.auth,
  })
  const signature = new Uint8Array(hexToBytes(signed))

  return {
    unsignedInfo,
    signature,
  }
}

export const createRingsNodeClient = async ({ turnUrl, account }: { turnUrl: string; account: string }) => {
  if (!wasmInitd) {
    wasmInitd = await init()
  }

  const { unsignedInfo, signature } = await createSignedInfo({ account })

  return await Client.new_client(unsignedInfo, signature, turnUrl)
}
