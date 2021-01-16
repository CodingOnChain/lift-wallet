

# LIFT Wallet
[![GitHub license](https://img.shields.io/github/license/nothingalike/lift-wallet)](https://github.com/nothingalike/lift-wallet/blob/master/LICENSE)

A Cardano Cryptocurrency Lite wallet. It ultilizes `cardano-cli` and `cardano-address`. 


## Still in Development. 
Proceed with caution.


## Prerequisites
 - Go to the [cardano-wallet](https://github.com/input-output-hk/cardano-wallet/releases) release page. Download your system's cooresponding binaries. 
 - Go to the [Cardano Configuration](https://hydra.iohk.io/job/Cardano/cardano-node/cardano-deployment/latest-finished/download/1/index.html) file page. Download the config, shelley genesis, byron genesis, and topology files. Don't rename the files.

## Project setup

1. Create a folder in the root of the project called `cardano`
2. Inside the new folder `cardano`, create a folder to your corresponding platform according to node's `process.platform`. Current list is [here](https://nodejs.org/api/process.html#process_process_platform). (Example: Windows = win32, Mac = darwin)
3. Inside your platform folder, paste your `cardano-wallet` binaries you downloaded during the Prerequisites.
4. Back in the `cardano` folder, create a folder called `configs`.
5. Paste the configurations files you downloaded during Prerequisites into the `configs` folder.

End Result:

```bash
├── cardano
│   ├── configs
│   │   ├── mainnet-config.json
│   │   ├── mainnet-byron-genesis.json
│   │   ├── mainnet-shelley-genesis.json
│   │   ├── mainnet-topology.json
│   ├── (platform: win32, darwin, linux, etc)
│   │   ├── *binaries from cardano-wallet release
```
## Run

```
npm install

npm run electron:serve
```
