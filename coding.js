const classRegistry = {}

// https://github.com/zcash/zcash/blob/fa1b656482a38d3a6c97950b35521a9c45da1e9c/src/serialize.h#L264
function writeCompactSize (size) {
  if (size < 253) {
    return Buffer.from([size])
  } else if (size <= 0xfff) {
    const b = Buffer.alloc(3)
    b.writeUInt8(253)
    b.writeUInt16LE(size, 1)
    return b
  } else if (size <= 0xffffffff) {
    const b = Buffer.alloc(5)
    b.writeUInt8(254)
    b.writeUInt32LE(size, 1)
    return b
  } else {
    throw new Error('writeCompactSize() size too large')
    // ser_writedata8(os, 255)
    // ser_writedata64(os, size)
  }
}

function compactSizeSize (size) {
  if (size < 253) {
    return 1
  } else if (size <= 0xfff) {
    return 3
  } else if (size <= 0xffffffff) {
    return 5
  } else {
    // throw new Error('compactSizeSize() size too large')
    return 9
  }
}

const encoders = {
  int32_t: function * writeUInt32LE (v) {
    if (typeof v !== 'number') {
      throw new Error('Encoding int32 requires a "number" type')
    }

    const b = Buffer.alloc(4)
    b.writeInt32LE(v)
    yield b
  },

  uint32_t: function * writeUInt32LE (v) {
    if (typeof v !== 'number') {
      throw new Error('Encoding uint32 requires a "number" type')
    }

    const b = Buffer.alloc(4)
    b.writeUInt32LE(v)
    yield b
  },

  uint256: function * writeHash (v) {
    if (!Buffer.isBuffer(v)) {
      throw new Error('Encoding uint256 requires a "Buffer" type')
    }
    if (v.length !== 32) {
      throw new Error('Encoding uint256 requires 32-byte Buffer')
    }

    yield v
  },

  compactSlice: function * writeCompactSlice (v) {
    if (!Buffer.isBuffer(v)) {
      throw new Error('Encoding compact slice requires a "Buffer" type')
    }
    yield writeCompactSize(v.length)
    yield v
  },

  int64_t: function * writeBigInt64LE (v) {
    const buf = Buffer.alloc(8)
    let lo = v & 0xffffffff
    buf[0] = lo
    lo = lo >> 8
    buf[1] = lo
    lo = lo >> 8
    buf[2] = lo
    lo = lo >> 8
    buf[3] = lo
    let hi = (v / (2 ** 32)) & 0xffffffff
    buf[4] = hi
    hi = hi >> 8
    buf[5] = hi
    hi = hi >> 8
    buf[6] = hi
    hi = hi >> 8
    buf[7] = hi
    yield buf
  }
}

function * encoder (typ, value, args) {
  // aliases
  if (typ === 'std::vector<unsigned char>' || typ === 'CScript') {
    // different forms of byte slices
    typ = 'compactSlice'
  } else if (typ === 'CAmount') {
    typ = 'int64_t'
  }

  const vectorType = isVectorType(typ)

  if (vectorType) {
    const arr = value
    if (!Array.isArray(arr)) {
      throw new Error(`Encoding std::vector (${typ}) requires an array`)
    }
    yield writeCompactSize(arr.length)
    for (const v of arr) {
      yield * encoder(vectorType, v, args)
    }
  } else if (encoders[typ]) {
    yield * encoders[typ](value)
  } else if (classRegistry[typ]) {
    yield * encodeType(value, args)
  } else {
    throw new TypeError(`Don't know how to encode type: ${typ}`)
  }
}

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
    yield * encoder(typ, value, prop.name, args)
  }
}

// https://github.com/zcash/zcash/blob/fa1b656482a38d3a6c97950b35521a9c45da1e9c/src/serialize.h#L288
function readCompactSize (buf, offset) {
  const chSize = buf.readUInt8(offset)
  offset++
  if (chSize < 253) {
    return [chSize, 1]
  } else if (chSize === 253) {
    const nSizeRet = buf.readUInt16LE(offset)
    if (nSizeRet < 253) {
      throw new Error('non-canonical readCompactSize()')
    }
    return [nSizeRet, 3]
  } else if (chSize === 254) {
    const nSizeRet = buf.readUInt32LE(offset)
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

function isVectorType (typ) {
  const isVector = typ.startsWith('std::vector<')
  const vectorType = isVector && typ.replace(/std::vector<([^>]+)>/, '$1')
  return vectorType
}

function isArrayType (typ) {
  const isArray = typ.startsWith('std::array<')
  const arrayDesc = isArray && typ.match(/std::array<([^,]+),\s*(\d+)>/)
  return arrayDesc
}

function decodeType (buf, type) {
  let pos = 0
  const state = {}

  const decoder = {
    currentPosition () {
      return pos
    },

    readUInt8 () {
      const i = buf.readUInt8(pos)
      pos++
      return i
    },

    readUInt32LE () {
      const i = buf.readUInt32LE(pos)
      pos += 4
      return i
    },

    readInt32LE () {
      const i = buf.readInt32LE(pos)
      pos += 4
      return i
    },

    // NOTE: this is actually a uint, if you need signed then you may be in trouble
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
      const hi = buf[pos + 4] +
        buf[pos + 5] * 2 ** 8 +
        buf[pos + 6] * 2 ** 16 +
        buf[pos + 7] * 2 ** 24
      // uint might &0x7f the first and then check the &0x80 bit for signedness
      const lo = buf[pos] +
        buf[pos + 1] * 2 ** 8 +
        buf[pos + 2] * 2 ** 16 +
        buf[pos + 3] * 2 ** 24
      const i = (hi * 2 ** 32) + lo
      pos += 8
      return i
    },

    peek (len) {
      return buf.slice(pos, pos + len)
    },

    slice (len) {
      return buf.slice(pos, pos += len) // eslint-disable-line
    },

    absoluteSlice (start, len) {
      return buf.slice(start, start + len)
    },

    readHash () {
      return decoder.slice(32)
    },

    readCompactInt () {
      const [i, bytesRead] = readCompactSize(buf, pos)
      pos += bytesRead
      return i
    },

    readCompactSlice () {
      return decoder.slice(decoder.readCompactInt())
    },

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
        const length = parseInt(type.replace(/^std::array<unsigned char,\s*(\d+)>$/, '$1', 10))
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
      return newInstance
    }
  }

  const block = decoder.readType(type)
  return block
}

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
