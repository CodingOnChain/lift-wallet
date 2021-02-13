import { cli, decrypt, encrypt, hex_to_ascii } from '../core/common';
import { 
    getMnemonicCmd,
    getRootCmd,
    getPublicCmd,
    getChildCmd,
    getBaseAddrCmd,
    getPaymentAddrCmd } from '../core/cardano-addresses.js';
import { 
    buildTxIn, 
    buildTransaction, 
    buildMintTransaction,
    calculateMinFee,
    createPaymentVerificationKey,
    createExtendedVerificationKey,
    getAddressKeyHash,
    createMonetaryPolicy,
    getPolicyId,
    signTransaction } from '../core/cardano-cli.js';
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
const extendedVerificationKeyFile = 'payment.evkey';
const verificationKeyFile = 'payment.vkey';
const changeFile = 'change.addr';
const protocolParamsFile = 'protocolParams.json';
const draftTxFile = 'draft.tx';
const rawTxFile = 'raw.tx';
const signedTxFile = 'signed.tx';
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
    //payment signiing key (needed to get verification keys)
    const paymentSKeyPath = path.resolve(walletDir, paymentSigningKeyFile);
    const paymentSigningKey = getBufferHexFromFile(paymentPrv.stdout).slice(0, 128) + getBufferHexFromFile(paymentPub.stdout);
    const paymentSKey = `{
        "type": "PaymentExtendedSigningKeyShelley_ed25519_bip32",
        "description": "Payment Signing Key",
        "cborHex": "5880${paymentSigningKey}"
    }`
    // public [extended] verification key
    const extendedVerificationKeyPath = path.resolve(walletDir, extendedVerificationKeyFile);
    const verificationKeyPath = path.resolve(walletDir, verificationKeyFile);

    //stake public
    const stakePub = await cmd(getChildCmd(accountPub.stdout, "2/0"));
    if(stakePub.stderr) throw stakePub.stderr;

    const addresses = [];
    const changes = [];
    for(let i = 0; i < 20; i++) {
        //public payment key 
        const paymentPub = await cmd(getChildCmd(accountPub.stdout, `0/${i}`));
        if(paymentPub.stderr) throw paymentPub.stderr;

        //enterprise address
        const basePaymentAddr = await cmd(getBaseAddrCmd(paymentPub.stdout, network));
        if(basePaymentAddr.stderr) throw basePaymentAddr.stderr;

        //payment address
        const paymentAddr = await cmd(getPaymentAddrCmd(basePaymentAddr.stdout, stakePub.stdout));
        if(paymentAddr.stderr) throw paymentAddr.stderr;
        
        //public change key 
        const changePub = await cmd(getChildCmd(accountPub.stdout, `1/${i}`));
        if(changePub.stderr) throw changePub.stderr;

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
    // write publicVerificationKey now that wallet dir exists
    fs.writeFileSync(path.resolve(walletDir, paymentSKeyPath), paymentSKey);
    let paymentVerificationKey = createPaymentVerificationKey(paymentSKeyPath, extendedVerificationKeyPath);
    await cli(paymentVerificationKey);
    let extendedVerificationKey = createExtendedVerificationKey(extendedVerificationKeyPath, verificationKeyPath)
    await cli(extendedVerificationKey);
    //// cleanup paymentskey
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
    const walletDir = path.resolve(walletsPath, network, name);

    //tx/key file paths
    const txDraftPath = path.resolve(walletDir, draftTxFile);

    //gather payment/change addresses for utxos
    const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
    const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))

    //UTxOs
    const addressUtxos = await getUtxos(
        network, 
        [...addresses.map((a) => a.address), ...changes.map((a) => a.address)]);

    //get draft tx-ins
    let draftTxIns = buildTxIn(addressUtxos, amount, 0);

    //build draft transaction
    let draftTx = buildTransaction('allegra-era', 0, 0, toAddress, amount, changes[0].address, draftTxIns, null, txDraftPath, sendAll)
    await cli(draftTx);

    //get protocol parameters
    const protocolParamsPath = await refreshProtocolParametersFile(network)

    //calculate fees
    const calculateFee = calculateMinFee(txDraftPath, addressUtxos.length, 2, 1, 0, protocolParamsPath);
    const feeResult = await cli(calculateFee);
    //originally tried to just calculate the fee locally
    //  but had issues when trying to use multiple --tx-in
    //minFeeA * txSize + minFeeB
    //note the output of the 'calculate-min-fee' is: 'XXXX Lovelace' 
    //  this is why i split and take index 0
    return feeResult.stdout.split(' ')[0];
}

//add ability to send custom ada amount and to address
export async function mintToken(network, walletName, assetName, tokenAmount, passphrase, metadataPath) {
    const walletDir = path.resolve(walletsPath, network, walletName);

    //if we already have a policy for an asset with this name
    const assetDir = path.resolve(walletDir, assetName);
    const newAsset = true;
    
    const txDraftPath = path.resolve(assetDir, draftTxFile);
    const txRawPath = path.resolve(assetDir, rawTxFile);
    const txSignedPath = path.resolve(assetDir, signedTxFile);
    const policyScriptPath = path.resolve(assetDir, policyScriptFile);
    const policySkeyPath = path.resolve(assetDir, policySigningKeyFile);
    const policyVkeyPath = path.resolve(assetDir, policyVerificationKeyFile);
    const signingKeyPaths = [];

    //Step 1) Create a Token Policy
    if(newAsset)
    {
      if (!fs.existsSync(assetDir)){
        fs.mkdirSync(assetDir);
      }
      //get the key hash of the verification key of the wallet
      const verificationKeyPath = path.resolve(walletDir, verificationKeyFile);
      const keyHashCmdOutput = await cli(getAddressKeyHash(verificationKeyPath));
      const keyHash = keyHashCmdOutput.stdout.replace(/[\n\r]/g, '');

      //lets create the monetary policy for the asset
      let monetaryPolicy = await createMonetaryPolicy(keyHash, policyScriptPath, policyVkeyPath, policySkeyPath);
      await cli(monetaryPolicy);
    }

    //Step 2) Get Protocol Params
    const protocolParamsPath = await refreshProtocolParametersFile(network);

    //Step 3) Get UTXOs
    const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)));
    const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))
    const addressUtxos = await getUtxos(
        network, 
        [...addresses.map((a) => a.address), ...changes.map((a) => a.address)]);
    //TODO: pass in address to send
    const tokenDestinationAddress = addresses[0].address;

    //Step 4) Build Draft Tx
    let draftTxIns = buildTxIn(addressUtxos, getBalance(network, walletName), 0);
    const assetIdCmdOutput = await cli(getPolicyId(policyScriptPath));
    const assetId = assetIdCmdOutput.stdout.replace(/[\n\r]/g, '')
    
    let draftTx = buildMintTransaction('mary-era', 0, 0, tokenDestinationAddress, assetId, assetName, tokenAmount, draftTxIns, metadataPath, txDraftPath);
    await cli(draftTx);

    ////Step 5) Calculute Fees
    const calculateFee = calculateMinFee(txDraftPath, addressUtxos.length, 2, 1, 0, protocolParamsPath);
    const feeResult = await cli(calculateFee);
    const fee = feeResult.stdout.split(' ')[0];

    //Step 6) Build Raw Tx
    const slotNo = await getCurrentSlotNo(network);
    const ttl = slotNo + 1000;
    let rawTx = buildMintTransaction('mary-era', fee, ttl, tokenDestinationAddress, assetId, assetName, tokenAmount, draftTxIns, metadataPath, txRawPath);
    await cli(rawTx);

    await getSigningKeys(draftTxIns, passphrase, walletDir, signingKeyPaths, addresses, changes);

    //Step 7) Sign Tx
    const signedTx = signTransaction(network, 1097911063, signingKeyPaths, txRawPath, txSignedPath, policyScriptPath, policySkeyPath);
    await cli(signedTx);
    const signedtxContents = JSON.parse(fs.readFileSync(txSignedPath));

    
    let result = { transactionId: null, error: null };
    try{
        //Step 8) Submit Tx
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
    if(fs.existsSync(txDraftPath)) fs.unlinkSync(txDraftPath);
    if(fs.existsSync(txRawPath)) fs.unlinkSync(txRawPath);
    if(fs.existsSync(txSignedPath)) fs.unlinkSync(txSignedPath);
    
    signingKeyPaths.forEach(sk => {
        if(fs.existsSync(sk)) fs.unlinkSync(sk);
    })

    return result;
}

export async function refreshProtocolParametersFile(network) {

    const protocolParamsPath = path.resolve(walletsPath, network, protocolParamsFile);
    const protocolParams = await getProtocolParams(network);
    fs.writeFileSync(
        protocolParamsPath,
        Buffer.from(JSON.stringify(protocolParams)));

    return protocolParamsPath

}


export async function sendTransaction(network, name, sendAll, amount, toAddress, passphrase, metadataPath) {
    const walletDir = path.resolve(walletsPath, network, name);

    //tx/key file paths
    const txDraftPath = path.resolve(walletDir, draftTxFile);
    const txRawPath = path.resolve(walletDir, rawTxFile);
    const txSignedPath = path.resolve(walletDir, signedTxFile);
    const signingKeyPaths = [];

    let result = { transactionId: null, error: null };
    try {
        //gather payment/change addresses for utxos
        const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
        const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))

        //UTxOs
        const addressUtxos = await getUtxos(
            network, 
            [...addresses.map((a) => a.address), ...changes.map((a) => a.address)]);

        //get draft tx-ins
        let draftTxIns = buildTxIn(addressUtxos, amount, 0);

        //build draft transaction
        let draftTx = buildTransaction('allegra-era', 0, 0, toAddress, amount, changes[0].address, draftTxIns, metadataPath, txDraftPath, sendAll)
        await cli(draftTx);

        //refresh protocol parameters
        const protocolParamsPath = await refreshProtocolParametersFile(network)

        //calculate fees
        const calculateFee = calculateMinFee(txDraftPath, addressUtxos.length, 2, 1, 0, protocolParamsPath);
        const feeResult = await cli(calculateFee);
        //originally tried to just calculate the fee locally
        //  but had issues when trying to use multiple --tx-in
        //minFeeA * txSize + minFeeB
        //note the output of the 'calculate-min-fee' is: 'XXXX Lovelace' 
        //  this is why i split and take index 0
        const fee = feeResult.stdout.split(' ')[0];

        //get current slot no to calculate ttl
        const slotNo = await getCurrentSlotNo(network);
        const ttl = slotNo + 1000;

        //get draft tx-ins
        let rawTxIns = buildTxIn(addressUtxos, amount, fee);

        //build raw transaction
        let rawTx = buildTransaction('allegra-era', fee, ttl, toAddress, amount, changes[0].address, rawTxIns, metadataPath, txRawPath, sendAll)
        await cli(rawTx);

        await getSigningKeys(draftTxIns, passphrase, walletDir, signingKeyPaths, addresses, changes);

        const signedTx = signTransaction(network, 1097911063, signingKeyPaths, txRawPath, txSignedPath);
        await cli(signedTx);

        //send transaction 
        //get signed tx binary
        // var dataHex = JSON.parse(fs.readFileSync(txSignedPath)).cborHex
        // var dataBinary = getBinaryFromHexString(dataHex)
        var signedtxContents = JSON.parse(fs.readFileSync(txSignedPath));

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

    //clean up
    if(fs.existsSync(txDraftPath)) fs.unlinkSync(txDraftPath);
    if(fs.existsSync(txRawPath)) fs.unlinkSync(txRawPath);
    if(fs.existsSync(txSignedPath)) fs.unlinkSync(txSignedPath);
    
    signingKeyPaths.forEach(sk => {
        if(fs.existsSync(sk)) fs.unlinkSync(sk);
    })

    return result;
}

export async function getTransactions(network, name) {
    const walletDir = path.resolve(walletsPath, network, name);

    //gather payment/change addresses for utxos
    const payments = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
    const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))
    const addresses = [...payments.map((a) => a.address), ...changes.map((a) => a.address)]

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

function getBufferHexFromFile(hex) {
    return lib.bech32.decode(hex).data.toString('hex');
}

function getBinaryFromHexString(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}

async function getSigningKeys(draftTxIns, passphrase, walletDir, signingKeyPaths, addresses, changes){
    //create signing keys
    //decrypt account prv
    const accountPrv = decrypt(
        path.resolve(walletDir, accountPrvFile), 
        path.resolve(walletDir, accountPubFile),
        passphrase);

    for(let i = 0; i < draftTxIns.length; i++) {
        const txIn = draftTxIns[i];
        //figure out if it is external or internal address
        const payment = addresses.find(a => a.address == txIn.address)
        const change = changes.find(c => c.address == txIn.address)

        if(payment != undefined)
        {
            //payment private/public
            const paymentPrv = await cmd(getChildCmd(accountPrv, `0/${payment.index}`));
            if(paymentPrv.stderr) throw paymentPrv.stderr;
            const paymentPub = await cmd(getPublicCmd(paymentPrv.stdout));
            if(paymentPub.stderr) throw paymentPub.stderr;
            
            //payment signing keys
            const paymentSigningKey = getBufferHexFromFile(paymentPrv.stdout).slice(0, 128) + getBufferHexFromFile(paymentPub.stdout)
            const paymentSigningKeyFile = `payment.${payment.index}.skey`
            const paymentSKeyPath = path.resolve(walletDir, paymentSigningKeyFile);
    
            fs.writeFileSync(paymentSKeyPath, `{ 
                "type": "PaymentExtendedSigningKeyShelley_ed25519_bip32", 
                "description": "Payment Signing Key", 
                "cborHex": "5880${paymentSigningKey}"
            }`);
            signingKeyPaths.push(paymentSKeyPath)
        }else if(change != undefined) {
            //change private/public
            const changePrv = await cmd(getChildCmd(accountPrv, `1/${change.index}`));
            if(changePrv.stderr) throw changePrv.stderr;
            const changePub = await cmd(getPublicCmd(changePrv.stdout));
            if(changePub.stderr) throw changePub.stderr;    

            //change signing keys
            const changeSigningKey = getBufferHexFromFile(changePrv.stdout).slice(0, 128) + getBufferHexFromFile(changePub.stdout)
            const changeSigningKeyFile = `change.${change.index}.skey`
            const changeSKeyPath = path.resolve(walletDir, changeSigningKeyFile);
            
            fs.writeFileSync(changeSKeyPath, `{ 
                "type": "PaymentExtendedSigningKeyShelley_ed25519_bip32", 
                "description": "Change Signing Key", 
                "cborHex": "5880${changeSigningKey}"
            }`);
            signingKeyPaths.push(changeSKeyPath)
        }else {
            //wtf?
            console.log('Unable to find address from tx input');
        }
    }     
}
