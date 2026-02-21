/**
 * @param {Uint8Array[]} buffers
 * @returns {Uint8Array}
 */
export function concat (buffers) {
  if (!buffers.length) {
    return new Uint8Array(0)
  }
  let length = 0
  for (let i = 0; i < buffers.length; i++) {
    length += buffers[i].length
  }

  const ret = new Uint8Array(length)
  let pos = 0
  for (let i = 0; i < buffers.length; i++) {
    ret.set(buffers[i], pos)
    pos += buffers[i].length
  }

  return ret
}

// from https://github.com/feross/buffer, thanks
const hexSliceLookupTable = (function () {
  const alphabet = '0123456789abcdef'
  const table = new Array(256)
  for (let i = 0; i < 16; ++i) {
    const i16 = i * 16
    for (let j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

/**
 * @param {Uint8Array} buf
 * @returns {string}
 */
export function toHex (buf) {
  let ret = ''
  for (let i = 0; i < buf.length; i++) {
    ret += hexSliceLookupTable[buf[i]]
  }
  return ret
}

/**
 * @param {string} hex
 * @returns {Uint8Array}
 */
export function fromHex (hex) {
  const buf = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length / 2; i++) {
    buf[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return buf
}
