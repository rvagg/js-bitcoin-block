const fs = require('fs')

const {
  BitcoinBlock,
  toHashHex,
  COIN
} = require('./')

const rawBlockData = Buffer.from(fs.readFileSync(process.argv[2], 'ascii'), 'hex')

const block = BitcoinBlock.decode(rawBlockData)

console.log(`Block: ${toHashHex(block.hash)}
  Previous block: ${toHashHex(block.previousblockhash)}
  Timestamp: ${new Date(block.time * 1000).toUTCString()}
  Difficulty: ${block.difficulty}
  TX merkle root: ${toHashHex(block.merkleroot)}
  Version: ${block.version}
  Bits: ${block.bits}
  Weight: ${block.weight} WU
  Size: ${block.size} bytes
  Nonce: ${block.nonce}
  Transaction volume: ${block.tx.slice(1).reduce((p, c) => p + c.vout.reduce((p, c) => p + c.value, 0), 0) / COIN}
  Block reward: ${block.tx[0].vout[0].value / COIN}
  Transactions ${block.tx.length}:`)
block.tx.slice(1).forEach((tx, i) => {
  tx.vout.forEach((vout, j) => {
    const is = `${i + 1}`
    if (j === 0) {
      console.log(`    #${is} for ${vout.value / COIN} BTC`)
    } else {
      console.log(`     ${''.padStart(is.length, ' ')} and ${vout.value / COIN} BTC`)
    }
  })
})
