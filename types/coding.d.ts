export = setup;
/**
 * @param {Record<string, any>} classes
 */
declare function setup(classes: Record<string, any>): {
    decodeType: typeof decodeType;
    encodeType: typeof encodeType;
    encoder: typeof encoder;
};
declare namespace setup {
    export { compactSizeSize, DEBUG, Encoder, ValueEncoder, Decoder };
}
/**
 * @param {Uint8Array} buf
 * @param {string} type
 * @param {boolean} [strictLengthUsage]
 * @returns {any}
 */
declare function decodeType(buf: Uint8Array, type: string, strictLengthUsage?: boolean | undefined): any;
/**
 * @param {any} obj
 * @param {any} args
 * @returns {any}
 */
declare function encodeType(obj: any, args: any): any;
/**
 * @type {Encoder}
 */
declare function encoder(typ: string, value: any, args: any): Generator<Uint8Array, void, unknown>;
/**
 * @param {number} size
 * @returns {number}
 */
declare function compactSizeSize(size: number): number;
declare var DEBUG: boolean;
type Encoder = import('./interface').Encoder;
type ValueEncoder = import('./interface').ValueEncoder;
type Decoder = import('./interface').Decoder;
//# sourceMappingURL=coding.d.ts.map