import { cli, decrypt, encrypt, hex_to_ascii, getBufferHexFromFile } from '../core/common';
import { 
    getMnemonicCmd,
    getRootCmd,
    getPublicCmd,
    getChildCmd,
    getBaseAddrCmd,
    getPaymentAddrCmd } from '../core/cardano-addresses.js';
import { 
    buildTransaction, 
    buildMintTransaction,
    calculateMinFee,
    createVerificationKey,
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


const draftTxFile = 'draft.tx';
const rawTxFile = 'raw.tx';
const signedTxFile = 'signed.tx';

const accountPrvFile = 'account.xprv';
const accountPubFile = 'account.xpub';
const paymentFile = 'payment.addr';
const changeFile = 'change.addr';
const protocolParamsFile = 'protocolParams.json';

export async function calcFee(network, era, walletDir, amount, sendAll, receivingAddress, metadataPath) {
    //tx/key file paths
    const txDraftPath = path.resolve(walletDir, draftTxFile);

    //gather payment/change addresses for utxos
    const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
    const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))

    //UTxOs
    const utxos = await getUtxos(
        network, 
        [...addresses.map((a) => a.address), ...changes.map((a) => a.address)]);

    //get draft tx-ins
    let draftTxIns = buildTxIn(utxos, amount, 0);

    //build draft transaction
    let draftTx = buildTransaction(era, 0, 0, receivingAddress, amount, changes[0].address, draftTxIns, metadataPath, txDraftPath, sendAll)
    await cli(draftTx);

    //get protocol parameters
    const protocolParamsPath = await refreshProtocolParametersFile(network)

    //calculate fees
    const calculateFee = calculateMinFee(txDraftPath, utxos.length, 2, 1, 0, protocolParamsPath);
    const feeResult = await cli(calculateFee);
    //originally tried to just calculate the fee locally
    //  but had issues when trying to use multiple --tx-in
    //minFeeA * txSize + minFeeB
    //note the output of the 'calculate-min-fee' is: 'XXXX Lovelace' 
    //  this is why i split and take index 0
    return feeResult.stdout.split(' ')[0];
}

export async function sendFunds(network, era, walletDir, amount, sendAll, receivingAddress, passphrase, metadataPath) {
    const txDraftPath = path.resolve(walletDir, draftTxFile);
    const txRawPath = path.resolve(walletDir, rawTxFile);
    const txSignedPath = path.resolve(walletDir, signedTxFile);

    //gather payment/change addresses for utxos
    const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
    const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))

    //refresh protocol parameters
    const protocolParamsPath = await refreshProtocolParametersFile(network);

    //UTxOs
    const utxos = await getUtxos(
        network, 
        [...addresses.map((a) => a.address), ...changes.map((a) => a.address)]);

    //get draft tx-ins
    let draftTxIns = buildTxIn(utxos, amount, 0);

    //build draft transaction
    let draftTx = buildTransaction(era, 0, 0, receivingAddress, amount, changes[0].address, draftTxIns, metadataPath, txDraftPath, sendAll)
    await cli(draftTx);

    //calculate fees
    const calculateFee = calculateMinFee(txDraftPath, utxos.length, 2, 1, 0, protocolParamsPath);
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
    let rawTxIns = buildTxIn(utxos, amount, fee);

    //build raw transaction
    let rawTx = buildTransaction(era, fee, ttl, receivingAddress, amount, changes[0].address, rawTxIns, metadataPath, txRawPath, sendAll)
    await cli(rawTx);

    let signingKeyPaths = await getSigningKeys(draftTxIns, passphrase, walletDir, addresses, changes);

    const signedTx = signTransaction(network, 1097911063, signingKeyPaths, txRawPath, txSignedPath);
    await cli(signedTx);

    signingKeyPaths.forEach(sk => {
        if(fs.existsSync(sk)) fs.unlinkSync(sk);
    })

    return JSON.parse(fs.readFileSync(txSignedPath));
}

export async function createAsset(network, era, walletDir, currentBalance, policySkeyPath, policyScriptPath, assetName, tokenAmount, metadataPath, passphrase) {
    const txDraftPath = path.resolve(walletDir, draftTxFile);
    const txRawPath = path.resolve(walletDir, rawTxFile);
    const txSignedPath = path.resolve(walletDir, signedTxFile);
    
    //Step 2) Get Protocol Params
    const protocolParamsPath = await refreshProtocolParametersFile(network);

    //Step 3) Get UTXOs
    const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)));
    const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))
    const utxos = await getUtxos(
        network, 
        [...addresses.map((a) => a.address), ...changes.map((a) => a.address)]);
    //TODO: pass in address to send
    const tokenDestinationAddress = addresses[0].address;

    //Step 4) Build Draft Tx
    let draftTxIns = buildTxIn(utxos, currentBalance, 0);
    const assetIdCmdOutput = await cli(getPolicyId(policyScriptPath));
    const assetId = assetIdCmdOutput.stdout.replace(/[\n\r]/g, '')
    
    let draftTx = buildMintTransaction(era, 0, 0, tokenDestinationAddress, assetId, assetName, tokenAmount, draftTxIns, metadataPath, txDraftPath);
    await cli(draftTx);

    ////Step 5) Calculute Fees
    const calculateFee = calculateMinFee(txDraftPath, utxos.length, 2, 1, 0, protocolParamsPath);
    const feeResult = await cli(calculateFee);
    const fee = feeResult.stdout.split(' ')[0];

    //Step 6) Build Raw Tx
    const slotNo = await getCurrentSlotNo(network);
    const ttl = slotNo + 1000;
    let rawTx = buildMintTransaction(era, fee, ttl, tokenDestinationAddress, assetId, assetName, tokenAmount, draftTxIns, metadataPath, txRawPath);
    await cli(rawTx);

    const signingKeyPaths = await getSigningKeys(draftTxIns, passphrase, walletDir, addresses, changes);

    //Step 7) Sign Tx
    const signedTx = signTransaction(network, 1097911063, signingKeyPaths, txRawPath, txSignedPath, policyScriptPath, policySkeyPath);
    await cli(signedTx);

    signingKeyPaths.forEach(sk => {
        if(fs.existsSync(sk)) fs.unlinkSync(sk);
    })

    return JSON.parse(fs.readFileSync(txSignedPath));
}

export function cleanUpFiles(walletDir){

    const txDraftPath = path.resolve(walletDir, draftTxFile);
    const txRawPath = path.resolve(walletDir, rawTxFile);
    const txSignedPath = path.resolve(walletDir, signedTxFile);

    //clean up
    if(fs.existsSync(txDraftPath)) fs.unlinkSync(txDraftPath);
    if(fs.existsSync(txRawPath)) fs.unlinkSync(txRawPath);
    if(fs.existsSync(txSignedPath)) fs.unlinkSync(txSignedPath);
}


async function getSigningKeys(draftTxIns, passphrase, walletDir, addresses, changes){
    var signingKeyPaths = [];
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
    return signingKeyPaths; 
}

function buildTxOut(bundle, fee) {

}

function buildTxIn(utxos, amount, fee) {
    let txIn = [];
    let totalUsed = 0;
    for(let u of utxos)
    {
        u.assets = [];
        totalUsed += parseInt(u.value);
        u.assets.push({ quantity: parseInt(u.value), assetName: 'lovelace' });
        
        for(let t of u.tokens) 
        {
            u.assets.push({ 
                quantity: parseInt(t.quantity),
                assetName: `${t.policyId}.${hex_to_ascii(t.assetName)}`
            });
        }

        txIn.push(u);
        if(totalUsed >= parseInt(amount) + parseInt(fee))
            break;
    }

    return txIn;
}

async function refreshProtocolParametersFile(network) {

    const protocolParamsPath = path.resolve(walletsPath, network, protocolParamsFile);
    const protocolParams = await getProtocolParams(network);
    fs.writeFileSync(
        protocolParamsPath,
        Buffer.from(JSON.stringify(protocolParams)));

    return protocolParamsPath

}