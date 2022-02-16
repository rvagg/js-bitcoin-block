const { toHex, fromHex, concat } = require('../util')
const assert = require('assert')
const { hash: sha256 } = require('@stablelib/sha256')
const RIPEMD160 = require('@rvagg/ripemd160')
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
 * @param {Uint8Array} hash
 * @returns {string}
 */
function toHashHex (hash) {
  const rev = new Uint8Array(hash.length)
  for (let i = 0; i < hash.length; i++) {
    rev[hash.length - i - 1] = hash[i]
  }
  return toHex(rev)
}

/**
 * Takes a string containing a big-endian uint256 in hex encoded form and converts it
 * to a standard byte array.
 *
 * This method simply reverses the string and produces a `Uint8Array` from the hex bytes.
 *
 * See {@link toHashHex} for the reverse operation.
 *
 * @name fromHashHex
 * @function
 * @param {string} hashStr
 * @returns {Uint8Array}
 */
function fromHashHex (hashStr) {
  const buf = fromHex(hashStr)
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

/**
 * Perform a standard Bitcoin double SHA2-256 hash on a binary blob.
 * SHA2-256(SHA2-256(bytes))
 *
 * @param {Uint8Array} bytes a Uint8Array
 * @returns {Uint8Array} a 32-byte digest
 * @function
 */
function dblSha2256 (bytes) {
  return sha256(sha256(bytes))
}

function ripemd160 (bytes) {
  return new RIPEMD160().update(bytes).digest()
}

function hash160 (bytes) { // bitcoin ripemd-160(sha2-256(bytes))
  return ripemd160(sha256(bytes))
}

/**
 * Generate a merkle root using {@link dblSha2256} on each node. The merkle tree uses Bitcoin's
 * algorithm whereby a level with an odd number of nodes has the last node duplicated.
 *
 * @param {Array<Uint8Array>} hashes
 * @returns {Uint8Array} the merkle root hash
 * @function
 */
function merkleRoot (hashes) {
  let last
  for (last of merkle(hashes)) {
    // empty
  }
  return last.hash
}

/**
 * Generate a merkle tree using {@link dblSha2256} on each node. The merkle tree uses Bitcoin's
 * algorithm whereby a level with an odd number of nodes has the last node duplicated.
 *
 * This generator function will `yield` `{ hash, data }` elements for each node of the merkle
 * tree where `data` is a two-element array containing hash `Uint8Array`s of the previous level
 * and `hash` is a `Uint8Array` containing the hash of those concatenated hashes.
 *
 * It is possible for a result to _not_ contain a `data` element if the input hashes array
 * contains only one element, in this case, that single element will be the merkle root and
 * the only result yielded, as `{ hash }`.
 *
 * The final yielded result is the merkle root.
 *
 * @param {Array<Uint8Array>} hashes
 * @yields {object} `{ hash, data }` where `data` is an array of two hashes
 * @generator
 * @function
 */
function * merkle (hashes) {
  hashes = hashes.slice()

  if (hashes.length === 1) {
    yield { hash: hashes[0] }
    return
  } else if (hashes.length === 0) {
    throw new Error('Hash array must have at least one element')
  }

  while (hashes.length > 1) {
    if (hashes.length & 1) {
      hashes.push(hashes[hashes.length - 1])
    }
    const newHashes = []
    for (let i = 0; i < hashes.length; i += 2) {
      const data = [hashes[i], hashes[i + 1]]
      const hash = dblSha2256(concat(data))
      yield { hash, data }
      newHashes.push(hash)
    }
    hashes = newHashes
  }
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
module.exports.merkle = merkle
module.exports.isHexString = isHexString
module.exports.COIN = COIN
module.exports.WITNESS_SCALE_FACTOR = WITNESS_SCALE_FACTOR
module.exports.SEGWIT_HEIGHT = SEGWIT_HEIGHT
module.exports.HASH_NO_WITNESS = HASH_NO_WITNESS
