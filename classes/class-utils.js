const multihashing = require('multihashing')

const COIN = 100000000
const WITNESS_SCALE_FACTOR = 4

function decodeProperties (propertiesDescriptor) {
  return propertiesDescriptor
    .split('\n')
    .map((l) => l.replace(/\s*(\/\/.*)$/, '')) // trailing whitespace and comments
    .filter(Boolean)
    .map((p) => {
      const ls = p.lastIndexOf(' ')
      const type = ls > -1 ? p.substring(0, ls).replace(/^const /, '') : p
      const name = ls > -1 ? p.substring(ls + 1).replace(/;$/, '') : p
      return { type, name }
    })
}

function toHashHex (hash) {
  const rev = Buffer.alloc(hash.length)
  for (let i = 0; i < hash.length; i++) {
    rev[hash.length - i - 1] = hash[i]
  }
  return rev.toString('hex')
}

function dblSha2256 (bytes) {
  let digest = multihashing.digest(bytes, 'sha2-256')
  digest = multihashing.digest(digest, 'sha2-256')
  return digest
}

function merkleRoot (hashes) {
  hashes = hashes.slice()

  while (hashes.length > 1) {
    if (hashes.length & 1) {
      hashes.push(hashes[hashes.length - 1])
    }
    const newHashes = []
    for (let i = 0; i < hashes.length; i += 2) {
      newHashes.push(dblSha2256(Buffer.concat([hashes[i], hashes[i + 1]])))
    }
    hashes = newHashes
  }

  return hashes[0]
}

module.exports.decodeProperties = decodeProperties
module.exports.toHashHex = toHashHex
module.exports.dblSha2256 = dblSha2256
module.exports.merkleRoot = merkleRoot
module.exports.COIN = COIN
module.exports.WITNESS_SCALE_FACTOR = WITNESS_SCALE_FACTOR
