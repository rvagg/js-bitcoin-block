const assert = require('assert')
const multihashing = require('multihashing')
const RIPEMD160 = require('ripemd160')

const COIN = 100000000
const WITNESS_SCALE_FACTOR = 4
const SEGWIT_HEIGHT = 481824
const HASH_NO_WITNESS = Symbol.for('hash-no-witness')

function decodeProperties (propertiesDescriptor) {
  return propertiesDescriptor
    .split('\n')
    .map((l) => l.replace(/\s*(\/\/.*)$/, '')) // trailing whitespace and comments
    .filter(Boolean)
    .map((p) => {
      const ls = p.lastIndexOf(' ')
      const type = ls > -1 ? p.substring(0, ls).replace(/^const /, '') : p
      const name = ls > -1 ? p.substring(ls + 1).replace(/;$/, '') : p
      return { type, name }
    })
}

function toHashHex (hash) {
  const rev = Buffer.alloc(hash.length)
  for (let i = 0; i < hash.length; i++) {
    rev[hash.length - i - 1] = hash[i]
  }
  return rev.toString('hex')
}

function fromHashHex (hash) {
  const buf = Buffer.from(hash, 'hex')
  assert(buf.length === 32)
  const mid = buf.length / 2
  for (let i = 0; i < mid; i++) {
    const bi = buf[i]
    buf[i] = buf[buf.length - i - 1]
    buf[buf.length - i - 1] = bi
  }
  return buf
}

function dblSha2256 (bytes) {
  let digest = multihashing.digest(bytes, 'sha2-256')
  digest = multihashing.digest(digest, 'sha2-256')
  return digest
}

function ripemd160 (bytes) {
  return new RIPEMD160().update(bytes).digest()
}

function hash160 (bytes) { // bitcoin ripemd-160(sha2-256(bytes))
  return ripemd160(multihashing.digest(bytes, 'sha2-256'))
}

function merkleRoot (hashes) {
  hashes = hashes.slice()

  while (hashes.length > 1) {
    if (hashes.length & 1) {
      hashes.push(hashes[hashes.length - 1])
    }
    const newHashes = []
    for (let i = 0; i < hashes.length; i += 2) {
      newHashes.push(dblSha2256(Buffer.concat([hashes[i], hashes[i + 1]])))
    }
    hashes = newHashes
  }

  return hashes[0]
}

function isHexString (str, len) {
  return (len === undefined || str.length === len) && /^[0-9a-f]*$/.test(str)
}

module.exports.decodeProperties = decodeProperties
module.exports.toHashHex = toHashHex
module.exports.fromHashHex = fromHashHex
module.exports.dblSha2256 = dblSha2256
module.exports.ripemd160 = ripemd160
module.exports.hash160 = hash160
module.exports.merkleRoot = merkleRoot
module.exports.isHexString = isHexString
module.exports.COIN = COIN
module.exports.WITNESS_SCALE_FACTOR = WITNESS_SCALE_FACTOR
module.exports.SEGWIT_HEIGHT = SEGWIT_HEIGHT
module.exports.HASH_NO_WITNESS = HASH_NO_WITNESS
