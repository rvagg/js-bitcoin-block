const { toHex } = require('./util')
/** @type {Record<string, any>} */
const classRegistry = {}

/** @typedef {import('./interface').Encoder} Encoder */
/** @typedef {import('./interface').ValueEncoder} ValueEncoder */
/** @typedef {import('./interface').Decoder} Decoder */

// https://github.com/zcash/zcash/blob/fa1b656482a38d3a6c97950b35521a9c45da1e9c/src/serialize.h#L264
/**
 * @param {number} size
 * @returns {Uint8Array}
 */
function writeCompactSize (size) {
  if (size < 253) {
    return Uint8Array.from([size])
  } else if (size <= 0xffff) {
    const b = new Uint8Array(3)
    const dv = new DataView(b.buffer, b.byteOffset, b.length)
    dv.setUint8(0, 253)
    dv.setUint16(1, size, true)
    return b
  } else if (size <= 0xffffffff) {
    const b = new Uint8Array(5)
    const dv = new DataView(b.buffer, b.byteOffset, b.length)
    dv.setUint8(0, 253)
    dv.setUint32(1, size, true)
    return b
  } else {
    throw new Error('writeCompactSize() size too large')
    // ser_writedata8(os, 255)
    // ser_writedata64(os, size)
  }
}

/**
 * @param {number} size
 * @returns {number}
 */
function compactSizeSize (size) {
  if (size < 253) {
    return 1
  } else if (size <= 0xffff) {
    return 3
  } else if (size <= 0xffffffff) {
    return 5
  } else {
    // throw new Error('compactSizeSize() size too large')
    return 9
  }
}

/** @type {Record<string, ValueEncoder>} */
const encoders = {
  int32_t: function * writeInt32LE (v) {
    if (typeof v !== 'number') {
      throw new Error('Encoding int32 requires a "number" type')
    }

    const b = new Uint8Array(4)
    const dv = new DataView(b.buffer, b.byteOffset, b.length)
    dv.setInt32(0, v, true)
    if (module.exports.DEBUG) {
      console.log(`int32_t[${v}]: ${toHex(b)}`)
    }
    yield b
  },

  uint32_t: function * writeUInt32LE (v) {
    if (typeof v !== 'number') {
      throw new Error('Encoding uint32 requires a "number" type')
    }

    const b = new Uint8Array(4)
    const dv = new DataView(b.buffer, b.byteOffset, b.length)
    dv.setUint32(0, v, true)
    if (module.exports.DEBUG) {
      console.log(`uint32_t[${v}]: ${toHex(b)}`)
    }
    yield b
  },

  uint256: function * writeHash (v) {
    if (!(v instanceof Uint8Array)) {
      throw new Error('Encoding uint256 requires a "Uint8Array" type')
    }
    if (v.length !== 32) {
      throw new Error('Encoding uint256 requires 32-byte Uint8Array')
    }
    if (module.exports.DEBUG) {
      console.log(`uint256: ${toHex(v)}`)
    }
    yield v
  },

  compactSlice: function * writeCompactSlice (v) {
    if (!(v instanceof Uint8Array)) {
      throw new Error('Encoding compact slice requires a "Uint8Array" type')
    }
    if (module.exports.DEBUG) {
      console.log(`compactSlice[${v.length}]: ${toHex(writeCompactSize(v.length))} + ${toHex(v)}`)
    }
    yield writeCompactSize(v.length)
    yield v
  },

  int64_t: function * writeBigInt64LE (v) {
    const buf = new Uint8Array(8)
    buf[0] = v
    buf[1] = v >> 8
    buf[2] = v >> 16
    buf[3] = v >> 24
    let hi = (v / (2 ** 32)) & 0xffffffff
    if (v < 0) {
      hi -= 1
    }
    buf[4] = hi
    buf[5] = hi >> 8
    buf[6] = hi >> 16
    buf[7] = hi >> 24
    if (module.exports.DEBUG) {
      console.log(`int64_t: ${toHex(buf)}`)
    }
    yield buf
  },

  /**
   * @param {Uint8Array} v
   */
  slice: function * writeSlice (v) {
    if (!(v instanceof Uint8Array)) {
      throw new Error('Encoding slice requires a "Uint8Array" type')
    }
    if (module.exports.DEBUG) {
      console.log(`slice: ${toHex(v)}`)
    }
    yield v
  }
}

/**
 * @type {Encoder}
 */
function * encoder (typ, value, args) {
  // aliases
  if (typ === 'std::vector<unsigned char>' || typ === 'CScript') {
    // different forms of variable size byte slices
    typ = 'compactSlice'
  } else if (typ === 'libzcash::GrothProof' ||
      typ === 'spend_auth_sig_t' ||
      typ === 'libzcash::SaplingEncCiphertext' ||
      typ === 'libzcash::SaplingOutCiphertext' ||
      typ === 'binding_sig_t' ||
      typ === 'ZCNoteEncryption::Ciphertext' ||
      typ === 'joinsplit_sig_t') {
    // different forms of fixed size byte slices
    typ = 'slice'
  } else if (typ === 'CAmount') {
    typ = 'int64_t'
  }

  const vectorType = isVectorType(typ)
  const arrayDesc = !vectorType && isArrayType(typ)

  if (vectorType) {
    const arr = value
    if (!Array.isArray(arr)) {
      throw new Error(`Encoding std::vector (${typ}) requires an array`)
    }
    if (module.exports.DEBUG) {
      console.log(`cs[${arr.length}]: ${toHex(writeCompactSize(arr.length))}`)
    }
    yield writeCompactSize(arr.length)
    for (const v of arr) {
      yield * encoder(vectorType, v, args)
    }
  } else if (arrayDesc) {
    const arraySize = parseInt(arrayDesc[2], 10)
    const arrayType = arrayDesc[1]
    const arr = value
    if (!Array.isArray(arr)) {
      throw new Error(`Encoding std::array (${typ}) requires an array`)
    }
    if (arr.length !== arraySize) {
      throw new Error(`Encoding std::array (${typ}) requires an array of length ${arraySize}, got ${arr.length}`)
    }
    for (const v of arr) {
      yield * encoder(arrayType, v, args)
    }
  } else if (typ in encoders) {
    yield * encoders[typ](value)
  } else if (classRegistry[typ]) {
    yield * encodeType(value, args)
  } else {
    throw new TypeError(`Don't know how to encode type: ${typ}`)
  }
}

/**
 * @param {any} obj
 * @param {any} args
 * @returns {any}
 */
function * encodeType (obj, args) {
  const clazz = Object.getPrototypeOf(obj).constructor
  const properties = clazz._encodePropertiesDescriptor

  if (!Array.isArray(properties)) {
    throw new Error(`Type does not have encoding instructions attached: ${clazz.name}`)
  }

  for (const prop of properties) {
    const typ = prop.type

    if (typ.startsWith('_customEncode') && typeof clazz[typ] === 'function') {
      yield * clazz[typ](obj, encoder, args)
      continue
    }

    const value = obj[prop.name]
    yield * encoder(typ, value, args)
  }
}

// https://github.com/zcash/zcash/blob/fa1b656482a38d3a6c97950b35521a9c45da1e9c/src/serialize.h#L288
/**
 * @param {Uint8Array} buf
 * @param {number} offset
 * @returns {[number, number]}
 */
function readCompactSize (buf, offset) {
  const chSize = buf[offset]
  offset++
  if (chSize < 253) {
    return [chSize, 1]
  } else if (chSize === 253) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.length)
    const nSizeRet = dv.getUint16(offset, true)
    if (nSizeRet < 253) {
      throw new Error('non-canonical readCompactSize()')
    }
    return [nSizeRet, 3]
  } else if (chSize === 254) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.length)
    const nSizeRet = dv.getUint32(offset, true)
    if (nSizeRet < 0x10000) {
      throw new Error('non-canonical readCompactSize()')
    }
    return [nSizeRet, 5]
  } else {
    // shouldn't need this, no way are we going to encounter 64-bit ints for decode sizes here
    // const nSizeRet = buf.readBigInt64LE(offset)
    // throw new Error(`readCompactSize() size too large (probably ${nSizeRet})`)
    throw new Error('readCompactSize() size too large')
    /*
    nSizeRet = ser_readdata64(is);
    if (nSizeRet < 0x100000000ULL)
        throw std::ios_base::failure("non-canonical ReadCompactSize()");
    */
  }
}

/**
 * @param {string} typ
 * @returns {string}
 */
function isVectorType (typ) {
  const isVector = typ.startsWith('std::vector<')
  return isVector ? typ.replace(/std::vector<([^>]+)>/, '$1') : ''
}

/**
 * @param {string} typ
 * @returns {RegExpMatchArray|null}
 */
function isArrayType (typ) {
  const isArray = typ.startsWith('std::array<')
  return isArray ? typ.match(/std::array<([^,]+),\s*(\d+)>/) : null
}

/**
 * @param {number} actual
 * @param {number} expected
 */
function assertSize (actual, expected) {
  if (actual < expected) {
    throw new Error(`decode expected to read ${expected} bytes but only ${actual} where available`)
  }
}

/**
 * @param {Uint8Array} read
 * @param {number} expected
 * @returns {Uint8Array}
 */
function sizeAsserted (read, expected) {
  assertSize(read.length, expected)
  return read
}

/**
 * @param {Uint8Array} buf
 * @param {string} type
 * @param {boolean} [strictLengthUsage]
 * @returns {any}
 */
function decodeType (buf, type, strictLengthUsage) {
  let pos = 0
  /** @type {Record<string, any>} */
  const state = {}

  /**
   * @param {number} want
   */
  function assertAvailable (want) {
    assertSize(buf.length - pos, want)
  }

  /** @type {Decoder} */
  const decoder = {
    currentPosition () {
      return pos
    },

    readUInt8 () {
      const i = buf[pos]
      pos++
      return i
    },

    readUInt32LE () {
      const dv = new DataView(buf.buffer, buf.byteOffset, buf.length)
      const i = dv.getUint32(pos, true)
      pos += 4
      return i
    },

    readInt32LE () {
      const dv = new DataView(buf.buffer, buf.byteOffset, buf.length)
      const i = dv.getInt32(pos, true)
      pos += 4
      return i
    },

    readBigInt64LE () {
      // not browser friendly, need to simulate:
      // const i = buf.readBigInt64LE(pos)

      // nicer BigInt version:
      /*
      const lo = BigInt(buf.readInt32LE(pos))
      const hi = BigInt(buf.readInt32LE(pos + 4))
      const i = (BigInt(2) ** BigInt(32)) * hi + lo
      */
      // risky plain, but currently (2019) browser-safe version
      /*
      const lo = buf.readUInt32LE(pos)
      const hi = buf.readUInt32LE(pos + 4)
      const i = (2 ** 32) * hi + lo
      pos += 8
      */
      // more manual version
      assertAvailable(8)
      const hi = buf[pos + 4] +
        buf[pos + 5] * 2 ** 8 +
        buf[pos + 6] * 2 ** 16 +
        (buf[pos + 7] << 24) // possible overflow
      const lo = buf[pos] +
        buf[pos + 1] * 2 ** 8 +
        buf[pos + 2] * 2 ** 16 +
        buf[pos + 3] * 2 ** 24
      const i = (hi * 2 ** 32) + lo
      pos += 8
      return i
    },

    /**
     * @param {number} len
     * @returns {Uint8Array}
     */
    peek (len) {
      return sizeAsserted(buf.slice(pos, pos + len), len)
    },

    /**
     * @param {number} len
     * @returns {Uint8Array}
     */
    slice (len) {
      return sizeAsserted(buf.slice(pos, pos += len), len) // eslint-disable-line
    },

    /**
     * @param {number} start
     * @param {number} len
     * @returns {Uint8Array}
     */
    absoluteSlice (start, len) {
      return sizeAsserted(buf.slice(start, start + len), len)
    },

    /**
     * @returns {Uint8Array}
     */
    readHash () {
      return decoder.slice(32)
    },

    /**
     * @returns {number}
     */
    readCompactInt () {
      const [i, bytesRead] = readCompactSize(buf, pos)
      pos += bytesRead
      return i
    },

    /**
     * @returns {Uint8Array}
     */
    readCompactSlice () {
      return decoder.slice(decoder.readCompactInt())
    },

    /**
     * @param {string} type
     * @returns {any}
     */
    readType (type) {
      // a class we know
      if (classRegistry[type]) {
        return decoder.readClass(classRegistry[type])
      }

      // TODO: push some of this specific typedef stuff back into classes rather than
      // hardwiring here

      // fixed byte arrays
      if (type === 'libzcash::GrothProof') {
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/zcash/JoinSplit.hpp#L18
        type = `std::array<unsigned char, ${48 + 96 + 48}>`
      } else if (type === 'libzcash::SaplingEncCiphertext') {
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/zcash/NoteEncryption.hpp#L20
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/zcash/Zcash.h#L27
        type = 'std::array<unsigned char, 580>'
      } else if (type === 'libzcash::SaplingOutCiphertext') {
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/zcash/NoteEncryption.hpp#L21
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/zcash/Zcash.h#L28
        type = 'std::array<unsigned char, 80>'
      } else if (type === 'spend_auth_sig_t') {
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/primitives/transaction.h#L46
        type = 'std::array<unsigned char, 64>'
      } else if (type === 'ZCNoteEncryption::Ciphertext') {
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/zcash/NoteEncryption.hpp#L196
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/zcash/NoteEncryption.hpp#L142
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/zcash/Zcash.h#L22
        // CLEN=MLEN+NOTEENCRYPTION_AUTH_BYTES
        // MLEN=ZC_NOTEPLAINTEXT_SIZE (for ZCNoteEncryption)
        // ZC_NOTEPLAINTEXT_SIZE=585
        // NOTEENCRYPTION_AUTH_BYTES=16
        // therefore CLEN=585+16
        type = `std::array<unsigned char, ${585 + 16}>`
      } else if (type === 'joinsplit_sig_t') {
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/primitives/transaction.h#L515
        type = 'std::array<unsigned char, 64>'
      } else if (type === 'binding_sig_t') {
        // https://github.com/zcash/zcash/blob/6da42887f10f9228da4c8c1182174d70b2633284/src/primitives/transaction.h#L516
        type = 'std::array<unsigned char, 64>'
      } else if (type === 'base_blob<256>') {
        type = `std::array<unsigned char, ${256 / 8}>`
      } else if (type === 'base_blob<512>') {
        type = `std::array<unsigned char, ${512 / 8}>`
      }

      if (type.startsWith('std::array<unsigned char,')) {
        const length = parseInt(type.replace(/^std::array<unsigned char,\s*(\d+)>$/, '$1'), 10)
        return decoder.slice(length)
      }

      // some rewrites of things that share forms

      if (type === 'std::vector<unsigned char>' || type === 'CScript') {
        // different forms of byte slices
        type = 'compactSlice'
      } else if (type === 'CAmount') {
        type = 'int64_t'
      }

      // flexible vectors
      const vectorType = isVectorType(type)
      if (vectorType) {
        const size = decoder.readCompactInt()
        const list = []
        for (let i = 0; i < size; i++) {
          list.push(decoder.readType(vectorType))
        }
        return list
      }

      // fixed arrays
      const arrayDesc = isArrayType(type)
      if (arrayDesc) {
        const arraySize = parseInt(arrayDesc[2], 10)
        const arrayType = arrayDesc[1]
        const array = []
        for (let i = 0; i < arraySize; i++) {
          array.push(decoder.readType(arrayType))
        }
        return array
      }

      // generic stuff
      switch (type) {
        case 'bool':
          return decoder.readUInt8() !== 0
        case 'int32_t':
          return decoder.readInt32LE()
        case 'uint32_t':
          return decoder.readUInt32LE()
        case 'int64_t':
          return decoder.readBigInt64LE()
        case 'uint256':
          return decoder.readHash()
        case 'compactSlice':
          return decoder.readCompactSlice()
        default:
          throw new TypeError(`Don't know how to decode type: ${type} / ${vectorType}`)
      }
    },

    /**
     * @param {any} clazz
     * @returns {any}
     */
    readClass (clazz) {
      const properties = []
      for (const property of clazz._decodePropertiesDescriptor) {
        const type = property.type
        // custom decoder, something a bit fancier than we can handle
        if (type.startsWith('_customDecode') && typeof clazz[type] === 'function') {
          clazz[type](decoder, properties, state)
        } else {
          properties.push(decoder.readType(type))
        }
      }

      const newInstance = new (Function.prototype.bind.apply(clazz, [null, ...properties])) // eslint-disable-line
      // console.log('newInstance(', clazz, '): ', newInstance)
      return newInstance
    }
  }

  const block = decoder.readType(type)
  if (strictLengthUsage && pos !== buf.length) {
    throw new Error(`decode did not consume all available bytes as expected (${pos} != ${buf.length})`)
  }
  return block
}

/**
 * @param {Record<string, any>} classes
 */
function setup (classes) {
  // const classes = require('./classes/')
  Object.values(classes).reduce((p, c) => {
    p[c._nativeName] = c
    return p
  }, classRegistry)

  return {
    decodeType,
    encodeType,
    encoder
  }
}

module.exports = setup
module.exports.compactSizeSize = compactSizeSize
module.exports.DEBUG = false
