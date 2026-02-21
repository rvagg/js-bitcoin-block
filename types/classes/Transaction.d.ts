export default BitcoinTransaction;
export { COIN };
export type Decoder = import("../interface.js").Decoder;
export type Encoder = import("../interface.js").Encoder;
export type TransactionPorcelain = import("../interface.js").TransactionPorcelain;
/** @typedef {import('../interface.js').Decoder} Decoder */
/** @typedef {import('../interface.js').Encoder} Encoder */
/** @typedef {import('../interface.js').TransactionPorcelain} TransactionPorcelain */
/**
 * A class representation of a Bitcoin Transaction, multiple of which are contained within each
 * {@link BitcoinBlock}.
 *
 * @name BitcoinTransaction
 * @property {number} version
 * @property {boolean} segWit - whether this transaction contains witness data or was encoded with
 * possibly separate witness data
 * @property {Array.<BitcoinTransactionIn>} vin - an array of {@link BitcoinTransactionIn}s
 * @property {Array.<BitcoinTransactionIn>} vout - an array of {@link BitcoinTransactionOut}s
 * @property {number} lockTime
 * @property {Uint8Array} rawBytes - the raw bytes of the encoded form of this transaction
 * @property {Uint8Array} hash - the hash of the entire transaction, including witness data
 * @property {Uint8Array} txid - the hash of the transaction minus witness data
 * @property {number} sizeNoWitness - the sise of the transaction in bytes when encoded without
 * witness data
 * @property {number} size - the size of the transaction when encoded with witness data (i.e. the
 * raw form stored on disk)
 * @property {number} vsize
 * @property {number} weight
 * @class
 */
declare class BitcoinTransaction {
    /**
     * Instantiate a new `BitcoinTransaction`.
     *
     * See the class properties for expanded information on these parameters.
     *
     * @param {number} version
     * @param {boolean} segWit
     * @param {Array.<BitcoinTransactionIn>} vin
     * @param {Array.<BitcoinTransactionOut>} vout
     * @param {number} lockTime
     * @param {Uint8Array} [rawBytes]
     * @param {Uint8Array} [hash]
     * @param {Uint8Array} [txid]
     * @param {number} [sizeNoWitness]
     * @param {number} [size]
     * @constructs BitcoinTransaction
     */
    constructor(version: number, segWit: boolean, vin: Array<BitcoinTransactionIn>, vout: Array<BitcoinTransactionOut>, lockTime: number, rawBytes?: Uint8Array, hash?: Uint8Array, txid?: Uint8Array, sizeNoWitness?: number, size?: number);
    version: number;
    segWit: boolean;
    vin: BitcoinTransactionIn[];
    vout: BitcoinTransactionOut[];
    lockTime: number;
    rawBytes: Uint8Array<ArrayBufferLike> | undefined;
    hash: Uint8Array<ArrayBufferLike> | undefined;
    txid: Uint8Array<ArrayBufferLike> | undefined;
    sizeNoWitness: number | undefined;
    size: number | undefined;
    _calculateWeightAndVsize(): void;
    weight: number | undefined;
    vsize: number | undefined;
    /**
     * @returns {TransactionPorcelain}
     */
    toJSON(): TransactionPorcelain;
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
    * @method
    * @returns {object}
    */
    toPorcelain(): object;
    /**
     * Find the witness commitment index in the vout array. This method should only work on SegWit
     * _coinbase_ transactions. The vout array is scanned and each `scriptPubKey` field is inspected.
     * If one is 38 bytes long and begins with `0x6a24aa21a9ed`, this is the witness commitment vout,
     * and the index of this vout is returned.
     *
     * @method
     * @returns {number}
     */
    getWitnessCommitmentIndex(): number;
    /**
     * Get the witness commitment from this transaction. This method should only work on SegWit
     * _coinbase_ transactions. See {@link BitcoinTransaction#getWitnessCommitmentIndex} for details
     * on how this is found in the vout array. The leading 6 byte flag is removed from the
     * `scriptPubKey` of the vout before being returned by this method.
     *
     * @method
     * @returns {Uint8Array|null} the witness commitment
     */
    getWitnessCommitment(): Uint8Array | null;
    /**
     * Get the witness commitment nonce from the scriptWitness in this transaction. This method
     * should only work on _coinbase_ transacitons in SegWit blocks where the transaction data
     * we're working with has full witness data attached (i.e. not the trimmed no-witness form)
     * since the nonce is stored in the scrptWitness.
     *
     * The scriptWitness of a SegWit coinbase contains a stack with a single 32-byte array which
     * is the nonce that combines with the witness merkle root to be hashed together and form the
     * witness commitment.
     *
     * @method
     * @returns {Uint8Array|null} the witness commitment
     */
    getWitnessCommitmentNonce(): Uint8Array | null;
    /**
     * Determine if this is the coinbase. This involves checking the vout array, if this array has a
     * single entry and the `prevout` field is a null hash (`0x00*32`), this is assumed to be the
     * coinbase.
     *
     * @returns {boolean}
     */
    isCoinbase(): boolean;
    /**
     * Encode this transaction into its raw binary form. Assuming you have the complete
     * transaction data in this instantiated form.
     *
     * It is possible to perform a `decode().encode()` round-trip for any given valid
     * transaction data and produce the same binary output.
     *
     * @param {HASH_NO_WITNESS} [_noWitness] - any encoding args, currently only
     * `BitcoinTransaction.HASH_NO_WITNESS` is a valid argument, which when provided will
     * return the transaction encoded _without_ witness data. When encoded without
     * witness data, the resulting binary data can be double SHA2-256 hashed to produce
     * the `txid` which is used in the transaction merkle root stored in the header,
     * while the binary data from a full transaction will produce the `hash` which is
     * used in the witness merkle and witness commitment.
     * @name BitcoinTransaction#encode
     * @method
     * @returns {Uint8Array}
     */
    encode(_noWitness?: typeof HASH_NO_WITNESS): Uint8Array;
}
declare namespace BitcoinTransaction {
    /**
     * Decode a {@link BitcoinTransaction} from the raw bytes of the transaction.
     * Normally raw transaction data isn't available in detached form, although the
     * hex is available in the JSON output provided by the bitcoin cli attached to
     * each element of the `tx` array. It may also come from the
     * {@link BitcoinTransaction#encode} method.
     *
     * @param {Uint8Array} _bytes - the raw bytes of the transaction to be decoded.
     * @param {boolean} _strictLengthUsage - ensure that all bytes were consumed during decode.
     * This is useful when ensuring that bytes have been properly decoded where there is
     * uncertainty about whether the bytes represent a Transaction or not. Switch to `true`
     * to be sure.
     * @name BitcoinTransaction.decode
     * @returns {BitcoinTransaction}
     * @function
     */
    export function decode(_bytes: Uint8Array, _strictLengthUsage: boolean): BitcoinTransaction;
    /**
     * Check if the porcelain form of a transaction is has witness data and is therefore
     * post-SegWit.
     *
     * @function
     * @param {TransactionPorcelain} porcelain form of a transaction
     * @returns {boolean}
     */
    export function isPorcelainSegWit(porcelain: TransactionPorcelain): boolean;
    /**
     * Instantiate a `BitcoinTransaction` from porcelain data. This is the inverse of
     * {@link BitcoinTransaction#toPorcelain}. It does _not_ require the entirety of the porcelain data
     * as much of it is either duplicate data or derivable from other fields.
     *
     * This function is normally called from {@link BitcoinBlock.fromPorcelain} to instantiate the
     * each element of the `tx` array.
     *
     * Fields required to instantiate a transaction are:
     *
     * * `version` number
     * * `locktime` number
     * * `vin` array of {@link BitcoinTransactionIn} porcelain forms
     * * `vout` array of {@link BitcoinTransactionIn} porcelain forms
     *
     * Some indication of whether this is a SegWit transaction is also required to properly instantiate
     * a correct BitcoinTransaction. This could be one of:
     *
     * * both the `hash` and `txid` fields (these are compared)
     * * both the `size` and `weight` fields (`weight` is recalculated from size and compared)
     * * the `height` property (this can only come from the Bitcoin Core RPC as it is chain-context data
     *   and not derivable from standard block data)
     *
     * @function
     * @param {TransactionPorcelain} porcelain the porcelain form of a BitcoinTransaction
     * @returns {BitcoinTransaction}
     */
    export function fromPorcelain(porcelain: TransactionPorcelain): BitcoinTransaction;
    export { HASH_NO_WITNESS };
    export let _nativeName: string;
    export let _decodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
    export let _encodePropertiesDescriptor: {
        type: string;
        name: string;
    }[];
    /**
     * @param {Decoder} decoder
     * @param {any[]} _properties
     * @param {Record<string, any>} state
     */
    export function _customDecoderMarkStart(decoder: Decoder, _properties: any[], state: Record<string, any>): void;
    /**
     * @param {Decoder} decoder
     * @param {any[]} properties
     * @param {Record<string, any>} state
     */
    export function _customDecodeSegWit(decoder: Decoder, properties: any[], state: Record<string, any>): void;
    /**
     * @param {BitcoinTransaction} transaction
     * @param {Encoder} _encoder
     * @param {any[]} args
     */
    export function _customEncodeSegWit(transaction: BitcoinTransaction, _encoder: Encoder, args: any[]): Generator<Uint8Array<ArrayBuffer>, void, unknown>;
    /**
     * @param {Decoder} decoder
     * @param {any[]} properties
     * @param {Record<string, any>} state
     */
    export function _customDecodeWitness(decoder: Decoder, properties: any[], state: Record<string, any>): void;
    /**
     * @param {BitcoinTransaction} transaction
     * @param {Encoder} encoder
     * @param {any[]} args
     */
    export function _customEncodeWitness(transaction: BitcoinTransaction, encoder: Encoder, args: any[]): Generator<Uint8Array<ArrayBufferLike>, void, unknown>;
    /**
     * @param {Decoder} decoder
     * @param {any[]} properties
     * @param {Record<string, any>} state
     */
    export function _customDecodeBytes(decoder: Decoder, properties: any[], state: Record<string, any>): void;
    /**
     * @param {Decoder} _decoder
     * @param {any[]} properties
     * @param {Record<string, any>} _state
     */
    export function _customDecodeHash(_decoder: Decoder, properties: any[], _state: Record<string, any>): void;
    /**
     * @param {Decoder} decoder
     * @param {any[]} properties
     * @param {Record<string, any>} state
     */
    export function _customDecodeHashNoWitness(decoder: Decoder, properties: any[], state: Record<string, any>): void;
    /**
     * @param {Decoder} decoder
     * @param {any[]} properties
     * @param {Record<string, any>} state
     */
    export function _customDecodeSize(decoder: Decoder, properties: any[], state: Record<string, any>): void;
}
import { COIN } from './class-utils.js';
import BitcoinTransactionIn from './TransactionIn.js';
import BitcoinTransactionOut from './TransactionOut.js';
import { HASH_NO_WITNESS } from './class-utils.js';
//# sourceMappingURL=Transaction.d.ts.map