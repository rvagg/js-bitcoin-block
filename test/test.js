import { assert } from 'chai'
import { BitcoinBlock, BitcoinTransaction } from '../bitcoin-block.js'
import { toHashHex, dblSha2256 } from '../classes/class-utils.js'
import { toHex } from '../util.js'
// for debugging, uncomment:
// import { fromHex } from '../util.js'
// import { writeFileSync } from 'node:fs'
// import { setDebug } from '../coding.js'

/** @typedef {import('../interface.js').BlockPorcelain} BlockPorcelain */
/** @typedef {import('../interface.js').BlockHeaderPorcelain} BlockHeaderPorcelain */

/**
 * round difficulty to 2 decimal places, it's a calculated value
 * @param {any} obj
 * @returns {any}
 */
function roundDifficulty (obj) {
  const ret = Object.assign({}, obj)
  ret.difficulty = Math.round(obj.difficulty * 100) / 100
  return ret
}

/**
 * @param {any} obj
 * @returns {any}
 */
function cleanExpectedBlock (obj) {
  // clean up expected data, removing pieces we can't get without additional context
  delete obj.mediantime // depends on past blocks
  delete obj.height // depends on chain, although it may be discernable from the coinbase?
  delete obj.chainwork // depends on the chain
  delete obj.confirmations // depends on chain context
  delete obj.nextblockhash // content-addressing just doesn't work this way
  return obj
}

/**
 * @param {any} obj
 * @returns {any}
 */
function cleanActualBlock (obj) {
  if (obj.tx && obj.tx[0]) {
    cleanActualTransaction(obj.tx[0], 0)
  }
  return obj
}

/**
 * @param {any} obj
 * @param {number} i
 * @returns {any}
 */
function cleanActualTransaction (obj, i) {
  if (i === 0 && obj.vin.length && obj.vin[0].txinwitness) {
    // get rid of coinbase txinwitness, the bitcoin cli doesn't show this but it's
    // the nonce for the witness commitment so can't get lost
    delete obj.vin[0].txinwitness
  }
  return obj
}

/**
 * @param {any} obj
 * @returns {any}
 */
function toMinimalExpected (obj) {
  const ret = Object.assign({}, obj)
  ret.tx = obj.tx.map((/** @type {any} */ tx) => tx.txid)
  return ret
}

/**
 * @param {Uint8Array} block
 * @param {any} expectedComplete
 */
function verifyHeader (block, expectedComplete) {
  const headerData = block.slice(0, 80)
  const decodedHeader = BitcoinBlock.decodeHeaderOnly(block)

  // just the pieces we expect from a header
  const expected = 'hash version versionHex merkleroot time nonce bits previousblockhash difficulty'.split(' ').reduce((/** @type {Record<string, any>} */ p, c) => {
    if (expectedComplete[c] !== undefined) {
      p[c] = expectedComplete[c]
    }
    return p
  }, /** @type {Record<string, any>} */ {})
  assert.deepStrictEqual(roundDifficulty(decodedHeader.toPorcelain()), roundDifficulty(expected), 'decoded header data')

  // re-encode
  const encodedHeader = decodedHeader.encode()
  assert.strictEqual(toHex(encodedHeader), toHex(headerData), 're-encoded block header')

  // instantiate new
  const newHeader = BitcoinBlock.fromPorcelain(/** @type {BlockHeaderPorcelain|BlockPorcelain} */(Object.assign({}, decodedHeader.toPorcelain())))
  assert.deepStrictEqual(roundDifficulty(newHeader.toPorcelain()), roundDifficulty(expected), 're-instantiated header data')
  // encode newly instantiated
  const encodedNewHeader = newHeader.encode()
  assert.strictEqual(toHex(encodedNewHeader), toHex(headerData), 're-instantiated and encoded block header')
}

/**
 * @param {any} decoded
 * @param {any} expected
 */
function verifyMinimalForm (decoded, expected) {
  const serializableMin = decoded.toPorcelain('min')
  const minimalExpected = toMinimalExpected(expected)
  assert.deepStrictEqual(roundDifficulty(serializableMin), roundDifficulty(minimalExpected))
}

/**
 * @param {any} decoded
 * @param {any} expected
 */
function verifyMaximalForm (decoded, expected) {
  const serializable = cleanActualBlock(decoded.toPorcelain())
  assert.deepStrictEqual(roundDifficulty(serializable), roundDifficulty(expected))
}

/**
 * @param {any} decoded
 * @param {any} expected
 * @param {Uint8Array} block
 */
function verifyRoundTrip (decoded, expected, block) {
  // instantiate new
  const from = Object.assign({}, decoded.toPorcelain())
  from.tx = from.tx.map((/** @type {any} */ tx) => Object.assign({}, tx))
  const newBlock = BitcoinBlock.fromPorcelain(from)
  /* for debugging JSON output
  writeFileSync('act.json', JSON.stringify(Object.assign({}, roundDifficulty(cleanActualBlock(newBlock.toPorcelain()))), null, 2), 'utf8')
  writeFileSync('exp.json', JSON.stringify(Object.assign({}, roundDifficulty(expected)), null, 2), 'utf8')
  /**/
  const newBlockClean = roundDifficulty(cleanActualBlock(newBlock.toPorcelain()))
  assert.deepStrictEqual(newBlockClean, roundDifficulty(expected), 're-instantiated data')
  // encode newly instantiated
  const encodedNew = newBlock.encode()
  /* for debugging - compare hex output, optionally enable setDebug(true) for encoding trace
  const w = (f, b) => {
    const a = []
    for (let i = 0; i < b.length; i += 50) {
      a.push(`${i}: ` + toHex(b.slice(i, i + 50)))
    }
    writeFileSync(f, a.join('\n'), 'utf8')
  }
  w('act.hex', encodedNew)
  w('exp.hex', block)
  */
  assert.strictEqual(toHex(encodedNew), toHex(block), 're-instantiated and encoded block')
}

/**
 * @param {any} tx
 * @param {any} expectedTx
 * @param {number} i
 */
function verifyTransactionRoundTrip (tx, expectedTx, i) {
  // instantiate new
  const newTransaction = BitcoinTransaction.fromPorcelain(Object.assign({}, tx.toPorcelain()))
  /* for debugging JSON output
  writeFileSync('act.json', JSON.stringify(Object.assign({}, newTransaction.toPorcelain(), { hex: null }), null, 2), 'utf8')
  writeFileSync('exp.json', JSON.stringify(Object.assign({}, expectedTx, { hex: null }), null, 2), 'utf8')
  /**/
  assert.deepStrictEqual(roundDifficulty(cleanActualTransaction(newTransaction.toPorcelain(), i)), roundDifficulty(expectedTx), `re-instantiated data (${i})`)
  // encode newly instantiated
  const encodedNew = newTransaction.encode()
  assert.strictEqual(toHex(encodedNew), expectedTx.hex, `re-instantiated and encoded transaction (${i})`)
}

/**
 * @param {any} tx
 * @param {any} expectedTx
 * @param {number} i
 * @returns {boolean}
 */
function verifyTransaction (tx, expectedTx, i) {
  // hash & txid correct? (early sanity check)
  assert.strictEqual(toHashHex(tx.txid), expectedTx.txid)
  assert.strictEqual(toHashHex(tx.hash), expectedTx.hash)

  // porcelain form correct?
  const serializableTx = cleanActualTransaction(tx.toPorcelain(), i)
  /* for debugging JSON output
  writeFileSync('act.json', JSON.stringify(Object.assign({}, serializableTx, { hex: null }), null, 2), 'utf8')
  writeFileSync('exp.json', JSON.stringify(Object.assign({}, expectedTx, { hex: null }), null, 2), 'utf8')
  /**/
  assert.deepStrictEqual(serializableTx, expectedTx, `transaction decode ${i}`)

  const encodedTx = tx.encode()
  // full encoded form matches expected
  /* for debugging - compare hex output, optionally enable setDebug(true) for encoding trace
  const w = (f, b) => {
    const a = []
    for (let i = 0; i < b.length; i += 50) {
      a.push(`${i}: ` + toHex(b.slice(i, i + 50)))
    }
    writeFileSync(f, a.join('\n'), 'utf8')
  }
  w('act.hex', encodedTx)
  w('exp.hex', fromHex(expectedTx.hex))
  */
  const etxhash = toHashHex(dblSha2256(encodedTx))
  assert.strictEqual(etxhash, expectedTx.hash, `transaction encode hash ${i}`)
  assert.strictEqual(toHex(encodedTx), expectedTx.hex, `transaction encode raw ${i}`)

  // segwit encoded form matches expected
  const encodedTxNoWitness = tx.encode(BitcoinTransaction.HASH_NO_WITNESS)
  const etxid = toHashHex(dblSha2256(encodedTxNoWitness))
  assert.strictEqual(etxid, expectedTx.txid)

  verifyTransactionRoundTrip(tx, expectedTx, i)

  // segwitishness
  if (etxid === etxhash) {
    // not segwit
    assert(tx.segWit === false)
    return false
  } else {
    // is segwit, whole block should be too
    assert(tx.segWit === true)
    return true
  }
}

/**
 * @param {any} decoded
 * @param {any} expected
 */
function verifyMerkleRoot (decoded, expected) {
  const merkleRootNoWitness = toHashHex(decoded.calculateMerkleRoot(BitcoinBlock.HASH_NO_WITNESS))
  assert.strictEqual(merkleRootNoWitness, expected.merkleroot, 'calculated merkle root')
}

/**
 * @param {any} decoded
 */
function verifyWitnessCommitment (decoded) {
  // find the expected witness commitment [hash(nonce + full merkle root)] in the first transaction
  // and compare it to one we calculate from the nonce in the coinbase + our own calculated full merkle root
  const expectedWitnessCommitment = decoded.getWitnessCommitment()
  if ((expectedWitnessCommitment instanceof Uint8Array) && expectedWitnessCommitment.length === 32) {
    const witnessCommitment = decoded.calculateWitnessCommitment()
    assert.strictEqual(toHashHex(witnessCommitment), toHashHex(expectedWitnessCommitment), 'witness commitment')
  } else {
    assert.fail('no valid witness commitment found, what do?')
  }
}

/**
 * @param {any} block
 * @param {any} expected
 */
function test (block, expected) {
  // ---------------------------------------------------------------------------
  // prepare exepected data (trim fat we can't / won't test)
  cleanExpectedBlock(expected)

  // ---------------------------------------------------------------------------
  // verify _only_ the first 80 bytes and that we can parse basic data
  verifyHeader(block, expected)

  const decoded = BitcoinBlock.decode(block, true) // decode full block, strict length consumption

  // ---------------------------------------------------------------------------
  // test the serialized minimum form, where the `tx` array is just the txids
  verifyMinimalForm(decoded, expected)

  // ---------------------------------------------------------------------------
  // sift through each transaction, checking their properties individually and
  // in detail, doing this before testing maximal form shows up errors early and
  // pin-points them
  let hasSegWit = false
  assert.isDefined(decoded.tx)
  // @ts-ignore: TS2532: Object is possibly 'undefined'.
  assert.equal(decoded.tx.length, expected.tx.length)
  for (let i = 0; decoded.tx && i < expected.tx.length; i++) {
    const tx = decoded.tx[i]
    const expectedTx = expected.tx[i]

    if (verifyTransaction(tx, expectedTx, i)) {
      hasSegWit = true
    }
  }

  // ---------------------------------------------------------------------------
  // test the serialized maximum form, where the `tx` array the full transaction
  // data, potentially huge
  verifyMaximalForm(decoded, expected)

  // ---------------------------------------------------------------------------
  // check that we can properly calculate the transaction merkle root, this
  // doesn't include witness data
  verifyMerkleRoot(decoded, expected)

  // ---------------------------------------------------------------------------
  // if this block includes segwit transacitons, check that we can properly
  // calculate the full merkle root and then the witness commitment from that
  // and the nonce found in the coinbase
  // (only for `nHeight >= consensusParams.SegwitHeight` (481824))
  assert(decoded.isSegWit() === hasSegWit, `expected isSegWit(): ${hasSegWit}`) // is this a segwit transaction?
  if (hasSegWit) {
    verifyWitnessCommitment(decoded)
  }

  verifyRoundTrip(decoded, expected, block)
}

export default test
