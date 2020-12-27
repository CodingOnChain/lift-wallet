const { spawn } = require("child_process")
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require("path")
import axios from 'axios'

const isDevelopment = process.env.NODE_ENV !== 'production'
const baseUrl = 'http://localhost:8090'

export const cardanoPath = isDevelopment ? path.resolve(__dirname, '..', 'cardano') 
: (process.platform == 'darwin') 
    ? path.resolve(__dirname, '..', '..', 'cardano')
    : '';
export const dbPath = path.resolve(cardanoPath, 'db');
export const walletDbPath = path.resolve(cardanoPath, 'wallets');
export const socketPath = (process.platform == 'win32') ? '\\\\.\\pipe\\cardano-node-mainnet' : path.resolve(cardanoPath, 'socket');
export const configPath = path.resolve(cardanoPath, 'configs');
export const topolgoyFile = path.resolve(configPath, 'mainnet-topology.json');
export const configFile = path.resolve(configPath, 'mainnet-config.json');

export const cardanoNodeOptions = [
    '--port', '6000',
    '--database-path', dbPath,
    '--socket-path', socketPath,
    '--config', configFile,
    '--topology', topolgoyFile
]

export const walletServeEnvs = { 
    env: { ...process.env, CARDANO_NODE_SOCKET_PATH: socketPath } 
}

export const walletServeOptions = [
    '--mainnet',
    '--node-socket', socketPath,
    '--database', walletDbPath,
    '--pool-metadata-fetching', 'https://smash.cardano-mainnet.iohk.io',
    '--log-level', 'ERROR'
]

export async function getNetworkInfo() {
    try {
        return await axios.get(`${baseUrl}/v2/network/information`, { timeout: 10000 })
    }catch(err){
        return null
    }
}

export async function getPhrase() {
    try {
        const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
        console.info(addressCli)
        const { stdout, stderr } = await exec(`${addressCli} recovery-phrase generate`)
        console.info(stdout)
        console.info(stderr)
        if(stderr) return { error: stderr, phrase: null };
        return { error: null, phrase: stdout };
    }catch(e) {
        console.error(e);
        return { error: e, phrase: null };
    }
}

export async function createWallet(name, mnemonic, passphrase) {
    try {
        const mnemonicList = mnemonic.split(" ");
        var result = await axios.post(
            `${baseUrl}/v2/wallets`, 
            {
                "name": name,
                "mnemonic_sentence": mnemonicList,
                "passphrase": passphrase,
                "address_pool_gap": 20
            }, 
            { timeout: 10000 });
        return result.data;
    }catch(err){
        return err.response.data
    }
}

export async function getWallets() {
    try {
        var result = await axios.get(`${baseUrl}/v2/wallets`, { timeout: 10000 })
        return result.data;
    }catch(err){
        return err.response.data
    }
}

export async function getWallet(walletId) {
    try {
        var result = await axios.get(`${baseUrl}/v2/wallets/${walletId}`, { timeout: 10000 })
        return result.data;
    }catch(err){
        return err.response.data
    }
}

export async function getAddresses(walletId) {
    try {
        var result = await axios.get(`${baseUrl}/v2/wallets/${walletId}/addresses`, { timeout: 10000 })
        return result.data;
    }catch(err){
        return err.response.data
    }
}

export async function validateAddress(addressId) {
    try {
        var result = await axios.get(`${baseUrl}/v2/addresses/${addressId}`, { timeout: 10000 })
        if(result.status != 200)
            return null;
        return result.data;
    }catch(err){
        return err.response.data
    }
}

export async function getTransactions(walletId) {
    try {
        var result = await axios.get(`${baseUrl}/v2/wallets/${walletId}/transactions`, { timeout: 10000 })
        return result.data;
    }catch(err){
        return err.response.data
    }
}

export async function createTransactions(walletId, transaction) {
    try {
        var result = await axios.post(
            `${baseUrl}/v2/wallets/${walletId}/transactions`, 
            transaction, 
            { timeout: 10000 })
        return result.data;
    }catch(err){
        return err.response.data;
    }
}

export async function getTransactionFee(walletId, transaction) {
    try {
        var result = await axios.post(
            `${baseUrl}/v2/wallets/${walletId}/payment-fees`, 
            transaction, 
            { timeout: 10000 })
        return result.data;
    }catch(err){
        return err.response.data;
    }
}

export async function getPools() {
    try {
        var result = await axios.get(`${baseUrl}/v2/stake-pools`, { timeout: 10000 })
        return result.data;
    }catch(err){
        return err.response.data
    }
}

export async function delegateToPool(walletId, stakePoolId, passphrase) {
    try {
        var result = await axios.put(
            `${baseUrl}/v2/stake-pools/${stakePoolId}/wallets/${walletId}`, 
            {
                "passphrase": passphrase
            }, 
            { timeout: 10000 })
        return result.data;
    }catch(err){
        return err.response.data
    }
}



///Example of how to break base64 into segments
/*
let ballot = 'ewogICJCYWxsb3RJZCI6ICIzOWYyN2ZkNy0wOTMyLTRiZjktOWYzNy1mZjA0MmRjZjljMzMiLAogICJBdXRob3JJZCI6ICIzOWYyN2ZkNy0wOTMyLTRiZjktOWYzNy1mZjA0MmRjZjljMzMiLAogICJOYW1lIjogIlNvbWUgYXdlc29tZSBuYW1lIGZvciB0aGUgYmFsbG90IiwKICAiRXhwaXJhdGlvbiI6ICIyMDIxLTAxLTAxIiwKICAiUXVlc3Rpb25zIjogWwogICAgewogICAgICAiUXVlc3Rpb24iOiAiV2hhdCBpcyBzb21ldGhpbmcgdHJ1bHkgYXdlc29tZT8iLAogICAgICAiVHlwZSI6ICJTaW5nbGUiLAogICAgICAiRGlzcGxheU9yZGVyIjogMCwKICAgICAgIkNob2ljZXMiOiBbCiAgICAgICAgewogICAgICAgICAgIkNob2ljZSI6ICJDaG9pY2UgMSIsCiAgICAgICAgICAiRGlzcGxheU9yZGVyIjogMAogICAgICAgIH0sCiAgICAgICAgewogICAgICAgICAgIkNob2ljZSI6ICJDaG9pY2UgMSIsCiAgICAgICAgICAiRGlzcGxheU9yZGVyIjogMAogICAgICAgIH0sCiAgICAgICAgewogICAgICAgICAgIkNob2ljZSI6ICJDaG9pY2UgMSIsCiAgICAgICAgICAiRGlzcGxheU9yZGVyIjogMAogICAgICAgIH0gIAogICAgICBdCiAgICB9LAogICAgewogICAgICAiUXVlc3Rpb24iOiAiV2hhdCBpcyBzb21ldGhpbmcgdHJ1bHkgYXdlc29tZT8iLAogICAgICAiVHlwZSI6ICJTaW5nbGUiLAogICAgICAiRGlzcGxheU9yZGVyIjogMCwKICAgICAgIkNob2ljZXMiOiBbCiAgICAgICAgewogICAgICAgICAgIkNob2ljZSI6ICJDaG9pY2UgMSIsCiAgICAgICAgICAiRGlzcGxheU9yZGVyIjogMAogICAgICAgIH0sCiAgICAgICAgewogICAgICAgICAgIkNob2ljZSI6ICJDaG9pY2UgMSIsCiAgICAgICAgICAiRGlzcGxheU9yZGVyIjogMAogICAgICAgIH0sCiAgICAgICAgewogICAgICAgICAgIkNob2ljZSI6ICJDaG9pY2UgMSIsCiAgICAgICAgICAiRGlzcGxheU9yZGVyIjogMAogICAgICAgIH0gIAogICAgICBdCiAgICB9LAogICAgewogICAgICAiUXVlc3Rpb24iOiAiV2hhdCBpcyBzb21ldGhpbmcgdHJ1bHkgYXdlc29tZT8iLAogICAgICAiVHlwZSI6ICJTaW5nbGUiLAogICAgICAiRGlzcGxheU9yZGVyIjogMCwKICAgICAgIkNob2ljZXMiOiBbCiAgICAgICAgewogICAgICAgICAgIkNob2ljZSI6ICJDaG9pY2UgMSIsCiAgICAgICAgICAiRGlzcGxheU9yZGVyIjogMAogICAgICAgIH0sCiAgICAgICAgewogICAgICAgICAgIkNob2ljZSI6ICJDaG9pY2UgMSIsCiAgICAgICAgICAiRGlzcGxheU9yZGVyIjogMAogICAgICAgIH0sCiAgICAgICAgewogICAgICAgICAgIkNob2ljZSI6ICJDaG9pY2UgMSIsCiAgICAgICAgICAiRGlzcGxheU9yZGVyIjogMAogICAgICAgIH0gIAogICAgICBdCiAgICB9CiAgXQp9'

let ballotSeg = ballot.match(/.{1,60}/g);
let metadata = {"list":[]}

ballotSeg.forEach((o,i) => {
	metadata["list"].push(o)
})

console.log(metadata);
*/