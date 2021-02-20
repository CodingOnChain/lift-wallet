

# LIFT Wallet
[![GitHub license](https://img.shields.io/github/license/nothingalike/lift-wallet)](https://github.com/nothingalike/lift-wallet/blob/master/LICENSE)

A Cardano Cryptocurrency Lite wallet. It ultilizes `cardano-cli` and `cardano-address`. 


## Still in Development. 
Proceed with caution.


## Prerequisites
 
 - git
 - nodejs/nvm
 - bash
 - wget

We recommend using these methods to fulfill prerequisites:

- Windows: use [choco](https://chocolatey.org/):
```
choco install git nvm bash wget
```
- MacOS: [brew](https://brew.sh/):
```
brew install git nvm bash wget
```
- Linux: feel free :)

## Initial setup

1. Clone the project in your computer    
``` bash
git clone https://github.com/nothingalike/lift-wallet.git
```
2. Install `node` dependencies
```
# install required nodejs version from .nvmrc
nvm install
nvm use
# install nodejs modules/dependencies
npm install
```
4. Download latest `cardano` binaries for your platform
``` bash
npm run binaries:macos
npm run binaries:linux
npm run binaries:windows
```

## Run

```
npm run electron:serve
```

A clean instance of `lift-wallet` should pop up!

 ![alt text](https://user-images.githubusercontent.com/35784914/105702296-5963c100-5eea-11eb-9cb3-83ec46753379.PNG)
