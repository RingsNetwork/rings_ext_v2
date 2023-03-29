// Convert a hex string to a byte array
export function hexToBytes(hex: string) {
  const result = []
  for (let i = 0; i < hex.length; i += 2) {
    result.push(parseInt(hex.substr(i, 2), 16))
  }
  return result
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
