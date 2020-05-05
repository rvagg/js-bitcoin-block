# bitcoin-block: A Bitcoin block interface for JavaScript

**bitcoin-block** implements the basic block primitives: `BitcoinBlock`, `BitcoinTransaction`, `BitcoinTransactionIn`, `BitcoinTransactionOut` and `BitcoinOutPoint`. These primitives are able to decode raw block binary form and present the same data available via the Bitcoin Core RPC (and via the `bitcoin-cli` utility) and many online block explorers minus contextual chain data that is not available in individual blocks (e.g. height, confirmations, next block). These primitives can also re-encode binary block form given the minimum required block and data.

Transactions are SegWit-aware and can decode and re-encode both full and no-witness forms and their associated merkle trees: including the standard no-witness transaction merkle tree found in the block header and the full witness transaction data merkle plus the witness confirmation hash.

Top-level primitives also implement a `toPorcelain()` method that converts the block form to a pure, undecorated JavaScript object that, when passed through `JSON.stringify()` presents identical data to the Bitcoin Core RPC `getblock` (i.e. `bitcoin-cli getblock ...`) interface (minus contextual chain data). The reverse operation is also possible, whereby this JSON form can be re-instantiated into the block primitives and even re-encoded into binary form.

Full compatibility, including round-trip to from binary, to JSON, back to binary form, has been tested across the entire Bitcoin blockchain (to date of writing).

## Example

Make your own block explorer from raw block data:

```js
const fs = require('fs')
const {
  BitcoinBlock,
  toHashHex,
  COIN
} = require('./')

// read in hex data from a file, as you get from `bitcoin-cli getblock <hash> 0`
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
```

```
> node example.js test/fixtures/000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506.hex
Block: 000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506
  Previous block: 000000000002d01c1fccc21636b607dfd930d31d01c3a62104612a1719011250
  Timestamp: Wed, 29 Dec 2010 11:57:43 GMT
  Difficulty: 14484.162361225399
  TX merkle root: f3e94742aca4b5ef85488dc37c06c3282295ffec960994b2c0d5ac2a25a95766
  Version: 1
  Bits: 453281356
  Weight: 3828 WU
  Size: 957 bytes
  Nonce: 274148111
  Transaction volume: 53.01
  Block reward: 50
  Transactions 4:
    #1 for 5.56 BTC
       and 44.44 BTC
    #2 for 0.01 BTC
       and 2.99 BTC
    #3 for 0.01 BTC
```

## Native vs Porcelain APIs: `toPorcelain()` and `fromPorcelain()`

`BitcoinBlock`, `BitcoinTransaction`, `BitcoinTransactionIn` and `BitcoinTransactionOut` each implement a `toPorcelain()` method. When called, this method will return a plain, undecorated, JavaScript object which contains only the properties that can be found on the Bitcoin RPC (and via `bitcoin-cli`) in the JSON form of these objects. Performing a `JSON.stringify()` on these objects would produce the same output provided by the Bitcoin RPC _minus_ certain properties that are only derivable with full chain context.

`BitcoinBlock#toPorcelain()` on a block that has complete transactions will also call `BitcoinTransaction#toPorcelain()` on those transactions and present those as well in the returned result. In this way, a `JSON.stringify(block.toPorcelain())` can replicate the Bitcoin RPC output when the transactions are present.

All byte arrays are presented as hex strings in the porcelain API. All hashes and merkle roots are presented as hexidecimal big-endian uint256 form, i.e. a reversed 32-byte-array printed in hex. This is where we get the standard leading-zeros bitcoin block addresses (even though the zeros are trailing in serialized form).

### Unavailable properties

For blocks, the following properties are not derivable from isolated block data:

  * `mediantime` - depends on past blocks
  * `height` - depends on the chain
  * `chainwork` - depends on the chain
  * `confirmations` - depends on the chain context
  * `nextblockhash` - content-addressing just doesn't work this way

Additionally, the `difficulty` property may different slightly in precision of output but will be the same to two decimal places.

For transactions, the coinbase (first transaction) reported from the Bitcoin RPC does not report the `txinwitness` property which is the witness commitment nonce. It is included in this API for completeness and may be present in future iterations of the Bitcoin RPC pending [bitcoin/bitcoin#18826](https://github.com/bitcoin/bitcoin/pull/18826/).

### Schema

Using [IPlD Schemas](https://specs.ipld.io/schemas/) we can approximately describe the structure of Bitcoin blocks and transactions in both their native and porcelain forms.

* The **native** format is described in [block.ipldsch](./block.ipldsch).
* The **porcelain** format, as obtained frome the Bitcoin RPC and the `toPorcelain()` methods in this library are described in [block-porcelain.ipldsch](./block-porcelain.ipldsch).

### Round-trip conversion

`BitcoinBlock`, `BitcoinTransaction`, `BitcoinTransactionIn` and `BitcoinTransactionOut` each also implement a `fromPorcelain()` method which performs the reverse operation by instantiating the native classes from basic plain object representations.

**`fromPorcelain()` should be preferred to using constructors for instantiating these objects in a stand-alone manner** (i.e. not from parsing raw block data). This is because `fromPorcelain()` is also able to reconstruct hashes and identifiers properly from the provided data.

Only the non-redundant parts of a porcelain form of the objects are required to perform this operation. See the API documentation below for details.

## API

### Contents

 * [`COIN`](#COIN)
 * [`HASH_NO_WITNESS`](#HASH_NO_WITNESS)
 * [`toHashHex(hash)`](#toHashHex)
 * [`fromHashHex(hashStr)`](#fromHashHex)
 * [`class BitcoinBlock`](#BitcoinBlock)
   * [Constructor: `BitcoinBlock()`](#BitcoinBlock_new)
 * [`class BitcoinBlock`](#BitcoinBlock)
   * [Constructor: `BitcoinBlock(version, previousblockhash, merkleroot, time, bits, nonce[, hash][, tx][, size])`](#BitcoinBlock_new)
 * [`BitcoinBlock#toPorcelain()`](#BitcoinBlock_toPorcelain)
 * [`BitcoinBlock#calculateMerkleRoot(noWitness)`](#BitcoinBlock_calculateMerkleRoot)
 * [`BitcoinBlock#calculateWitnessCommitment()`](#BitcoinBlock_calculateWitnessCommitment)
 * [`BitcoinBlock#getWitnessCommitment()`](#BitcoinBlock_getWitnessCommitment)
 * [`BitcoinBlock#isSegWit()`](#BitcoinBlock_isSegWit)
 * [`BitcoinBlock#encode(args)`](#BitcoinBlock_encode)
 * [`BitcoinBlock.HASH_NO_WITNESS`](#BitcoinBlock__HASH_NO_WITNESS)
 * [`BitcoinBlock.fromPorcelain(porcelain)`](#BitcoinBlock__fromPorcelain)
 * [`BitcoinBlock.decode(bytes)`](#BitcoinBlock__decode)
 * [`BitcoinBlock.decodeBlockHeaderOnly(bytes)`](#BitcoinBlock__decodeBlockHeaderOnly)
 * [`class BitcoinTransaction`](#BitcoinTransaction)
   * [Constructor: `BitcoinTransaction()`](#BitcoinTransaction_new)
 * [`class BitcoinTransaction`](#BitcoinTransaction)
   * [Constructor: `BitcoinTransaction(version, segWit, vin, vout, lockTime[, rawBytes][, hash][, txid][, sizeNoWitness][, size])`](#BitcoinTransaction_new)
 * [`BitcoinTransaction#toPorcelain()`](#BitcoinTransaction_toPorcelain)
 * [`BitcoinTransaction#getWitnessCommitmentIndex()`](#BitcoinTransaction_getWitnessCommitmentIndex)
 * [`BitcoinTransaction#getWitnessCommitment()`](#BitcoinTransaction_getWitnessCommitment)
 * [`BitcoinTransaction#isCoinbase()`](#BitcoinTransaction_isCoinbase)
 * [`BitcoinTransaction#encode(args)`](#BitcoinTransaction_encode)
 * [`BitcoinTransaction.fromPorcelain(porcelain)`](#BitcoinTransaction__fromPorcelain)
 * [`BitcoinTransaction.decode(bytes)`](#BitcoinTransaction__decode)
 * [`class BitcoinTransactionIn`](#BitcoinTransactionIn)
   * [Constructor: `BitcoinTransactionIn(prevout, scriptSig, sequence)`](#BitcoinTransactionIn_new)
 * [`BitcoinTransactionIn#toPorcelain()`](#BitcoinTransactionIn_toPorcelain)
 * [`BitcoinTransactionIn.fromPorcelain(porcelain)`](#BitcoinTransactionIn__fromPorcelain)
 * [`class BitcoinTransactionOut`](#BitcoinTransactionOut)
   * [Constructor: `BitcoinTransactionOut(value, scriptPubKey)`](#BitcoinTransactionOut_new)
 * [`BitcoinTransactionOut#toPorcelain()`](#BitcoinTransactionOut_toPorcelain)
 * [`BitcoinTransactionOut.fromPorcelain(porcelain)`](#BitcoinTransactionOut__fromPorcelain)

<a name="COIN"></a>
### `COIN`

The `COIN` constant is the number of _satoshis_ in 1 BTC, i.e. 100,000,000.
Transaction store values in satoshis so must be divided by `COIN` to find the
amount in BTC.

<a name="HASH_NO_WITNESS"></a>
### `HASH_NO_WITNESS`

`HASH_NO_WITNESS` is available on [`BitcoinBlock`](#BitcoinBlock) and [`BitcoinTransaction`](#BitcoinTransaction)
and is used as an optional argument to their respective `encode()` methods
to signal that encoded transactions should not include witness data (i.e. their
pre SegWit form and the form used to generate the `txid` and transaction merkle root).

<a name="toHashHex"></a>
### `toHashHex(hash)`

Takes a hash, in byte form, and returns it as a big-endian uint256 in hex encoded form.
This format is typically used by Bitcoin in its hash identifiers, particularly its
block hashes and transaction identifiers and hashes.

This method simply reverses the bytes and produces a hex string from the resulting bytes.

See [`fromHashHex`](#fromHashHex) for the reverse operation.

**Parameters:**

* **`hash`** _(`Buffer|Uint8Array`)_

**Return value**  _(`string`)_

<a name="fromHashHex"></a>
### `fromHashHex(hashStr)`

Takes a string containing a big-endian uint256 in hex encoded form and converts it
to a standard byte array.

This method simply reverses the string and produces a `Buffer` from the hex bytes.

See [`toHashHex`](#toHashHex) for the reverse operation.

**Parameters:**

* **`hashStr`** _(`string`)_

**Return value**  _(`Buffer`)_

<a name="BitcoinBlock"></a>
### `class BitcoinBlock`

**Properties:**

* **`version`** _(`number`)_: positive integer
* **`previousblockhash`** _(`Uint8Array|Buffer`)_: 256-bit hash
* **`merkleroot`** _(`Uint8Array|Buffer`)_: 256-bit hash
* **`time`** _(`number`)_: seconds since epoch
* **`bits`** _(`number`)_
* **`nonce`** _(`number`)_: 32-bit integer
* **`hash`** _(`Uint8Array|Buffer`)_: 256-bit hash, a double SHA2-256 hash of all bytes making up
  this block (calculated)
* **`tx`** _(`Array.<BitcoinTransaction>`)_: an array of [`BitcoinTransaction`](#BitcoinTransaction) objects
  representing the transactions in this block
* **`size`** _(`number`)_: the length of the entire block in bytes
* **`strippedsize`** _(`number`)_: the size adjusted according to weight, which accounts for
  SegWit encoding.
* **`difficulty`** _(`number`)_
* **`weight`** _(`number`)_

<a name="BitcoinBlock_new"></a>
#### Constructor: `BitcoinBlock()`

A class representation of a Bitcoin Block. Parent for all of the data included in the raw block
data in addition to some information that can be calculated based on that data. Properties are
intended to match the names that are provided by the Bitcoin API (hence the casing and some
strange names).

<a name="BitcoinBlock"></a>
### `class BitcoinBlock`

<a name="BitcoinBlock_new"></a>
#### Constructor: `BitcoinBlock(version, previousblockhash, merkleroot, time, bits, nonce[, hash][, tx][, size])`

Instantiate a new `BitcoinBlock`.

See the class properties for expanded information on these parameters. The `difficulty`
property will be calculated from `bits`. The `stripedsize` and `weight` properties will be
calculated from the transactions if they are available.

To represent a header only, the `hash`, `tx` and `size` parameters are optional.

**Parameters:**

* **`version`** _(`number`)_
* **`previousblockhash`** _(`Uint8Array|Buffer`)_
* **`merkleroot`** _(`Uint8Array|Buffer`)_
* **`time`** _(`number`)_
* **`bits`** _(`number`)_
* **`nonce`** _(`number`)_
* **`hash`** _(`Uint8Array|Buffer`, optional)_
* **`tx`** _(`Array.<BitcoinTransaction>`, optional)_
* **`size`** _(`number`, optional)_

<a name="BitcoinBlock_toPorcelain"></a>
### `BitcoinBlock#toPorcelain()`

Convert to a serializable form that has nice stringified hashes and other simplified forms. May
be useful for simplified inspection.

The object returned by this method matches the shape of the JSON structure provided by the
`getblock` RPC call of Bitcoin Core minus some chain-contextual fields that are not calculable
from isolated block data. Performing a `JSON.stringify()` on this object will yield the same
data as the RPC minus these fields.

See [block-porcelain.ipldsch](block-porcelain.ipldsch) for a description of the layout of the
object returned from this method.

**Return value**  _(`object`)_

<a name="BitcoinBlock_calculateMerkleRoot"></a>
### `BitcoinBlock#calculateMerkleRoot(noWitness)`

**Calculate** the merkle root of the transactions in this block. This method should reproduce
the native `merkleroot` field if this block was decoded from raw block data.

This operation can be performed with or without witness data using the `noWitness` flag
parameter. Without witness data will yield the `merkleroot`, with witness data will yield the
witness merkle root which is hashed with the witness nonce (from the single coinbase vin) to
produce the witness commitment that is stored in the coinbase (from one of the vouts).

This method assumes this object has transactions attached to it and is not the header data
alone.

**Parameters:**

* **`noWitness`** _(`Symbol`)_: calculate the merkle root without witness data (i.e. the standard
  block header `merkleroot` value). Supply `HASH_NO_WITNESS` to activate.

<a name="BitcoinBlock_calculateWitnessCommitment"></a>
### `BitcoinBlock#calculateWitnessCommitment()`

**Calculate** the witness commitment for this block. Uses the full transaction merkle root
(with witness data), appended to the witness nonce (stored in the coinbase vin) and hashed.

This method assumes this object has transactions attached to it and is not the header data
alone. It also assumes a valid witness nonce stored in the single element of the
`scriptWitness` in the coinbase's single vin.

<a name="BitcoinBlock_getWitnessCommitment"></a>
### `BitcoinBlock#getWitnessCommitment()`

**Get** the witness commitment as decoded from the block data. This is a shortcut method that
reaches assumes transaction data is associated with this block and reaches into the coinbase
and finds the witness commitment within one of the vout elements.

<a name="BitcoinBlock_isSegWit"></a>
### `BitcoinBlock#isSegWit()`

Does this block contain SegWit (BIP141) transactions. This method assumes this block has
transaction data associated with it as it checks whether those transactions were encoded
as SegWit.

<a name="BitcoinBlock_encode"></a>
### `BitcoinBlock#encode(args)`

Encode this block into its raw binary form. Assuming you have the complete
block data in this instantiated form.

It is possible to perform a `decode().encode()` round-trip for any given valid
block data and produce the same binary output.

**Parameters:**

* **`args`** _(`object`)_: any encoding args, currently only
  `BitcoinBlock.HASH_NO_WITNESS` is a valid argument, which when provided will
  return the block with transactions encoded _without_ witness data.

**Return value**  _(`Buffer`)_

<a name="BitcoinBlock__HASH_NO_WITNESS"></a>
### `BitcoinBlock.HASH_NO_WITNESS`

Symbol used as a flag for [`Block#calculateMerkleRoot`](#Block_calculateMerkleRoot) to calculate the merkle root without
transaction witness data included in the transaction hashes.

<a name="BitcoinBlock__fromPorcelain"></a>
### `BitcoinBlock.fromPorcelain(porcelain)`

Instantiate a `BitcoinBlock` from porcelain data. This is the inverse of
[`BitcoinBlock#toPorcelain`](#BitcoinBlock_toPorcelain). It does _not_ require the entirety of the porcelain data as
much of it is either duplicate data or derivable from other fields.

If a full `tx` array is provided on the porcelain object [`BitcoinTransaction.fromPorcelain`](#BitcoinTransaction__fromPorcelain)
is called on each of these in turn to re-instantiate the native transaction array.

Fields required to instantiate a basic header form are:

* `previousblockhash` _if_ the block is not the genesis block (its absence assumes this)
* `version` integer
* `merkleroot` 64-character hex string
*  `time` integer
* `bits` hex string

A `tx` array indicates that full block data is present and it should attempt to decode the entire
structure.

**Parameters:**

* **`porcelain`** _(`object`)_: the porcelain form of a Bitcoin block

**Return value**  _(`BitcoinBlock`)_

<a name="BitcoinBlock__decode"></a>
### `BitcoinBlock.decode(bytes)`

Decode a [`BitcoinBlock`](#BitcoinBlock) from the raw bytes of the block. Such data
in hex form is available directly from the bitcoin cli:
`bitcoin-cli getblock <hash> 0` (where `0` requests hex form).

Use this if you have the full block hash, otherwise use [`BitcoinBlock.decodeBlockHeaderOnly`](#BitcoinBlock__decodeBlockHeaderOnly)
to parse just the 80-byte header data.

**Parameters:**

* **`bytes`** _(`Uint8Array|Buffer`)_: the raw bytes of the block to be decoded.

**Return value**  _(`BitcoinBlock`)_

<a name="BitcoinBlock__decodeBlockHeaderOnly"></a>
### `BitcoinBlock.decodeBlockHeaderOnly(bytes)`

Decode only the header section of a [`BitcoinBlock`](#BitcoinBlock) from the raw bytes of the block.
This method will exclude the transactions but will properly present the header
data including the correct hash.

To decode the entire block data, use [`BitcoinBlock.decodeBlock`](#BitcoinBlock__decodeBlock).

This method returns a `BitcoinBlockHeaderOnly` which is a subclass of
`BitcoinBlock` and may be used as such. Just don't expect it to give you
any transaction data beyond the merkle root.

**Parameters:**

* **`bytes`** _(`Uint8Array|Buffer`)_: the raw bytes of the block to be decoded.

**Return value**  _(`BitcoinBlock`)_

<a name="BitcoinTransaction"></a>
### `class BitcoinTransaction`

**Properties:**

* **`version`** _(`number`)_
* **`segWit`** _(`boolean`)_: whether this transaction contains witness data or was encoded with
  possibly separate witness data
* **`vin`** _(`Array.<BitcoinTransactionIn>`)_: an array of [`BitcoinTransactionIn`](#BitcoinTransactionIn)s
* **`vout`** _(`Array.<BitcoinTransactionIn>`)_: an array of [`BitcoinTransactionOut`](#BitcoinTransactionOut)s
* **`lockTime`** _(`number`)_
* **`rawBytes`** _(`Uint8Array|Buffer`)_: the raw bytes of the encoded form of this transaction
* **`hash`** _(`Uint8Array|Buffer`)_: the hash of the entire transaction, including witness data
* **`txid`** _(`Uint8Array|Buffer`)_: the hash of the transaction minus witness data
* **`sizeNoWitness`** _(`number`)_: the sise of the transaction in bytes when encoded without
  witness data
* **`size`** _(`number`)_: the size of the transaction when encoded with witness data (i.e. the
  raw form stored on disk)
* **`vsize`** _(`number`)_
* **`weight`** _(`number`)_

<a name="BitcoinTransaction_new"></a>
#### Constructor: `BitcoinTransaction()`

A class representation of a Bitcoin Transaction, multiple of which are contained within each
[`BitcoinBlock`](#BitcoinBlock).

<a name="BitcoinTransaction"></a>
### `class BitcoinTransaction`

<a name="BitcoinTransaction_new"></a>
#### Constructor: `BitcoinTransaction(version, segWit, vin, vout, lockTime[, rawBytes][, hash][, txid][, sizeNoWitness][, size])`

Instantiate a new `BitcoinTransaction`.

See the class properties for expanded information on these parameters.

**Parameters:**

* **`version`** _(`number`)_
* **`segWit`** _(`boolean`)_
* **`vin`** _(`Array.<BitcoinTransactionIn>`)_
* **`vout`** _(`Array.<BitcoinTransactionIn>`)_
* **`lockTime`** _(`number`)_
* **`rawBytes`** _(`Uint8Array|Buffer`, optional)_
* **`hash`** _(`Uint8Array|Buffer`, optional)_
* **`txid`** _(`Uint8Array|Buffer`, optional)_
* **`sizeNoWitness`** _(`number`, optional)_
* **`size`** _(`number`, optional)_

<a name="BitcoinTransaction_toPorcelain"></a>
### `BitcoinTransaction#toPorcelain()`

Convert to a serializable form that has nice stringified hashes and other simplified forms. May
be useful for simplified inspection.

The object returned by this method matches the shape of the JSON structure provided by the
`getblock` (or `gettransaction`) RPC call of Bitcoin Core. Performing a `JSON.stringify()` on
this object will yield the same data as the RPC.

See [block-porcelain.ipldsch](block-porcelain.ipldsch) for a description of the layout of the
object returned from this method.

**Return value**  _(`object`)_

<a name="BitcoinTransaction_getWitnessCommitmentIndex"></a>
### `BitcoinTransaction#getWitnessCommitmentIndex()`

Find the witness commitment index in the vout array. This method should only work on SegWit
_coinbase_ transactions. The vout array is scanned and each `scriptPubKey` field is inspected.
If one is 38 bytes long and begins with `0x6a24aa21a9ed`, this is the witness commitment vout,
and the index of this vout is returned.

**Return value**  _(`number`)_

<a name="BitcoinTransaction_getWitnessCommitment"></a>
### `BitcoinTransaction#getWitnessCommitment()`

Get the witness commitment from this transaction. This method should only work on SegWit
_coinbase_ transactions. See [`BitcoinTransaction#getWitnessCommitmentIndex`](#BitcoinTransaction_getWitnessCommitmentIndex) for details
on how this is found in the vout array. The leading 6 byte flag is removed from the
`scriptPubKey` of the vout before being returned by this method.

**Return value**  _(`Buffer`)_: the witness commitment

<a name="BitcoinTransaction_isCoinbase"></a>
### `BitcoinTransaction#isCoinbase()`

Determine if this is the coinbase. This involves checking the vout array, if this array has a
single entry and the `prevout` field is a null hash (`0x00*32`), this is assumed to be the
coinbase.

**Return value**  _(`boolean`)_

<a name="BitcoinTransaction_encode"></a>
### `BitcoinTransaction#encode(args)`

Encode this transaction into its raw binary form. Assuming you have the complete
transaction data in this instantiated form.

It is possible to perform a `decode().encode()` round-trip for any given valid
transaction data and produce the same binary output.

**Parameters:**

* **`args`** _(`object`)_: any encoding args, currently only
  `BitcoinTransaction.HASH_NO_WITNESS` is a valid argument, which when provided will
  return the transaction encoded _without_ witness data. When encoded without
  witness data, the resulting binary data can be double SHA2-256 hashed to produce
  the `txid` which is used in the transaction merkle root stored in the header,
  while the binary data from a full transaction will produce the `hash` which is
  used in the witness merkle and witness commitment.

**Return value**  _(`Buffer`)_

<a name="BitcoinTransaction__fromPorcelain"></a>
### `BitcoinTransaction.fromPorcelain(porcelain)`

Instantiate a `BitcoinTransaction` from porcelain data. This is the inverse of
[`BitcoinTransaction#toPorcelain`](#BitcoinTransaction_toPorcelain). It does _not_ require the entirety of the porcelain data
as much of it is either duplicate data or derivable from other fields.

This function is normally called from [`BitcoinBlock.fromPorcelain`](#BitcoinBlock__fromPorcelain) to instantiate the
each element of the `tx` array.

Fields required to instantiate a transaction are:

* `version` number
* `locktime` number
* `vin` array of [`BitcoinTransactionIn`](#BitcoinTransactionIn) porcelain forms
* `vout` array of [`BitcoinTransactionIn`](#BitcoinTransactionIn) porcelain forms

Some indication of whether this is a SegWit transaction is also required to properly instantiate
a correct BitcoinTransaction. This could be one of:

* both the `hash` and `txid` fields (these are compared)
* both the `size` and `weight` fields (`weight` is recalculated from size and compared)
* the `height` property (this can only come from the Bitcoin Core RPC as it is chain-context data
  and not derivable from standard block data)

**Parameters:**

* **`porcelain`**: the porcelain form of a BitcoinTransaction

**Return value**  _(`BitcoinTransaction`)_

<a name="BitcoinTransaction__decode"></a>
### `BitcoinTransaction.decode(bytes)`

Decode a [`BitcoinTransaction`](#BitcoinTransaction) from the raw bytes of the transaction.
Normally raw transaction data isn't available in detached form, although the
hex is available in the JSON output provided by the bitcoin cli attached to
each element of the `tx` array. It may also come from the
[`BitcoinTransaction#encode`](#BitcoinTransaction_encode) method.

**Parameters:**

* **`bytes`** _(`Uint8Array|Buffer`)_: the raw bytes of the transaction to be decoded.

**Return value**  _(`BitcoinTransaction`)_

<a name="BitcoinTransactionIn"></a>
### `class BitcoinTransactionIn`

A class representation of a Bitcoin TransactionIn, multiple of which are contained within each
[`BitcoinTransaction`](#BitcoinTransaction) in its `vin` array.

**Properties:**

* **`prevout`** _(`BitcoinOutPoint`)_: details of the transaction and TransactionOut that this
  transaction follows from
* **`scriptSig`** _(`Uint8Array|Buffer`)_: an arbitrary length byte array with signature data
* **`sequence`** _(`number`)_

<a name="BitcoinTransactionIn_new"></a>
#### Constructor: `BitcoinTransactionIn(prevout, scriptSig, sequence)`

Instantiate a new `BitcoinTransactionIn`.

See the class properties for expanded information on these parameters.

<a name="BitcoinTransactionIn_toPorcelain"></a>
### `BitcoinTransactionIn#toPorcelain()`

Convert to a serializable form that has nice stringified hashes and other simplified forms. May
be useful for simplified inspection.

The object returned by this method matches the shape of the JSON structure provided by the
`getblock` (or `gettransaction`) RPC call of Bitcoin Core. Performing a `JSON.stringify()` on
this object will yield the same data as the RPC.

See [block-porcelain.ipldsch](block-porcelain.ipldsch) for a description of the layout of the
object returned from this method.

**Return value**  _(`object`)_

<a name="BitcoinTransactionIn__fromPorcelain"></a>
### `BitcoinTransactionIn.fromPorcelain(porcelain)`

Instantiate a `BitcoinTransactionIn` from porcelain data. This is the inverse of
[`BitcoinTransactionIn#toPorcelain`](#BitcoinTransactionIn_toPorcelain).

This function is normally called from [`BitcoinTransaction.fromPorcelain`](#BitcoinTransaction__fromPorcelain) to instantiate the
each element of the `vin` array.

Fields required to instantiate a transaction are:

* `sequence` number
* `txinwitness` hex string - optional, but should be provided if available to form the correct
  TransactionIn.

Then, if this TransactionIn is attached to the coinbase:

* `coinbase` hex string

_Otherwise_:

* `txid` number - the linked previous transactionid
* `vout` number - the vout index in the previous transaction
* `scriptSig` object:
  - `scriptSig.hex` hex string - the raw scriptSig data (the asm isn't used)

**Parameters:**

* **`porcelain`**: the porcelain form of a BitcoinTransactionIn

**Return value**  _(`BitcoinTransactionIn`)_

<a name="BitcoinTransactionOut"></a>
### `class BitcoinTransactionOut`

A class representation of a Bitcoin TransactionOut, multiple of which are contained within each
[`BitcoinTransaction`](#BitcoinTransaction) in its `vout` array.

**Properties:**

* **`value`** _(`number`)_: an amount / value for this TransactionOut (in satoshis, not BTC)
* **`scriptPubKey`** _(`Uint8Array|Buffer`)_: an arbitrary length byte array

<a name="BitcoinTransactionOut_new"></a>
#### Constructor: `BitcoinTransactionOut(value, scriptPubKey)`

Instantiate a new `BitcoinTransactionOut`.

See the class properties for expanded information on these parameters.

<a name="BitcoinTransactionOut_toPorcelain"></a>
### `BitcoinTransactionOut#toPorcelain()`

Convert to a serializable form that has nice stringified hashes and other simplified forms. May
be useful for simplified inspection.

The object returned by this method matches the shape of the JSON structure provided by the
`getblock` (or `gettransaction`) RPC call of Bitcoin Core. Performing a `JSON.stringify()` on
this object will yield the same data as the RPC.

See [block-porcelain.ipldsch](block-porcelain.ipldsch) for a description of the layout of the
object returned from this method.

**Return value**  _(`object`)_

<a name="BitcoinTransactionOut__fromPorcelain"></a>
### `BitcoinTransactionOut.fromPorcelain(porcelain)`

Instantiate a `BitcoinTransactionIn` from porcelain data. This is the inverse of
[`BitcoinTransactionOut#toPorcelain`](#BitcoinTransactionOut_toPorcelain).

This function is normally called from [`BitcoinTransaction.fromPorcelain`](#BitcoinTransaction__fromPorcelain) to instantiate the
each element of the `vin` array.

Fields required to instantiate a transaction are:

* `value` number - the BTC value of this transaction (not satoshis, which are used in the
  BitcoinTransactionOut).
* `scriptPubKey` object:
  - `scriptPubKey.hex` hex string - the raw scriptPubKey data (the asm isn't used)

**Parameters:**

* **`porcelain`**: the porcelain form of a BitcoinTransactionOut

**Return value**  _(`BitcoinTransactionOut`)_

## License and Copyright

Copyright 2020 Rod Vagg

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
