export const MAX_SCRIPT_SIZE: 10000;
export namespace opcodes {
    const OP_0: number;
    const OP_FALSE: number;
    const OP_PUSHDATA1: number;
    const OP_PUSHDATA2: number;
    const OP_PUSHDATA4: number;
    const OP_1NEGATE: number;
    const OP_RESERVED: number;
    const OP_TRUE: number;
    const OP_1: number;
    const OP_2: number;
    const OP_3: number;
    const OP_4: number;
    const OP_5: number;
    const OP_6: number;
    const OP_7: number;
    const OP_8: number;
    const OP_9: number;
    const OP_10: number;
    const OP_11: number;
    const OP_12: number;
    const OP_13: number;
    const OP_14: number;
    const OP_15: number;
    const OP_16: number;
    const OP_NOP: number;
    const OP_VER: number;
    const OP_IF: number;
    const OP_NOTIF: number;
    const OP_VERIF: number;
    const OP_VERNOTIF: number;
    const OP_ELSE: number;
    const OP_ENDIF: number;
    const OP_VERIFY: number;
    const OP_RETURN: number;
    const OP_TOALTSTACK: number;
    const OP_FROMALTSTACK: number;
    const OP_2DROP: number;
    const OP_2DUP: number;
    const OP_3DUP: number;
    const OP_2OVER: number;
    const OP_2ROT: number;
    const OP_2SWAP: number;
    const OP_IFDUP: number;
    const OP_DEPTH: number;
    const OP_DROP: number;
    const OP_DUP: number;
    const OP_NIP: number;
    const OP_OVER: number;
    const OP_PICK: number;
    const OP_ROLL: number;
    const OP_ROT: number;
    const OP_SWAP: number;
    const OP_TUCK: number;
    const OP_CAT: number;
    const OP_SUBSTR: number;
    const OP_LEFT: number;
    const OP_RIGHT: number;
    const OP_SIZE: number;
    const OP_INVERT: number;
    const OP_AND: number;
    const OP_OR: number;
    const OP_XOR: number;
    const OP_EQUAL: number;
    const OP_EQUALVERIFY: number;
    const OP_RESERVED1: number;
    const OP_RESERVED2: number;
    const OP_1ADD: number;
    const OP_1SUB: number;
    const OP_2MUL: number;
    const OP_2DIV: number;
    const OP_NEGATE: number;
    const OP_ABS: number;
    const OP_NOT: number;
    const OP_0NOTEQUAL: number;
    const OP_ADD: number;
    const OP_SUB: number;
    const OP_MUL: number;
    const OP_DIV: number;
    const OP_MOD: number;
    const OP_LSHIFT: number;
    const OP_RSHIFT: number;
    const OP_BOOLAND: number;
    const OP_BOOLOR: number;
    const OP_NUMEQUAL: number;
    const OP_NUMEQUALVERIFY: number;
    const OP_NUMNOTEQUAL: number;
    const OP_LESSTHAN: number;
    const OP_GREATERTHAN: number;
    const OP_LESSTHANOREQUAL: number;
    const OP_GREATERTHANOREQUAL: number;
    const OP_MIN: number;
    const OP_MAX: number;
    const OP_WITHIN: number;
    const OP_RIPEMD160: number;
    const OP_SHA1: number;
    const OP_SHA256: number;
    const OP_HASH160: number;
    const OP_HASH256: number;
    const OP_CODESEPARATOR: number;
    const OP_CHECKSIG: number;
    const OP_CHECKSIGVERIFY: number;
    const OP_CHECKMULTISIG: number;
    const OP_CHECKMULTISIGVERIFY: number;
    const OP_NOP1: number;
    const OP_NOP2: number;
    const OP_CHECKLOCKTIMEVERIFY: number;
    const OP_NOP3: number;
    const OP_CHECKSEQUENCEVERIFY: number;
    const OP_NOP4: number;
    const OP_NOP5: number;
    const OP_NOP6: number;
    const OP_NOP7: number;
    const OP_NOP8: number;
    const OP_NOP9: number;
    const OP_NOP10: number;
    const OP_INVALIDOPCODE: number;
}
export const opcodeNames: string[];
export namespace sigHashTypes {
    const SIGHASH_ALL: number;
    const SIGHASH_NONE: number;
    const SIGHASH_SINGLE: number;
    const SIGHASH_ANYONECANPAY: number;
}
export const mapSigHashTypes: {
    [x: number]: string;
};
export namespace types {
    const TX_NONSTANDARD: string;
    const TX_PUBKEY: string;
    const TX_PUBKEYHASH: string;
    const TX_SCRIPTHASH: string;
    const TX_MULTISIG: string;
    const TX_NULL_DATA: string;
    const TX_WITNESS_V0_KEYHASH: string;
    const TX_WITNESS_V0_SCRIPTHASH: string;
    const TX_WITNESS_UNKNOWN: string;
}
export const WITNESS_V0_KEYHASH_SIZE: 20;
export const WITNESS_V0_SCRIPTHASH_SIZE: 32;
/**
 * @param {Uint8Array} buf
 * @param {number} [offset=0]
 * @returns {{opcode:number,opcodeName:string,data:Uint8Array,offset:number}|null}
 */
export function getScriptOp(buf: Uint8Array, offset?: number | undefined): {
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
export function scriptToAsmStr(buf: Uint8Array, attemptSighashDecode?: boolean | undefined): string;
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