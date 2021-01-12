import { encrypt } from '../core/common';
import { 
    getMnemonicCmd,
    getRootCmd,
    getPublicCmd,
    getChildCmd,
    getBaseAddrCmd,
    getPaymentAddrCmd } from '../core/cardano-addresses.js';
import { getUtxos } from '../core/dandelion.js'
import util from 'util';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process'

const cmd = util.promisify(exec);

const walletPath = path.resolve(__dirname, '..', 'cardano', 'wallets');

const accountPrvFile = 'account.xprv';
const accountPubFile = 'account.xpub';
const addressFile = 'payment.addr';
const changeFile = 'change.addr';
const draftTxFile = 'draft.tx';
const rawTxFile = 'raw.tx';
const signedTxFile = 'signed.tx';
const txBinaryFile = 'binary.tx';

export async function setupWalletDir() {
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
    fs.writeFileSync(path.resolve(walletDir, accountPrvFile), accountPrv.stdout);
    fs.writeFileSync(path.resolve(walletDir, accountPubFile), accountPub.stdout);
    encrypt(
        path.resolve(walletDir, accountPrvFile), 
        path.resolve(walletDir, accountPubFile),
        passphrase);
    fs.writeFileSync(path.resolve(walletDir, addressFile), JSON.stringify(addresses));
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
    return JSON.parse(fs.readFileSync(path.resolve(walletDir, addressFile)))
}

export async function getBalance(network, name) {
    const walletDir = path.resolve(walletPath, network, name);
    const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, addressFile)))
    const addressUtxos = await getUtxos(network, addresses.map((a) => a.address));
    return getTotalUtxoBalance(addressUtxos);
}

export async function getFee() {

}

export async function getTransactions(network, name, amount, toAddress) {
    const walletDir = path.resolve(walletPath, network, name);
    const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, addressFile)))
    const addressUtxos = await getUtxos(network, addresses.map((a) => a.address));

    const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))
//this goes in cardano-cli.js
    let txDraft = 'cardano-cli transaction build-raw --allegra-era --fee 0 --ttl 0';
    let totalUsed = 0;
    let utxoInCount = 0;
    for(let u of addressUtxos)
    {
        totalUsed += parseInt(u.value);
        txDraft += ` --tx-in ${u.txHash}#${u.index}`
        utxoInCount++;
        if(totalUsed >= amount)
            break;
    }
    txDraft += ` --tx-out ${toAddress}+${amount}`;
    txDraft += ` --tx-out ${changes[0].address}+${totalUsed - amount}`;
    txDraft += ` --out-file ${draftTxFile}`;
    await cmd(txDraft);
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