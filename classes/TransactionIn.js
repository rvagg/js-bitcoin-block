const { toHashHex, fromHashHex, decodeProperties, isHexString } = require('./class-utils')
const { scriptToAsmStr } = require('./script')
const BitcoinOutPoint = require('./OutPoint')

/**
 * A class representation of a Bitcoin TransactionIn, multiple of which are contained within each {@link BitcoinTransaction}.
 *
 * This class isn't explicitly exported, access it for direct use with `require('bitcoin-block/classes/TransactionIn')`.
 *
 * @property {BitcoinOutPoint} prevout
 * @property {Uint8Array|Buffer} scriptSig - an arbitrary length byte array
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
   * @param {Uint8Array|Buffer} scriptSig
   * @param {number} sequence
   * @constructs BitcoinTransactionIn
   */
  constructor (prevout, scriptSig, sequence) {
    this.prevout = prevout
    this.scriptSig = scriptSig
    this.sequence = sequence
  }

  /**
   * Convert to a serializable form that has nice stringified hashes and other simplified forms. May be
   * useful for simplified inspection.
   *
   * The serailizable form converts this object to `{ coinbase: scriptSig, sequence: sequence }` to match the Bitcoin API output.
   */
  toJSON (_, coinbase) {
    let obj
    if (coinbase) {
      obj = {
        coinbase: this.scriptSig.toString('hex')
      }
    } else {
      obj = {
        txid: toHashHex(this.prevout.hash),
        vout: this.prevout.n,
        scriptSig: {
          asm: scriptToAsmStr(this.scriptSig, true),
          hex: this.scriptSig.toString('hex')
        }
      }
    }

    if (this.scriptWitness && this.scriptWitness.length) {
      obj.txinwitness = this.scriptWitness.map((w) => w.toString('hex'))
    }

    obj.sequence = this.sequence

    return obj
  }

  /**
  * Convert to a serializable form that has nice stringified hashes and other simplified forms. May be
  * useful for simplified inspection.
  */
  toPorcelain () {
    return this.toJSON()
  }
}

BitcoinTransactionIn.fromPorcelain = function fromPorcelain (porcelain) {
  if (typeof porcelain !== 'object') {
    throw new TypeError('BitcoinTransactionIn porcelain must be an object')
  }

  if (typeof porcelain.sequence !== 'number') {
    throw new TypeError('sequence property must be a number')
  }
  let vin
  if (porcelain.coinbase) {
    if (typeof porcelain.coinbase !== 'string' || !isHexString(porcelain.coinbase)) {
      throw new Error('coinbase property should be a hex string')
    }
    const outpoint = new BitcoinOutPoint(Buffer.alloc(32), 0xffffffff) // max uint32 is "null"
    vin = new BitcoinTransactionIn(outpoint, Buffer.from(porcelain.coinbase, 'hex'), porcelain.sequence)
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
    vin = new BitcoinTransactionIn(outpoint, Buffer.from(porcelain.scriptSig.hex, 'hex'), porcelain.sequence)
  }

  let scriptWitness
  if (porcelain.txinwitness) {
    if (!Array.isArray(porcelain.txinwitness)) {
      throw new TypeError('txinwitness property must be an array')
    }
    scriptWitness = []
    for (const wit of porcelain.txinwitness) {
      if (!isHexString(wit)) {
        throw new TypeError('txinwitness elements must be hex strings: ', wit)
      }
      scriptWitness.push(Buffer.from(wit, 'hex'))
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

module.exports = BitcoinTransactionIn
