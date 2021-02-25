import * as types from './types';
export default {
  [types.SET_MNEMONIC]: (state, mnemonic) => {
    state.mnemonic = mnemonic;
  },
  [types.SET_WALLET]: (state, wallet) => {
    state.wallet = wallet;
  },
  [types.SET_TRANSACTION]: (state, transaction) => {
    state.transaction = transaction;
  },
  [types.SET_ADDRESS]: (state, address) => {
    state.address = address;
  },
  [types.SET_ADDRESSES]: (state, addresses) => {
    state.addresses = addresses;
  },
  [types.SET_IS_VALID_ADRESS]: (state, isValidAdress) => {
    state.isValidAdress = isValidAdress;
  },
  [types.SET_IS_SENDING_ADA]: (state, isSendingAda) => {
    state.isSendingAda = isSendingAda;
  },
  [types.SET_IS_VALID_AMOUNT]: (state, isValidAmount) => {
    state.isValidAmount = isValidAmount;
  },
  [types.SET_AMOUNT]: (state, amount) => {
    state.amount = amount;
  },
  [types.SET_AMOUNT_FORMATTED]: (state, amountFromatted) => {
    state.amountFromatted = amountFromatted;
  },
  [types.SET_TOTAL]: (state, total) => {
    state.total = total;
  },
  [types.SET_TOTAL_FORMATTED]: (state, totalFormatted) => {
    state.totalFormatted = totalFormatted;
  },
  [types.SET_WALLET_ID]: (state, walletId) => {
    state.walletId = walletId;
  },
  [types.SET_FEE]: (state, fee) => {
    state.fee = fee;
  },
  [types.SET_FEE_FORMATTED]: (state, feeFormatted) => {
    state.feeFormatted = feeFormatted;
  },
  [types.SET_SEND_ALL]: (state, sendAll) => {
    state.sendAll = sendAll;
  },
  [types.SET_METADATA_FILE]: (state, metadataFile) => {
    state.metadataFile = metadataFile;
  }
};
