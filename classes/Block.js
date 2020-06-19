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
 * A class representation of a Bitcoin Block. Parent for all of the data included in the raw block
 * data in addition to some information that can be calculated based on that data. Properties are
 * intended to match the names that are provided by the Bitcoin API (hence the casing and some
 * strange names).
 *
 * @name BitcoinBlock
 * @property {number} version - positive integer
 * @property {Uint8Array|Buffer} previousblockhash - 256-bit hash
 * @property {Uint8Array|Buffer} merkleroot - 256-bit hash
 * @property {number} time - seconds since epoch
 * @property {number} bits
 * @property {number} nonce - 32-bit integer
 * @property {Uint8Array|Buffer} hash - 256-bit hash, a double SHA2-256 hash of all bytes making up
 * this block (calculated)
 * @property {Array.<BitcoinTransaction>} tx - an array of {@link BitcoinTransaction} objects
 * representing the transactions in this block
 * @property {number} size - the length of the entire block in bytes
 * @property {number} strippedsize - the size adjusted according to weight, which accounts for
 * SegWit encoding.
 * @property {number} difficulty
 * @property {number} weight
 * @class
 */

class BitcoinBlock {
  /**
   * Instantiate a new `BitcoinBlock`.
   *
   * See the class properties for expanded information on these parameters. The `difficulty`
   * property will be calculated from `bits`. The `stripedsize` and `weight` properties will be
   * calculated from the transactions if they are available.
   *
   * To represent a header only, the `hash`, `tx` and `size` parameters are optional.
   *
   * @param {number} version
   * @param {Uint8Array|Buffer} previousblockhash
   * @param {Uint8Array|Buffer} merkleroot
   * @param {number} time
   * @param {number} bits
   * @param {number} nonce
   * @param {Uint8Array|Buffer} [hash]
   * @param {Array.<BitcoinTransaction>} [tx]
   * @param {number} [size]
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
    this.strippedsize = this.tx ? ((() => {
      const txLead = compactSizeSize(this.tx.length)
      const txSizeNoWitness = this.tx.reduce((p, tx) => {
        p += tx.sizeNoWitness
        return p
      }, 0)
      return 80 + txLead + txSizeNoWitness
    })()) : null
  }

  _calculateWeight () {
    this.weight = this.tx ? this.strippedsize * (WITNESS_SCALE_FACTOR - 1) + this.size : null
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
    obj.strippedsize = this.strippedsize
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
   * Convert to a serializable form that has nice stringified hashes and other simplified forms. May
   * be useful for simplified inspection.
   *
   * The object returned by this method matches the shape of the JSON structure provided by the
   * `getblock` RPC call of Bitcoin Core minus some chain-contextual fields that are not calculable
   * from isolated block data. Performing a `JSON.stringify()` on this object will yield the same
   * data as the RPC minus these fields.
   *
   * See [block-porcelain.ipldsch](block-porcelain.ipldsch) for a description of the layout of the
   * object returned from this method.
   *
   * @method
   * @returns {object}
   */
  toPorcelain (type) {
    return this.toJSON(null, type)
  }

  /**
   * **Calculate** the merkle root of the transactions in this block. This method should reproduce
   * the native `merkleroot` field if this block was decoded from raw block data.
   *
   * This operation can be performed with or without witness data using the `noWitness` flag
   * parameter. Without witness data will yield the `merkleroot`, with witness data will yield the
   * witness merkle root which is hashed with the witness nonce (from the single coinbase vin) to
   * produce the witness commitment that is stored in the coinbase (from one of the vouts).
   *
   * This method assumes this object has transactions attached to it and is not the header data
   * alone.
   *
   * @method
   * @param {Symbol} noWitness calculate the merkle root without witness data (i.e. the standard
   * block header `merkleroot` value). Supply `HASH_NO_WITNESS` to activate.
   * @returns {Buffer} the merkle root
   */
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

  /**
   * **Calculate** the witness commitment for this block. Uses the full transaction merkle root
   * (with witness data), appended to the witness nonce (stored in the coinbase vin) and hashed.
   *
   * This method assumes this object has transactions attached to it and is not the header data
   * alone. It also assumes a valid witness nonce stored in the single element of the
   * `scriptWitness` in the coinbase's single vin.
   *
   * @method
   * @returns {Buffer} the witness commitment
   */
  calculateWitnessCommitment () {
    if (!this.tx || !this.tx.length) {
      throw new Error('Cannot calculate witness commitment without transactions')
    }
    if (!this.isSegWit()) {
      throw new Error('Cannot calculate witness commitment of non-segwit block')
    }

    const nonce = this.getWitnessCommitmentNonce()
    // full merkle root _with_ witness data but excluding coinbase
    const fullMerkleRoot = this.calculateMerkleRoot()
    const witnessCommitment = dblSha2256(Buffer.concat([fullMerkleRoot, nonce]))

    return witnessCommitment
  }

  /**
   * **Get** the witness commitment as decoded from the block data. This is a shortcut method that
   * assumes transaction data is associated with this block and reaches into the coinbase and finds
   * the witness commitment within one of the vout elements.
   *
   * See {@link BitcoinTransaction#getWitnessCommitment()}
   *
   * @method
   * @returns {Buffer} the witness commitment
   */
  getWitnessCommitment () {
    if (!this.tx || !this.tx.length) {
      throw new Error('Cannot get witness commitment without transactions')
    }
    return this.tx[0].getWitnessCommitment() // will return null if it's not segwit
  }

  /**
   * Get the witness commitment nonce from the scriptWitness in the coinbase. This is a shortcut
   * that assumes transaction data (with witness data) is associated with this block and reaches
   * into the coinbase to find the nonce in the scriptWitness.
   *
   * See {@link BitcoinTransaction#getWitnessCommitmentNonce()}
   *
   * @method
   * @returns {Buffer} the witness commitment nonce
   */
  getWitnessCommitmentNonce () {
    if (!this.tx || !this.tx.length) {
      throw new Error('Cannot calculate witness commitment without transactions')
    }
    if (!this.isSegWit()) {
      throw new Error('Cannot calculate witness commitment of non-segwit block')
    }

    const nonce = this.tx[0].getWitnessCommitmentNonce()
    if (!nonce) {
      throw new Error('Don\'t have a valid witness nonce')
    }
    return nonce
  }

  /**
   * Does this block contain SegWit (BIP141) transactions. This method assumes this block has
   * transaction data associated with it as it checks whether those transactions were encoded
   * as SegWit.
   *
   * @method
   * @returns {boolean}
   */
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
}

// from bitcoin-block.js

/**
 * Encode this block into its raw binary form. Assuming you have the complete
 * block data in this instantiated form.
 *
 * It is possible to perform a `decode().encode()` round-trip for any given valid
 * block data and produce the same binary output.
 *
 * @param {object} args - any encoding args, currently only
 * `BitcoinBlock.HASH_NO_WITNESS` is a valid argument, which when provided will
 * return the block with transactions encoded _without_ witness data.
 * @name BitcoinBlock#encode
 * @method
 * @returns {Buffer}
 */
BitcoinBlock.prototype.encode = null

/**
 * Symbol used as a flag for {@link Block#calculateMerkleRoot} to calculate the merkle root without
 * transaction witness data included in the transaction hashes.
 */
BitcoinBlock.HASH_NO_WITNESS = HASH_NO_WITNESS

/**
 * Instantiate a `BitcoinBlock` from porcelain data. This is the inverse of
 * {@link BitcoinBlock#toPorcelain}. It does _not_ require the entirety of the porcelain data as
 * much of it is either duplicate data or derivable from other fields.
 *
 * If a full `tx` array is provided on the porcelain object {@link BitcoinTransaction.fromPorcelain}
 * is called on each of these in turn to re-instantiate the native transaction array.
 *
 * Fields required to instantiate a basic header form are:
 *
 * * `previousblockhash` _if_ the block is not the genesis block (its absence assumes this)
 * * `version` integer
 * * `merkleroot` 64-character hex string
 * *  `time` integer
 * * `bits` hex string
 *
 * A `tx` array indicates that full block data is present and it should attempt to decode the entire
 * structure.
 *
 * @param {object} porcelain the porcelain form of a Bitcoin block
 * @returns {BitcoinBlock}
 * @function
 */
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
  if (typeof porcelain.nonce !== 'number') {
    throw new TypeError('nonce property must be a number')
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

// methods in bitcoin-block.js

/**
 * Decode a {@link BitcoinBlock} from the raw bytes of the block. Such data
 * in hex form is available directly from the bitcoin cli:
 * `bitcoin-cli getblock <hash> 0` (where `0` requests hex form).
 *
 * Use this if you have the full block hash, otherwise use {@link BitcoinBlock.decodeBlockHeaderOnly}
 * to parse just the 80-byte header data.
 *
 * @param {Uint8Array|Buffer} bytes - the raw bytes of the block to be decoded.
 * @param {boolean} strictLengthUsage - ensure that all bytes were consumed during decode.
 * This is useful when ensuring that bytes have been properly decoded where there is
 * uncertainty about whether the bytes represent a Block or not. Switch to `true` to be
 * sure.
 * @name BitcoinBlock.decode
 * @function
 * @returns {BitcoinBlock}
 */
BitcoinBlock.decode = null

/**
 * Decode only the header section of a {@link BitcoinBlock} from the raw bytes of the block.
 * This method will exclude the transactions but will properly present the header
 * data including the correct hash.
 *
 * To decode the entire block data, use {@link BitcoinBlock.decodeBlock}.
 *
 * This method returns a `BitcoinBlockHeaderOnly` which is a subclass of
 * `BitcoinBlock` and may be used as such. Just don't expect it to give you
 * any transaction data beyond the merkle root.
 *
 * @param {Uint8Array|Buffer} bytes - the raw bytes of the block to be decoded.
 * @name BitcoinBlock.decodeBlockHeaderOnly
 * @function
 * @returns {BitcoinBlock}
 */
BitcoinBlock.decodeBlockHeaderOnly = null
