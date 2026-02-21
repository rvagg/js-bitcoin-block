import BitcoinBlock, { BitcoinBlockHeaderOnly } from './classes/Block.js'
import BitcoinTransaction from './classes/Transaction.js'
import BitcoinTransactionIn from './classes/TransactionIn.js'
import BitcoinTransactionOut from './classes/TransactionOut.js'
import BitcoinOutPoint from './classes/OutPoint.js'
import { setup, decodeType, encodeType } from './coding.js'
import * as allClasses from './classes/index.js'
import { toHashHex, fromHashHex, COIN, dblSha2256, merkle, merkleRoot } from './classes/class-utils.js'
import { concat } from './util.js'

// Populate the class registry used by coding.js for encode/decode
setup(allClasses)

/**
 * @param {Uint8Array} buf
 * @param {boolean} [strictLengthUsage]
 * @returns {BitcoinBlock}
 */
BitcoinBlock.decode = function decodeBlock (buf, strictLengthUsage) {
  return decodeType(buf, 'CBlockHeader', strictLengthUsage)
}

/**
 * @param {Uint8Array} buf
 * @param {boolean} [strictLengthUsage]
 * @returns {BitcoinBlock}
 */
BitcoinBlock.decodeHeaderOnly = function decodeBlockHeaderOnly (buf, strictLengthUsage) {
  return decodeType(buf, 'CBlockHeader__Only', strictLengthUsage)
}

/**
 * @param  {...any} args
 * @returns {Uint8Array}
 */
BitcoinBlock.prototype.encode = function (...args) {
  return concat([...encodeType(this, args)])
}

/**
 * @param  {...any} args
 * @returns {Uint8Array}
 */
BitcoinBlockHeaderOnly.prototype.encode = function (...args) {
  return concat([...encodeType(this, args)])
}

/**
 * @param {Uint8Array} buf
 * @param {boolean} [strictLengthUsage]
 * @returns {any}
 */
BitcoinTransaction.decode = function decodeTransaction (buf, strictLengthUsage) {
  return decodeType(buf, 'CTransaction', strictLengthUsage)
}

/**
 * @param  {...any} args
 * @returns {Uint8Array}
 */
BitcoinTransaction.prototype.encode = function (...args) {
  return concat([...encodeType(this, args)])
}

export {
  BitcoinBlock,
  BitcoinBlockHeaderOnly,
  BitcoinTransaction,
  BitcoinTransactionIn,
  BitcoinTransactionOut,
  BitcoinOutPoint,
  toHashHex,
  fromHashHex,
  COIN,
  dblSha2256,
  merkle,
  merkleRoot
}
