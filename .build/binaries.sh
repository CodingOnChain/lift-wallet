#!/usr/bin/env bash

set -e

downloadBinaries() {
    mkdir -p ./cardano/$2
    if [ "$2" == 'win64' ];
    then
        wget -q -O .build/tmp.zip "https://github.com/input-output-hk/cardano-wallet/releases/download/$1/cardano-wallet-$1-$2.zip" && unzip  -j .build/tmp.zip -d ./cardano/$2 && rm .build/tmp.zip
    else
        wget -qO- "https://github.com/input-output-hk/cardano-wallet/releases/download/$1/cardano-wallet-$1-$2.tar.gz" | tar xvz - --strip-components 1 -C ./cardano/$2

    fi    
}

if [ -z $2 ]; 
then
CARDANO_WALLET_TAG=$(git ls-remote --tags https://github.com/input-output-hk/cardano-wallet.git | awk '{print $2}' | cut -d '/' -f 3 | cut -d '^' -f 1  | sort -b -t . -k 1,1nr -k 2,2nr -k 3,3r -k 4,4r -k 5,5r | uniq | tail -1);
else
CARDANO_WALLET_TAG=$2
fi

downloadBinaries $CARDANO_WALLET_TAG $1