const { toHashHex, decodeProperties } = require('./class-utils')
const { scriptToAsmStr } = require('./script')

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
    if (coinbase) {
      return {
        coinbase: this.scriptSig.toString('hex'),
        sequence: this.sequence
      }
    }
    const obj = {
      txid: this.prevout ? toHashHex(this.prevout.hash) : null,
      vout: this.prevout ? this.prevout.n : -1,
      scriptSig: null,
      sequence: this.sequence
    }
    if (this.scriptSig) {
      obj.scriptSig = {
        asm: scriptToAsmStr(this.scriptSig, true),
        hex: this.scriptSig.toString('hex')
      }
    }
    if (this.scriptWitness && this.scriptWitness.length) {
      obj.txinwitness = this.scriptWitness.map((w) => w.toString('hex'))
    }
    return obj
  }
}

// -------------------------------------------------------------------------------------------------------
// Custom decoder descriptors and functions below here, used by ../decoder.js

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
