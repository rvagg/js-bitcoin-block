/* eslint-env mocha */

const fs = require('fs').promises
const { readdirSync } = require('fs')
const path = require('path')
const test = require('./test')
const { fromHex } = require('../util')

// export an async function per block
const hashes = readdirSync(path.join(__dirname, 'fixtures'))
  .map((f) => f.endsWith('.hex') && f.substring(0, f.length - 4))
  .filter(Boolean)

for (const hash of hashes) {
  it(hash, async () => {
    const blockContent = fromHex(await fs.readFile(path.join(__dirname, 'fixtures', `${hash}.hex`), 'utf8'))
    const expectedData = JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures', `${hash}.json`)))
    test(hash, blockContent, expectedData)
  }).timeout(5000)
}
