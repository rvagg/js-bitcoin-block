import { decodeProperties, toHashHex } from './class-utils.js'

/**
 * A class representation of a Bitcoin OutPoint for a {@link BitcoinTransactionIn}.
 *
 * This class isn't explicitly exported, access it for direct use with `import BitcoinOutPoint from 'bitcoin-block/classes/OutPoint'`.
 *
 * @property {Uint8Array} hash
 * @property {number} n
 * @class
 */
class BitcoinOutPoint {
  /**
   * Instantiate a new `BitcoinOutPoint`.
   *
   * See the class properties for expanded information on these parameters.
   *
   * @param {Uint8Array} hash
   * @param {number} n
   * @constructs BitcoinOutPoint
   */
  constructor (hash, n) {
    this.hash = hash
    this.n = n
  }

  /**
   * Convert to a serializable form that has nice stringified hashes and other simplified forms. May be
   * useful for simplified inspection.
   */
  toJSON () {
    return Object.assign({}, this, {
      hash: toHashHex(this.hash)
    })
  }
}

// -------------------------------------------------------------------------------------------------------
// Custom decoder and encoder descriptors and functions below here, used by ../coding.js

BitcoinOutPoint._nativeName = 'COutPoint'
// https://github.com/bitcoin/bitcoin/blob/41fa2926d86a57c9623d34debef20746ee2f454a/src/primitives/transaction.h#L21-L22
BitcoinOutPoint._decodePropertiesDescriptor = decodeProperties(`
uint256 hash;
uint32_t n;
`)
BitcoinOutPoint._encodePropertiesDescriptor = decodeProperties(`
uint256 hash;
uint32_t n;
`)

export default BitcoinOutPoint
