const { decodeProperties, toHashHex, WITNESS_SCALE_FACTOR, dblSha2256, merkleRoot } = require('./class-utils')
const { compactSizeSize } = require('../coding')

/**
 * A class representation of a Bitcoin Block, parent for all of the data included in the raw block data
 * in addition to some information that can be calculated based on that data. Properties are intended to
 * match the names that are provided by the Bitcoin API (hence the casing and some strange names).
 *
 * Exported as the main object, available as `require('bitcoin-block')`.
 *
 * @property {number} version - positive integer
 * @property {Uint8Array|Buffer} previousblockhash - 256-bit hash
 * @property {Uint8Array|Buffer} merkleroot - 256-bit hash
 * @property {number} time - seconds since epoch
 * @property {number} bits
 * @property {number} nonce - 32-bit integer
 * @property {Uint8Array|Buffer} hash - 256-bit hash, a double SHA2-256 hash of all bytes making up this block (calculated)
 * @property {Array.<BitcoinTransaction>} tx
 * @param {number} size
 * @class
 */

class BitcoinBlock {
  /**
   * Instantiate a new `BitcoinBlock`.
   *
   * See the class properties for expanded information on these parameters.
   *
   * @param {number} version
   * @param {Uint8Array|Buffer} previousblockhash
   * @param {Uint8Array|Buffer} merkleroot
   * @param {number} time
   * @param {number} bits
   * @param {number} nonce
   * @param {Uint8Array|Buffer} hash
   * @param {Array.<BitcoinTransaction>} tx
   * @param {number} size
   * @constructs BitcoinBlock
   */
  constructor (version, previousblockhash, merkleroot, time, bits, nonce, hash, tx, size) {
    this.version = version
    this.previousblockhash = previousblockhash
    this.merkleroot = merkleroot
    this.time = time
    this.bits = bits
    this.nonce = nonce
    this.hash = hash
    this.tx = tx
    this.size = size

    this.difficulty = ((() => {
      // https://github.com/bitcoin/bitcoin/blob/7eed413e72a236b6f1475a198f7063fd24929e23/src/rpc/blockchain.cpp#L67-L87
      let nshift = (this.bits >> 24) & 0xff
      let ddiff = 0x0000ffff / (this.bits & 0x00ffffff)
      while (nshift < 29) {
        ddiff *= 256
        nshift++
      }
      while (nshift > 29) {
        ddiff /= 256
        nshift--
      }
      return ddiff
    })())

    this.strippedSize = this.tx ? ((() => {
      const txLead = compactSizeSize(this.tx.length)
      const txSizeNoWitness = this.tx.reduce((p, tx) => {
        p += tx.sizeNoWitness
        return p
      }, 0)
      return 80 + txLead + txSizeNoWitness
    })()) : null

    this.weight = this.tx ? this.strippedSize * (WITNESS_SCALE_FACTOR - 1) + this.size : null
  }

  toJSON (_, type) {
    const obj = {
      hash: toHashHex(this.hash),
      version: this.version,
      versionHex: ((() => {
        const b = Buffer.alloc(4)
        b.writeUInt32BE(this.version, 0)
        return b.toString('hex')
      })()),
      merkleroot: toHashHex(this.merkleroot),
      time: this.time,
      nonce: this.nonce,
      bits: Number(this.bits).toString(16),
      difficulty: this.difficulty
    }

    const previousblockhash = toHashHex(this.previousblockhash)
    if (!/^0+$/.test(previousblockhash)) { // not genesis block?
      obj.previousblockhash = previousblockhash
    }

    if (type === 'header' || this.size === undefined || !this.tx) {
      return obj
    }

    obj.size = this.size
    obj.strippedsize = this.strippedSize
    obj.weight = this.weight
    obj.tx = this.tx.map((tx) => toHashHex(tx.txid))
    obj.nTx = this.tx.length

    return obj
  }

  /**
   * Convert to a serializable form that has nice stringified hashes and other simplified forms. May be
   * useful for simplified inspection.
   */
  toSerializable (type) {
    return this.toJSON(null, type)
  }

  calculateMerkleRoot () {
    const hashes = [Buffer.alloc(32)] // coinbase transaction is 0x000...
    for (let i = 1; i < this.tx.length; i++) {
      hashes.push(this.tx[i].hash)
    }
    return merkleRoot(hashes)
  }

  calculateMerkleRootNoWitness () {
    const hashes = []
    for (const tx of this.tx) {
      hashes.push(tx.txid)
    }
    return merkleRoot(hashes)
  }
}

// -------------------------------------------------------------------------------------------------------
// Custom decoder descriptors and functions below here, used by ../decoder.js

BitcoinBlock._nativeName = 'CBlockHeader'
// https://github.com/bitcoin/bitcoin/blob/41fa2926d86a57c9623d34debef20746ee2f454a/src/primitives/block.h#L24-L29
BitcoinBlock._decodePropertiesDescriptor = decodeProperties(`
_customDecoderMarkStart
int32_t nVersion;
uint256 hashPrevBlock;
uint256 hashMerkleRoot;
uint32_t nTime;
uint32_t nBits;
uint32_t nNonce;
_customDecodeHash
std::vector<CTransaction> transactions;
_customDecodeSize
`)
// Encode is the same but without hash mark and hash. Names changed to reflect
// property names of our BitcoinBlock object.
BitcoinBlock._encodePropertiesDescriptor = decodeProperties(`
int32_t version;
uint256 previousblockhash;
uint256 merkleroot;
uint32_t time;
uint32_t bits;
uint32_t nonce;
`)

BitcoinBlock._customDecoderMarkStart = function (decoder, properties, state) {
  state.blockStartPos = decoder.currentPosition()
}

BitcoinBlock._customDecodeHash = function (decoder, properties, state) {
  const start = state.blockStartPos
  const end = decoder.currentPosition()
  const hashBytes = decoder.absoluteSlice(start, end - start)
  const digest = dblSha2256(hashBytes)
  properties.push(digest)
}

BitcoinBlock._customDecodeSize = function (decoder, properties, state) {
  const start = state.blockStartPos
  const end = decoder.currentPosition()
  const size = end - start
  properties.push(size)
}

class BitcoinBlockHeaderOnly extends BitcoinBlock {}
BitcoinBlockHeaderOnly._nativeName = 'CBlockHeader__Only'
// properties is the same, minus the last two for transactions & size
BitcoinBlockHeaderOnly._decodePropertiesDescriptor = decodeProperties(`
_customDecoderMarkStart
int32_t nVersion;
uint256 hashPrevBlock;
uint256 hashMerkleRoot;
uint32_t nTime;
uint32_t nBits;
uint32_t nNonce;
_customDecodeHash
`)
BitcoinBlockHeaderOnly._customDecoderMarkStart = BitcoinBlock._customDecoderMarkStart
BitcoinBlockHeaderOnly._customDecodeHash = BitcoinBlock._customDecodeHash
// Encode is the same but without hash mark and hash. Names changed to reflect
// property names of our BitcoinBlockHeaderOnly object.
BitcoinBlockHeaderOnly._encodePropertiesDescriptor = decodeProperties(`
int32_t version;
uint256 previousblockhash;
uint256 merkleroot;
uint32_t time;
uint32_t bits;
uint32_t nonce;
`)

module.exports = BitcoinBlock
module.exports.BitcoinBlockHeaderOnly = BitcoinBlockHeaderOnly
