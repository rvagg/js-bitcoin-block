const { decodeProperties, isHexString } = require('./class-utils')
const { COIN } = require('./class-utils')
const { types, scriptToAsmStr, solver, extractDestinations, encodeAddress } = require('./script')
const { toHex, fromHex } = require('../util')

/**
 * A class representation of a Bitcoin TransactionOut, multiple of which are contained within each
 * {@link BitcoinTransaction} in its `vout` array.
 *
 * @property {number} value - an amount / value for this TransactionOut (in satoshis, not BTC)
 * @property {Uint8Array} scriptPubKey - an arbitrary length byte array
 * @class
 */
class BitcoinTransactionOut {
  /**
   * Instantiate a new `BitcoinTransactionOut`.
   *
   * See the class properties for expanded information on these parameters.
   *
   * @param {BigInt|number} value
   * @param {Uint8Array} scriptPubKey
   * @constructs BitcoinTransactionOut
   */
  constructor (value, scriptPubKey) {
    this.value = Number(value)
    this.scriptPubKey = scriptPubKey
  }

  toJSON (n) {
    const obj = { value: this.value / COIN }
    if (typeof n === 'number') {
      obj.n = n
    }
    if (this.scriptPubKey) {
      const solution = solver(this.scriptPubKey)
      obj.scriptPubKey = {
        asm: scriptToAsmStr(this.scriptPubKey),
        hex: toHex(this.scriptPubKey)
      }
      if (solution.solutions && solution.type !== types.TX_PUBKEY) {
        const dest = extractDestinations(this.scriptPubKey)
        if (dest) {
          obj.scriptPubKey.reqSigs = dest.required
          obj.scriptPubKey.type = solution.type
          obj.scriptPubKey.addresses = dest.addresses.map((a) => encodeAddress(a, solution.type))
        }
      }
      if (!obj.scriptPubKey.type) { // doing this because the bitcoin cli orders it between reqSigs and address
        obj.scriptPubKey.type = solution.type
      }
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
  * @returns {object}
  */
  toPorcelain () {
    return this.toJSON()
  }
}

/**
 * Instantiate a `BitcoinTransactionIn` from porcelain data. This is the inverse of
 * {@link BitcoinTransactionOut#toPorcelain}.
 *
 * This function is normally called from {@link BitcoinTransaction.fromPorcelain} to instantiate the
 * each element of the `vin` array.
 *
 * Fields required to instantiate a transaction are:
 *
 * * `value` number - the BTC value of this transaction (not satoshis, which are used in the
 *   BitcoinTransactionOut).
 * * `scriptPubKey` object:
 *   - `scriptPubKey.hex` hex string - the raw scriptPubKey data (the asm isn't used)
 *
 * @function
 * @param porcelain the porcelain form of a BitcoinTransactionOut
 * @returns {BitcoinTransactionOut}
 */
BitcoinTransactionOut.fromPorcelain = function fromPorcelain (porcelain) {
  if (typeof porcelain !== 'object') {
    throw new TypeError('BitcoinTransactionOut porcelain must be an object')
  }
  if (typeof porcelain.value !== 'number') {
    throw new TypeError('value property must be a number')
  }
  if (typeof porcelain.scriptPubKey !== 'object') {
    throw new TypeError('scriptPubKey property must be an object')
  }
  if (typeof porcelain.scriptPubKey.hex !== 'string' || !isHexString(porcelain.scriptPubKey.hex)) {
    throw new TypeError('scriptPubKey.hex property must be a hex string')
  }
  const value = Math.round(porcelain.value * COIN) // round to deal with the likely fraction, we need a uint64
  return new BitcoinTransactionOut(value, fromHex(porcelain.scriptPubKey.hex))
}

// -------------------------------------------------------------------------------------------------------
// Custom decoder and encoder descriptors and functions below here, used by ../coding.js

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
