export type Encoder = import('./interface.js').Encoder;
export type ValueEncoder = import('./interface.js').ValueEncoder;
export type Decoder = import('./interface.js').Decoder;
/**
 * @param {boolean} value
 */
export declare function setDebug(value: boolean): void;
/**
 * @param {number} size
 * @returns {number}
 */
export declare function compactSizeSize(size: number): number;
/**
 * @param {string} typ
 * @param {any} value
 * @param {any} args
 * @returns {Generator<Uint8Array, void, undefined>}
 */
declare function encoder(typ: string, value: any, args: any): Generator<Uint8Array, void, undefined>;
/**
 * @param {any} obj
 * @param {any} args
 * @returns {any}
 */
declare function encodeType(obj: any, args: any): any;
/**
 * @param {Uint8Array} buf
 * @param {string} type
 * @param {boolean} [strictLengthUsage]
 * @returns {any}
 */
export declare function decodeType(buf: Uint8Array, type: string, strictLengthUsage?: boolean): any;
/**
 * @param {Record<string, any>} classes
 */
export declare function setup(classes: Record<string, any>): void;
export { encodeType, encoder };
//# sourceMappingURL=coding.d.ts.map