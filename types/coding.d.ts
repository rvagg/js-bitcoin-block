/**
 * @param {boolean} value
 */
export function setDebug(value: boolean): void;
/**
 * @param {number} size
 * @returns {number}
 */
export function compactSizeSize(size: number): number;
/**
 * @param {Uint8Array} buf
 * @param {string} type
 * @param {boolean} [strictLengthUsage]
 * @returns {any}
 */
export function decodeType(buf: Uint8Array, type: string, strictLengthUsage?: boolean): any;
/**
 * @param {Record<string, any>} classes
 */
export function setup(classes: Record<string, any>): void;
export type Encoder = import("./interface.js").Encoder;
export type ValueEncoder = import("./interface.js").ValueEncoder;
export type Decoder = import("./interface.js").Decoder;
/**
 * @param {any} obj
 * @param {any} args
 * @returns {any}
 */
export function encodeType(obj: any, args: any): any;
/**
 * @param {string} typ
 * @param {any} value
 * @param {any} args
 * @returns {Generator<Uint8Array, void, undefined>}
 */
export function encoder(typ: string, value: any, args: any): Generator<Uint8Array, void, undefined>;
//# sourceMappingURL=coding.d.ts.map