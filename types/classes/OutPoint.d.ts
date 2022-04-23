export = BitcoinOutPoint;
/**
 * A class representation of a Bitcoin OutPoint for a {@link BitcoinTransactionIn}.
 *
 * This class isn't explicitly exported, access it for direct use with `require('bitcoin-block/classes/OutPoint')`.
 *
 * @property {Uint8Array} hash
 * @property {number} n
 * @class
 */
declare class BitcoinOutPoint {
    /**
     * Instantiate a new `BitcoinOutPoint`.
     *
     * See the class properties for expanded information on these parameters.
     *
     * @param {Uint8Array} hash
     * @param {number} n
     * @constructs BitcoinOutPoint
     */
    constructor(hash: Uint8Array, n: number);
    hash: Uint8Array;
    n: number;
    /**
     * Convert to a serializable form that has nice stringified hashes and other simplified forms. May be
     * useful for simplified inspection.
     */
    toJSON(): BitcoinOutPoint & {
        hash: string;
    };
}
declare namespace BitcoinOutPoint {
    const _nativeName: string;
    const _decodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
    const _encodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
}
//# sourceMappingURL=OutPoint.d.ts.map