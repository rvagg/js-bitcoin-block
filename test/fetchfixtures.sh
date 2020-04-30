#!/bin/bash

files="/mnt/md4/pl/coins/btc-dump/index/12/12500
/mnt/md4/pl/coins/btc-dump/index/25/25000
/mnt/md4/pl/coins/btc-dump/index/37/37500
/mnt/md4/pl/coins/btc-dump/index/50/50000
/mnt/md4/pl/coins/btc-dump/index/62/62500
/mnt/md4/pl/coins/btc-dump/index/75/75000
/mnt/md4/pl/coins/btc-dump/index/87/87500
/mnt/md4/pl/coins/btc-dump/index/100/100000
/mnt/md4/pl/coins/btc-dump/index/112/112500
/mnt/md4/pl/coins/btc-dump/index/125/125000
/mnt/md4/pl/coins/btc-dump/index/137/137500
/mnt/md4/pl/coins/btc-dump/index/150/150000
/mnt/md4/pl/coins/btc-dump/index/162/162500
/mnt/md4/pl/coins/btc-dump/index/175/175000
/mnt/md4/pl/coins/btc-dump/index/187/187500
/mnt/md4/pl/coins/btc-dump/index/200/200000
/mnt/md4/pl/coins/btc-dump/index/212/212500
/mnt/md4/pl/coins/btc-dump/index/225/225000
/mnt/md4/pl/coins/btc-dump/index/237/237500
/mnt/md4/pl/coins/btc-dump/index/250/250000
/mnt/md4/pl/coins/btc-dump/index/262/262500
/mnt/md4/pl/coins/btc-dump/index/275/275000
/mnt/md4/pl/coins/btc-dump/index/287/287500
/mnt/md4/pl/coins/btc-dump/index/300/300000
/mnt/md4/pl/coins/btc-dump/index/312/312500
/mnt/md4/pl/coins/btc-dump/index/325/325000
/mnt/md4/pl/coins/btc-dump/index/337/337500
/mnt/md4/pl/coins/btc-dump/index/350/350000
/mnt/md4/pl/coins/btc-dump/index/362/362500
/mnt/md4/pl/coins/btc-dump/index/375/375000
/mnt/md4/pl/coins/btc-dump/index/387/387500
/mnt/md4/pl/coins/btc-dump/index/400/400000
/mnt/md4/pl/coins/btc-dump/index/412/412500
/mnt/md4/pl/coins/btc-dump/index/425/425000
/mnt/md4/pl/coins/btc-dump/index/437/437500
/mnt/md4/pl/coins/btc-dump/index/450/450000
/mnt/md4/pl/coins/btc-dump/index/462/462500
/mnt/md4/pl/coins/btc-dump/index/475/475000
/mnt/md4/pl/coins/btc-dump/index/487/487500
/mnt/md4/pl/coins/btc-dump/index/500/500000
/mnt/md4/pl/coins/btc-dump/index/512/512500
/mnt/md4/pl/coins/btc-dump/index/525/525000
/mnt/md4/pl/coins/btc-dump/index/537/537500
/mnt/md4/pl/coins/btc-dump/index/550/550000
/mnt/md4/pl/coins/btc-dump/index/562/562500
/mnt/md4/pl/coins/btc-dump/index/575/575000
/mnt/md4/pl/coins/btc-dump/index/587/587500
/mnt/md4/pl/coins/btc-dump/index/600/600000
/mnt/md4/pl/coins/btc-dump/index/612/612500
/mnt/md4/pl/coins/btc-dump/index/625/625000
/mnt/md4/pl/coins/btc-dump/index/637/637500"

for file in $files; do
  json=$(readlink -f $file)
  hash=$(echo $json | cut -d/ -f10 | sed 's/json$/hex/')
  bin=$(echo $json | sed 's/json$/bin/g')
  hex=/tmp/$hash
  echo "hash:$hash, json:$json, bin:$bin, hex:$hex"
  # node -e "fs=require('fs');hex=fs.readFileSync('${bin}').toString('hex');fs.writeFileSync('${hex}', hex, 'utf8')"
done