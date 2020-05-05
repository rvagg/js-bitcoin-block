const assert = require('assert')
const multihashing = require('multihashing')
const RIPEMD160 = require('ripemd160')
const WITNESS_SCALE_FACTOR = 4
const SEGWIT_HEIGHT = 481824

/**
 * The `COIN` constant is the number of _satoshis_ in 1 BTC, i.e. 100,000,000.
 * Transaction store values in satoshis so must be divided by `COIN` to find the
 * amount in BTC.
 *
 * @name COIN
 * @constant
 */
const COIN = 100000000

/**
 * `HASH_NO_WITNESS` is available on {@link BitcoinBlock} and {@link BitcoinTransaction}
 * and is used as an optional argument to their respective `encode()` methods
 * to signal that encoded transactions should not include witness data (i.e. their
 * pre SegWit form and the form used to generate the `txid` and transaction merkle root).
 *
 * @name HASH_NO_WITNESS
 * @constant
 */
const HASH_NO_WITNESS = Symbol.for('hash-no-witness')

/**
 * Takes a hash, in byte form, and returns it as a big-endian uint256 in hex encoded form.
 * This format is typically used by Bitcoin in its hash identifiers, particularly its
 * block hashes and transaction identifiers and hashes.
 *
 * This method simply reverses the bytes and produces a hex string from the resulting bytes.
 *
 * See {@link fromHashHex} for the reverse operation.
 *
 * @name toHashHex
 * @function
 * @param {Buffer|Uint8Array} hash
 * @returns {string}
 */
function toHashHex (hash) {
  const rev = Buffer.alloc(hash.length)
  for (let i = 0; i < hash.length; i++) {
    rev[hash.length - i - 1] = hash[i]
  }
  return rev.toString('hex')
}

/**
 * Takes a string containing a big-endian uint256 in hex encoded form and converts it
 * to a standard byte array.
 *
 * This method simply reverses the string and produces a `Buffer` from the hex bytes.
 *
 * See {@link toHashHex} for the reverse operation.
 *
 * @name fromHashHex
 * @function
 * @param {string} hashStr
 * @returns {Buffer}
 */
function fromHashHex (hashStr) {
  const buf = Buffer.from(hashStr, 'hex')
  assert(buf.length === 32)
  const mid = buf.length / 2
  for (let i = 0; i < mid; i++) {
    const bi = buf[i]
    buf[i] = buf[buf.length - i - 1]
    buf[buf.length - i - 1] = bi
  }
  return buf
}

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
