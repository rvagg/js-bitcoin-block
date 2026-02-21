import { toHashHex, fromHashHex, decodeProperties, isHexString } from './class-utils.js'
import { scriptToAsmStr } from './script.js'
import BitcoinOutPoint from './OutPoint.js'
import { toHex, fromHex } from '../util.js'

/** @typedef {import('../interface.js').TransactionInPorcelain} TransactionInPorcelain */
/** @typedef {import('../interface.js').TransactionInCoinbasePorcelain} TransactionInCoinbasePorcelain */

/**
 * A class representation of a Bitcoin TransactionIn, multiple of which are contained within each
 * {@link BitcoinTransaction} in its `vin` array.
 *
 * @property {BitcoinOutPoint} prevout - details of the transaction and TransactionOut that this
 * transaction follows from
 * @property {Uint8Array} scriptSig - an arbitrary length byte array with signature data
 * @property {number} sequence
 * @class
 */
class BitcoinTransactionIn {
  /**
   * Instantiate a new `BitcoinTransactionIn`.
   *
   * See the class properties for expanded information on these parameters.
   *
   * @param {BitcoinOutPoint} prevout
   * @param {Uint8Array} scriptSig
   * @param {number} sequence
   * @constructs BitcoinTransactionIn
   */
  constructor (prevout, scriptSig, sequence) {
    this.prevout = prevout
    this.scriptSig = scriptSig
    this.sequence = sequence
    /** @type {undefined|Uint8Array[]} */
    this.scriptWitness = undefined
  }

  /**
   * @param {*} [_]
   * @param {boolean} [coinbase]
   * @returns {TransactionInPorcelain|TransactionInCoinbasePorcelain}
   */
  toJSON (_, coinbase) {
    /** @type {any} */
    let obj
    if (coinbase) {
      obj = {
        coinbase: toHex(this.scriptSig)
      }
    } else {
      obj = {
        txid: toHashHex(this.prevout.hash),
        vout: this.prevout.n,
        scriptSig: {
          asm: scriptToAsmStr(this.scriptSig, true),
          hex: toHex(this.scriptSig)
        }
      }
    }

    if (this.scriptWitness && this.scriptWitness.length) {
      obj.txinwitness = this.scriptWitness.map((w) => toHex(w))
    }

    obj.sequence = this.sequence

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
  * @returns {object}
  */
  toPorcelain () {
    return this.toJSON()
  }
}

/**
 * Instantiate a `BitcoinTransactionIn` from porcelain data. This is the inverse of
 * {@link BitcoinTransactionIn#toPorcelain}.
 *
 * This function is normally called from {@link BitcoinTransaction.fromPorcelain} to instantiate the
 * each element of the `vin` array.
 *
 * Fields required to instantiate a transaction are:
 *
 * * `sequence` number
 * * `txinwitness` hex string - optional, but should be provided if available to form the correct
 *   TransactionIn.
 *
 * Then, if this TransactionIn is attached to the coinbase:
 *
 * * `coinbase` hex string
 *
 * _Otherwise_:
 *
 * * `txid` number - the linked previous transactionid
 * * `vout` number - the vout index in the previous transaction
 * * `scriptSig` object:
 *   - `scriptSig.hex` hex string - the raw scriptSig data (the asm isn't used)
 *
 * @function
 * @param {TransactionInCoinbasePorcelain | TransactionInPorcelain} porcelain the porcelain form of a BitcoinTransactionIn
 * @returns {BitcoinTransactionIn}
 */
BitcoinTransactionIn.fromPorcelain = function fromPorcelain (porcelain) {
  if (typeof porcelain !== 'object') {
    throw new TypeError('BitcoinTransactionIn porcelain must be an object')
  }

  if (typeof porcelain.sequence !== 'number') {
    throw new TypeError('sequence property must be a number')
  }
  let vin
  if ('coinbase' in porcelain) {
    if (typeof porcelain.coinbase !== 'string' || !isHexString(porcelain.coinbase)) {
      throw new Error('coinbase property should be a hex string')
    }
    const outpoint = new BitcoinOutPoint(new Uint8Array(32), 0xffffffff) // max uint32 is "null"
    vin = new BitcoinTransactionIn(outpoint, fromHex(porcelain.coinbase), porcelain.sequence)
  } else {
    if (typeof porcelain.txid !== 'string' || !isHexString(porcelain.txid, 64)) {
      throw new Error('txid property should be a 64-character hex string')
    }
    if (typeof porcelain.vout !== 'number') {
      throw new TypeError('vout property must be a number')
    }
    if (typeof porcelain.scriptSig !== 'object') {
      throw new TypeError('scriptSig property must be an object')
    }
    if (typeof porcelain.scriptSig.hex !== 'string' || !isHexString(porcelain.scriptSig.hex)) {
      throw new TypeError('scriptSig.hex property must be a hex string')
    }

    const outpoint = new BitcoinOutPoint(fromHashHex(porcelain.txid), porcelain.vout)
    vin = new BitcoinTransactionIn(outpoint, fromHex(porcelain.scriptSig.hex), porcelain.sequence)
  }

  let scriptWitness
  if (porcelain.txinwitness) {
    if (!Array.isArray(porcelain.txinwitness)) {
      throw new TypeError('txinwitness property must be an array')
    }
    scriptWitness = []
    for (const wit of porcelain.txinwitness) {
      if (!isHexString(wit)) {
        throw new TypeError('txinwitness elements must be hex strings: ' + wit)
      }
      scriptWitness.push(fromHex(wit))
    }
  }

  if (scriptWitness) {
    vin.scriptWitness = scriptWitness
  }

  return vin
}

// -------------------------------------------------------------------------------------------------------
// Custom decoder and encoder descriptors and functions below here, used by ../coding.js

BitcoinTransactionIn._nativeName = 'CTxIn'
// https://github.com/bitcoin/bitcoin/blob/41fa2926d86a57c9623d34debef20746ee2f454a/src/primitives/transaction.h#L66-L68
BitcoinTransactionIn._decodePropertiesDescriptor = decodeProperties(`
COutPoint prevout;
CScript scriptSig;
uint32_t nSequence;
`)
BitcoinTransactionIn._encodePropertiesDescriptor = decodeProperties(`
COutPoint prevout;
CScript scriptSig;
uint32_t sequence;
`)

export default BitcoinTransactionIn
