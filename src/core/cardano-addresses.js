import { cli } from '../core/common.js'
import path from 'path'

const isDevelopment = process.env.NODE_ENV !== 'production'

export const cardanoPath = isDevelopment 
    ? path.resolve(__dirname, '..', '..', 'cardano') 
    : path.resolve(__dirname, '..', '..', '..', 'cardano') ;

export function getMnemonicCmd(size){
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    return `${addressCli} recovery-phrase generate --size ${size}`;
}

export function getRootCmd(mnemonic) {
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    return `"${mnemonic}" | ${addressCli} key from-recovery-phrase Shelley`;
}

export function getChildCmd(stdIn, derivation) {
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    return `"${stdIn}" | cardano-address key child ${derivation}`;
}

export function getPublicCmd(prvKey) {
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    return `"${prvKey}" | cardano-address key public --with-chain-code`;
}

export function getBaseAddrCmd(pubKey, network){
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    return `"${pubKey}" | cardano-address address payment --network-tag ${network}`;
}

export function getPaymentAddrCmd(baseAddr, stakePub){
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    return `"${baseAddr}" | cardano-address address delegation "${stakePub}"`;
}