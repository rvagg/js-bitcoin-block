export = BitcoinBlock;
/** @typedef {import('../interface').Encoder} Encoder */
/** @typedef {import('../interface').BlockPorcelain} BlockPorcelain */
/** @typedef {import('../interface').BlockHeaderPorcelain} BlockHeaderPorcelain */
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
    constructor(version: number, previousblockhash: Uint8Array, merkleroot: Uint8Array, time: number, bits: number, nonce: number, hash?: Uint8Array | undefined, tx?: BitcoinTransaction[] | undefined, size?: number | undefined);
    version: number;
    previousblockhash: Uint8Array;
    merkleroot: Uint8Array;
    time: number;
    bits: number;
    nonce: number;
    hash: Uint8Array | undefined;
    tx: BitcoinTransaction[] | undefined;
    size: number | undefined;
    difficulty: number;
    strippedsize: number | undefined;
    weight: number | undefined;
    /**
     * @param {any} _
     * @param {'min'|'header'|'full'} [type]
     * @returns {BlockPorcelain|BlockHeaderPorcelain}
     */
    toJSON(_: any, type?: "min" | "header" | "full" | undefined): BlockPorcelain | BlockHeaderPorcelain;
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
    toPorcelain(type?: "min" | "header" | "full" | undefined): BlockPorcelain | BlockHeaderPorcelain;
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
    calculateMerkleRoot(noWitness?: Symbol | undefined): Uint8Array;
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
    _segWit: boolean | undefined;
    /**
     * Encode this block into its raw binary form. Assuming you have the complete
     * block data in this instantiated form.
     *
     * It is possible to perform a `decode().encode()` round-trip for any given valid
     * block data and produce the same binary output.
     *
     * @param {HASH_NO_WITNESS} [_noWitness] - any encoding args, currently only
     * `BitcoinBlock.HASH_NO_WITNESS` is a valid argument, which when provided will
     * return the block with transactions encoded _without_ witness data.
     * @name BitcoinBlock#encode
     * @method
     * @returns {Uint8Array}
     */
    encode(_noWitness?: typeof HASH_NO_WITNESS | undefined): Uint8Array;
}
declare namespace BitcoinBlock {
    export { HASH_NO_WITNESS, fromPorcelain, _nativeName, _decodePropertiesDescriptor, _encodePropertiesDescriptor, _customDecoderMarkStart, _customDecodeHash, _customDecodeSize, _customEncodeTransactions, decode, decodeHeaderOnly, BitcoinBlockHeaderOnly, Encoder, BlockPorcelain, BlockHeaderPorcelain };
}
import BitcoinTransaction = require("./Transaction");
type BlockPorcelain = import('../interface').BlockPorcelain;
type BlockHeaderPorcelain = import('../interface').BlockHeaderPorcelain;
import { HASH_NO_WITNESS } from "./class-utils";
/**
 * Instantiate a `BitcoinBlock` from porcelain data. This is the inverse of
 * {@link BitcoinBlock#toPorcelain}. It does _not_ require the entirety of the porcelain data as
 * much of it is either duplicate data or derivable from other fields.
 *
 * If a full `tx` array is provided on the porcelain object {@link BitcoinTransaction.fromPorcelain}
 * is called on each of these in turn to re-instantiate the native transaction array.
 *
 * Fields required to instantiate a basic header form are:
 *
 * * `previousblockhash` _if_ the block is not the genesis block (its absence assumes this)
 * * `version` integer
 * * `merkleroot` 64-character hex string
 * *  `time` integer
 * * `bits` hex string
 *
 * A `tx` array indicates that full block data is present and it should attempt to decode the entire
 * structure.
 *
 * @param {BlockPorcelain | BlockHeaderPorcelain} porcelain the porcelain form of a Bitcoin block
 * @returns {BitcoinBlock}
 * @function
 */
declare function fromPorcelain(porcelain: BlockPorcelain | BlockHeaderPorcelain): BitcoinBlock;
declare var _nativeName: string;
declare var _decodePropertiesDescriptor: {
    type: string;
    name: string;
}[];
declare var _encodePropertiesDescriptor: {
    type: string;
    name: string;
}[];
/**
 * @param {*} decoder
 * @param {Record<string, any>} _
 * @param {Record<string, any>} state
 */
declare function _customDecoderMarkStart(decoder: any, _: Record<string, any>, state: Record<string, any>): void;
/**
 * @param {*} decoder
 * @param {Record<string, any>} properties
 * @param {Record<string, any>} state
 */
declare function _customDecodeHash(decoder: any, properties: Record<string, any>, state: Record<string, any>): void;
/**
 * @param {*} decoder
 * @param {Record<string, any>} properties
 * @param {Record<string, any>} state
 */
declare function _customDecodeSize(decoder: any, properties: Record<string, any>, state: Record<string, any>): void;
/**
 * @param {BitcoinBlock} block
 * @param {Encoder} encoder
 * @param {any[]} args
 */
declare function _customEncodeTransactions(block: BitcoinBlock, encoder: Encoder, args: any[]): Generator<Uint8Array, void, unknown>;
/**
 * Decode a {@link BitcoinBlock} from the raw bytes of the block. Such data
 * in hex form is available directly from the bitcoin cli:
 * `bitcoin-cli getblock <hash> 0` (where `0` requests hex form).
 *
 * Use this if you have the full block hash, otherwise use {@link BitcoinBlock.decodeBlockHeaderOnly}
 * to parse just the 80-byte header data.
 *
 * @param {Uint8Array} _bytes - the raw bytes of the block to be decoded.
 * @param {boolean} [_strictLengthUsage] - ensure that all bytes were consumed during decode.
 * This is useful when ensuring that bytes have been properly decoded where there is
 * uncertainty about whether the bytes represent a Block or not. Switch to `true` to be
 * sure.
 * @name BitcoinBlock.decode
 * @function
 * @returns {BitcoinBlock}
 */
declare function decode(_bytes: Uint8Array, _strictLengthUsage?: boolean | undefined): BitcoinBlock;
/**
 * Decode only the header section of a {@link BitcoinBlock} from the raw bytes of the block.
 * This method will exclude the transactions but will properly present the header
 * data including the correct hash.
 *
 * To decode the entire block data, use {@link BitcoinBlock.decodeBlock}.
 *
 * This method returns a `BitcoinBlockHeaderOnly` which is a subclass of
 * `BitcoinBlock` and may be used as such. Just don't expect it to give you
 * any transaction data beyond the merkle root.
 *
 * @param {Uint8Array} _bytes - the raw bytes of the block to be decoded.
 * @param {boolean} [_strictLengthUsage]
 * @name BitcoinBlock.decodeBlockHeaderOnly
 * @function
 * @returns {BitcoinBlock}
 */
declare function decodeHeaderOnly(_bytes: Uint8Array, _strictLengthUsage?: boolean | undefined): BitcoinBlock;
declare class BitcoinBlockHeaderOnly extends BitcoinBlock {
}
declare namespace BitcoinBlockHeaderOnly {
    export const _nativeName: string;
    export const _decodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
    import _customDecoderMarkStart = BitcoinBlock._customDecoderMarkStart;
    export { _customDecoderMarkStart };
    import _customDecodeHash = BitcoinBlock._customDecodeHash;
    export { _customDecodeHash };
    export const _encodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
}
type Encoder = import('../interface').Encoder;
//# sourceMappingURL=Block.d.ts.map