// Convert a hex string to a byte array
export function hexToBytes(hex: number | string) {
  hex = hex.toString(16)

  hex = hex.replace(/^0x/i, '')

  for (var bytes = [], c = 0; c < hex.length; c += 2) bytes.push(parseInt(hex.slice(c, c + 2), 16))
  return bytes
}

// Convert a byte array to a hex string
export function bytesToHex(bytes: number[]) {
  let hex = []
  for (let i = 0; i < bytes.length; i++) {
    let current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i]
    hex.push((current >>> 4).toString(16))
    hex.push((current & 0xf).toString(16))
  }
  return hex.join('')
}

export const sleep = (duration = 1000) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
