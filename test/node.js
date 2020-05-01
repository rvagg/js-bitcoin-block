const fs = require('fs').promises
const { readdirSync } = require('fs')
const path = require('path')
const test = require('./test')

// export an async function per block
module.exports = readdirSync(path.join(__dirname, 'fixtures'))
  .map((f) => f.endsWith('.hex') && f.substring(0, f.length - 4))
  .filter(Boolean)
  .reduce((p, hash) => {
    p[hash] = async () => {
      test(
        hash,
        Buffer.from(await fs.readFile(path.join(__dirname, 'fixtures', `${hash}.hex`), 'utf8'), 'hex'),
        require(path.join(__dirname, 'fixtures', `${hash}.json`))
      )
    }
    return p
  }, {})
