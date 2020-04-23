// const assert = require('chai').assert
const assert = require('assert-diff')
const BitcoinBlock = require('../')

const { toHashHex } = require('../classes/class-utils')

// round difficulty to 2 decimal places, it's a calculated value
function roundDifficulty (obj) {
  const ret = Object.assign({}, obj)
  ret.difficulty = Math.round(obj.difficulty * 100) / 100
  return ret
}

function cleanExpectedBlock (obj) {
  // clean up expected data, removing pieces we can't get without additional context
  delete obj.mediantime // depends on past blocks
  delete obj.height // depends on chain, although it may be discernable from the coinbase?
  delete obj.chainwork // depends on the chain
  delete obj.confirmations // depends on chain context
  delete obj.nextblockhash // content-addressing just doesn't work this way
  return obj
}

function cleanExpectedTransaction (obj) {
  return obj // no cleanup required
}

function toMinimalExpected (obj) {
  const ret = Object.assign({}, obj)
  ret.tx = obj.tx.map((tx) => tx.txid)
  return ret
}

function verifyHeader (block, expectedComplete) {
  const headerData = block.slice(0, 80)
  const decodedHeader = BitcoinBlock.decodeHeaderOnly(block)

  // just the pieces we expect from a header
  const expected = 'hash version versionHex merkleroot time nonce bits previousblockhash difficulty'.split(' ').reduce((p, c) => {
    p[c] = expectedComplete[c]
    return p
  }, {})
  assert.deepEqual(roundDifficulty(decodedHeader.toSerializable()), roundDifficulty(expected), 'decoded header data')

  // re-encode
  const encodedHeader = decodedHeader.encode()
  assert.strictEqual(encodedHeader.toString('hex'), headerData.toString('hex'), 're-encoded block header')
}

module.exports = function test (hash, block, expected) {
  cleanExpectedBlock(expected)

  verifyHeader(block, expected)

  const decoded = BitcoinBlock.decode(block)
  const serializableMin = decoded.toSerializable('min')

  const minimalExpected = toMinimalExpected(expected)
  // console.log(roundDifficulty(serializableMin), roundDifficulty(minimalExpected))
  assert.deepEqual(roundDifficulty(serializableMin), roundDifficulty(minimalExpected))

  // see if we got hashes and segwit hashing right
  for (let i = 0; i < expected.tx.length; i++) {
    const tx = decoded.tx[i]
    const expectedTx = expected.tx[i]
    assert.strictEqual(toHashHex(tx.txid), expectedTx.txid)
    assert.strictEqual(toHashHex(tx.hash), expectedTx.hash)
  }

  for (let i = 0; i < expected.tx.length; i++) {
    const tx = decoded.tx[i]
    const serializableTx = tx.toSerializable()
    const expectedTx = cleanExpectedTransaction(expected.tx[i])
    /*
    console.dir(serializableTx, { depth: Infinity })
    console.dir(expectedTx, { depth: Infinity })
    */
    // console.log(JSON.stringify(serializableTx, null, 2))
    // console.log(JSON.stringify(expectedTx, null, 2))
    assert.deepEqual(serializableTx, expectedTx, `transaction ${i}`)
  }

  // console.log(decoded.tx[0].toSerializable())

  /*
  if (decoded.tx[0].segWit) { // should be: nHeight >= consensusParams.SegwitHeight (481824)
    const wci = decoded.tx[0].getWitnessCommitmentIndex()
    if (wci >= 0) {
      const wc = decoded.tx[0].vout[wci]
      console.log('scriptPubKey', wc.scriptPubKey.toString('hex'))
      console.log('nonce', toHashHex(decoded.tx[0].vin[0].scriptWitness[0]))
      console.log('witness merkle root     ', toHashHex(wc.scriptPubKey.slice(6)))
      console.log('witness merkle root calc', toHashHex(dblSha2256(Buffer.concat([decoded.calculateMerkleRoot(), decoded.tx[0].vin[0].scriptWitness[0]]))))

      console.log('merkle root source ', expected.merkleroot)
      console.log('merkle root decoded', toHashHex(decoded.calculateMerkleRootNoWitness()))

      console.log(decoded.tx[0].vin[0].scriptWitness)
    } else {
      console.log('no witness commitment index')
    }
  } else {
    console.log('not segwit')
  }
  */

  // can't test these things as they come from having a full blockchain state to work with
  // while we are only working with isolated blocks
}
