import * as types from './types';
export default {
  [types.MNEMONIC]: (state) => {
    return state.mnemonic;
  },
  [types.WALLET]: (state) => {
    return state.wallet;
  },
  [types.WALLET_ID]: (state) => {
    return state.walletId;
  },
  [types.WORDS_NUMBER_ALLOWED]: (state) => {
    return state.wordsNumbersAllowed;
  },
  [types.NETWORK]: (state) => {
    return state.network;
  },
  [types.WALLET_NAME]: (state) => {
    return state.walletName;
  },
  [types.ASSET_NAME]: (state) => {
    return state.assetName;
  },
  [types.TOKEN_AMOUNT]: (state) => {
    return state.tokenAmount;
  },
  [types.PASSPHRASE]: (state) => {
    return state.passphrase;
  },
  [types.METADATA]: (state) => {
    return state.metadata;
  },
  [types.TRANSACTION]: (state) => {
    return state.transaction;
  },
  [types.ADDRESSES]: (state) => {
    return state.addresses;
  },
  [types.IS_VALID_ADRESS]: (state) => {
    return state.isValidAdress;
  },
  [types.IS_READONLY_AMOUNT]: (state) => {
    return state.isReadonlyAmount;
  },
  [types.IS_SENDING_ADA]: (state) => {
    return state.isSendingAda;
  },
  [types.IS_VALID_AMOUNT]: (state) => {
    return state.isValidAmount;
  },
  [types.AMOUNT]: (state) => {
    return state.amount;
  },
  [types.AMOUNT_FORMATTED]: (state) => {
    return state.amountFromatted;
  },
  [types.TOTAL]: (state) => {
    return state.total;
  },
  [types.TOTAL_FORMATTED]: (state) => {
    return state.totalFormatted;
  },
  [types.FEE]: (state) => {
    return state.fee;
  },
  [types.FEE_FORMATTED]: (state) => {
    return state.feeFormatted;
  },
  [types.SEND_ALL]: (state) => {
    return state.sendAllS;
  },
  [types.METADATA_FILE]: (state) => {
    return state.metadataFile;
  },
  [types.IS_VALID_PASSPHRASE]: (state) => {
    return state.isValidPassphrase;
  }
};


