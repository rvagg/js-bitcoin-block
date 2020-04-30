const {
  decodeProperties,
  toHashHex,
  fromHashHex,
  WITNESS_SCALE_FACTOR,
  HASH_NO_WITNESS,
  dblSha2256,
  merkleRoot,
  isHexString
} = require('./class-utils')
const { compactSizeSize } = require('../coding')
const BitcoinTransaction = require('./Transaction')

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

    this._calculateDifficulty()
    this._calculateStrippedSize()
    this._calculateWeight()
  }

  _calculateDifficulty () {
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
    this.difficulty = ddiff
  }

  _calculateStrippedSize () {
    this.strippedSize = this.tx ? ((() => {
      const txLead = compactSizeSize(this.tx.length)
      const txSizeNoWitness = this.tx.reduce((p, tx) => {
        p += tx.sizeNoWitness
        return p
      }, 0)
      return 80 + txLead + txSizeNoWitness
    })()) : null
  }

  _calculateWeight () {
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
    if (type === 'min') {
      obj.tx = this.tx.map((tx) => toHashHex(tx.txid))
    } else {
      obj.tx = this.tx.map((tx) => tx.toJSON())
    }
    obj.nTx = this.tx.length

    return obj
  }

  /**
   * Convert to a serializable form that has nice stringified hashes and other simplified forms. May be
   * useful for simplified inspection.
   */
  toPorcelain (type) {
    return this.toJSON(null, type)
  }

  calculateMerkleRoot (noWitness) {
    if (!this.tx || !this.tx.length) {
      throw new Error('Cannot calculate merkle root without transactions')
    }
    noWitness = noWitness === HASH_NO_WITNESS
    const hashes = noWitness ? [] : [Buffer.alloc(32)] // coinbase transaction is 0x000... for fill merkle
    for (let i = noWitness ? 0 : 1; i < this.tx.length; i++) {
      hashes.push(this.tx[i][noWitness ? 'txid' : 'hash'])
    }
    return merkleRoot(hashes)
  }

  calculateWitnessCommitment () {
    if (!this.tx || !this.tx.length) {
      throw new Error('Cannot calculate witness commitment without transactions')
    }
    if (!this.isSegWit()) {
      throw new Error('Cannot calculate witness commitment of non-segwit block')
    }

    // nonce from coinbase vin scriptWitness
    const nonce = this.tx[0].vin[0].scriptWitness[0]
    // full merkle root _with_ witness data but excluding coinbase
    const fullMerkleRoot = this.calculateMerkleRoot()
    const witnessCommitment = dblSha2256(Buffer.concat([fullMerkleRoot, nonce]))

    return witnessCommitment
  }

  isSegWit () {
    if (!this.tx || !this.tx.length) {
      throw new Error('Cannot determine if segwit without transactions')
    }
    if (this._segWit !== undefined) {
      return this._segWit
    }
    for (const tx of this.tx) {
      if (tx.segWit) {
        this._segWit = true
        return true
      }
    }
    this._segWit = false
    return false
  }

  getWitnessCommitment () {
    if (!this.tx || !this.tx.length) {
      throw new Error('Cannot get witness commitment without transactions')
    }
    return this.tx[0].getWitnessCommitment() // will return null if it's not segwit
  }
}

BitcoinBlock.HASH_NO_WITNESS = HASH_NO_WITNESS

BitcoinBlock.fromPorcelain = function fromPorcelain (porcelain) {
  if (typeof porcelain !== 'object') {
    throw new TypeError('BitcoinBlock porcelain must be an object')
  }
  if (porcelain.previousblockhash != null) {
    if (typeof porcelain.previousblockhash !== 'string' || !isHexString(porcelain.previousblockhash, 64)) {
      throw new Error('previousblockhash property should be a 64-character hex string')
    }
  } // else assume genesis
  if (typeof porcelain.version !== 'number') {
    throw new TypeError('version property must be a number')
  }
  if (typeof porcelain.merkleroot !== 'string' || !isHexString(porcelain.merkleroot, 64)) {
    throw new Error('merkleroot property should be a 64-character hex string')
  }
  if (typeof porcelain.time !== 'number') {
    throw new TypeError('time property must be a number')
  }
  if (typeof porcelain.difficulty !== 'number') {
    throw new TypeError('difficulty property must be a number')
  }
  if (typeof porcelain.bits !== 'string' && !/^[0-9a-f]+$/.test(porcelain.bits)) {
    throw new TypeError('bits property must be a hex string')
  }
  let tx
  if (porcelain.tx) {
    if (!Array.isArray(porcelain.tx)) {
      throw new TypeError('tx property must be an array')
    }
    tx = porcelain.tx.map(BitcoinTransaction.fromPorcelain)
  }
  const block = new BitcoinBlock(
    porcelain.version,
    porcelain.previousblockhash ? fromHashHex(porcelain.previousblockhash) : Buffer.alloc(32),
    fromHashHex(porcelain.merkleroot),
    porcelain.time,
    parseInt(porcelain.bits, 16),
    porcelain.nonce,
    null, // hash
    tx
  )

  // calculate the hash for this block
  // this comes from ../bitcoin-block, if it's not instantiated via there then it won't be available
  if (typeof block.encode !== 'function') {
    throw new Error('Block#encode() not available')
  }
  const rawData = block.encode()
  block.hash = dblSha2256(rawData.slice(0, 80))
  if (tx) {
    block.size = rawData.length
    block._calculateStrippedSize()
    block._calculateWeight()
  }

  return block
}

// -------------------------------------------------------------------------------------------------------
// Custom decoder and encoder descriptors and functions below here, used by ../coding.js

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
_customEncodeTransactions
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

BitcoinBlock._customEncodeTransactions = function * (block, encoder, args) {
  if (Array.isArray(block.tx)) {
    yield * encoder('std::vector<CTransaction>', block.tx, args)
  }
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
