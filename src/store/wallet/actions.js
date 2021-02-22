import * as types from './types.js';
const { ipcRenderer } = require('electron');
const actions = {
  async [types.GET_NEW_MNEMONIC]({ state }, { wordsNumber }) {
    var wordsAmmountToBeGenerated = state.wordsNumbersAllowed.find(x => x === wordsNumber);
    if (wordsAmmountToBeGenerated == null) throw 'not allowed lenght';
    ipcRenderer.send('req:generate-recovery-phrase');
  },

  [types.SET_UP_WALLET]({ commit }) {
    console.log('set up wallet');
    ipcRenderer.on('res:generate-recovery-phrase', (_, args) => {
      console.log('phrase', args);
      if (args.isSuccessful) {
        console.log("generate recovery phrase", args.data);
        commit(types.SET_MNEMONIC, args.data);
      } else {
        console.log(args.data);
      }
    });
    ipcRenderer.on('res:add-wallet', (_, args) => {
      if (args.isSuccessful) {
        console.log("adding new wallet", args.data);
        commit(types.SET_WALLET, args.data);
      } else {
        console.log("adding wallet error");
      }
    });
  },
  [types.SET_UP_SEND_WALLET_DATA]({ commit, state }) {
    console.log('set up send wallet data');
    ipcRenderer.on('res:get-transactions', (_, args) => {
      commit(types.SET_TRANSACTION, args.transactions);
    });
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
          commit(types.SET_TOTAL_FORMATTED, `${parseFloat(this.sendForm.total / 1000000).toFixed(6)}`);
        }
      } else {
        commit(types.SET_IS_VALID_ADRESS, false);
      }
    });

    ipcRenderer.on('res:get-addresses', (_, args) => {
      console.log('add adresses');
      commit(types.SET_ADDRESSES, args.addresses);
    });
    ipcRenderer.on('res:get-wallet', (_, args) => {
      console.log('walletId: ', state.walletId);
      commit(types.SET_WALLET, args.data);
      // if (state.wallet != null) {
      ipcRenderer.send("req:get-transactions", {
        network: "testnet",
        wallet: state.walletId,
      });
      if (state.addresses == null || state.addresses.length == 0) {
        ipcRenderer.send("req:get-addresses", {
          name: state.walletId,
          network: "testnet",
        });
      }
      // }
    });


    ipcRenderer.on('res:send-transaction', (_, args) => {
      commit(types.IS_SENDING_ADA, false);
      if (args.transaction.error) {
        alert(args.transaction.error);
      } else {
        //  this.mintForm = {
        //      asset: 'lift',
        //      amount: 1,
        //      passphrase: '',
        //      metadataFile: null,
        //  };        
        //     this.$v.$reset();
        //     this.tabIndex = 0;
      }
    });

    ipcRenderer.on('mint-asset', (_, args) => {
      commit(types.IS_SENDING_ADA, false);
      if (args.transaction.error) {
        alert(args.transaction.error);
      } else {
        //     this.mintForm = {
        //         asset: 'lift',
        //         amount: 1,
        //         passphrase: '',
        //         metadataFile: null,
        //     };
        //     this.$v.$reset();
        //     this.tabIndex = 0;
      }
    });
  },
  async [types.ADD_WALLET]({ state }, { walletForm }) {
    console.log(state);
    console.log('add a new wallet');
    console.log('wallet form', walletForm);
    ipcRenderer.send('req:add-wallet', walletForm);
  },
  async [types.GET_FEE]({ state }) {
    if (state.address.length > 0) {
      let amount;
      if (this.state.sendAll) {
        amount = state.wallet.balance;
      } else {
        amount = state.amount < 1000000 ? 1000000 : state.amount;
      }
      ipcRenderer.send('req:get-fee', { network: 'testnet', wallet: state.walletId, address: state.address, sendAll: state.sendAll, amount: amount });
    }
  },
  async [types.SUBMIT_AND_SEND_ADA]({ commit, state }) {
    commit(types.IS_SENDING_ADA, true);
    let metadata = null;
    if (state.metadataFile != null)
      metadata = state.metadataFile.path;
    let amount;
    if (state.sendAll) {
      amount = state.wallet.balance;
    } else {
      amount = amount * 1000000;
    }
    ipcRenderer.send("req:send-transaction", {
      network: "testnet",
      wallet: state.walletId,
      address: state.address,
      amount: amount,
      sendAll: state.sendAll,
      passphrase: state.passphrase,
      metadata: metadata,
    });
  },
  [types.SET_WALLET_ID]({ commit }, { walletId }) {
    commit(types.SET_TRANSACTION, null);
    commit(types.SET_WALLET_ID, walletId);
  },
  [types.CHANGE_IS_VALID_ADRESS]({ commit }, { newValueForIsValidAdress }) {
    commit(types.SET_IS_VALID_ADRESS, newValueForIsValidAdress);    
  },
  [types.CHANGE_SEND_ALL]({ commit }, { newValueForSendAll }) {
    commit(types.SET_SEND_ALL, newValueForSendAll);    
  },
  [types.CHANGE_AMOUNT]({ commit }, { newAmount,newAmountFormatted,newIsValidAmount }) {
    commit(types.SET_AMOUNT, newAmount);    
    commit(types.SET_AMOUNT_FORMATTED, newAmountFormatted);    
    commit(types.SET_IS_VALID_AMOUNT, newIsValidAmount);    
  }
};

export default actions;
