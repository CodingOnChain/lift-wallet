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
    console.log(walletPath);
    const walletDir = path.resolve(walletPath, network, name);
    if(fs.existsSync(walletDir)) throw "Wallet already exists";

    //root key
    const { rootKey, rootKeyErr } = await cmd(getRootCmd(mnemonic));
    if(rootKeyErr) throw rootKeyErr;
    
    //account private
    const { accountPrv, accountPrvErr } = await cmd(getChildCmd(rootKey, "1852H/1815H/0H"));
    if(accountPrvErr) throw accountPrvErr;
    
    //account public
    const { accountPub, accountPubErr } = await cmd(getPublicCmd(accountPrv));
    if(accountPubErr) throw accountPubErr;
    
    //stake public
    const { stakePub, stakePubErr } = await cmd(getChildCmd(accountPub, "2/0"));
    if(stakePubErr) throw stakePubErr;

    const addresses = [];
    for(let i = 0; i < 20; i++) {
        //public payment key 
        const { paymentPub, paymentPubErr } = await cmd(getChildCmd(accountPub, `0/${i}`));
        if(paymentPubErr) throw paymentPubErr;

        //enterprise address
        const { baseAddr, baseAddrErr } = await cmd(getBaseAddrCmd(paymentPub, network));
        if(baseAddrErr) throw baseAddrErr;

        //enterprise address
        const { paymentAddr, paymentAddrErr } = await cmd(getPaymentAddrCmd(baseAddr, stakePub));
        if(paymentAddrErr) throw paymentAddrErr;

        addresses.push({ index: i, address: paymentAddr });
    }
    
    //keys/addresses to save
    //account prv (encrypted)
    //account pub
    //10 - payment addresses
    fs.mkdirSync(walletDir);
    fs.writeFileSync(path.resolve(walletDir, accountPrvFile), accountPrv);
    fs.writeFileSync(path.resolve(walletDir, accountPubFile), accountPub);
    encrypt(
        path.resolve(walletDir, accountPrvFile), 
        path.resolve(walletDir, accountPubFile),
        passphrase);
    fs.writeFileSync(path.resolve(walletDir, addressFile), addresses);
}

export async function getWallets(network) {
    const networkPath = path.resolve(walletPath, network);
    const walletDirs = getDirectories(networkPath);
    const wallets = [];
    walletDirs.forEach(async w => {
        wallets.push({
            name: w,
            balance: await getBalance(network, w)
        });
    })

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

function getTotalUtxoBalance(utxos) {
    let total = 0;
    utxos.forEach(o => total += parseInt(o.value))
    return total;
}

function getDirectories (source) {
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}