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
 * A class representation of a Bitcoin Transaction, multiple of which are contained within each
 * {@link BitcoinBlock}.
 *
 * @name BitcoinTransaction
 * @property {number} version
 * @property {boolean} segWit - whether this transaction contains witness data or was encoded with
 * possibly separate witness data
 * @property {Array.<BitcoinTransactionIn>} vin - an array of {@link BitcoinTransactionIn}s
 * @property {Array.<BitcoinTransactionIn>} vout - an array of {@link BitcoinTransactionOut}s
 * @property {number} lockTime
 * @property {Uint8Array|Buffer} rawBytes - the raw bytes of the encoded form of this transaction
 * @property {Uint8Array|Buffer} hash - the hash of the entire transaction, including witness data
 * @property {Uint8Array|Buffer} txid - the hash of the transaction minus witness data
 * @property {number} sizeNoWitness - the sise of the transaction in bytes when encoded without
 * witness data
 * @property {number} size - the size of the transaction when encoded with witness data (i.e. the
 * raw form stored on disk)
 * @property {number} vsize
 * @property {number} weight
 * @class
 */
class BitcoinTransaction {
  /**
   * Instantiate a new `BitcoinTransaction`.
   *
   * See the class properties for expanded information on these parameters.
   *
   * @param {number} version
   * @param {boolean} segWit
   * @param {Array.<BitcoinTransactionIn>} vin
   * @param {Array.<BitcoinTransactionIn>} vout
   * @param {number} lockTime
   * @param {Uint8Array|Buffer} [rawBytes]
   * @param {Uint8Array|Buffer} [hash]
   * @param {Uint8Array|Buffer} [txid]
   * @param {number} [sizeNoWitness]
   * @param {number} [size]
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

    this._calculateWeightAndVsize()
  }

  _calculateWeightAndVsize () {
    if (this.sizeNoWitness && this.size) {
      this.weight = this.sizeNoWitness * (WITNESS_SCALE_FACTOR - 1) + this.size
      this.vsize = Math.floor((this.weight + WITNESS_SCALE_FACTOR - 1) / WITNESS_SCALE_FACTOR)
    }
  }

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
  * Convert to a serializable form that has nice stringified hashes and other simplified forms. May
  * be useful for simplified inspection.
  *
  * The object returned by this method matches the shape of the JSON structure provided by the
  * `getblock` (or `gettransaction`) RPC call of Bitcoin Core. Performing a `JSON.stringify()` on
  * this object will yield the same data as the RPC.
  *
  * See [block-porcelain.ipldsch](block-porcelain.ipldsch) for a description of the layout of the
  * object returned from this method.
  *
  * @method
  * @returns {object}
  */
  toPorcelain () {
    return this.toJSON()
  }

  /**
   * Find the witness commitment index in the vout array. This method should only work on SegWit
   * _coinbase_ transactions. The vout array is scanned and each `scriptPubKey` field is inspected.
   * If one is 38 bytes long and begins with `0x6a24aa21a9ed`, this is the witness commitment vout,
   * and the index of this vout is returned.
   *
   * @method
   * @returns {number}
   */
  getWitnessCommitmentIndex () {
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

  /**
   * Get the witness commitment from this transaction. This method should only work on SegWit
   * _coinbase_ transactions. See {@link BitcoinTransaction#getWitnessCommitmentIndex} for details
   * on how this is found in the vout array. The leading 6 byte flag is removed from the
   * `scriptPubKey` of the vout before being returned by this method.
   *
   * @method
   * @returns {Buffer} the witness commitment
   */
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

  /**
   * Get the witness commitment nonce from the scriptWitness in this transaction. This method
   * should only work on _coinbase_ transacitons in SegWit blocks where the transaction data
   * we're working with has full witness data attached (i.e. not the trimmed no-witness form)
   * since the nonce is stored in the scrptWitness.
   *
   * The scriptWitness of a SegWit coinbase contains a stack with a single 32-byte array which
   * is the nonce that combines with the witness merkle root to be hashed together and form the
   * witness commitment.
   *
   * @method
   * @returns {Buffer} the witness commitment
   */
  getWitnessCommitmentNonce () {
    if (!this.isCoinbase() || !this.segWit) {
      return null
    }
    if (!this.vin || this.vin.length !== 1 || !this.vin[0].scriptWitness ||
        this.vin[0].scriptWitness.length !== 1 || this.vin[0].scriptWitness[0].length !== 32) {
      return null
    }
    return this.vin[0].scriptWitness[0]
  }

  /**
   * Determine if this is the coinbase. This involves checking the vout array, if this array has a
   * single entry and the `prevout` field is a null hash (`0x00*32`), this is assumed to be the
   * coinbase.
   *
   * @returns {boolean}
   */
  isCoinbase () {
    return this.vin &&
      this.vin.length === 1 &&
      this.vin[0].prevout &&
      this.vin[0].prevout &&
      NULL_HASH.equals(this.vin[0].prevout.hash)
  }
}

// from bitcoin-block.js

/**
 * Encode this transaction into its raw binary form. Assuming you have the complete
 * transaction data in this instantiated form.
 *
 * It is possible to perform a `decode().encode()` round-trip for any given valid
 * transaction data and produce the same binary output.
 *
 * @param {object} args - any encoding args, currently only
 * `BitcoinTransaction.HASH_NO_WITNESS` is a valid argument, which when provided will
 * return the transaction encoded _without_ witness data. When encoded without
 * witness data, the resulting binary data can be double SHA2-256 hashed to produce
 * the `txid` which is used in the transaction merkle root stored in the header,
 * while the binary data from a full transaction will produce the `hash` which is
 * used in the witness merkle and witness commitment.
 * @name BitcoinTransaction#encode
 * @method
 * @returns {Buffer}
 */
BitcoinTransaction.prototype.encode = null

/**
 * Check if the porcelain form of a transaction is has witness data and is therefore
 * post-SegWit.
 *
 * @function
 * @param {object} porcelain form of a transaction
 * @returns {boolean}
 */
BitcoinTransaction.isPorcelainSegWit = function isPorcelainSegWit (porcelain) {
  if (typeof porcelain !== 'object') {
    return false
  }
  let segWit = false
  if (typeof porcelain.hash === 'string' &&
      isHexString(porcelain.hash, 64) &&
      typeof porcelain.txid === 'string' &&
      isHexString(porcelain.txid, 64)) {
    segWit = porcelain.hash !== porcelain.txid
  } else if (typeof porcelain.size === 'number' && typeof porcelain.weight === 'number') {
    segWit = porcelain.weight !== porcelain.size * (WITNESS_SCALE_FACTOR - 1) + porcelain.size
  } else if (typeof porcelain.height === 'number') {
    segWit = porcelain.height >= SEGWIT_HEIGHT
  }
  return segWit
}

/**
 * Instantiate a `BitcoinTransaction` from porcelain data. This is the inverse of
 * {@link BitcoinTransaction#toPorcelain}. It does _not_ require the entirety of the porcelain data
 * as much of it is either duplicate data or derivable from other fields.
 *
 * This function is normally called from {@link BitcoinBlock.fromPorcelain} to instantiate the
 * each element of the `tx` array.
 *
 * Fields required to instantiate a transaction are:
 *
 * * `version` number
 * * `locktime` number
 * * `vin` array of {@link BitcoinTransactionIn} porcelain forms
 * * `vout` array of {@link BitcoinTransactionIn} porcelain forms
 *
 * Some indication of whether this is a SegWit transaction is also required to properly instantiate
 * a correct BitcoinTransaction. This could be one of:
 *
 * * both the `hash` and `txid` fields (these are compared)
 * * both the `size` and `weight` fields (`weight` is recalculated from size and compared)
 * * the `height` property (this can only come from the Bitcoin Core RPC as it is chain-context data
 *   and not derivable from standard block data)
 *
 * @function
 * @param porcelain the porcelain form of a BitcoinTransaction
 * @returns {BitcoinTransaction}
 */
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

  const segWit = BitcoinTransaction.isPorcelainSegWit(porcelain)

  const vin = porcelain.vin.map(BitcoinTransactionIn.fromPorcelain)
  if (segWit) {
    const coinbase = !!porcelain.vin[0].coinbase
    for (let i = coinbase ? 1 : 0; i < vin.length; i++) {
      if (!vin[i].scriptWitness) {
        vin[i].scriptWitness = []
      }
    }
    if (porcelain.vin[0].coinbase && !vin[0].scriptWitness) {
      vin[0].scriptWitness = [Buffer.alloc(32)] // assume default null, good guess, but still a guess
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
  transaction.size = rawBytes.length
  transaction.hash = dblSha2256(rawBytes)
  const rawBytesNoWitness = transaction.encode(HASH_NO_WITNESS)
  transaction.sizeNoWitness = rawBytesNoWitness.length
  transaction.txid = transaction.segWit ? dblSha2256(rawBytesNoWitness) : transaction.hash
  transaction._calculateWeightAndVsize()
  return transaction
}

BitcoinTransaction.HASH_NO_WITNESS = HASH_NO_WITNESS

// from bitcoin-block.js
/**
 * Decode a {@link BitcoinTransaction} from the raw bytes of the transaction.
 * Normally raw transaction data isn't available in detached form, although the
 * hex is available in the JSON output provided by the bitcoin cli attached to
 * each element of the `tx` array. It may also come from the
 * {@link BitcoinTransaction#encode} method.
 *
 * @param {Uint8Array|Buffer} bytes - the raw bytes of the transaction to be decoded.
 * @param {boolean} strictLengthUsage - ensure that all bytes were consumed during decode.
 * This is useful when ensuring that bytes have been properly decoded where there is
 * uncertainty about whether the bytes represent a Transaction or not. Switch to `true`
 * to be sure.
 * @name BitcoinTransaction.decode
 * @returns {BitcoinTransaction}
 * @function
 */
BitcoinTransaction.decode = null

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
  const hashBytes = properties[properties.length - 1] // rawBytes
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
  /* debugging data for generating test fixtures focused on transactions
  const hash = properties[properties.length - 4]
  let hashNoWitness = properties[properties.length - 3]
  hashNoWitness = hashNoWitness ? `'${hashNoWitness.toString('hex')}'` : 'null'
  require('fs').appendFileSync('tx.log', `  ['${hash.toString('hex')}', ${hashNoWitness}, ${start}, ${end}],\n`, 'utf8')
  */
}

module.exports = BitcoinTransaction
module.exports.COIN = COIN
