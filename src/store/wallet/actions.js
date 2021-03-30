import * as types from "./types.js";
const { ipcRenderer } = require("electron");
const actions = {
  async [types.GET_NEW_MNEMONIC]({ state, commit }, { wordsNumber }) {
    return new Promise(resolve => {
      var wordsAmmountToBeGenerated = state.wordsNumbersAllowed.find(x => x === wordsNumber);
      if (wordsAmmountToBeGenerated == null) throw resolve('not allowed lenght');
      ipcRenderer.send('req:generate-recovery-phrase');
      ipcRenderer.on('res:generate-recovery-phrase', (_, args) => {
        console.log('phrase', args);
        if (args.isSuccessful) {
          console.log("generate recovery phrase", args.data);
          commit(types.SET_MNEMONIC, args.data);
        } else {
          console.log(args.data);
        }
        resolve(args);
      });
    });
  },
  async [types.SET_UP_TRANSACTIONS]({ commit }) {
    return new Promise(resolve => {
      ipcRenderer.on('res:get-transactions', (_, args) => {
        commit(types.SET_TRANSACTION, args.transactions);
        resolve(args);
      });
    });
  },
  async [types.SET_MINT_ASSET_TRANSACTION]({ state }, { assetName, assetAmount, passphrase, metadata }) {
    return new Promise(resolve => {
      ipcRenderer.send("req:mint-asset", {
        network: "testnet",
        walletName: state.walletId,
        assetName: assetName,
        assetAmount: assetAmount,
        passphrase: passphrase,
        metadata: metadata,
      });
      ipcRenderer.on('res:mint-asset', (_, args) => {
        resolve(args);
      });
    });
  },
  [types.SET_UP_SEND_WALLET_DATA]({ commit, state }) {
    ipcRenderer.on('res:get-wallet', (_, args) => {
      console.log('walletId: ', state.walletId);
      commit(types.SET_WALLET, args.data);
      ipcRenderer.send("req:get-transactions", {
        network: "testnet",
        wallet: state.walletId,
      });
    });
  },
  async [types.ADD_WALLET]({ commit }, { walletForm }) {
    return new Promise(resolve => {
      ipcRenderer.send('req:add-wallet', walletForm);
      ipcRenderer.on('res:add-wallet', (_, args) => {
        if (args.isSuccessful) {
          console.log("adding new wallet", args.data);
          commit(types.SET_WALLET, args.data);
        } else {
          console.log("adding wallet error");
        }
        resolve(args);
      });
    });
  },
  async [types.GET_FEE]({ state, commit }) {
    return new Promise(resolve => {
      if (state.address != null && state.address.length > 0) {
        console.log("checking fees");
        let amount;
        if (this.state.sendAll) {
          amount = state.wallet.balance;
        } else {
          amount = state.amount < 1000000 ? 1000000 : state.amount;
        }
        ipcRenderer.send('req:get-fee', { network: 'testnet', wallet: state.walletId, address: state.address, sendAll: state.sendAll, amount: amount });
        ipcRenderer.on('res:get-fee', (_, args) => {
          console.log("fees", args);
          if (args.fee != undefined) {
            const fee = args.fee / 1000000;
            commit(types.SET_IS_VALID_ADRESS, true);
            commit(types.SET_FEE, parseFloat(fee));
            if (isNaN(fee)) {
              console.log("nan");
              this.sendForm.fee = 0;
              commit(types.SET_FEE, 0);
            }
            commit(types.SET_FEE_FORMATTED, fee.toFixed(6));
            commit(types.SET_TOTAL, parseFloat(state.amount) + parseFloat(state.fee));
            commit(types.SET_TOTAL_FORMATTED, state.total.toFixed(6));
            if (state.isReadonlyAmount) {
              const availableWithoutFee = state.wallet.balance - args.fee;
              commit(types.SET_AMOUNT, availableWithoutFee / 1000000);
              commit(types.SET_AMOUNT_FORMATTED, `${parseFloat(availableWithoutFee / 1000000).toFixed(6)}`);
              commit(types.SET_TOTAL, state.wallet.balance);
              commit(types.SET_TOTAL_FORMATTED, `${parseFloat(availableWithoutFee / 1000000).toFixed(6)}`);
              commit(types.SET_IS_VALID_AMOUNT, true);
            }
          } else {
            commit(types.SET_IS_VALID_ADRESS, false);
          }
          resolve(args);
        });
      } else {
        resolve("error");
      }


    });
  },
  async [types.SUBMIT_AND_SEND_ADA]({ commit, state }, { passphrase }) {
    commit(types.SET_IS_SENDING_ADA, true);
    commit(types.SET_PASSPHRASE, passphrase);
    let metadata = null;
    if (state.metadataFile != null)
      metadata = state.metadataFile.path;
    let amount;
    if (state.sendAll) {
      amount = state.wallet.balance;
    } else {
      amount = state.amount * 1000000;
    }

    return new Promise(resolve => {
      ipcRenderer.send("req:send-transaction", {
        network: "testnet",
        wallet: state.walletId,
        address: state.address,
        amount: amount,
        sendAll: state.sendAll,
        passphrase: state.passphrase,
        metadata: metadata,
      });
      ipcRenderer.on('res:send-transaction', (_, args) => {
        commit(types.SET_IS_SENDING_ADA, false);
        resolve(args);
      });

    });
  },
  [types.SET_WALLET_ID]({ commit }, { walletId }) {
    return new Promise(resolve => {
      ipcRenderer.send("req:get-addresses", {
        name: walletId,
        network: "testnet",
      });
      ipcRenderer.on('res:get-addresses', (_, args) => {
        commit(types.SET_TRANSACTION, null);
        commit(types.SET_WALLET_ID, walletId);
        commit(types.SET_ADDRESSES, args.addresses);
        resolve(args);
      });
    });
  },
  [types.CHANGE_IS_VALID_ADRESS]({ commit }, { newValueForIsValidAdress }) {
    commit(types.SET_IS_VALID_ADRESS, newValueForIsValidAdress);
  },
  [types.CHANGE_SEND_ALL]({ commit }, { newValueForSendAll }) {
    console.log("send all has been checked", newValueForSendAll);
    commit(types.SET_SEND_ALL, newValueForSendAll);
  },
  [types.CHANGE_AMOUNT]({ commit }, { newAddress, newAmount, newAmountFormatted, newIsValidAmount }) {
    console.log("amount has been changed", newAmount);
    commit(types.SET_ADDRESS, newAddress);
    commit(types.SET_AMOUNT, newAmount);
    commit(types.SET_AMOUNT_FORMATTED, newAmountFormatted);
    commit(types.SET_IS_VALID_AMOUNT, newIsValidAmount);
  }

};

export default actions;
