export default BitcoinTransactionIn;
export type TransactionInPorcelain = import("../interface.js").TransactionInPorcelain;
export type TransactionInCoinbasePorcelain = import("../interface.js").TransactionInCoinbasePorcelain;
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
declare class BitcoinTransactionIn {
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
    constructor(prevout: BitcoinOutPoint, scriptSig: Uint8Array, sequence: number);
    prevout: BitcoinOutPoint;
    scriptSig: Uint8Array<ArrayBufferLike>;
    sequence: number;
    /** @type {undefined|Uint8Array[]} */
    scriptWitness: undefined | Uint8Array[];
    /**
     * @param {*} [_]
     * @param {boolean} [coinbase]
     * @returns {TransactionInPorcelain|TransactionInCoinbasePorcelain}
     */
    toJSON(_?: any, coinbase?: boolean): TransactionInPorcelain | TransactionInCoinbasePorcelain;
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
    toPorcelain(): object;
}
declare namespace BitcoinTransactionIn {
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
    function fromPorcelain(porcelain: TransactionInCoinbasePorcelain | TransactionInPorcelain): BitcoinTransactionIn;
    let _nativeName: string;
    let _decodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
    let _encodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
}
import BitcoinOutPoint from './OutPoint.js';
//# sourceMappingURL=TransactionIn.d.ts.map