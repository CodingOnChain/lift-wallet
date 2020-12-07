const { spawn } = require("child_process")
const path = require("path")
import axios from 'axios'
const isDevelopment = process.env.NODE_ENV !== 'production'

export const cardanoPath = isDevelopment ? path.resolve(__dirname, '..', 'cardano') : '';
export const dbPath = isDevelopment ? path.resolve(cardanoPath, 'db') : '';
export const walletDbPath = isDevelopment ? path.resolve(cardanoPath, 'wallets') : '';
export const socketPath = isDevelopment ? (process.platform == 'win32') ? '\\\\.\\pipe\\cardano-node-mainnet' : path.resolve(cardanoPath, 'socket') : '';
export const configPath = isDevelopment ? path.resolve(cardanoPath, 'configs') : '';
export const topolgoyFile = isDevelopment ? path.resolve(configPath, 'mainnet-topology.json') : '';
export const configFile = isDevelopment ? path.resolve(configPath, (process.platform == 'win32') ? 'mainnet-config-win32.json' : 'mainnet-config.json') : '';

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
    '--log-level', 'WARNING'
]

export async function getNetworkInfo() {
    try {
        return await axios.get('http://localhost:8090/v2/network/information', { timeout: 10000 })
    }catch(err){
        return null
    }
}