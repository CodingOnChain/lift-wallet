import { cli, decrypt, encrypt, getBufferHexFromFile } from '../core/common';
import { 
    calculateMinFee,
    createVerificationKey,
    createExtendedVerificationKey,
    createStakeRegistrationCertificate,
    createDelegationCertificate,
    buildTransaction,
    signTransaction } from '../core/cardano-cli.js';
import { 
    getPublicCmd,
    getChildCmd,
    getStakingAddrCmd } from '../core/cardano-addresses.js';
import { 
    getProtocolParams, 
    getUtxos, 
    getCurrentSlotNo,
    submitTransaction,
    getValidPools,
    getTransactionsByAddresses,
    getTransactionsDetails } from '../core/dandelion.js'
import util from 'util';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process'
import lib from 'cardano-crypto.js'

const cmd = util.promisify(exec);


const isDevelopment = process.env.NODE_ENV !== 'production'
const appPath = path.resolve(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"), 'lift-wallet');

const walletsPath = isDevelopment
    ? path.resolve(__dirname, '..', 'cardano', 'wallets')
    : path.resolve(appPath , 'wallets');

const paymentFile = 'payment.addr';
const changeFile = 'change.addr';
const protocolParamsFile = 'protocolParams.json';
const draftTxFile = 'draft.tx';
const rawTxFile = 'raw.tx';
const signedTxFile = 'signed.tx';
const accountPrvFile = 'account.xprv';
const accountPubFile = 'account.xpub';
const stakeSigningKeyFile = 'stake.skey';
const stakeExtendedVerificationKeyFile = 'stake.evkey';
const stakeVerificationKeyFile = 'stake.vkey';
const stakeRegistrationCertFile = 'stake.cert';
const stakeAddressFile = 'stakingAddresses.addr';
const isRegisteredFile = 'register.0.tx';
const delegationCertFile = 'delegation.cert';

let stakeSKeyPath = null;

export async function getPools(network) {
    return await getValidPools(network);
}

//delegate a wallet a stake pool
export async function delegate(network, walletName, passphrase, poolId) {
    try{
        //1) are we registered
        const walletDir = path.resolve(walletsPath, network, walletName);
        const isRegistered = fs.existsSync(path.resolve(walletDir, isRegisteredFile))
        
        //1b) create stake signing keys
        await createStakeSigningKeys(network, walletName, passphrase);

        if(!isRegistered){

            //1a) create files
            await setupWalletStakingFile(network, walletName);

            //1c) register the certificate
            await registerStakingCert(network, walletName, passphrase);
        }
        
        //3) delegate wallet
        //3a) generate delegation cert
        // TODO: dynamic poolId :)
        const poolId = 'pool1lu369gwp0cprpf5vsfxr0gyguz4lnajj9arnqdn3nu6xq929yqq';
        await createDelegationCert(network, walletName, passphrase, poolId);
        //3b) register delegation cert
        await registerDelegationCert(network, walletName, passphrase);

        //4) clean up
        cleanUpStakeSigningKeys();
    }catch(err) {
        console.log(err);
    }
}

async function createDelegationCert(network, walletName, passphrase, poolId) {

    //get wallet location
    const walletDir = path.resolve(walletsPath, network, walletName);
    
    const delegationCertPath = path.resolve(walletDir, delegationCertFile);
    const stakeVerificationKeyPath = path.resolve(walletDir, stakeVerificationKeyFile);

    let delegCertCmd = createDelegationCertificate(stakeVerificationKeyPath, poolId, delegationCertPath)
    await cli(delegCertCmd);

}

//register your wallet's delegation cert
async function registerDelegationCert(network, walletName, passphrase) {
    //get wallet location
    const walletDir = path.resolve(walletsPath, network, walletName);

    //tx/key file paths
    const delegationCertPath = path.resolve(walletDir, delegationCertFile);
    const txDraftPath = path.resolve(walletDir, draftTxFile);
    const txRawPath = path.resolve(walletDir, rawTxFile);
    const txSignedPath = path.resolve(walletDir, signedTxFile);
    const isRegisteredPath = path.resolve(walletDir, isRegisteredFile);
    const signingKeyPaths = [];

    let result = { transactionId: null, error: null };
    try {
        //gather payment/change addresses for utxos
        const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
        const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))

        //UTxOs
        const addressUtxos = await getUtxos(
            network, 
            [...addresses.map((a) => a.address), ...changes.map((a) => a.address)]);
        let amount = 0;
        addressUtxos.forEach(o => amount += parseInt(o.value));
            
        //refresh protocol parameters
        const protocolParamsPath = await refreshProtocolParametersFile(network);
        const protocolParams = fs.readFileSync(protocolParamsPath).toString();

        //get draft tx-ins
        let draftTxIns = buildTxIn(addressUtxos, amount, 0);

        //build draft transaction
        let draftTx = buildTransaction('mary-era', 0, 0, changes[0].address, amount, changes[0].address, draftTxIns, null, txDraftPath, true, delegationCertPath)
        await cli(draftTx);

        //calculate fees
        const calculateFee = calculateMinFee(txDraftPath, draftTxIns.length, 1, 1, 0, protocolParamsPath);
        const feeResult = await cli(calculateFee);
        //originally tried to just calculate the fee locally
        //  but had issues when trying to use multiple --tx-in
        //minFeeA * txSize + minFeeB
        //note the output of the 'calculate-min-fee' is: 'XXXX Lovelace' 
        //  this is why i split and take index 0
        let fee = parseInt(feeResult.stdout.split(' ')[0]);

        //get current slot no to calculate ttl
        const slotNo = await getCurrentSlotNo(network);
        const ttl = slotNo + 1000;

        //get draft tx-ins
        let rawTxIns = buildTxIn(addressUtxos, amount, fee);

        //build raw transaction
        let rawTx = buildTransaction('mary-era', fee, ttl, changes[0].address, amount, changes[0].address, rawTxIns, null, txRawPath, true, delegationCertPath)
        console.log("=====RAW======");
        console.log(rawTx);
        await cli(rawTx);

        await getSigningKeys(draftTxIns, passphrase, walletDir, signingKeyPaths, addresses, changes);

        signingKeyPaths.push(stakeSKeyPath);
        const signedTx = signTransaction(network, 1097911063, signingKeyPaths, txRawPath, txSignedPath);
        console.log("=====SIGN======");
        console.log(signedTx);
        await cli(signedTx);

        //send transaction 
        //get signed tx binary
        // var dataHex = JSON.parse(fs.readFileSync(txSignedPath)).cborHex
        // var dataBinary = getBinaryFromHexString(dataHex)
        var signedtxContents = JSON.parse(fs.readFileSync(txSignedPath));

        //submit transaction to dandelion
        result.transactionId = await submitTransaction(network, signedtxContents);
        fs.writeFileSync(path.resolve(walletDir, isRegisteredPath), result.transactionId);
    }catch(err) {
        console.error(err);
        if(err.response.data != undefined) {
            console.log(err.response.data);
            result.error = err.response.data;
        }
        else {
            console.log(err);
            result.error = err;
        }
    }

    //clean up
    // if(fs.existsSync(txDraftPath)) fs.unlinkSync(txDraftPath);
    // if(fs.existsSync(txRawPath)) fs.unlinkSync(txRawPath);
    // if(fs.existsSync(txSignedPath)) fs.unlinkSync(txSignedPath);
    
    // signingKeyPaths.forEach(sk => {
    //     if(fs.existsSync(sk)) fs.unlinkSync(sk);
    // })

    return result;
}

//register your wallet's staking cert
async function registerStakingCert(network, walletName, passphrase) {
    //get wallet location
    const walletDir = path.resolve(walletsPath, network, walletName);

    //tx/key file paths
    const stakeRegistrationCertPath = path.resolve(walletDir, stakeRegistrationCertFile);
    const txDraftPath = path.resolve(walletDir, draftTxFile);
    const txRawPath = path.resolve(walletDir, rawTxFile);
    const txSignedPath = path.resolve(walletDir, signedTxFile);
    const isRegisteredPath = path.resolve(walletDir, isRegisteredFile);
    const signingKeyPaths = [];

    let result = { transactionId: null, error: null };
    try {
        //gather payment/change addresses for utxos
        const addresses = JSON.parse(fs.readFileSync(path.resolve(walletDir, paymentFile)))
        const changes = JSON.parse(fs.readFileSync(path.resolve(walletDir, changeFile)))

        //UTxOs
        const addressUtxos = await getUtxos(
            network, 
            [...addresses.map((a) => a.address), ...changes.map((a) => a.address)]);
        let amount = 0;
        addressUtxos.forEach(o => amount += parseInt(o.value));
            
        //refresh protocol parameters
        const protocolParamsPath = await refreshProtocolParametersFile(network);
        const protocolParams = fs.readFileSync(protocolParamsPath).toString();
        const registrationFee = parseInt(JSON.parse(protocolParams)["keyDeposit"]);

        //get draft tx-ins
        let draftTxIns = buildTxIn(addressUtxos, amount, 0);

        //build draft transaction
        let draftTx = buildTransaction('mary-era', 0, 0, changes[0].address, amount, changes[0].address, draftTxIns, null, txDraftPath, true, stakeRegistrationCertPath);
        console.log("=====DRAFT======");
        console.log(draftTx);
        await cli(draftTx);

        await getSigningKeys(draftTxIns, passphrase, walletDir, signingKeyPaths, addresses, changes);
        signingKeyPaths.push(stakeSKeyPath);

        //calculate fees
        const calculateFee = calculateMinFee(txDraftPath, draftTxIns.length, 1, signingKeyPaths.length, 0, protocolParamsPath);
        console.log("=====FEE======");
        console.log(calculateFee);
        const feeResult = await cli(calculateFee);
        //originally tried to just calculate the fee locally
        //  but had issues when trying to use multiple --tx-in
        //minFeeA * txSize + minFeeB
        //note the output of the 'calculate-min-fee' is: 'XXXX Lovelace' 
        //  this is why i split and take index 0
        let fee = parseInt(feeResult.stdout.split(' ')[0]);
        //fee += parseInt(registrationFee);

        //get current slot no to calculate ttl
        const slotNo = await getCurrentSlotNo(network);
        const ttl = slotNo + 1000;

        //get draft tx-ins
        let rawTxIns = buildTxIn(addressUtxos, amount, fee);

        //build raw transaction
        amount = amount - registrationFee;
        let rawTx = buildTransaction('mary-era', fee, ttl, changes[0].address, amount, changes[0].address, rawTxIns, null, txRawPath, true, stakeRegistrationCertPath)
        console.log("=====RAW======");
        console.log(rawTx);
        await cli(rawTx);

        const signedTx = signTransaction(network, 1097911063, signingKeyPaths, txRawPath, txSignedPath);
        await cli(signedTx);

        //send transaction 
        //get signed tx binary
        // var dataHex = JSON.parse(fs.readFileSync(txSignedPath)).cborHex
        // var dataBinary = getBinaryFromHexString(dataHex)
        var signedtxContents = JSON.parse(fs.readFileSync(txSignedPath));

        //submit transaction to dandelion
        result.transactionId = await submitTransaction(network, signedtxContents);
        fs.writeFileSync(path.resolve(walletDir, isRegisteredPath), result.transactionId);
    }catch(err) {
        console.error(err);
        if(err.response.data != undefined) {
            console.log(err.response.data);
            result.error = err.response.data;
        }
        else {
            console.log(err);
            result.error = err;
        }
    }

    //clean up
    // if(fs.existsSync(txDraftPath)) fs.unlinkSync(txDraftPath);
    // if(fs.existsSync(txRawPath)) fs.unlinkSync(txRawPath);
    // if(fs.existsSync(txSignedPath)) fs.unlinkSync(txSignedPath);
    
    // signingKeyPaths.forEach(sk => {
    //     if(fs.existsSync(sk)) fs.unlinkSync(sk);
    // })

    return result;
}

//fill out the wallet with necessary staking files
async function setupWalletStakingFile(network, walletName) {
    //get wallet location
    const walletDir = path.resolve(walletsPath, network, walletName);

    //get account pub
    const accountPub = fs.readFileSync(path.resolve(walletDir, accountPubFile)).toString();

    //stake priv/pub keys (needed to get verification keys)
    const stakePub = await cmd(getChildCmd(accountPub, "2/0"));
    if(stakePub.stderr) throw stakePub.stderr;

    //stake address
    const stakeAddr = await cmd(getStakingAddrCmd(stakePub.stdout, network));
    if(stakeAddr.stderr) throw stakeAddr.stderr;

    let stakeAddresses = [];
    stakeAddresses.push({ index: 0, address: stakeAddr.stdout });
    fs.writeFileSync(path.resolve(walletDir, stakeAddressFile), JSON.stringify(stakeAddresses));

    // public stake [extended] verification keys
    const stakeExtendedVerificationKeyPath = path.resolve(walletDir, stakeExtendedVerificationKeyFile);
    let stakeExtendedVerificationKey = createExtendedVerificationKey(stakeSKeyPath, stakeExtendedVerificationKeyPath);
    await cli(stakeExtendedVerificationKey); //this writes

    const stakeVerificationKeyPath = path.resolve(walletDir, stakeVerificationKeyFile);
    let stakeVerificationKey = createVerificationKey(stakeExtendedVerificationKeyPath, stakeVerificationKeyPath)
    await cli(stakeVerificationKey); //this writes

    // create stake registration certificate
    const stakeRegistrationCertPath = path.resolve(walletDir, stakeRegistrationCertFile)
    let stakeRegistrationKey = createStakeRegistrationCertificate(stakeVerificationKeyPath, stakeRegistrationCertPath);
    await cli(stakeRegistrationKey); //this writes
}

async function createStakeSigningKeys(network, walletName, passphrase) {    
    //if(stakeSKeyPath == null) {
        //get wallet location
        const walletDir = path.resolve(walletsPath, network, walletName);

        //get account key files
        const accountPub = fs.readFileSync(path.resolve(walletDir, accountPubFile)).toString();
        const accountPrv = decrypt(
            path.resolve(walletDir, accountPrvFile), 
            path.resolve(walletDir, accountPubFile),
            passphrase);

        //stake priv/pub keys (needed to get verification keys)
        const stakePrv = await cmd(getChildCmd(accountPrv, "2/0"));
        if(stakePrv.stderr) throw stakePrv.stderr;
        const stakePub = await cmd(getChildCmd(accountPub, "2/0"));
        if(stakePub.stderr) throw stakePub.stderr;

        //stake signing key (needed to get verification keys)
        stakeSKeyPath = path.resolve(walletDir, stakeSigningKeyFile);
        const stakeSigningKey = getBufferHexFromFile(stakePrv.stdout).slice(0, 128) + getBufferHexFromFile(stakePub.stdout);
        const stakeSKey = `{
            "type": "StakeExtendedSigningKeyShelley_ed25519_bip32",
            "description": "Stake Signing Key",
            "cborHex": "5880${stakeSigningKey}"
        }`;

        fs.writeFileSync(path.resolve(walletDir, stakeSKeyPath), stakeSKey);
    //}
}

function cleanUpStakeSigningKeys() {
    // if (stakeSKeyPath != null && fs.existsSync(stakeSKeyPath)) 
    //     fs.unlinkSync(stakeSKeyPath);
}

async function getSigningKeys(draftTxIns, passphrase, walletDir, signingKeyPaths, addresses, changes){
    //create signing keys
    //decrypt account prv
    const accountPrv = decrypt(
        path.resolve(walletDir, accountPrvFile), 
        path.resolve(walletDir, accountPubFile),
        passphrase);

    for(let i = 0; i < draftTxIns.length; i++) {
        const txIn = draftTxIns[i];
        //figure out if it is external or internal address
        const payment = addresses.find(a => a.address == txIn.address)
        const change = changes.find(c => c.address == txIn.address)

        if(payment != undefined)
        {
            //payment private/public
            const paymentPrv = await cmd(getChildCmd(accountPrv, `0/${payment.index}`));
            if(paymentPrv.stderr) throw paymentPrv.stderr;
            const paymentPub = await cmd(getPublicCmd(paymentPrv.stdout));
            if(paymentPub.stderr) throw paymentPub.stderr;
            
            //payment signing keys
            const paymentSigningKey = getBufferHexFromFile(paymentPrv.stdout).slice(0, 128) + getBufferHexFromFile(paymentPub.stdout)
            const paymentSigningKeyFile = `payment.${payment.index}.skey`
            const paymentSKeyPath = path.resolve(walletDir, paymentSigningKeyFile);
    
            fs.writeFileSync(paymentSKeyPath, `{ 
                "type": "PaymentExtendedSigningKeyShelley_ed25519_bip32", 
                "description": "Payment Signing Key", 
                "cborHex": "5880${paymentSigningKey}"
            }`);
            signingKeyPaths.push(paymentSKeyPath)
        }else if(change != undefined) {
            //change private/public
            const changePrv = await cmd(getChildCmd(accountPrv, `1/${change.index}`));
            if(changePrv.stderr) throw changePrv.stderr;
            const changePub = await cmd(getPublicCmd(changePrv.stdout));
            if(changePub.stderr) throw changePub.stderr;    

            //change signing keys
            const changeSigningKey = getBufferHexFromFile(changePrv.stdout).slice(0, 128) + getBufferHexFromFile(changePub.stdout)
            const changeSigningKeyFile = `change.${change.index}.skey`
            const changeSKeyPath = path.resolve(walletDir, changeSigningKeyFile);
            
            fs.writeFileSync(changeSKeyPath, `{ 
                "type": "PaymentExtendedSigningKeyShelley_ed25519_bip32", 
                "description": "Change Signing Key", 
                "cborHex": "5880${changeSigningKey}"
            }`);
            signingKeyPaths.push(changeSKeyPath)
        }else {
            //wtf?
            console.log('Unable to find address from tx input');
        }
    }     
}

async function refreshProtocolParametersFile(network) {

    const protocolParamsPath = path.resolve(walletsPath, network, protocolParamsFile);
    const protocolParams = await getProtocolParams(network);
    fs.writeFileSync(
        protocolParamsPath,
        Buffer.from(JSON.stringify(protocolParams)));

    return protocolParamsPath

}

function buildTxIn(utxos, amount, fee) {
    let txIn = [];
    let totalUsed = 0;
    for(let u of utxos)
    {
        u.assets = [];
        totalUsed += parseInt(u.value);
        u.assets.push({ quantity: parseInt(u.value), assetName: 'lovelace' });
        
        for(let t of u.tokens) 
        {
            u.assets.push({ 
                quantity: parseInt(t.quantity),
                assetName: `${t.policyId}.${hex_to_ascii(t.assetName)}`
            });
        }

        txIn.push(u);
        if(totalUsed >= parseInt(amount) + parseInt(fee))
            break;
    }

    return txIn;
}
