const { decodeProperties } = require('./class-utils')
const { COIN } = require('./class-utils')
const { types, scriptToAsmStr, solver, extractDestinations, encodeAddress } = require('./script')

/**
 * A class representation of a Bitcoin TransactionOut, multiple of which are contained within each {@link BitcoinTransaction}.
 *
 * This class isn't explicitly exported, access it for direct use with `require('bitcoin-block/classes/TransactionOut')`.
 *
 * @property {BigInt} value - an amount / value for this TransactionOut
 * @property {Uint8Array|Buffer} scriptPubKey - an arbitrary length byte array
 * @class
 */
class BitcoinTransactionOut {
  /**
   * Instantiate a new `BitcoinTransactionOut`.
   *
   * See the class properties for expanded information on these parameters.
   *
   * @param {BigInt} value
   * @param {Uint8Array|Buffer} scriptPubKey
   * @constructs BitcoinTransactionOut
   */
  constructor (value, scriptPubKey) {
    this.value = Number(value)
    this.scriptPubKey = scriptPubKey
  }

  /**
   * Convert to a serializable form that has nice stringified hashes and other simplified forms. May be
   * useful for simplified inspection.
   *
   * The serialized version includes the raw `value` as `valueZat` while `value` is a proper Bitcoin coin value.
   */
  toJSON (n) {
    const obj = { value: this.value / COIN }
    if (typeof n === 'number') {
      obj.n = n
    }
    if (this.scriptPubKey) {
      const solution = solver(this.scriptPubKey)
      obj.scriptPubKey = {
        asm: scriptToAsmStr(this.scriptPubKey),
        hex: this.scriptPubKey.toString('hex'),
        type: solution.type
      }
      if (solution.solutions && solution.type !== types.TX_PUBKEY) {
        const dest = extractDestinations(this.scriptPubKey)
        if (dest) {
          obj.scriptPubKey.addresses = dest.addresses.map((a) => encodeAddress(a, solution.type))
          obj.scriptPubKey.reqSigs = dest.required
        }
      }
    }
    return obj
  }
}

// -------------------------------------------------------------------------------------------------------
// Custom decoder descriptors and functions below here, used by ../decoder.js

BitcoinTransactionOut._nativeName = 'CTxOut'
// https://github.com/bitcoin/bitcoin/blob/41fa2926d86a57c9623d34debef20746ee2f454a/src/primitives/transaction.h#L136-L137
BitcoinTransactionOut._decodePropertiesDescriptor = decodeProperties(`
CAmount nValue;
CScript scriptPubKey;
`)
BitcoinTransactionOut._encodePropertiesDescriptor = decodeProperties(`
CAmount value;
CScript scriptPubKey;
`)

module.exports = BitcoinTransactionOut
