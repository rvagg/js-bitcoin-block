export type TransactionOutPorcelain = import('../interface.js').TransactionOutPorcelain;
/** @typedef {import('../interface.js').TransactionOutPorcelain} TransactionOutPorcelain */
/**
 * A class representation of a Bitcoin TransactionOut, multiple of which are contained within each
 * {@link BitcoinTransaction} in its `vout` array.
 *
 * @property {number} value - an amount / value for this TransactionOut (in satoshis, not BTC)
 * @property {Uint8Array} scriptPubKey - an arbitrary length byte array
 * @class
 */
declare class BitcoinTransactionOut {
    value: number;
    scriptPubKey: Uint8Array<ArrayBufferLike>;
    /**
     * Instantiate a new `BitcoinTransactionOut`.
     *
     * See the class properties for expanded information on these parameters.
     *
     * @param {BigInt|number} value
     * @param {Uint8Array} scriptPubKey
     * @constructs BitcoinTransactionOut
     */
    constructor(value: bigint | number, scriptPubKey: Uint8Array);
    /**
     * @param {number} [n]
     * @returns {TransactionOutPorcelain}
     */
    toJSON(n?: number): TransactionOutPorcelain;
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
declare namespace BitcoinTransactionOut {
    var fromPorcelain: (porcelain: TransactionOutPorcelain) => BitcoinTransactionOut;
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
export default BitcoinTransactionOut;
//# sourceMappingURL=TransactionOut.d.ts.map