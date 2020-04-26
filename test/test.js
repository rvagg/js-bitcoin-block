// const assert = require('chai').assert
const assert = require('assert-diff')
const { BitcoinBlock, BitcoinTransaction } = require('../')

const { toHashHex, dblSha2256 } = require('../classes/class-utils')

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
    if (expectedComplete[c] !== undefined) {
      p[c] = expectedComplete[c]
    }
    return p
  }, {})
  assert.deepEqual(roundDifficulty(decodedHeader.toPorcelain()), roundDifficulty(expected), 'decoded header data')

  // re-encode
  const encodedHeader = decodedHeader.encode()
  assert.strictEqual(encodedHeader.toString('hex'), headerData.toString('hex'), 're-encoded block header')
}

module.exports = function test (hash, block, expected) {
  // ---------------------------------------------------------------------------
  // prepare exepected data (trim fat we can't / won't test)
  cleanExpectedBlock(expected)

  // ---------------------------------------------------------------------------
  // verify _only_ the first 80 bytes and that we can parse basic data
  verifyHeader(block, expected)

  // ---------------------------------------------------------------------------
  // decode full block
  const decoded = BitcoinBlock.decode(block)

  // ---------------------------------------------------------------------------
  // test the serialized minimum form, where the `tx` array is just the txids
  const serializableMin = decoded.toPorcelain('min')
  const minimalExpected = toMinimalExpected(expected)
  assert.deepEqual(roundDifficulty(serializableMin), roundDifficulty(minimalExpected))

  // ---------------------------------------------------------------------------
  // sift through each transaction, checking their properties individually
  let hasSegWit = false
  for (let i = 0; i < expected.tx.length; i++) {
    const tx = decoded.tx[i]
    const expectedTx = cleanExpectedTransaction(expected.tx[i])

    // hash & txid correct? (early sanity check)
    assert.strictEqual(toHashHex(tx.txid), expectedTx.txid)
    assert.strictEqual(toHashHex(tx.hash), expectedTx.hash)

    // porcelain form correct?
    const serializableTx = tx.toPorcelain()
    assert.deepEqual(serializableTx, expectedTx, `transaction ${i}`)

    // full encoded form matches expected
    const encodedTx = tx.encode()
    const etxhash = toHashHex(dblSha2256(encodedTx))
    assert.strictEqual(etxhash, expectedTx.hash)
    assert.strictEqual(encodedTx.toString('hex'), expectedTx.hex)

    // segwit encoded form matches expected
    const encodedTxNoWitness = tx.encode(BitcoinTransaction.HASH_NO_WITNESS)
    const etxid = toHashHex(dblSha2256(encodedTxNoWitness))
    assert.strictEqual(etxid, expectedTx.txid)

    if (etxid === etxhash) {
      // not segwit
      assert(tx.segWit === false)
    } else {
      // is segwit, whole block should be too
      assert(tx.segWit === true)
      hasSegWit = true
    }
  }
  assert(decoded.isSegWit() === hasSegWit)

  // ---------------------------------------------------------------------------
  // test the serialized maximum form, where the `tx` array the full transaction
  // data, potentially huge
  const serializable = decoded.toPorcelain()
  assert.deepEqual(roundDifficulty(serializable), roundDifficulty(expected))

  // ---------------------------------------------------------------------------
  // check that we can properly calculate the transaction merkle root, this
  // doesn't include witness data
  const merkleRootNoWitness = toHashHex(decoded.calculateMerkleRoot(BitcoinBlock.HASH_NO_WITNESS))
  assert.strictEqual(merkleRootNoWitness, expected.merkleroot, 'calculated merkle root')

  // ---------------------------------------------------------------------------
  // if this block includes segwit transacitons, check that we can properly
  // calculate the full merkle root and then the witness commitment from that
  // and the nonce found in the coinbase
  //
  // (only for `nHeight >= consensusParams.SegwitHeight` (481824))
  if (hasSegWit) {
    const wci = decoded.tx[0].getWitnessCommitmentIndex()
    if (wci >= 0) {
      // find the expected full merkle root in the first transaction
      const witnessCommitmentOut = decoded.tx[0].vout[wci]
      const expectedWitnessCommitment = witnessCommitmentOut.scriptPubKey.slice(6)
      // calculate our own
      const witnessCommitment = decoded.calculateWitnessCommitment()
      assert.strictEqual(toHashHex(witnessCommitment), toHashHex(expectedWitnessCommitment), 'witness commitment')
    } else {
      assert.fail('no witness commitment index, what do?')
    }
  }
}
