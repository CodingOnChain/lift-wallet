import path from 'path'

const isDevelopment = process.env.NODE_ENV !== 'production'

export const cardanoPath = isDevelopment 
    ? path.resolve(__dirname, '..', 'cardano') 
    : path.resolve(__dirname, '..', '..', 'cardano') ;

export function getMnemonicCmd(size){
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    return `${addressCli} recovery-phrase generate --size ${size}`;
}

export function getRootCmd(mnemonic) {
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    if(process.platform == 'win32')
        return `echo ${mnemonic} | ${addressCli} key from-recovery-phrase Shelley`;
    else
        return `${addressCli} key from-recovery-phrase Shelley < <(echo '${mnemonic}')`;
}

export function getChildCmd(stdIn, derivation) {
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    if(process.platform == 'win32')
        return `echo ${stdIn}| ${addressCli} key child ${derivation}`;
    else
        return `${addressCli} key child ${derivation} < <(echo '${stdIn}')`;
}

export function getPublicCmd(prvKey) {
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    if(process.platform == 'win32')
        return `echo ${prvKey}| ${addressCli} key public --with-chain-code`;
    else
        return `${addressCli} key public --with-chain-code < <(echo '${prvKey}')`;
}

export function getBaseAddrCmd(pubKey, network){
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    if(process.platform == 'win32')
        return `echo ${pubKey}| ${addressCli} address payment --network-tag ${network}`;
    else
        return `${addressCli} address payment --network-tag ${network} < <(echo '${pubKey}')`;
}

export function getPaymentAddrCmd(baseAddr, stakePub){
    const addressCli = path.resolve('.', cardanoPath, process.platform, 'cardano-address');
    if(process.platform == 'win32')
        return `echo ${baseAddr}| ${addressCli} address delegation "${stakePub}"`;
    else
        return `${addressCli} address delegation "${stakePub}" < <(echo '${baseAddr}')`;
}