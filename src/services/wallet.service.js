import { cli, decrypt, encrypt, hex_to_ascii, getBufferHexFromFile } from '../core/common';
import { 
    sendFunds, 
    createAsset,
    calcFee,
    cleanUpFiles as cleanUpTxFiles } from './transaction.service.js';
import { 
    getMnemonicCmd,
    getRootCmd,
    getPublicCmd,
    getChildCmd,
    getBaseAddrCmd,
    getPaymentAddrCmd } from '../core/cardano-addresses.js';
import { 
    createVerificationKey,
    createExtendedVerificationKey,
    getAddressKeyHash,
    createMonetaryPolicy,
    getPolicyId } from '../core/cardano-cli.js';
import { 
    getProtocolParams, 
    getUtxos, 
    getCurrentSlotNo,
    submitTransaction,
    getTransactionsByAddresses,
    getTransactionsDetails } from '../core/dandelion.js'
import util from 'util';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process'
import lib from 'cardano-crypto.js'

const cmd = util.promisify(exec);

const isDevelopment = process.env.NODE_ENV !== 'production'
const appPath = path.resolve(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"), 'lift-wallet');

const walletsPath = isDevelopment
    ? path.resolve(__dirname, '..', 'cardano', 'wallets')
    : path.resolve(appPath , 'wallets');
    
const assetsPath = isDevelopment
    ? path.resolve(__dirname, '..', 'cardano', 'assets')
    : path.resolve(appPath , 'assets');

const accountPrvFile = 'account.xprv';
const accountPubFile = 'account.xpub';
const paymentFile = 'payment.addr';
const paymentSigningKeyFile = 'payment.skey';
const paymentExtendedVerificationKeyFile = 'payment.evkey';
const paymentVerificationKeyFile = 'payment.vkey';
const changeFile = 'change.addr';
const policyScriptFile = 'policyScript.json';
const policySigningKeyFile = 'policy.skey';
const policyVerificationKeyFile = 'policy.vkey';

export async function setupWalletDir() {
    if(!isDevelopment) {
        if(!fs.existsSync(appPath)) {
            fs.mkdirSync(appPath);
        }
    }

    if(!fs.existsSync(walletsPath)){
        fs.mkdirSync(walletsPath);
    }

    if(!fs.existsSync(path.resolve(walletsPath, 'testnet')))
        fs.mkdirSync(path.resolve(walletsPath, 'testnet'))

    if(!fs.existsSync(path.resolve(walletsPath, 'mainnet')))
        fs.mkdirSync(path.resolve(walletsPath, 'mainnet'))
}

export async function getMnemonic(){
    //right now we are hardcoding 24 words
    //  lets pass in a number. maybe we use a set of word lengths
    //  12, 15, 18, 21, 24
    const { stdout, stderr } = await cmd(getMnemonicCmd(24));
    if(stderr) throw stderr;

    return stdout.replace('\n', '');
}

export async function createWallet(network, name, mnemonic, passphrase) {

    //if we already have a wallet for this network with this name
    //  prevent the wallet creation.
    const walletDir = path.resolve(walletsPath, network, name);
    if(fs.existsSync(walletDir)) throw "Wallet already exists";

    //root key
    const rootKey = await cmd(getRootCmd(mnemonic));
    if(rootKey.stderr) throw rootKey.stderr;

    //account private
    const accountPrv = await cmd(getChildCmd(rootKey.stdout, "1852H/1815H/0H"));
    if(accountPrv.stderr) throw accountPrv.stderr;
    
    //account public
    const accountPub = await cmd(getPublicCmd(accountPrv.stdout));
    if(accountPub.stderr) throw accountPub.stderr;

    ///TODO: We maybe want to think about moving this to be on-demand.
    //payment priv/pub keys (needed to get verification keys)
    const paymentPrv = await cmd(getChildCmd(accountPrv.stdout, "0/0"));
    if(paymentPrv.stderr) throw paymentPrv.stderr;
    const paymentPub = await cmd(getChildCmd(accountPub.stdout, "0/0"));
    if(paymentPub.stderr) throw paymentPub.stderr;
    //payment signing key (needed to get verification keys)
    const paymentSKeyPath = path.resolve(walletDir, paymentSigningKeyFile);
    const paymentSigningKey = getBufferHexFromFile(paymentPrv.stdout).slice(0, 128) + getBufferHexFromFile(paymentPub.stdout);
    const paymentSKey = `{
        "type": "PaymentExtendedSigningKeyShelley_ed25519_bip32",
        "description": "Payment Signing Key",
        "cborHex": "5880${paymentSigningKey}"
    }`

    // public payment [extended] verification keys
    const paymentExtendedVerificationKeyPath = path.resolve(walletDir, paymentExtendedVerificationKeyFile);
    const paymentVerificationKeyPath = path.resolve(walletDir, paymentVerificationKeyFile);

    const addresses = [];
    const changes = [];
    for(let i = 0; i < 20; i++) {
        //public payment key 
        const paymentPub = await cmd(getChildCmd(accountPub.stdout, `0/${i}`));
        if(paymentPub.stderr) throw paymentPub.stderr;

        //public change key 
        const changePub = await cmd(getChildCmd(accountPub.stdout, `1/${i}`));
        if(changePub.stderr) throw changePub.stderr;

        //public stake key
        const stakePub = await cmd(getChildCmd(accountPub.stdout, `2/${i}`));
        if(stakePub.stderr) throw stakePub.stderr;

        //enterprise address
        const basePaymentAddr = await cmd(getBaseAddrCmd(paymentPub.stdout, network));
        if(basePaymentAddr.stderr) throw basePaymentAddr.stderr;

        //payment address
        const paymentAddr = await cmd(getPaymentAddrCmd(basePaymentAddr.stdout, stakePub.stdout));
        if(paymentAddr.stderr) throw paymentAddr.stderr;

        //enterprise change address
        const baseChangeAddr = await cmd(getBaseAddrCmd(changePub.stdout, network));
        if(baseChangeAddr.stderr) throw baseChangeAddr.stderr;

        //change address
        const changeAddr = await cmd(getPaymentAddrCmd(baseChangeAddr.stdout, stakePub.stdout));
        if(changeAddr.stderr) throw changeAddr.stderr;

        addresses.push({ index: i, address: paymentAddr.stdout });
        changes.push({ index: i, address: changeAddr.stdout });
    }
    
    //keys/addresses to save
    //account prv (encrypted)
    //account pub
    //10 - payment addresses
    fs.mkdirSync(walletDir);
    // write */0 publicVerificationKeys now that wallet dir exists
    //// payment
    fs.writeFileSync(path.resolve(walletDir, paymentSKeyPath), paymentSKey);
    let paymentExtendedVerificationKey = createExtendedVerificationKey(paymentSKeyPath, paymentExtendedVerificationKeyPath);
    await cli(paymentExtendedVerificationKey);
    let paymentVerificationKey = createVerificationKey(paymentExtendedVerificationKeyPath, paymentVerificationKeyPath)
    await cli(paymentVerificationKey);

    //// cleanup skeys
    if (fs.existsSync(paymentSKeyPath)) fs.unlinkSync(paymentSKeyPath);

    fs.writeFileSync(path.resolve(walletDir, accountPrvFile), accountPrv.stdout);
    fs.writeFileSync(path.resolve(walletDir, accountPubFile), accountPub.stdout);
    encrypt(
        path.resolve(walletDir, accountPrvFile), 
        path.resolve(walletDir, accountPubFile),
        passphrase);
    fs.writeFileSync(path.resolve(walletDir, paymentFile), JSON.stringify(addresses));
    fs.writeFileSync(path.resolve(walletDir, changeFile), JSON.stringify(changes));
}

export async function getWallets(network) {
    const networkPath = path.resolve(walletsPath, network);
    const walletDirs = getDirectories(networkPath);
    let wallets = [];
        for(let i = 0; i < walletDirs.length; i++) {
            var balance=null;
            try{
                balance = await getBalance(network, walletDirs[i]);                                
            }catch(e){
                console.log(e.message);
            } 
            if(balance!=null){
                wallets.push({
                    name: walletDirs[i],
                    balance: balance
                });
            }
        }
    return wallets;
}

export async function getAddresses(network, name) {
    console.log("@@@ walletsPath, network, name", walletsPath, network, name);
    const walletDir = path.resolve(walletsPath, network, name);
    return JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
}

export async function getBalance(network, name) {
    const walletDir = path.resolve(walletsPath, network, name);
    const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
    const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))

    const addressUtxos = await getUtxos(
        network, 
        [...addresses.map((a) => a.address),...changes.map((a) => a.address)]);
    return getTotalUtxoBalance(addressUtxos);
}

export async function getFee(network, name, sendAll, amount, toAddress) {
    return await calcFee(network, 'mary-era', path.resolve(walletsPath, network, name), amount, sendAll, toAddress, null);
}

//TODO: add ability to send custom ada amount and to address
export async function mintToken(network, walletName, assetName, tokenAmount, passphrase, metadataPath) {
    let result = { transactionId: null, error: null };
    const walletDir = path.resolve(walletsPath, network, walletName);

    //if we already have a policy for an asset with this name
    const assetDir = path.resolve(walletDir, assetName);
    const newAsset = true;
    
    const policyScriptPath = path.resolve(assetDir, policyScriptFile);
    const policySkeyPath = path.resolve(assetDir, policySigningKeyFile);
    const policyVkeyPath = path.resolve(assetDir, policyVerificationKeyFile);

    //Step 1) Create a Token Policy
    if(newAsset)
    {
      if (!fs.existsSync(assetDir)){
        fs.mkdirSync(assetDir);
      }
      //get the key hash of the verification key of the wallet
      const paymentVerificationKeyPath = path.resolve(walletDir, paymentVerificationKeyFile);
      const keyHashCmdOutput = await cli(getAddressKeyHash(paymentVerificationKeyPath));
      const keyHash = keyHashCmdOutput.stdout.replace(/[\n\r]/g, '');

      //lets create the monetary policy for the asset
      let monetaryPolicy = await createMonetaryPolicy(keyHash, policyScriptPath, policyVkeyPath, policySkeyPath);
      await cli(monetaryPolicy);
    }
    
    try{
        const currentBalance = await getBalance(network, walletName);
        const signedtxContents = await createAsset(
            network, 
            'mary-era', 
            walletDir, 
            currentBalance, 
            policySkeyPath,
            policyScriptPath, 
            assetName, 
            tokenAmount, 
            metadataPath, 
            passphrase);
        result.transactionId = await submitTransaction(network, signedtxContents);
    }catch(err) {
        console.error(err);
        if(err.response.data != undefined) {
            console.log(err.response.data);
            result.error = err.response.data;
        }
        else {
            console.log(err);
            result.error = err;
        }
    }

    //clean up
    cleanUpTxFiles();

    return result;
}

export async function sendTransaction(network, name, sendAll, amount, toAddress, passphrase, metadataPath) {

    let result = { transactionId: null, error: null };
    try {
        //build transaction 
        //get signed tx binary
        var signedtxContents = await sendFunds(
            network,
            'mary-era', 
            path.resolve(walletsPath, network, name), 
            amount, 
            sendAll,
            toAddress, 
            passphrase, 
            metadataPath);

        //submit transaction to dandelion
        result.transactionId = await submitTransaction(network, signedtxContents);

    }catch(err) {
        console.error(err);
        if(err.response.data != undefined) {
            console.log(err.response.data);
            result.error = err.response.data;
        }
        else {
            console.log(err);
            result.error = err;
        }
    }

    cleanUpTxFiles();

    return result;
}

export async function getTransactions(network, name) {
    const walletDir = path.resolve(walletsPath, network, name);

    //gather payment/change addresses for utxos
    const payments = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
    const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))

    const addresses = [...payments.map((a) => a.address), ...changes.map((a) => a.address)]

    //get transactions by addresses
    //get transactions by addresses
    const transactions = await getTransactionsByAddresses(network, addresses);
    
    const transactionsDetails = await getTransactionsDetails(
        network,
        [...transactions.map((t) => t.tx_hash)]
    )

    let transactionHistory = []
    transactionsDetails.forEach(td => {
        const inputFound = td.inputs.filter(i => addresses.includes(i.address))
        const outputFound = td.outputs.filter(o => addresses.includes(o.address))

        if(inputFound.length > 0) {
            let inputSum = 0;
            inputFound.forEach(i => inputSum += parseInt(i.value));
            let outputSum = 0;
            outputFound.forEach(i => outputSum += parseInt(i.value));
            
            transactionHistory.push({
                hash: td.hash,
                direction: 'Sent',
                datetime: td.includedAt,
                amount: parseInt(inputSum - outputSum)/1000000
            })
        }else if(outputFound.length > 0) {
            let outputSum = 0;
            outputFound.forEach(i => outputSum += i.value);
            
            transactionHistory.push({
                hash: td.hash,
                direction: 'Received',
                datetime: td.includedAt,
                amount: parseInt(outputSum)/1000000
            })
        }
    });
    transactionHistory.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    
    return transactionHistory;
}

function getTotalUtxoBalance(utxos) {
    let total = 0;
    utxos.forEach(o => total += parseInt(o.value))
    return total;
}

function getDirectories (source) {
  return fs.readdirSync(source)
    .filter(f => {
        return fs.statSync(path.resolve(source, f)).isDirectory();
    });
}

function getBinaryFromHexString(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}