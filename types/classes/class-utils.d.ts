/**
 * @param {string} propertiesDescriptor
 * @returns {{type:string, name:string}[]}
 */
export function decodeProperties(propertiesDescriptor: string): {
    type: string;
    name: string;
}[];
/**
 * Takes a hash, in byte form, and returns it as a big-endian uint256 in hex encoded form.
 * This format is typically used by Bitcoin in its hash identifiers, particularly its
 * block hashes and transaction identifiers and hashes.
 *
 * This method simply reverses the bytes and produces a hex string from the resulting bytes.
 *
 * See {@link fromHashHex} for the reverse operation.
 *
 * @name toHashHex
 * @function
 * @param {Uint8Array} hash
 * @returns {string}
 */
export function toHashHex(hash: Uint8Array): string;
/**
 * Takes a string containing a big-endian uint256 in hex encoded form and converts it
 * to a standard byte array.
 *
 * This method simply reverses the string and produces a `Uint8Array` from the hex bytes.
 *
 * See {@link toHashHex} for the reverse operation.
 *
 * @name fromHashHex
 * @function
 * @param {string} hashStr
 * @returns {Uint8Array}
 */
export function fromHashHex(hashStr: string): Uint8Array;
/**
 * Perform a standard Bitcoin double SHA2-256 hash on a binary blob.
 * SHA2-256(SHA2-256(bytes))
 *
 * @param {Uint8Array} bytes a Uint8Array
 * @returns {Uint8Array} a 32-byte digest
 * @function
 */
export function dblSha2256(bytes: Uint8Array): Uint8Array;
/**
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function ripemd160(bytes: Uint8Array): Uint8Array;
/**
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function hash160(bytes: Uint8Array): Uint8Array;
/**
 * Generate a merkle root using {@link dblSha2256} on each node. The merkle tree uses Bitcoin's
 * algorithm whereby a level with an odd number of nodes has the last node duplicated.
 *
 * @param {Array<Uint8Array>} hashes
 * @returns {Uint8Array} the merkle root hash
 * @function
 */
export function merkleRoot(hashes: Array<Uint8Array>): Uint8Array;
/**
 * Generate a merkle tree using {@link dblSha2256} on each node. The merkle tree uses Bitcoin's
 * algorithm whereby a level with an odd number of nodes has the last node duplicated.
 *
 * This generator function will `yield` `{ hash, data }` elements for each node of the merkle
 * tree where `data` is a two-element array containing hash `Uint8Array`s of the previous level
 * and `hash` is a `Uint8Array` containing the hash of those concatenated hashes.
 *
 * It is possible for a result to _not_ contain a `data` element if the input hashes array
 * contains only one element, in this case, that single element will be the merkle root and
 * the only result yielded, as `{ hash }`.
 *
 * The final yielded result is the merkle root.
 *
 * @param {Array<Uint8Array>} hashes
 * @yields {{hash:Uint8Array, data?:[Uint8Array, Uint8Array]}} `{ hash, data }` where `data` is an array of two hashes
 * @generator
 * @function
 */
export function merkle(hashes: Array<Uint8Array>): Generator<{
    hash: Uint8Array<ArrayBufferLike>;
    data?: undefined;
} | {
    hash: Uint8Array<ArrayBufferLike>;
    data: Uint8Array<ArrayBufferLike>[];
}, void, unknown>;
/**
 * @param {string} str
 * @param {number} [len]
 * @returns {boolean}
 */
export function isHexString(str: string, len?: number): boolean;
/**
 * The `COIN` constant is the number of _satoshis_ in 1 BTC, i.e. 100,000,000.
 * Transaction store values in satoshis so must be divided by `COIN` to find the
 * amount in BTC.
 *
 * @name COIN
 * @constant
 */
export const COIN: 100000000;
export const WITNESS_SCALE_FACTOR: 4;
export const SEGWIT_HEIGHT: 481824;
/**
 * `HASH_NO_WITNESS` is available on {@link BitcoinBlock} and {@link BitcoinTransaction}
 * and is used as an optional argument to their respective `encode()` methods
 * to signal that encoded transactions should not include witness data (i.e. their
 * pre SegWit form and the form used to generate the `txid` and transaction merkle root).
 *
 * @name HASH_NO_WITNESS
 * @constant
 */
export const HASH_NO_WITNESS: unique symbol;
//# sourceMappingURL=class-utils.d.ts.map