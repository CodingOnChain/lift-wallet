import axios from 'axios'

export async function getUtxos(network, addresses) {
    var utxos = `{ utxos( order_by: { value: desc } where: { address: { _in: ${getGraphqlAddresses(addresses)} }} ) { address index txHash value } }`
    var utxosResult = await axios.post(getGraphqlUrl(network), { query: utxos });
    return utxosResult.data.data.utxos;
}

function getGraphqlUrl(network) {
    return `https://graphql-api.${network}.dandelion.link/`;
}

function getSubmitApiUrl(network) {
    return `https://submit-api.${network}.dandelion.link/`;
}

function getGraphqlAddresses(addresses) {
    let result = '[';
    addresses.forEach(a => {
        result += `"${a}"`;
    })
    result += ']';
    return result;
}