import * as types from './types.js';

const actions = {
  [types.GET_NEW_MNEMONIC]() {
    console.log('get new mnemonic');
  },
  [types.SET_UP_WALLET]() {
    console.log('set up wallet');
  }
};

export default actions;
