const { spawn } = require("child_process")
const path = require("path")
const isDevelopment = process.env.NODE_ENV !== 'production'

export const cardanoPath = isDevelopment ? path.resolve(__dirname, '..', 'cardano') : '';
export const dbPath = isDevelopment ? path.resolve(cardanoPath, 'db') : '';
export const walletDbPath = isDevelopment ? path.resolve(cardanoPath, 'wallets') : '';
export const socketPath = isDevelopment ? path.resolve(cardanoPath, 'socket') : '';
export const configPath = isDevelopment ? path.resolve(cardanoPath, 'configs') : '';
export const topolgoyFile = isDevelopment ? path.resolve(configPath, 'mainnet-topology.json') : '';
export const configFile = isDevelopment ? path.resolve(configPath, 'mainnet-config.json') : '';

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
    '--database', walletDbPath
]