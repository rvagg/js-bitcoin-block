var context = require.context('./fixtures', true, /\.json$/)
const test = require('./test')

async function run () {
  const fixtures = []

  // load .json files to `fixture.data` and corresponding .hex file binary data as `fixture.block`
  await Promise.all(context.keys().map(async (f) => {
    const hash = f.replace(/^.\/([^.]+)\.json/, '$1')
    // console.log((await import(`!!raw-loader!./fixtures/${hash}.hex`)).substr(0, 100)
    const data = (await import(`./fixtures/${hash}.json`)).default
    const blockHex = (await import(`!!raw-loader!./fixtures/${hash}.hex`)).default
    const block = Buffer.from(blockHex.replace(/\n/g, ''), 'hex')
    fixtures.push({
      hash,
      block,
      data
    })
  }))

  for (const { hash, block, data } of fixtures) {
    test(hash, block, data)
  }
}

module.exports = run
