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
        txIn.push(` --tx-in ${u.txHash}#${u.index}`);
        if(totalUsed >= amount + fee)
            break;
    }
    txIn;
}

export function buildTransaction(era, fee, ttl, toAddress, amount, changeAddress, txIns, outputFile){
    let tx = `cardano-cli transaction build-raw --${era} --fee ${fee} --ttl ${ttl}`;
    let totalUsed = 0;
    for(let txIn of txIns)
    {
        tx += txIn;
    }
    tx += ` --tx-out ${toAddress}+${amount}`;
    tx += ` --tx-out ${changeAddress}+${totalUsed - amount - fee}`;
    tx += ` --out-file ${outputFile}`;
    return tx;
}

export function calculateMinFee(txBody, utxoInCount, utxoOutCount, witness, byronWitness, protocolParamsFile) {
    let txFee = 'cardano-cli transaction calculate-min-fee';
    txFee += ` --tx-body-file ${txBody}`;
    txFee += ` --tx-in-count ${utxoInCount}`;
    txFee += ` --tx-out-count ${utxoOutCount}`;
    txFee += ` --witness-count ${witness}`;
    txFee += ` --byron-witness-count ${byronWitness}`;
    txFee += ` --protocol-params-file ${protocolParamsFile}`;
    return txFee;
}

export function signTransaction(network, magic, paymentSigningFile, changeSigningFile, rawTxBody, signTxFile) {
    //sign the transaction
    let txSign = 'cardano-cli transaction sign';
    txSign += ` --${network}`;
    if(magic != null) txSign += ` ${magic}`;
    txSign += ` --signing-key-file ${paymentSigningFile}`;
    txSign += ` --signing-key-file ${changeSigningFile}`;
    txSign += ` --tx-body-file ${rawTxBody}`;
    txSign += ` --out-file ${signTxFile}`;
    return txSign;
}