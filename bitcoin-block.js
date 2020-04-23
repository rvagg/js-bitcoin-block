const BitcoinBlock = require('./classes/Block')
const coding = require('./coding')(require('./classes/'))

/**
 * Decode a {@link BitcoinBlock} from the raw bytes of the block.
 *
 * Can be used directly as `require('bitcoin-block').decode()`.
 *
 * @param {Uint8Array|Buffer} buffer - the raw bytes of the block to be decoded.
 * @name BitcoinBlock.decode()
 */
function decodeBlock (buf) {
  return coding.decodeType(buf, 'CBlockHeader')
}

/**
 * Decode only the header section of a {@link BitcoinBlock} from the raw bytes of the block. This method will exclude the transactions.
 *
 * Can be used directly as `require('bitcoin-block').decodeBlockHeaderOnly()`.
 *
 * @param {Uint8Array|Buffer} buffer - the raw bytes of the block to be decoded.
 * @name BitcoinBlock.decodeBlockHeaderOnly()
 */
function decodeBlockHeaderOnly (buf) {
  return coding.decodeType(buf, 'CBlockHeader__Only')
}

BitcoinBlock.decode = decodeBlock
BitcoinBlock.decodeHeaderOnly = decodeBlockHeaderOnly

BitcoinBlock.prototype.encode = function () {
  return Buffer.concat([...coding.encodeType(this)])
}

BitcoinBlock.BitcoinBlockHeaderOnly.prototype.encode = function () {
  return Buffer.concat([...coding.encodeType(this)])
}

module.exports = BitcoinBlock
