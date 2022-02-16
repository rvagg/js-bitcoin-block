const { base58btc } = require('multiformats/bases/base58')
const { bech32 } = require('bech32')
const { dblSha2256, hash160 } = require('./class-utils')
const { toHex, concat } = require('../util')

const MAX_SCRIPT_SIZE = 10000
const BECH32_HRP = 'bc'

const opcodes = {
  // push value
  OP_0: 0x00,
  OP_FALSE: 0x00,
  OP_PUSHDATA1: 0x4c,
  OP_PUSHDATA2: 0x4d,
  OP_PUSHDATA4: 0x4e,
  OP_1NEGATE: 0x4f,
  OP_RESERVED: 0x50,
  OP_TRUE: 0x51,
  OP_1: 0x51,
  OP_2: 0x52,
  OP_3: 0x53,
  OP_4: 0x54,
  OP_5: 0x55,
  OP_6: 0x56,
  OP_7: 0x57,
  OP_8: 0x58,
  OP_9: 0x59,
  OP_10: 0x5a,
  OP_11: 0x5b,
  OP_12: 0x5c,
  OP_13: 0x5d,
  OP_14: 0x5e,
  OP_15: 0x5f,
  OP_16: 0x60,

  // control
  OP_NOP: 0x61,
  OP_VER: 0x62,
  OP_IF: 0x63,
  OP_NOTIF: 0x64,
  OP_VERIF: 0x65,
  OP_VERNOTIF: 0x66,
  OP_ELSE: 0x67,
  OP_ENDIF: 0x68,
  OP_VERIFY: 0x69,
  OP_RETURN: 0x6a,

  // stack ops
  OP_TOALTSTACK: 0x6b,
  OP_FROMALTSTACK: 0x6c,
  OP_2DROP: 0x6d,
  OP_2DUP: 0x6e,
  OP_3DUP: 0x6f,
  OP_2OVER: 0x70,
  OP_2ROT: 0x71,
  OP_2SWAP: 0x72,
  OP_IFDUP: 0x73,
  OP_DEPTH: 0x74,
  OP_DROP: 0x75,
  OP_DUP: 0x76,
  OP_NIP: 0x77,
  OP_OVER: 0x78,
  OP_PICK: 0x79,
  OP_ROLL: 0x7a,
  OP_ROT: 0x7b,
  OP_SWAP: 0x7c,
  OP_TUCK: 0x7d,

  // splice ops
  OP_CAT: 0x7e,
  OP_SUBSTR: 0x7f,
  OP_LEFT: 0x80,
  OP_RIGHT: 0x81,
  OP_SIZE: 0x82,

  // bit logic
  OP_INVERT: 0x83,
  OP_AND: 0x84,
  OP_OR: 0x85,
  OP_XOR: 0x86,
  OP_EQUAL: 0x87,
  OP_EQUALVERIFY: 0x88,
  OP_RESERVED1: 0x89,
  OP_RESERVED2: 0x8a,

  // numeric
  OP_1ADD: 0x8b,
  OP_1SUB: 0x8c,
  OP_2MUL: 0x8d,
  OP_2DIV: 0x8e,
  OP_NEGATE: 0x8f,
  OP_ABS: 0x90,
  OP_NOT: 0x91,
  OP_0NOTEQUAL: 0x92,

  OP_ADD: 0x93,
  OP_SUB: 0x94,
  OP_MUL: 0x95,
  OP_DIV: 0x96,
  OP_MOD: 0x97,
  OP_LSHIFT: 0x98,
  OP_RSHIFT: 0x99,

  OP_BOOLAND: 0x9a,
  OP_BOOLOR: 0x9b,
  OP_NUMEQUAL: 0x9c,
  OP_NUMEQUALVERIFY: 0x9d,
  OP_NUMNOTEQUAL: 0x9e,
  OP_LESSTHAN: 0x9f,
  OP_GREATERTHAN: 0xa0,
  OP_LESSTHANOREQUAL: 0xa1,
  OP_GREATERTHANOREQUAL: 0xa2,
  OP_MIN: 0xa3,
  OP_MAX: 0xa4,

  OP_WITHIN: 0xa5,

  // crypto
  OP_RIPEMD160: 0xa6,
  OP_SHA1: 0xa7,
  OP_SHA256: 0xa8,
  OP_HASH160: 0xa9,
  OP_HASH256: 0xaa,
  OP_CODESEPARATOR: 0xab,
  OP_CHECKSIG: 0xac,
  OP_CHECKSIGVERIFY: 0xad,
  OP_CHECKMULTISIG: 0xae,
  OP_CHECKMULTISIGVERIFY: 0xaf,

  // expansion
  OP_NOP1: 0xb0,
  OP_NOP2: 0xb1,
  OP_CHECKLOCKTIMEVERIFY: 0xb1,
  OP_NOP3: 0xb2,
  OP_CHECKSEQUENCEVERIFY: 0xb2,
  OP_NOP4: 0xb3,
  OP_NOP5: 0xb4,
  OP_NOP6: 0xb5,
  OP_NOP7: 0xb6,
  OP_NOP8: 0xb7,
  OP_NOP9: 0xb8,
  OP_NOP10: 0xb9,

  OP_INVALIDOPCODE: 0xff
}

const opcodeNames = ((() => {
  const opcodeNames = Object.entries(opcodes).reduce((p, c) => {
    const [key, value] = c
    p[value] = key
    return p
  }, [])

  opcodeNames[opcodes.OP_0] = '0'
  opcodeNames[opcodes.OP_1NEGATE] = '-1'
  for (let i = opcodes.OP_1; i <= opcodes.OP_16; i++) {
    opcodeNames[i] = opcodeNames[i].substring(3)
  }
  return opcodeNames
})())

const sigHashTypes = {
  SIGHASH_ALL: 1,
  SIGHASH_NONE: 2,
  SIGHASH_SINGLE: 3,
  SIGHASH_ANYONECANPAY: 0x80
}

const mapSigHashTypes = {
  [sigHashTypes.SIGHASH_ALL]: 'ALL',
  [sigHashTypes.SIGHASH_ALL | sigHashTypes.SIGHASH_ANYONECANPAY]: 'ALL|ANYONECANPAY',
  [sigHashTypes.SIGHASH_NONE]: 'NONE',
  [sigHashTypes.SIGHASH_NONE | sigHashTypes.SIGHASH_ANYONECANPAY]: 'NONE|ANYONECANPAY',
  [sigHashTypes.SIGHASH_SINGLE]: 'SINGLE',
  [sigHashTypes.SIGHASH_SINGLE | sigHashTypes.SIGHASH_ANYONECANPAY]: 'SINGLE|ANYONECANPAY'
}

function getScriptOp (buf, offset = 0) {
  if (buf.length - offset < 1) {
    return null
  }
  const opcode = buf[offset++]
  let data = new Uint8Array(0)

  if (opcode <= opcodes.OP_PUSHDATA4) {
    let nSize = 0
    if (opcode < opcodes.OP_PUSHDATA1) {
      nSize = opcode
    } else if (opcode === opcodes.OP_PUSHDATA1) {
      if (buf.length - offset < 1) {
        return null
      }
      nSize = buf[offset++]
    } else if (opcode === opcodes.OP_PUSHDATA2) {
      if (buf.length - offset < 2) {
        return null
      }
      const dv = new DataView(buf.buffer, buf.byteOffset, buf.length)
      nSize = dv.getUint16(offset, true)
      offset += 2
    } else if (opcode === opcodes.OP_PUSHDATA4) {
      if (buf.length - offset < 4) {
        return null
      }
      const dv = new DataView(buf.buffer, buf.byteOffset, buf.length)
      nSize = dv.getUint32(offset, true)
      offset += 4
    }
    if (buf.length - offset < 0 || buf.length - offset < nSize) {
      return null
    }
    data = buf.slice(offset, offset + nSize)
    offset += nSize
  }

  return {
    opcode,
    opcodeName: opcodeNames[opcode] || 'OP_UNKNOWN',
    data: data,
    offset
  }
}

function isDefinedHashtypeSignature (buf) {
  if (buf.length === 0) {
    return false
  }
  const nHashType = buf[buf.length - 1] & (~(sigHashTypes.SIGHASH_ANYONECANPAY))
  if (nHashType < sigHashTypes.SIGHASH_ALL || nHashType > sigHashTypes.SIGHASH_SINGLE) {
    return false
  }
  return true
}

function isValidSignatureEncoding (sig) {
  // Format: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S] [sighash]
  // * total-length: 1-byte length descriptor of everything that follows,
  //   excluding the sighash byte.
  // * R-length: 1-byte length descriptor of the R value that follows.
  // * R: arbitrary-length big-endian encoded R value. It must use the shortest
  //   possible encoding for a positive integer (which means no null bytes at
  //   the start, except a single one when the next byte has its highest bit set).
  // * S-length: 1-byte length descriptor of the S value that follows.
  // * S: arbitrary-length big-endian encoded S value. The same rules apply.
  // * sighash: 1-byte value indicating what data is hashed (not part of the DER
  //   signature)

  // Minimum and maximum size constraints.
  if (sig.length < 9) {
    return false
  }
  if (sig.length > 73) {
    return false
  }

  // A signature is of type 0x30 (compound).
  if (sig[0] !== 0x30) {
    return false
  }

  // Make sure the length covers the entire signature.
  if (sig[1] !== sig.length - 3) {
    return false
  }

  // Extract the length of the R element.
  const lenR = sig[3]

  // Make sure the length of the S element is still inside the signature.
  if (5 + lenR >= sig.length) {
    return false
  }

  // Extract the length of the S element.
  const lenS = sig[5 + lenR]

  // Verify that the length of the signature matches the sum of the length
  // of the elements.
  if (lenR + lenS + 7 !== sig.length) {
    return false
  }

  // Check whether the R element is an integer.
  if (sig[2] !== 0x02) {
    return false
  }

  // Zero-length integers are not allowed for R.
  if (lenR === 0) {
    return false
  }

  // Negative numbers are not allowed for R.
  if (sig[4] & 0x80) {
    return false
  }

  // Null bytes at the start of R are not allowed, unless R would
  // otherwise be interpreted as a negative number.
  if (lenR > 1 && (sig[4] === 0x00) && !(sig[5] & 0x80)) {
    return false
  }

  // Check whether the S element is an integer.
  if (sig[lenR + 4] !== 0x02) {
    return false
  }

  // Zero-length integers are not allowed for S.
  if (lenS === 0) {
    return false
  }

  // Negative numbers are not allowed for S.
  if (sig[lenR + 6] & 0x80) {
    return false
  }

  // Null bytes at the start of S are not allowed, unless S would otherwise be
  // interpreted as a negative number.
  if (lenS > 1 && (sig[lenR + 6] === 0x00) && !(sig[lenR + 7] & 0x80)) {
    return false
  }

  return true
}

function scriptToAsmStr (buf, attemptSighashDecode) {
  let offset = 0
  let str = ''

  while (offset < buf.length) {
    if (offset) {
      str += ' '
    }
    const op = getScriptOp(buf, offset)
    if (!op) {
      str += '[error]'
      return str
    }
    offset = op.offset
    if (op.opcode >= 0 && op.opcode <= opcodes.OP_PUSHDATA4) { // eslint-disable-line
      if (op.data.length <= 4) {
        str += setVch(op.data)
      } else {
        let strSigHashDecode = ''
        if (attemptSighashDecode && !isUnspendable(buf)) {
          // CheckSignatureEncoding() call with SCRIPT_VERIFY_STRICTENC
          if (op.data.length > 0 && isValidSignatureEncoding(op.data) && isDefinedHashtypeSignature(op.data)) {
            const sigHashType = mapSigHashTypes[op.data[op.data.length - 1]]
            if (sigHashType) {
              strSigHashDecode = `[${sigHashType}]`
              op.data = op.data.slice(0, op.data.length - 1)
            }
          }
        }
        str += `${toHex(op.data)}${strSigHashDecode}`
      }
    } else {
      str += op.opcodeName
    }
  }

  return str
}

function isUnspendable (buf) {
  return (buf.length > 0 && buf[0] === opcodes.OP_RETURN) || (buf.length > MAX_SCRIPT_SIZE)
}

// why is this a thing? I don't know.
function setVch (buf) {
  if (!buf.length) {
    return 0
  }

  let result = 0
  for (let i = 0; i !== buf.length; ++i) {
    let v = buf[i]
    if (i === buf.length - 1) {
      // original version takes this bit off at the end but we run into bit-op
      // problems for ints of a certain size, so take it off this small int before
      // shifting it larger
      v = v & 0x7f
    }
    result += v * (2 ** (8 * i))
  }

  if (buf[buf.length - 1] & 0x80) {
    return -result
  }

  return result
}

function isPayToScriptHash (buf) {
  return buf.length === 23 && buf[0] === opcodes.OP_HASH160 && buf[1] === 0x14 && buf[22] === opcodes.OP_EQUAL
}

const types = {
  TX_NONSTANDARD: 'nonstandard',
  TX_PUBKEY: 'pubkey',
  TX_PUBKEYHASH: 'pubkeyhash',
  TX_SCRIPTHASH: 'scripthash',
  TX_MULTISIG: 'multisig',
  TX_NULL_DATA: 'nulldata',
  TX_WITNESS_V0_KEYHASH: 'witness_v0_keyhash',
  TX_WITNESS_V0_SCRIPTHASH: 'witness_v0_scripthash',
  TX_WITNESS_UNKNOWN: 'witness_unknown'
}

const WITNESS_V0_SCRIPTHASH_SIZE = 32
const WITNESS_V0_KEYHASH_SIZE = 20

function decodeOPN (opcode) {
  if (opcode === opcodes.OP_0) {
    return 0
  }
  return opcode - (opcodes.OP_1 - 1)
}

function isWitnessProgram (buf) {
  if (buf.length < 4 || buf.length > 42) {
    return null
  }
  if (buf[0] !== opcodes.OP_0 && (buf[0] < opcodes.OP_1 || buf[0] > opcodes.OP_16)) {
    return null
  }
  if ((buf[1] + 2) === buf.length) {
    return {
      version: decodeOPN(buf[0]),
      program: buf.slice(2)
    }
  }
  return null
}

function isPushOnly (buf, offset) {
  while (offset < buf.length) {
    const opcode = getScriptOp(buf, offset)
    if (!opcode) {
      return false
    }
    if (opcode.opcode > opcodes.OP_16) {
      return false
    }
    offset = opcode.offset
  }
  return true
}

const PUBKEY__SIZE = 65
const PUBKEY__COMPRESSED_SIZE = 33

function pubKeyGetLen (chHeader) {
  if (chHeader === 2 || chHeader === 3) {
    return PUBKEY__COMPRESSED_SIZE
  }
  if (chHeader === 4 || chHeader === 6 || chHeader === 7) {
    return PUBKEY__SIZE
  }
  return 0
}

function pubKeyValidSize (buf) {
  return buf.length > 0 && pubKeyGetLen(buf[0]) === buf.length
}

function matchPayToPubkey (buf) {
  if (buf.length === PUBKEY__SIZE + 2 && buf[0] === PUBKEY__SIZE && buf[buf.length - 1] === opcodes.OP_CHECKSIG) {
    const pubkey = buf.slice(1, PUBKEY__SIZE + 1)
    return pubKeyValidSize(pubkey) ? pubkey : null
  }
  if (buf.length === PUBKEY__COMPRESSED_SIZE + 2 && buf[0] === PUBKEY__COMPRESSED_SIZE && buf[buf.length - 1] === opcodes.OP_CHECKSIG) {
    const pubkey = buf.slice(1, PUBKEY__COMPRESSED_SIZE + 1)
    return pubKeyValidSize(pubkey) ? pubkey : null
  }
  return null
}

function matchPayToPubkeyHash (buf) {
  if (buf.length === 25 &&
      buf[0] === opcodes.OP_DUP &&
      buf[1] === opcodes.OP_HASH160 &&
      buf[2] === 20 &&
      buf[23] === opcodes.OP_EQUALVERIFY &&
      buf[24] === opcodes.OP_CHECKSIG) {
    return buf.slice(3, 23)
  }
  return null
}

function isSmallInteger (opcode) {
  return opcode >= opcodes.OP_1 && opcode <= opcodes.OP_16
}

function matchMultisig (buf) {
  if (buf.length < 1 || buf[buf.length - 1] !== opcodes.OP_CHECKMULTISIG) {
    return null
  }

  let offset = 0
  let opcode = getScriptOp(buf, offset)
  if (!opcode || !isSmallInteger(opcode.opcode)) {
    return null
  }

  offset = opcode.offset
  const required = decodeOPN(opcode.opcode)
  const pubkeys = []
  while (true) {
    opcode = getScriptOp(buf, offset)
    if (!opcode) {
      return null
    }
    offset = opcode.offset
    if (!pubKeyValidSize(opcode.data)) {
      break
    }
    pubkeys.push(opcode.data)
  }
  if (!opcode || !isSmallInteger(opcode.opcode)) {
    return null
  }
  const keys = decodeOPN(opcode.opcode)
  if (pubkeys.length !== keys || keys < required) {
    return null
  }
  if (offset !== buf.length - 1) { // -2? -- `return (it + 1 === script.end());`
    return null
  }
  return {
    required,
    pubkeys
  }
}

function solver (buf) {
  if (isPayToScriptHash(buf)) {
    return {
      solutions: [buf.slice(2, 22)],
      type: types.TX_SCRIPTHASH
    }
  }

  const witnessProgram = isWitnessProgram(buf)
  if (witnessProgram) {
    if (witnessProgram.version === 0 && witnessProgram.program.length === WITNESS_V0_KEYHASH_SIZE) {
      return {
        solutions: [witnessProgram.program],
        type: types.TX_WITNESS_V0_KEYHASH
      }
    }
    if (witnessProgram.version === 0 && witnessProgram.program.length === WITNESS_V0_SCRIPTHASH_SIZE) {
      return {
        solutions: [witnessProgram.program],
        type: types.TX_WITNESS_V0_SCRIPTHASH
      }
    }
    if (witnessProgram.version !== 0) {
      return {
        solutions: [Uint8Array.from([witnessProgram.version]), witnessProgram.program],
        type: types.TX_WITNESS_UNKNOWN
      }
    }
    return {
      type: types.TX_NONSTANDARD
    }
  }

  if (buf.length >= 1 && buf[0] === opcodes.OP_RETURN && isPushOnly(buf, 1)) {
    return {
      type: types.TX_NULL_DATA
    }
  }

  const pubkey = matchPayToPubkey(buf)
  if (pubkey) {
    return {
      solutions: [pubkey],
      type: types.TX_PUBKEY
    }
  }

  const pubkeyhash = matchPayToPubkeyHash(buf)
  if (pubkeyhash) {
    return {
      solutions: [pubkeyhash],
      type: types.TX_PUBKEYHASH
    }
  }

  const multisig = matchMultisig(buf)
  if (multisig) {
    const solutions = [Uint8Array.from([multisig.required])]
    for (const sol of multisig.pubkeys) {
      solutions.push(sol)
    }
    solutions.push(Uint8Array.from([multisig.pubkeys.length]))
    return {
      solutions,
      type: types.TX_MULTISIG
    }
  }

  return {
    solutions: [],
    type: types.TX_NONSTANDARD
  }
}

function extractDestination (buf) {
  const solution = solver(buf) // awkward double solve if this call comes from extractDestinations()
  if (solution.type === types.TX_PUBKEY) {
    if (!pubKeyValidSize(solution.solutions[0])) {
      return null
    }
    return solution.solutions[0]
  } else if (solution.type === types.TX_PUBKEYHASH) {
    return solution.solutions[0]
  } else if (solution.type === types.TX_SCRIPTHASH) {
    return solution.solutions[0]
  } else if (solution.type === types.TX_WITNESS_V0_KEYHASH) {
    return solution.solutions[0]
  } else if (solution.type === types.TX_WITNESS_V0_SCRIPTHASH) {
    return solution.solutions[0]
  } else if (solution.type === types.TX_WITNESS_UNKNOWN) {
    const unk = solution.solutions[1]
    unk.witnessUnknownVersion = solution.solutions[0][0]
    return unk
  }
  // Multisig txns have more than one address...
  return null
}

function extractDestinations (buf) {
  let required
  const addresses = []
  const solution = solver(buf) // TODO: make this an optional param
  if (solution.type === types.TX_NONSTANDARD) {
    return null
  } else if (solution.type === types.TX_NULL_DATA) {
    // This is data, not addresses
    return null
  }

  if (solution.type === types.TX_MULTISIG) {
    required = solution.solutions[0][0]
    for (let i = 1; i < solution.solutions.length - 1; i++) {
      if (!pubKeyValidSize(solution.solutions[i])) {
        continue
      }
      addresses.push(solution.solutions[i])
    }
    if (!addresses.length) {
      return null
    }
  } else {
    required = 1
    const addr = extractDestination(buf)
    if (!addr) {
      return null
    }
    addresses.push(addr)
  }

  return {
    addresses,
    required
  }
}

// DestinationEncoder
function encodeAddress (buf, type) {
  if (type === types.TX_PUBKEY || type === types.TX_PUBKEYHASH || type === types.TX_SCRIPTHASH || type === types.TX_MULTISIG) {
    if (type === types.TX_PUBKEY || type === types.TX_PUBKEYHASH || type === types.TX_MULTISIG) {
      if (type === types.TX_MULTISIG) {
        buf = hash160(buf) // pubkey to a pkhash
      }
      buf = concat([Uint8Array.from([0]), buf]) // PUBKEY_ADDRESS base58Prefix
    } else {
      buf = concat([Uint8Array.from([5]), buf]) // TX_SCRIPTHASH base58Prefix
    }
    const hash = dblSha2256(buf)
    buf = concat([buf, hash.slice(0, 4)]) // 4 byte "check" at the end
    return base58btc.encode(buf).slice(1)
  }
  if (type === types.TX_WITNESS_V0_KEYHASH || type === types.TX_WITNESS_V0_SCRIPTHASH) {
    const words = bech32.toWords(buf)
    return bech32.encode(BECH32_HRP, [0, ...words]) // 0 appended to the beginning as per DestinationEncoder()
  }
  if (type === types.TX_WITNESS_UNKNOWN) {
    const version = buf.witnessUnknownVersion
    if (version < 1 || version > 16 || buf.length < 2 || buf.length > 40) {
      return ''
    }
    const words = bech32.toWords(buf)
    return bech32.encode(BECH32_HRP, [buf.witnessUnknownVersion, ...words])
  }
  return `Unknown encoding [${type}]`
}

module.exports.MAX_SCRIPT_SIZE = MAX_SCRIPT_SIZE
module.exports.opcodes = opcodes
module.exports.opcodeNames = opcodeNames
module.exports.sigHashTypes = sigHashTypes
module.exports.mapSigHashTypes = mapSigHashTypes
module.exports.types = types
module.exports.WITNESS_V0_KEYHASH_SIZE = WITNESS_V0_KEYHASH_SIZE
module.exports.WITNESS_V0_SCRIPTHASH_SIZE = WITNESS_V0_SCRIPTHASH_SIZE
module.exports.getScriptOp = getScriptOp
module.exports.isDefinedHashtypeSignature = isDefinedHashtypeSignature
module.exports.isValidSignatureEncoding = isValidSignatureEncoding
module.exports.scriptToAsmStr = scriptToAsmStr
module.exports.isUnspendable = isUnspendable
module.exports.setVch = setVch
module.exports.isPayToScriptHash = isPayToScriptHash
module.exports.isWitnessProgram = isWitnessProgram
module.exports.isPushOnly = isPushOnly
module.exports.pubKeyGetLen = pubKeyGetLen
module.exports.pubKeyValidSize = pubKeyValidSize
module.exports.matchPayToPubkey = matchPayToPubkey
module.exports.matchPayToPubkeyHash = matchPayToPubkeyHash
module.exports.matchMultisig = matchMultisig
module.exports.isSmallInteger = isSmallInteger
module.exports.solver = solver
module.exports.extractDestinations = extractDestinations
module.exports.encodeAddress = encodeAddress
