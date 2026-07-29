import { HASH_NO_WITNESS } from './class-utils.js';
import BitcoinTransaction from './Transaction.js';
export type Encoder = import('../interface.js').Encoder;
export type BlockPorcelain = import('../interface.js').BlockPorcelain;
export type BlockHeaderPorcelain = import('../interface.js').BlockHeaderPorcelain;
/** @typedef {import('../interface.js').Encoder} Encoder */
/** @typedef {import('../interface.js').BlockPorcelain} BlockPorcelain */
/** @typedef {import('../interface.js').BlockHeaderPorcelain} BlockHeaderPorcelain */
/**
 * A class representation of a Bitcoin Block. Parent for all of the data included in the raw block
 * data in addition to some information that can be calculated based on that data. Properties are
 * intended to match the names that are provided by the Bitcoin API (hence the casing and some
 * strange names).
 *
 * @name BitcoinBlock
 * @property {number} version - positive integer
 * @property {Uint8Array} previousblockhash - 256-bit hash
 * @property {Uint8Array} merkleroot - 256-bit hash
 * @property {number} time - seconds since epoch
 * @property {number} bits
 * @property {number} nonce - 32-bit integer
 * @property {Uint8Array} hash - 256-bit hash, a double SHA2-256 hash of all bytes making up
 * this block (calculated)
 * @property {Array.<BitcoinTransaction>} tx - an array of {@link BitcoinTransaction} objects
 * representing the transactions in this block
 * @property {number} size - the length of the entire block in bytes
 * @property {number} strippedsize - the size adjusted according to weight, which accounts for
 * SegWit encoding.
 * @property {number} difficulty
 * @property {number} weight
 * @class
 */
declare class BitcoinBlock {
    version: number;
    previousblockhash: Uint8Array<ArrayBufferLike>;
    merkleroot: Uint8Array<ArrayBufferLike>;
    time: number;
    bits: number;
    nonce: number;
    hash: Uint8Array<ArrayBufferLike> | undefined;
    tx: BitcoinTransaction[] | undefined;
    size: number | undefined;
    difficulty: number;
    strippedsize: number | undefined;
    weight: number | undefined;
    _segWit: boolean | undefined;
    /**
     * Instantiate a new `BitcoinBlock`.
     *
     * See the class properties for expanded information on these parameters. The `difficulty`
     * property will be calculated from `bits`. The `stripedsize` and `weight` properties will be
     * calculated from the transactions if they are available.
     *
     * To represent a header only, the `hash`, `tx` and `size` parameters are optional.
     *
     * @param {number} version
     * @param {Uint8Array} previousblockhash
     * @param {Uint8Array} merkleroot
     * @param {number} time
     * @param {number} bits
     * @param {number} nonce
     * @param {Uint8Array} [hash]
     * @param {Array.<BitcoinTransaction>} [tx]
     * @param {number} [size]
     * @constructs BitcoinBlock
     */
    constructor(version: number, previousblockhash: Uint8Array, merkleroot: Uint8Array, time: number, bits: number, nonce: number, hash?: Uint8Array, tx?: Array<BitcoinTransaction>, size?: number);
    /**
     * @param {any} _
     * @param {'min'|'header'|'full'} [type]
     * @returns {BlockPorcelain|BlockHeaderPorcelain}
     */
    toJSON(_: any, type?: 'min' | 'header' | 'full'): BlockPorcelain | BlockHeaderPorcelain;
    /**
     * Convert to a serializable form that has nice stringified hashes and other simplified forms. May
     * be useful for simplified inspection.
     *
     * The object returned by this method matches the shape of the JSON structure provided by the
     * `getblock` RPC call of Bitcoin Core minus some chain-contextual fields that are not calculable
     * from isolated block data. Performing a `JSON.stringify()` on this object will yield the same
     * data as the RPC minus these fields.
     *
     * See [block-porcelain.ipldsch](block-porcelain.ipldsch) for a description of the layout of the
     * object returned from this method.
     *
     * @method
     * @param {'min'|'header'|'full'} [type]
     * @returns {BlockPorcelain|BlockHeaderPorcelain}
     */
    toPorcelain(type?: 'min' | 'header' | 'full'): BlockPorcelain | BlockHeaderPorcelain;
    /**
     * **Calculate** the merkle root of the transactions in this block. This method should reproduce
     * the native `merkleroot` field if this block was decoded from raw block data.
     *
     * This operation can be performed with or without witness data using the `noWitness` flag
     * parameter. Without witness data will yield the `merkleroot`, with witness data will yield the
     * witness merkle root which is hashed with the witness nonce (from the single coinbase vin) to
     * produce the witness commitment that is stored in the coinbase (from one of the vouts).
     *
     * This method assumes this object has transactions attached to it and is not the header data
     * alone.
     *
     * @method
     * @param {Symbol} [noWitness] calculate the merkle root without witness data (i.e. the standard
     * block header `merkleroot` value). Supply `HASH_NO_WITNESS` to activate.
     * @returns {Uint8Array} the merkle root
     */
    calculateMerkleRoot(noWitness?: Symbol): Uint8Array;
    /**
     * **Calculate** the witness commitment for this block. Uses the full transaction merkle root
     * (with witness data), appended to the witness nonce (stored in the coinbase vin) and hashed.
     *
     * This method assumes this object has transactions attached to it and is not the header data
     * alone. It also assumes a valid witness nonce stored in the single element of the
     * `scriptWitness` in the coinbase's single vin.
     *
     * @method
     * @returns {Uint8Array} the witness commitment
     */
    calculateWitnessCommitment(): Uint8Array;
    /**
     * **Get** the witness commitment as decoded from the block data. This is a shortcut method that
     * assumes transaction data is associated with this block and reaches into the coinbase and finds
     * the witness commitment within one of the vout elements.
     *
     * See {@link BitcoinTransaction#getWitnessCommitment()}
     *
     * @method
     * @returns {Uint8Array|null} the witness commitment
     */
    getWitnessCommitment(): Uint8Array | null;
    /**
     * Get the witness commitment nonce from the scriptWitness in the coinbase. This is a shortcut
     * that assumes transaction data (with witness data) is associated with this block and reaches
     * into the coinbase to find the nonce in the scriptWitness.
     *
     * See {@link BitcoinTransaction#getWitnessCommitmentNonce()}
     *
     * @method
     * @returns {Uint8Array} the witness commitment nonce
     */
    getWitnessCommitmentNonce(): Uint8Array;
    /**
     * Does this block contain SegWit (BIP141) transactions. This method assumes this block has
     * transaction data associated with it as it checks whether those transactions were encoded
     * as SegWit.
     *
     * @method
     * @returns {boolean}
     */
    isSegWit(): boolean;
    /**
     * Encode this block into its raw binary form. Assuming you have the complete
     * block data in this instantiated form.
     *
     * It is possible to perform a `decode().encode()` round-trip for any given valid
     * block data and produce the same binary output.
     *
     * @param {typeof HASH_NO_WITNESS} [_noWitness] - any encoding args, currently only
     * `BitcoinBlock.HASH_NO_WITNESS` is a valid argument, which when provided will
     * return the block with transactions encoded _without_ witness data.
     * @name BitcoinBlock#encode
     * @method
     * @returns {Uint8Array}
     */
    encode(_noWitness?: typeof HASH_NO_WITNESS): Uint8Array;
}
declare namespace BitcoinBlock {
    export { HASH_NO_WITNESS };
    export var fromPorcelain: (porcelain: BlockPorcelain | BlockHeaderPorcelain) => BitcoinBlock;
    export var _nativeName: string;
    export var _decodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
    export var _encodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
    export var _customDecoderMarkStart: (decoder: any, _: Record<string, any>, state: Record<string, any>) => void;
    export var _customDecodeHash: (decoder: any, properties: Record<string, any>, state: Record<string, any>) => void;
    export var _customDecodeSize: (decoder: any, properties: Record<string, any>, state: Record<string, any>) => void;
    export var _customEncodeTransactions: (block: BitcoinBlock, encoder: Encoder, args: any[]) => Generator<Uint8Array<ArrayBufferLike>, void, unknown>;
    export var decode: (_bytes: Uint8Array, _strictLengthUsage?: boolean) => BitcoinBlock;
    export var decodeHeaderOnly: (_bytes: Uint8Array, _strictLengthUsage?: boolean) => BitcoinBlock;
}
declare class BitcoinBlockHeaderOnly extends BitcoinBlock {
}
declare namespace BitcoinBlockHeaderOnly {
    var _nativeName: string;
    var _decodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
    var _customDecoderMarkStart: (decoder: any, _: Record<string, any>, state: Record<string, any>) => void;
    var _customDecodeHash: (decoder: any, properties: Record<string, any>, state: Record<string, any>) => void;
    var _encodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
}
export default BitcoinBlock;
export { BitcoinBlockHeaderOnly };
//# sourceMappingURL=Block.d.ts.map