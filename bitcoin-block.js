const BitcoinBlock = require('./classes/Block')
const BitcoinTransaction = require('./classes/Transaction')
const BitcoinTransactionIn = require('./classes/TransactionIn')
const BitcoinTransactionOut = require('./classes/TransactionOut')
const BitcoinOutPoint = require('./classes/OutPoint')
const coding = require('./coding')(require('./classes/'))
const { toHashHex, fromHashHex, COIN, dblSha2256, merkle, merkleRoot } = require('./classes/class-utils')
const { concat } = require('./util')

/**
 * @param {Uint8Array} buf
 * @param {boolean} [strictLengthUsage]
 * @returns {BitcoinBlock}
 */
BitcoinBlock.decode = function decodeBlock (buf, strictLengthUsage) {
  return coding.decodeType(buf, 'CBlockHeader', strictLengthUsage)
}

/**
 * @param {Uint8Array} buf
 * @param {boolean} [strictLengthUsage]
 * @returns {BitcoinBlock}
 */
BitcoinBlock.decodeHeaderOnly = function decodeBlockHeaderOnly (buf, strictLengthUsage) {
  return coding.decodeType(buf, 'CBlockHeader__Only', strictLengthUsage)
}

/**
 * @param  {...any} args
 * @returns {Uint8Array}
 */
BitcoinBlock.prototype.encode = function (...args) {
  return concat([...coding.encodeType(this, args)])
}

/**
 * @param  {...any} args
 * @returns {Uint8Array}
 */
BitcoinBlock.BitcoinBlockHeaderOnly.prototype.encode = function (...args) {
  return concat([...coding.encodeType(this, args)])
}

/**
 * @param {Uint8Array} buf
 * @param {boolean} [strictLengthUsage]
 * @returns {any}
 */
BitcoinTransaction.decode = function decodeTransaction (buf, strictLengthUsage) {
  return coding.decodeType(buf, 'CTransaction', strictLengthUsage)
}

/**
 * @param  {...any} args
 * @returns {Uint8Array}
 */
BitcoinTransaction.prototype.encode = function (...args) {
  return concat([...coding.encodeType(this, args)])
}

module.exports.BitcoinBlock = BitcoinBlock
module.exports.BitcoinBlockHeaderOnly = BitcoinBlock.BitcoinBlockHeaderOnly
module.exports.BitcoinTransaction = BitcoinTransaction
module.exports.BitcoinTransactionIn = BitcoinTransactionIn
module.exports.BitcoinTransactionOut = BitcoinTransactionOut
module.exports.BitcoinOutPoint = BitcoinOutPoint
module.exports.toHashHex = toHashHex
module.exports.fromHashHex = fromHashHex
module.exports.COIN = COIN
module.exports.dblSha2256 = dblSha2256
module.exports.merkle = merkle
module.exports.merkleRoot = merkleRoot
