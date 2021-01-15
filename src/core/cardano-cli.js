import path from 'path'

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
        txIn.push({ txHash: u.txHash, index: u.index, value: u.value });
        if(totalUsed >= amount + fee)
            break;
    }
    return txIn;
}

export function buildTransaction(era, fee, ttl, toAddress, amount, changeAddress, txIns, outputFile){
    let tx = `cardano-cli transaction build-raw --${era} --fee ${parseInt(fee)} --ttl ${parseInt(ttl)}`;
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
    tx += ` --out-file "${outputFile}"`;
    return tx;
}

export function calculateMinFee(txBody, utxoInCount, utxoOutCount, witness, byronWitness, protocolParamsFile) {
    let txFee = 'cardano-cli transaction calculate-min-fee';
    txFee += ` --tx-body-file "${txBody}"`;
    txFee += ` --tx-in-count ${utxoInCount}`;
    txFee += ` --tx-out-count ${utxoOutCount}`;
    txFee += ` --witness-count ${witness}`;
    txFee += ` --byron-witness-count ${byronWitness}`;
    txFee += ` --protocol-params-file ${protocolParamsFile}`;
    return txFee;
}

export function signTransaction(network, magic, paymentSigningFile, changeSigningFile, rawTxBody, signTxFile) {
    //sign the transaction
    if(network == 'testnet') network = 'testnet-magic';

    let txSign = 'cardano-cli transaction sign';
    txSign += ` --${network}`;
    if(magic != null) txSign += ` ${magic}`;
    txSign += ` --signing-key-file "${paymentSigningFile}"`;
    txSign += ` --signing-key-file "${changeSigningFile}"`;
    txSign += ` --tx-body-file "${rawTxBody}"`;
    txSign += ` --out-file "${signTxFile}"`;
    return txSign;
}