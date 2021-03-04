import path from 'path'
import { cli, hex_to_ascii } from './common.js';
import fs from 'fs'



const isDevelopment = process.env.NODE_ENV !== 'production'

export const cardanoPath = isDevelopment 
    ? path.resolve(__dirname, '..', 'cardano') 
    : path.resolve(__dirname, '..', '..', 'cardano');

export const cardanoPlatformPath = process.platform === 'darwin' ? 'macos64':
    process.platform === 'win32' ? 'win64':
    process.platform === 'linux' ? 'linux64': 
    process.platform;

export function buildTransaction(era, fee, ttl, toAddress, amount, changeAddress, txIns, metadataPath, outputFile, isSendAll, delegationCertPath){
    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');
    let tx = `"${cardanoCli}" transaction build-raw --${era} --fee ${parseInt(fee)} --ttl ${parseInt(ttl)}`;
    let totalUsed = 0;

    for(let txIn of txIns)
    {
        totalUsed += parseInt(txIn.value)
        tx += ` --tx-in ${txIn.txHash}#${txIn.index}`;
    }

    

    if (isSendAll) {
      let outputAmount = parseInt(amount) - parseInt(fee);
      tx += ` --tx-out ${toAddress}+${outputAmount}`;
    } else {
      let change = parseInt(totalUsed) - parseInt(amount) - parseInt(fee);
      if(change >0)  tx += ` --tx-out ${changeAddress}+${change}`;
      tx += ` --tx-out ${toAddress}+${parseInt(amount)}`;
    }

    if(metadataPath != null) tx += ` --metadata-json-file "${metadataPath}"`;

    if(delegationCertPath != null) tx += ` --certificate-file "${delegationCertPath}"`;
    
    tx += ` --out-file "${outputFile}"`;
    return tx;
}

export function getAddressKeyHash(verificationKeyPath) {
    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');

    let cmd = `${cardanoCli}`;
    cmd += ` address key-hash`;
    cmd += ` --payment-verification-key-file "${verificationKeyPath}"`;

    return cmd;

}

export function createMonetaryPolicy(keyHash, policyScriptPath, policyVkeyPath, policySkeyPath) {
    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');

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

    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');
    
    let cmd = `${cardanoCli}`
    cmd += ` transaction policyid`;
    cmd += ` --script-file "${assetDir}"`;

    return cmd;

}

export function buildMintTransaction(era, fee, ttl, toAddress, assetId, assetName, mintAmount, txIns, metadataPath, outputFile){

    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');

    let tx = `"${cardanoCli}" transaction build-raw --${era} --fee ${parseInt(fee)} --ttl ${parseInt(ttl)}`;
    let totalValue = 0;
    let totalAssets = [];
    for(let txIn of txIns)
    {
        totalValue += parseInt(txIn.value)
        tx += ` --tx-in ${txIn.txHash}#${txIn.index}`;
        console.log(txIn.assets);
        for(let asset of txIn.assets) {
            //see if we have already added an asset to our total list
            var existingAsset = totalAssets.find(c => c.assetName == asset.assetName);
            //if we haven't add it to the list as the initial value
            if(existingAsset == undefined) {
                totalAssets.push({
                    quantity: parseInt(asset.quantity),
                    assetName: asset.assetName
                });
            }else { //if we have already added the asset, lets just increment the quantity from another UTXO
                existingAsset.quantity += parseInt(asset.quantity);
            }
        }
    }

    tx += ` --tx-out "${toAddress}`
    let mintingTokenExists = false;
    //accommodate X number of assets
    console.log(totalAssets);
    for(let asset of totalAssets) {
        if(asset.assetName == 'lovelace')
            asset.quantity -= parseInt(fee);

        if(asset.assetName == `${assetId}.${assetName}`){
             asset.quantity += parseInt(mintAmount);
             mintingTokenExists = true;
        }

        tx += `+${asset.quantity} ${asset.assetName}`;
    }
    if(!mintingTokenExists)
        tx += `+${mintAmount} ${assetId}.${assetName}"`;
    else 
        tx += '"';

    tx += ` --mint="${mintAmount} ${assetId}.${assetName}"`;
    if(metadataPath != null) tx += ` --metadata-json-file "${metadataPath}"`;
    tx += ` --out-file "${outputFile}"`;

    return tx;
}

export function calculateMinFee(txBody, utxoInCount, utxoOutCount, witness, byronWitness, protocolParamsFile) {
    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');
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
    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');
    
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

export function createExtendedVerificationKey(signingKeyFile, extendedVerificationKeyFile) {
    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');
    // build evkey+vkey
    let cmd = `"${cardanoCli}" key verification-key`
    cmd += ` --signing-key-file "${signingKeyFile}"`;
    cmd += ` --verification-key-file "${extendedVerificationKeyFile}"`;

    return cmd
}

export function createVerificationKey(extendedVerificationKeyFile, verificationKeyFile) {
    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');
    var cmd = `"${cardanoCli}" key non-extended-key`;
    cmd += ` --extended-verification-key-file "${extendedVerificationKeyFile}"`;
    cmd += ` --verification-key-file "${verificationKeyFile}"`;

    return cmd
}

export function createStakeRegistrationCertificate(stakingVerificationKeyFile, stakingCert) {
    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');
    var cmd = `"${cardanoCli}" stake-address registration-certificate`;
    cmd += ` --staking-verification-key-file "${stakingVerificationKeyFile}"`;
    cmd += ` --out-file "${stakingCert}"`;

    return cmd

}

export function createDelegationCert(stakingVerificationKeyFile, poolId, delegationCert) {
    const cardanoCli = path.resolve('.', cardanoPath, cardanoPlatformPath, 'cardano-cli');
    var cmd = `"${cardanoCli}" stake-address delegation-certificate`;
    cmd += ` --staking-verification-key-file "${stakingVerificationKeyFile}"`;
    cmd += ` --stake-pool-id "${poolId}"`;
    cmd += ` --out-file "${delegationCert}"`;

    return cmd

}
