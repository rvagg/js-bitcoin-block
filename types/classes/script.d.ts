export const MAX_SCRIPT_SIZE: 10000;
export namespace opcodes {
    let OP_0: number;
    let OP_FALSE: number;
    let OP_PUSHDATA1: number;
    let OP_PUSHDATA2: number;
    let OP_PUSHDATA4: number;
    let OP_1NEGATE: number;
    let OP_RESERVED: number;
    let OP_TRUE: number;
    let OP_1: number;
    let OP_2: number;
    let OP_3: number;
    let OP_4: number;
    let OP_5: number;
    let OP_6: number;
    let OP_7: number;
    let OP_8: number;
    let OP_9: number;
    let OP_10: number;
    let OP_11: number;
    let OP_12: number;
    let OP_13: number;
    let OP_14: number;
    let OP_15: number;
    let OP_16: number;
    let OP_NOP: number;
    let OP_VER: number;
    let OP_IF: number;
    let OP_NOTIF: number;
    let OP_VERIF: number;
    let OP_VERNOTIF: number;
    let OP_ELSE: number;
    let OP_ENDIF: number;
    let OP_VERIFY: number;
    let OP_RETURN: number;
    let OP_TOALTSTACK: number;
    let OP_FROMALTSTACK: number;
    let OP_2DROP: number;
    let OP_2DUP: number;
    let OP_3DUP: number;
    let OP_2OVER: number;
    let OP_2ROT: number;
    let OP_2SWAP: number;
    let OP_IFDUP: number;
    let OP_DEPTH: number;
    let OP_DROP: number;
    let OP_DUP: number;
    let OP_NIP: number;
    let OP_OVER: number;
    let OP_PICK: number;
    let OP_ROLL: number;
    let OP_ROT: number;
    let OP_SWAP: number;
    let OP_TUCK: number;
    let OP_CAT: number;
    let OP_SUBSTR: number;
    let OP_LEFT: number;
    let OP_RIGHT: number;
    let OP_SIZE: number;
    let OP_INVERT: number;
    let OP_AND: number;
    let OP_OR: number;
    let OP_XOR: number;
    let OP_EQUAL: number;
    let OP_EQUALVERIFY: number;
    let OP_RESERVED1: number;
    let OP_RESERVED2: number;
    let OP_1ADD: number;
    let OP_1SUB: number;
    let OP_2MUL: number;
    let OP_2DIV: number;
    let OP_NEGATE: number;
    let OP_ABS: number;
    let OP_NOT: number;
    let OP_0NOTEQUAL: number;
    let OP_ADD: number;
    let OP_SUB: number;
    let OP_MUL: number;
    let OP_DIV: number;
    let OP_MOD: number;
    let OP_LSHIFT: number;
    let OP_RSHIFT: number;
    let OP_BOOLAND: number;
    let OP_BOOLOR: number;
    let OP_NUMEQUAL: number;
    let OP_NUMEQUALVERIFY: number;
    let OP_NUMNOTEQUAL: number;
    let OP_LESSTHAN: number;
    let OP_GREATERTHAN: number;
    let OP_LESSTHANOREQUAL: number;
    let OP_GREATERTHANOREQUAL: number;
    let OP_MIN: number;
    let OP_MAX: number;
    let OP_WITHIN: number;
    let OP_RIPEMD160: number;
    let OP_SHA1: number;
    let OP_SHA256: number;
    let OP_HASH160: number;
    let OP_HASH256: number;
    let OP_CODESEPARATOR: number;
    let OP_CHECKSIG: number;
    let OP_CHECKSIGVERIFY: number;
    let OP_CHECKMULTISIG: number;
    let OP_CHECKMULTISIGVERIFY: number;
    let OP_NOP1: number;
    let OP_NOP2: number;
    let OP_CHECKLOCKTIMEVERIFY: number;
    let OP_NOP3: number;
    let OP_CHECKSEQUENCEVERIFY: number;
    let OP_NOP4: number;
    let OP_NOP5: number;
    let OP_NOP6: number;
    let OP_NOP7: number;
    let OP_NOP8: number;
    let OP_NOP9: number;
    let OP_NOP10: number;
    let OP_INVALIDOPCODE: number;
}
export const opcodeNames: string[];
export namespace sigHashTypes {
    let SIGHASH_ALL: number;
    let SIGHASH_NONE: number;
    let SIGHASH_SINGLE: number;
    let SIGHASH_ANYONECANPAY: number;
}
export const mapSigHashTypes: {
    [x: number]: string;
};
export namespace types {
    let TX_NONSTANDARD: string;
    let TX_PUBKEY: string;
    let TX_PUBKEYHASH: string;
    let TX_SCRIPTHASH: string;
    let TX_MULTISIG: string;
    let TX_NULL_DATA: string;
    let TX_WITNESS_V0_KEYHASH: string;
    let TX_WITNESS_V0_SCRIPTHASH: string;
    let TX_WITNESS_UNKNOWN: string;
}
export const WITNESS_V0_KEYHASH_SIZE: 20;
export const WITNESS_V0_SCRIPTHASH_SIZE: 32;
/**
 * @param {Uint8Array} buf
 * @param {number} [offset=0]
 * @returns {{opcode:number,opcodeName:string,data:Uint8Array,offset:number}|null}
 */
export function getScriptOp(buf: Uint8Array, offset?: number): {
    opcode: number;
    opcodeName: string;
    data: Uint8Array;
    offset: number;
} | null;
/**
 * @param {Uint8Array} buf
 * @returns {boolean}
 */
export function isDefinedHashtypeSignature(buf: Uint8Array): boolean;
/**
 * @param {Uint8Array} sig
 * @returns {boolean}
 */
export function isValidSignatureEncoding(sig: Uint8Array): boolean;
/**
 * @param {Uint8Array} buf
 * @param {boolean} [attemptSighashDecode]
 * @returns {string}
 */
export function scriptToAsmStr(buf: Uint8Array, attemptSighashDecode?: boolean): string;
/**
 * @param {Uint8Array} buf
 * @returns {boolean}
 */
export function isUnspendable(buf: Uint8Array): boolean;
/**
 * @param {Uint8Array} buf
 * @returns {number}
 */
export function setVch(buf: Uint8Array): number;
/**
 * @param {Uint8Array} buf
 * @returns {boolean}
 */
export function isPayToScriptHash(buf: Uint8Array): boolean;
/**
 * @param {Uint8Array} buf
 * @returns {{version:number, program:Uint8Array}|null}
 */
export function isWitnessProgram(buf: Uint8Array): {
    version: number;
    program: Uint8Array;
} | null;
/**
 * @param {Uint8Array} buf
 * @param {number} offset
 * @returns {boolean}
 */
export function isPushOnly(buf: Uint8Array, offset: number): boolean;
/**
 * @param {number} chHeader
 * @returns {number}
 */
export function pubKeyGetLen(chHeader: number): number;
/**
 * @param {Uint8Array} buf
 * @returns {boolean}
 */
export function pubKeyValidSize(buf: Uint8Array): boolean;
/**
 * @param {Uint8Array} buf
 * @returns {Uint8Array|null}
 */
export function matchPayToPubkey(buf: Uint8Array): Uint8Array | null;
/**
 * @param {Uint8Array} buf
 * @returns {Uint8Array|null}
 */
export function matchPayToPubkeyHash(buf: Uint8Array): Uint8Array | null;
/**
 * @param {Uint8Array} buf
 * @returns {{required:number, pubkeys:Uint8Array[]}|null}
 */
export function matchMultisig(buf: Uint8Array): {
    required: number;
    pubkeys: Uint8Array[];
} | null;
/**
 * @param {number} opcode
 * @returns {boolean}
 */
export function isSmallInteger(opcode: number): boolean;
/**
 * @param {Uint8Array} buf
 * @returns {{solutions?:Uint8Array[], type:string}}
 */
export function solver(buf: Uint8Array): {
    solutions?: Uint8Array[];
    type: string;
};
/**
 * @param {Uint8Array} buf
 * @returns {{addresses:Uint8Array[], required:number}|null}
 */
export function extractDestinations(buf: Uint8Array): {
    addresses: Uint8Array[];
    required: number;
} | null;
/**
 * DestinationEncoder
 * @param {Uint8Array} buf
 * @param {string} type
 * @returns
 */
export function encodeAddress(buf: Uint8Array, type: string): string;
//# sourceMappingURL=script.d.ts.map