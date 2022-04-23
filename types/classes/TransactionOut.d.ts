export = BitcoinTransactionOut;
/** @typedef {import('../interface').TransactionOutPorcelain} TransactionOutPorcelain */
/**
 * A class representation of a Bitcoin TransactionOut, multiple of which are contained within each
 * {@link BitcoinTransaction} in its `vout` array.
 *
 * @property {number} value - an amount / value for this TransactionOut (in satoshis, not BTC)
 * @property {Uint8Array} scriptPubKey - an arbitrary length byte array
 * @class
 */
declare class BitcoinTransactionOut {
    /**
     * Instantiate a new `BitcoinTransactionOut`.
     *
     * See the class properties for expanded information on these parameters.
     *
     * @param {BigInt|number} value
     * @param {Uint8Array} scriptPubKey
     * @constructs BitcoinTransactionOut
     */
    constructor(value: BigInt | number, scriptPubKey: Uint8Array);
    value: number;
    scriptPubKey: Uint8Array;
    /**
     * @param {number} [n]
     * @returns {TransactionOutPorcelain}
     */
    toJSON(n?: number | undefined): TransactionOutPorcelain;
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
    export { fromPorcelain, _nativeName, _decodePropertiesDescriptor, _encodePropertiesDescriptor, TransactionOutPorcelain };
}
type TransactionOutPorcelain = import('../interface').TransactionOutPorcelain;
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
 * @param {TransactionOutPorcelain} porcelain the porcelain form of a BitcoinTransactionOut
 * @returns {BitcoinTransactionOut}
 */
declare function fromPorcelain(porcelain: TransactionOutPorcelain): BitcoinTransactionOut;
declare var _nativeName: string;
declare var _decodePropertiesDescriptor: {
    type: string;
    name: string;
}[];
declare var _encodePropertiesDescriptor: {
    type: string;
    name: string;
}[];
//# sourceMappingURL=TransactionOut.d.ts.map