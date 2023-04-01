export enum ADDRESS_TYPE {
  DEFAULT,
  ED25519,
  APTOS,
  UNKNOWN,
}

export const handlerError = (error: unknown) => {
  return {
    success: false,
    error,
  }
}

export const getAddressWithType = (address: string) => {
  const _address = address?.replace(/^0x/, '')
  const len = _address.length

  switch (len) {
    // etherum address
    // case 40:
    //   return { type: ADDRESS_TYPE.DEFAULT, address: `0x${_address.toLowerCase()}` }
    // solana address
    case 43:
    case 44:
      return { type: ADDRESS_TYPE.ED25519, address }
    // aptos address
    case 60:
    case 61:
    case 62:
      return { type: ADDRESS_TYPE.APTOS, address: `0x${_address.toLowerCase()}` }
    default:
      // etherum address
      return { type: ADDRESS_TYPE.DEFAULT, address: `0x${_address.toLowerCase()}` }
  }
}
