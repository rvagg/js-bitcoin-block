import BitcoinOutPoint from './OutPoint.js';
export type TransactionInPorcelain = import('../interface.js').TransactionInPorcelain;
export type TransactionInCoinbasePorcelain = import('../interface.js').TransactionInCoinbasePorcelain;
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
    prevout: BitcoinOutPoint;
    scriptSig: Uint8Array<ArrayBufferLike>;
    sequence: number;
    /** @type {undefined|Uint8Array[]} */
    scriptWitness: undefined | Uint8Array[];
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
    var fromPorcelain: (porcelain: TransactionInCoinbasePorcelain | TransactionInPorcelain) => BitcoinTransactionIn;
    var _nativeName: string;
    var _decodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
    var _encodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
}
export default BitcoinTransactionIn;
//# sourceMappingURL=TransactionIn.d.ts.map