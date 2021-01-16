import axios from 'axios'

export async function getUtxos(network, addresses) {
    var utxos = `{ utxos( order_by: { value: desc } where: { address: { _in: ${getGraphqlList(addresses)} }} ) { address index txHash value } }`
    var utxosResult = await axios.post(getGraphqlUrl(network), { query: utxos });
    return utxosResult.data.data.utxos;
}

export async function getProtocolParams(network) {
    var protocolParamsQuery = "{ genesis { shelley { protocolParams { a0 decentralisationParam eMax extraEntropy keyDeposit maxBlockBodySize maxBlockHeaderSize maxTxSize minFeeA minFeeB minPoolCost minUTxOValue nOpt poolDeposit protocolVersion rho tau }  }  } }"
    var protocolParamsResult = await axios.post(getGraphqlUrl(network), { query: protocolParamsQuery });
    return protocolParamsResult.data.data.genesis.shelley.protocolParams;
}

export async function getCurrentSlotNo(network) {
    //gathering data for constructing a transaction
    var tipQuery = "{ cardano { tip { slotNo } } }";
    var tipResult = await axios.post(getGraphqlUrl(network), { query: tipQuery });
    return tipResult.data.data.cardano.tip.slotNo;
}

export async function submitTransaction(network, signedTxBinary) {
    var sendResult = await axios(
        {
            method: 'post',
            url: `${getSubmitApiUrl(network)}api/submit/tx`,
            data: signedTxBinary,
            headers: {
                "Content-Type": "application/cbor"
            }
        });
    return sendResult.data;
}

export async function getTransactionsByAddresses(network, addresses) {
    const payload = { 
        data: {
            addresses: addresses
        }
    };
    
    var sendResult = await axios(
        {
            method: 'post',
            url: `${getPostgrestApiUrl(network)}rpc/get_tx_history_for_addresses`,
            data: payload,
            headers: {
                "Content-Type": "application/json"
            }
        });
    return sendResult.data;
}

export async function getTransactionsDetails(network, transactions) {
    //gathering data for constructing a transaction
    var transactionQuery = `{ transactions( where: { hash: { _in: ${getGraphqlList(transactions)} } } ) { hash fee deposit inputs { address value } outputs { address value } totalOutput includedAt } }`
    var transactionResult = await axios.post(getGraphqlUrl(network), { query: transactionQuery });
    return transactionResult.data.data.transactions;
}

function getGraphqlUrl(network) {
    return `https://graphql-api.${network}.dandelion.link/`;
}

function getSubmitApiUrl(network) {
    return `https://submit-api.${network}.dandelion.link/`;
}

function getPostgrestApiUrl(network) {
    return `https://postgrest-api.${network}.dandelion.link/`;
}

function getGraphqlList(list) {
    let result = '[';
    list.forEach(a => {
        result += `"${a}",`;
    })
    result += ']';
    return result;
}