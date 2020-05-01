const {
  decodeProperties,
  toHashHex,
  WITNESS_SCALE_FACTOR,
  COIN,
  HASH_NO_WITNESS,
  SEGWIT_HEIGHT,
  dblSha2256,
  isHexString
} = require('./class-utils')
const BitcoinTransactionIn = require('./TransactionIn')
const BitcoinTransactionOut = require('./TransactionOut')
const NULL_HASH = Buffer.alloc(32)

/**
 * A class representation of a Bitcoin Transaction, multiple of which are contained within each {@link BitcoinBlock}.
 *
 * This class isn't explicitly exported, access it for direct use with `require('bitcoin-block/classes/Transaction')`.
 *
 * @property {number} version
 * @property {boolean} segWit
 * @property {Array.<BitcoinTransactionIn>} vin
 * @property {Array.<BitcoinTransactionIn>} vout
 * @property {number} lockTime
 * @property {Uint8Array|Buffer} hash - 256-bit hash, a double SHA2-256 hash of all bytes making up this block (calculated)
 * @class
 */
class BitcoinTransaction {
  /**
   * Instantiate a new `BitcoinTransaction`.
   *
   * See the class properties for expanded information on these parameters.
   *
   * @property {number} version
   * @property {boolean} segWit
   * @property {Array.<BitcoinTransactionIn>} vin
   * @property {Array.<BitcoinTransactionIn>} vout
   * @property {number} lockTime
   * @property {Uint8Array|Buffer} rawBytes
   * @property {Uint8Array|Buffer} hash
   * @property {Uint8Array|Buffer} txid
   * @property {number} sizeNoWitness
   * @property {number} size
   * @constructs BitcoinTransaction
   */
  constructor (version, segWit, vin, vout, lockTime, rawBytes, hash, txid, sizeNoWitness, size) {
    this.version = version
    this.segWit = segWit
    this.vin = vin
    this.vout = vout
    this.lockTime = lockTime
    this.rawBytes = rawBytes
    this.hash = hash
    this.txid = txid || hash
    this.sizeNoWitness = sizeNoWitness || size
    this.size = size

    this.weight = this.sizeNoWitness * (WITNESS_SCALE_FACTOR - 1) + this.size
    this.vsize = Math.floor((this.weight + WITNESS_SCALE_FACTOR - 1) / WITNESS_SCALE_FACTOR)
  }

  /**
   * Convert to a serializable form that has nice stringified hashes and other simplified forms. May be
   * useful for simplified inspection.
   */
  toJSON () {
    const coinbase = this.isCoinbase()
    const obj = {
      txid: toHashHex(this.txid),
      hash: toHashHex(this.hash),
      version: this.version,
      size: this.size,
      vsize: this.vsize,
      weight: this.weight,
      locktime: this.lockTime,
      vin: this.vin.map((vin) => vin.toJSON(null, coinbase)),
      vout: this.vout.map((vout, n) => vout.toJSON(n)),
      hex: this.rawBytes.toString('hex')
    }
    return obj
  }

  /**
  * Convert to a serializable form that has nice stringified hashes and other simplified forms. May be
  * useful for simplified inspection.
  */
  toPorcelain () {
    return this.toJSON()
  }

  getWitnessCommitmentIndex () {
    if (!this.segWit) {
      return -1
    }
    // src/validation.cpp#GetWitnessCommitmentIndex
    let pos = -1
    for (let i = 0; i < this.vout.length; i++) {
      const spk = this.vout[i].scriptPubKey
      if (spk.length >= 38 &&
          spk[0] === 0x6a && // OP_RETURN
          spk[1] === 0x24 &&
          spk[2] === 0xaa &&
          spk[3] === 0x21 &&
          spk[4] === 0xa9 &&
          spk[5] === 0xed) {
        pos = i // last one is used, so keep looking
      }
    }
    return pos
  }

  getWitnessCommitment () {
    const wci = this.getWitnessCommitmentIndex()
    if (wci >= 0) {
      const witnessCommitmentOut = this.vout[wci]
      // bad-witness-nonce-size is supposed to make this strictly 6+32 bytes long but
      // there are cases where it's longer
      const witnessCommitment = witnessCommitmentOut.scriptPubKey.slice(6, 6 + 32)
      return witnessCommitment
    }
    return null
  }

  isCoinbase () {
    return this.vin &&
      this.vin.length === 1 &&
      this.vin[0].prevout &&
      this.vin[0].prevout &&
      NULL_HASH.equals(this.vin[0].prevout.hash)
  }
}

BitcoinTransaction.fromPorcelain = function fromPorcelain (porcelain) {
  if (typeof porcelain !== 'object') {
    throw new TypeError('BitcoinTransaction porcelain must be an object')
  }
  if (typeof porcelain.version !== 'number') {
    throw new TypeError('version property must be a number')
  }
  if (typeof porcelain.locktime !== 'number') {
    throw new TypeError('locktime property must be a number')
  }
  if (!Array.isArray(porcelain.vin)) {
    throw new TypeError('vin property must be an array')
  }
  if (!Array.isArray(porcelain.vout)) {
    throw new TypeError('vin property must be an array')
  }

  let segWit = false
  if (typeof porcelain.hash === 'string' && isHexString(porcelain.hash, 64) && typeof porcelain.txid === 'string' && isHexString(porcelain.txid, 64)) {
    segWit = porcelain.hash !== porcelain.txid
  } else if (typeof porcelain.size === 'number' && typeof porcelain.weight === 'number') {
    segWit = porcelain.weight !== porcelain.size * (WITNESS_SCALE_FACTOR - 1) + porcelain.size
  } else if (typeof porcelain.height === 'number') {
    segWit = porcelain.height >= SEGWIT_HEIGHT
  }

  const vin = porcelain.vin.map(BitcoinTransactionIn.fromPorcelain)
  if (segWit) {
    const coinbase = !!porcelain.vin[0].coinbase
    for (let i = coinbase ? 1 : 0; i < vin.length; i++) {
      if (!vin[i].scriptWitness) {
        vin[i].scriptWitness = []
      }
    }
    if (porcelain.vin[0].coinbase && !vin[0].scriptWitness) {
      vin[0].scriptWitness = [Buffer.alloc(32)]
    }
  }
  const vout = porcelain.vout.map(BitcoinTransactionOut.fromPorcelain)

  const transaction = new BitcoinTransaction(
    porcelain.version,
    segWit,
    vin,
    vout,
    porcelain.locktime)

  // calculate the hash for this block
  // this comes from ../bitcoin-block, if it's not instantiated via there then it won't be available
  if (typeof transaction.encode !== 'function') {
    throw new Error('Transaction#encode() not available')
  }
  const rawBytes = transaction.encode()
  transaction.rawBytes = rawBytes.toString('hex')
  transaction.hash = dblSha2256(rawBytes)
  const rawBytesNoWitness = transaction.encode(HASH_NO_WITNESS)
  transaction.txid = transaction.segWit ? dblSha2256(rawBytesNoWitness) : transaction.hash

  return new BitcoinTransaction(
    transaction.version,
    segWit,
    transaction.vin,
    transaction.vout,
    transaction.lockTime,
    rawBytes,
    transaction.hash,
    transaction.txid,
    rawBytesNoWitness.length,
    rawBytes.length
  )
}

BitcoinTransaction.HASH_NO_WITNESS = HASH_NO_WITNESS

// -------------------------------------------------------------------------------------------------------
// Custom decoder and encoder descriptors and functions below here, used by ../coding.js
// https://github.com/bitcoin/bitcoin/blob/41fa2926d86a57c9623d34debef20746ee2f454a/src/primitives/transaction.h#L181-L197
BitcoinTransaction._nativeName = 'CTransaction'
BitcoinTransaction._decodePropertiesDescriptor = decodeProperties(`
_customDecoderMarkStart
const int32_t nVersion
_customDecodeSegWit
const std::vector<CTxIn> vin;
const std::vector<CTxOut> vout;
_customDecodeWitness
const uint32_t nLockTime
_customDecodeBytes
_customDecodeHash
_customDecodeHashNoWitness
_customDecodeSize
`)
BitcoinTransaction._encodePropertiesDescriptor = decodeProperties(`
const int32_t version
_customEncodeSegWit
const std::vector<CTxIn> vin;
const std::vector<CTxOut> vout;
_customEncodeWitness
const uint32_t lockTime
`)

BitcoinTransaction._customDecoderMarkStart = function (decoder, properties, state) {
  state.transactionStartPos = decoder.currentPosition()
}

BitcoinTransaction._customDecodeSegWit = function (decoder, properties, state) {
  const flag = decoder.peek(2)
  state.segWitFlagStart = decoder.currentPosition()
  state.segWit = flag[0] === 0x00 && flag[1] === 0x01
  properties.push(state.segWit)
  if (state.segWit) {
    decoder.slice(2) // it was the flag, consume flag bytes
    state.segWitFlagEnd = decoder.currentPosition()
  }
}

BitcoinTransaction._customEncodeSegWit = function * (transaction, encoder, args) {
  if ((!args || args[0] !== HASH_NO_WITNESS) && transaction.segWit) {
    yield Buffer.from([0x00, 0x01])
  }
}

BitcoinTransaction._customDecodeWitness = function (decoder, properties, state) {
  if (state.segWit) {
    state.witnessStart = decoder.currentPosition()
    // witnesses are stored outside of TxIn but are attached to TxIn
    const txIn = properties[properties.length - 2]
    for (const vin of txIn) {
      const wit = decoder.readType('std::vector<std::vector<unsigned char>>')
      vin.scriptWitness = wit
    }
    state.witnessEnd = decoder.currentPosition()
  }
}

BitcoinTransaction._customEncodeWitness = function * (transaction, encoder, args) {
  if (args[0] !== HASH_NO_WITNESS && transaction.segWit) {
    for (const vin of transaction.vin) {
      yield * encoder('std::vector<std::vector<unsigned char>>', vin.scriptWitness, args)
    }
  }
}

BitcoinTransaction._customDecodeBytes = function (decoder, properties, state) {
  const start = state.transactionStartPos
  const end = decoder.currentPosition()
  const rawBytes = decoder.absoluteSlice(start, end - start)
  properties.push(rawBytes)
}

BitcoinTransaction._customDecodeHash = function (decoder, properties, state) {
  const start = state.transactionStartPos
  const end = decoder.currentPosition()
  const hashBytes = decoder.absoluteSlice(start, end - start)
  const digest = dblSha2256(hashBytes)
  properties.push(digest)
}

// calculate the hash of this transaction _as if it did not contain witness data_ if this is
// a segWit transaction. To do this we have to first remove the segWit flag before the txin
// array and then remove the witness data array after the txout array, then hash the bytes
// we're left with.
// used as the txid if different from the hash
BitcoinTransaction._customDecodeHashNoWitness = function (decoder, properties, state) {
  if (!state.segWit) {
    properties.push(null) // txid
    properties.push(null) // sizeNoWitness
    return
  }

  const start = state.transactionStartPos
  const end = decoder.currentPosition()
  const segWitFlagStart = state.segWitFlagStart
  const segWitFlagEnd = state.segWitFlagEnd
  const witnessStart = state.witnessStart
  const witnessEnd = state.witnessEnd

  const hashBytesArray = []
  hashBytesArray.push(decoder.absoluteSlice(start, segWitFlagStart - start))
  hashBytesArray.push(decoder.absoluteSlice(segWitFlagEnd, witnessStart - segWitFlagEnd))
  hashBytesArray.push(decoder.absoluteSlice(witnessEnd, end - witnessEnd))
  const hashBytes = Buffer.concat(hashBytesArray)

  const digest = dblSha2256(hashBytes)

  properties.push(digest)
  properties.push(hashBytes.length)
}

BitcoinTransaction._customDecodeSize = function (decoder, properties, state) {
  const start = state.transactionStartPos
  const end = decoder.currentPosition()
  properties.push(end - start)
}

module.exports = BitcoinTransaction
module.exports.COIN = COIN
