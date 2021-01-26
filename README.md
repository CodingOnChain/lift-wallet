

# LIFT Wallet
[![GitHub license](https://img.shields.io/github/license/nothingalike/lift-wallet)](https://github.com/nothingalike/lift-wallet/blob/master/LICENSE)

A Cardano Cryptocurrency Lite wallet. It ultilizes `cardano-cli` and `cardano-address`. 


## Still in Development. 
Proceed with caution.


## Prerequisites
 - Go to the [cardano-wallet](https://github.com/input-output-hk/cardano-wallet/releases) release page. Download your system's cooresponding binaries. 
 - Go to the [Cardano Configuration](https://hydra.iohk.io/job/Cardano/cardano-node/cardano-deployment/latest-finished/download/1/index.html) file page. Download the config, shelley genesis, byron genesis, and topology files. Don't rename the files.
 - you need [Node.js ](https://nodejs.org/es/) installed
 - you need [GIT](https://git-scm.com/)  installed

## Project setup

1. clone the project in your computer    
    ``` bash
      git clone https://github.com/nothingalike/lift-wallet.git
    ```
    the proyect should look like this (windows)
        ![alt text](https://user-images.githubusercontent.com/35784914/105702298-5963c100-5eea-11eb-876f-6f83572664b7.PNG)
        
2. Create a folder in the root of the project called `cardano`
        ![alt text](https://user-images.githubusercontent.com/35784914/105702285-57016700-5eea-11eb-8eb0-ff942a16ea90.PNG)
        
2. Inside the new folder `cardano`, create a folder to your corresponding platform according to node's `process.platform`. Current list is [here]
(https://nodejs.org/api/process.html#process_process_platform). (Example: Windows = win32, Mac = darwin)`\
        ![alt text](https://user-images.githubusercontent.com/35784914/105702289-58329400-5eea-11eb-94ae-b514c1ccb757.PNG)
        
3. Inside your platform folder, paste your `cardano-wallet` binaries you downloaded during the Prerequisites.
        ![alt text](https://user-images.githubusercontent.com/35784914/105702291-58329400-5eea-11eb-89d9-9b04e1da3715.PNG)
4. Back in the `cardano` folder, create a folder called `configs`.\
        ![alt text](https://user-images.githubusercontent.com/35784914/105702293-58cb2a80-5eea-11eb-918c-6cc530645bce.PNG)
5. Paste the configurations files you downloaded during Prerequisites into the `configs` folder.
        ![alt text](https://user-images.githubusercontent.com/35784914/105702294-58cb2a80-5eea-11eb-8323-3976125d940c.PNG)

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

At the end you can see the wallet running

 ![alt text](https://user-images.githubusercontent.com/35784914/105702296-5963c100-5eea-11eb-9cb3-83ec46753379.PNG)
