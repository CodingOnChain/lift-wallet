import { cli, decrypt, encrypt } from '../core/common';
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
    calculateMinFee,
    createPaymentVerificationKey,
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
const walletPath = isDevelopment
    ? path.resolve(__dirname, '..', 'cardano', 'wallets')
    : path.resolve(appPath , 'wallets');

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

export async function setupWalletDir() {
    if(!isDevelopment) {
        if(!fs.existsSync(appPath)) {
            fs.mkdirSync(appPath);
        }
    }

    if(!fs.existsSync(walletPath)){
        fs.mkdirSync(walletPath);
    }

    if(!fs.existsSync(path.resolve(walletPath, 'testnet')))
        fs.mkdirSync(path.resolve(walletPath, 'testnet'))

    if(!fs.existsSync(path.resolve(walletPath, 'mainnet')))
        fs.mkdirSync(path.resolve(walletPath, 'mainnet'))
}

export async function getMnemonic(){
    const { stdout, stderr } = await cmd(getMnemonicCmd(24));
    if(stderr) throw stderr;

    return stdout.replace('\n', '');
}

export async function createWallet(network, name, mnemonic, passphrase) {

    //if we already have a wallet for this network with this name
    //  prevent the wallet creation.
    const walletDir = path.resolve(walletPath, network, name);
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
    let paymentVerificationKey = createPaymentVerificationKey(paymentSKeyPath, extendedVerificationKeyPath, verificationKeyPath);
    await cli(paymentVerificationKey);
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
    const networkPath = path.resolve(walletPath, network);
    const walletDirs = getDirectories(networkPath);
    let wallets = [];
    for(let i = 0; i < walletDirs.length; i++) {
        const balance = await getBalance(network, walletDirs[i]);
        wallets.push({
            name: walletDirs[i],
            balance: balance
        });
    }
    return wallets;
}

export async function getAddresses(network, name) {
    const walletDir = path.resolve(walletPath, network, name);
    return JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
}

export async function getBalance(network, name) {
    const walletDir = path.resolve(walletPath, network, name);
    const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
    const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))

    const addressUtxos = await getUtxos(
        network, 
        [...addresses.map((a) => a.address),...changes.map((a) => a.address)]);
    return getTotalUtxoBalance(addressUtxos);
}

export async function getFee(network, name, amount, toAddress) {
    const walletDir = path.resolve(walletPath, network, name);

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
    let draftTx = buildTransaction('allegra-era', 0, 0, toAddress, amount, changes[0].address, draftTxIns, null, txDraftPath)
    await cli(draftTx);

    //get protocol parameters
    const protocolParamsPath = path.resolve(walletPath, network, protocolParamsFile);
    const protocolParams = await getProtocolParams(network);
    fs.writeFileSync(
        protocolParamsPath, 
        Buffer.from(JSON.stringify(protocolParams)));

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

export async function sendTransaction(network, name, amount, toAddress, passphrase, metadataPath) {
    const walletDir = path.resolve(walletPath, network, name);

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
        let draftTx = buildTransaction('allegra-era', 0, 0, toAddress, amount, changes[0].address, draftTxIns, metadataPath, txDraftPath)
        await cli(draftTx);

        //get protocol parameters
        const protocolParamsPath = path.resolve(walletPath, network, protocolParamsFile);
        const protocolParams = await getProtocolParams(network);
        fs.writeFileSync(
            protocolParamsPath, 
            Buffer.from(JSON.stringify(protocolParams)));

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
        let rawTx = buildTransaction('allegra-era', fee, ttl, toAddress, amount, changes[0].address, rawTxIns, metadataPath, txRawPath)
        await cli(rawTx);

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
    const walletDir = path.resolve(walletPath, network, name);

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
            inputFound.forEach(i => inputSum += i.value);
            let outputSum = 0;
            outputFound.forEach(i => outputSum += i.value);
            
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