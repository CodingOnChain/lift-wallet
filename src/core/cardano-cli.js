import path from 'path'
import { cli } from './common.js';
import fs from 'fs'

const isDevelopment = process.env.NODE_ENV !== 'production'

export const cardanoPath = isDevelopment 
    ? path.resolve(__dirname, '..', 'cardano') 
    : path.resolve(__dirname, '..', '..', 'cardano');

export function buildTxIn(addressUtxos, amount, fee) {
    let txIn = [];
    let totalUsed = 0;
    for(let u of addressUtxos)
    {
        totalUsed += parseInt(u.value);
        txIn.push(u);
        if(totalUsed >= parseInt(amount) + parseInt(fee))
            break;
    }
    return txIn;
}

export function buildTransaction(era, fee, ttl, toAddress, amount, changeAddress, txIns, metadataPath, outputFile){
    const cardanoCli = path.resolve('.', cardanoPath, process.platform, 'cardano-cli');
    let tx = `"${cardanoCli}" transaction build-raw --${era} --fee ${parseInt(fee)} --ttl ${parseInt(ttl)}`;
    let totalUsed = 0;
    for(let txIn of txIns)
    {
        totalUsed += parseInt(txIn.value)
        tx += ` --tx-in ${txIn.txHash}#${txIn.index}`;
    }
    tx += ` --tx-out ${toAddress}+${parseInt(amount)}`;
    let change = parseInt(totalUsed) - parseInt(amount) - parseInt(fee);
    if(change < 0) change = 0;
    tx += ` --tx-out ${changeAddress}+${change}`;
    if(metadataPath != null) tx += ` --metadata-json-file "${metadataPath}"`;
    
    tx += ` --out-file "${outputFile}"`;
    return tx;
}

export function getAddressKeyHash(verificationKeyPath) {

    const cardanoCli = path.resolve('.', cardanoPath, process.platform, 'cardano-cli');

    let cmd = `${cardanoCli}`;
    cmd += ` address key-hash`;
    cmd += ` --payment-verification-key-file "${verificationKeyPath}"`;

    return cmd;

}

export async function createMonetaryPolicy(assetDir, verificationKeyPath) {

    const cardanoCli = path.resolve('.', cardanoPath, process.platform, 'cardano-cli');

    const policyVkeyPath = path.resolve(assetDir, 'policy.vkey');
    const policySkeyPath = path.resolve(assetDir, 'policy.skey');
    const policyScriptPath = path.resolve(assetDir, 'policyScript.json');

    const keyHashCmd = getAddressKeyHash(verificationKeyPath);
    const keyHashCmdOutput = await cli(keyHashCmd);;
    const keyHash = keyHashCmdOutput.stdout.replace(/[\n\r]/g, '');

    const policyScript = `{
        "keyHash": "${keyHash}",
        "type": "sig"
    }`;

    fs.writeFileSync(policyScriptPath, policyScript);

    let cmd = `${cardanoCli}`;
    cmd += ` address key-gen`;
    cmd += ` --verification-key-file "${policyVkeyPath}"`;
    cmd += ` --signing-key-file "${policySkeyPath}"`;

    return cmd;

}

export function getPolicyId(assetDir) {

    const cardanoCli = path.resolve('.', cardanoPath, process.platform, 'cardano-cli');
    
    let cmd = `${cardanoCli}`
    cmd += ` transaction policyid`;
    cmd += ` --script-file "${assetDir}/policyScript.json"`;

    return cmd;

}

export function buildMintTransaction(era, fee, ttl, toAddress, assetId, assetName, mintAmount, txIns, metadataPath, outputFile){

    const cardanoCli = path.resolve('.', cardanoPath, process.platform, 'cardano-cli');

    let tx = `"${cardanoCli}" transaction build-raw --${era} --fee ${parseInt(fee)} --ttl ${parseInt(ttl)}`;
    let totalValue = 0;
    for(let txIn of txIns)
    {
        totalValue += parseInt(txIn.value)
        tx += ` --tx-in ${txIn.txHash}#${txIn.index}`;
    }
    let ownOutput = parseInt(totalValue) - parseInt(fee);

    // TODO: get full balance
    tx += ` --tx-out "${toAddress}+${ownOutput} lovelace+${mintAmount} ${assetId}.${assetName}"`;
    tx += ` --mint="${mintAmount} ${assetId}.${assetName}"`;
    if(metadataPath != null) tx += ` --metadata-json-file "${metadataPath}"`;
    tx += ` --out-file "${outputFile}"`;
    return tx;
}

export function calculateMinFee(txBody, utxoInCount, utxoOutCount, witness, byronWitness, protocolParamsFile) {
    const cardanoCli = path.resolve('.', cardanoPath, process.platform, 'cardano-cli');
    let txFee = `"${cardanoCli}" transaction calculate-min-fee`;
    txFee += ` --tx-body-file "${txBody}"`;
    txFee += ` --tx-in-count ${utxoInCount}`;
    txFee += ` --tx-out-count ${utxoOutCount}`;
    txFee += ` --witness-count ${witness}`;
    txFee += ` --byron-witness-count ${byronWitness}`;
    txFee += ` --protocol-params-file "${protocolParamsFile}"`;
    return txFee;
}

export function signTransaction(network, magic, signingKeyPaths, rawTxBody, signTxFile, policyScriptPath,  policySkeyPath) {
    const cardanoCli = path.resolve('.', cardanoPath, process.platform, 'cardano-cli');
    
    if(network == 'testnet') network = 'testnet-magic';

    let txSign = `"${cardanoCli}" transaction sign`;
    txSign += ` --${network}`;
    if(magic != null) txSign += ` ${magic}`;

    signingKeyPaths.forEach(sk => {
        txSign += ` --signing-key-file "${sk}"`;
    })
    if(policySkeyPath != null) txSign += ` --signing-key-file "${policySkeyPath}"`;
    if(policyScriptPath != null) txSign += ` --script-file "${policyScriptPath}"`;
    
    txSign += ` --tx-body-file "${rawTxBody}"`;
    txSign += ` --out-file "${signTxFile}"`;
    return txSign;
}

export function createPaymentVerificationKey(paymentSigningFile, extendedVerificationKeyFile) {
    const cardanoCli = path.resolve('.', cardanoPath, process.platform, 'cardano-cli');
    // build evkey+vkey
    let cmd = `${cardanoCli} key verification-key`
    cmd += ` --signing-key-file "${paymentSigningFile}"`;
    cmd += ` --verification-key-file "${extendedVerificationKeyFile}"`;

    return cmd
}

export function createExtendedVerificationKey(extendedVerificationKeyFile, verificationKeyFile) {
    const cardanoCli = path.resolve('.', cardanoPath, process.platform, 'cardano-cli');
    var cmd = `${cardanoCli} key non-extended-key`;
    cmd += ` --extended-verification-key-file "${extendedVerificationKeyFile}"`;
    cmd += ` --verification-key-file "${verificationKeyFile}"`;

    return cmd
}
