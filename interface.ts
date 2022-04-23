export type Encoder = (typ:string, value?:any, args?:any)=>Generator<Uint8Array, void, unknown>
export type ValueEncoder = (value:any)=>Generator<Uint8Array, void, unknown>

export interface Decoder {
  currentPosition(): number
  readUInt8(): number
  readUInt32LE(): number
  readInt32LE(): number
  readBigInt64LE(): number
  peek(len: number): Uint8Array
  slice(len: number): Uint8Array
  absoluteSlice(start: number, len: number): Uint8Array
  readHash(): Uint8Array
  readCompactInt(): number
  readCompactSlice(): Uint8Array
  readType(typ: string): any
  readClass(clazz: any): any
}

export interface BlockHeaderPorcelain {
  hash: string
  version: number
  versionHex: string
  merkleroot: string
  time: number
  nonce: number
  bits: string
  difficulty: number
  previousblockhash?: string
}

export interface BlockPorcelain extends BlockHeaderPorcelain {
  size: number
  strippedsize: number
  weight: number
  nTx: number
  // either the full transaction or the transaction hex hash
  tx: TransactionPorcelain[] | string[]
}

export interface TransactionPorcelain {
  txid: string
  hash: string
  version: number
  size: number
  vsize: number
  weight: number
  height?: number // may be present on bitcoin-cli output
  locktime: number
  vin: (TransactionInCoinbasePorcelain | TransactionInPorcelain)[]
  vout: TransactionOutPorcelain[]
  hex: string
}

export interface TransactionInCoinbasePorcelain {
  coinbase: string
  txinwitness?: string[]
  sequence: number
}

export interface TransactionInPorcelain {
  txid: string
  vout?: number
  scriptSig: {
    asm: string
    hex: string
  }
  txinwitness?: string[]
  sequence: number
}

export interface TransactionOutPorcelain {
  value: number
  n?: number
  scriptPubKey?: TransactionOutPorcelainScriptPubKey | TransactionOutPorcelainScriptPubKeyWithDest
}

interface TransactionOutPorcelainScriptPubKey {
  asm: string
  hex: string
}

interface TransactionOutPorcelainScriptPubKeyWithDest extends TransactionOutPorcelainScriptPubKey {
  reqSigs: number
  type: string
  addresses: string[]
}
