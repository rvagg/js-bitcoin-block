const BitcoinBlock = require('./classes/Block')
const BitcoinTransaction = require('./classes/Transaction')
const BitcoinTransactionIn = require('./classes/TransactionIn')
const BitcoinTransactionOut = require('./classes/TransactionOut')
const BitcoinOutPoint = require('./classes/OutPoint')
const coding = require('./coding')(require('./classes/'))
const { toHashHex, fromHashHex, COIN } = require('./classes/class-utils')

BitcoinBlock.decode = function decodeBlock (buf) {
  return coding.decodeType(buf, 'CBlockHeader')
}

BitcoinBlock.decodeHeaderOnly = function decodeBlockHeaderOnly (buf) {
  return coding.decodeType(buf, 'CBlockHeader__Only')
}

BitcoinBlock.prototype.encode = function (...args) {
  return Buffer.concat([...coding.encodeType(this, args)])
}

BitcoinBlock.BitcoinBlockHeaderOnly.prototype.encode = function (...args) {
  return Buffer.concat([...coding.encodeType(this, args)])
}

BitcoinTransaction.decode = function decodeTransaction (buf) {
  return coding.decodeType(buf, 'CTransaction')
}

BitcoinTransaction.prototype.encode = function (...args) {
  return Buffer.concat([...coding.encodeType(this, args)])
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
