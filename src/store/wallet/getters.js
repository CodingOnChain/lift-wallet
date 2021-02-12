import * as types from './types';
export default {
  [types.MNEMONIC]: (state) => {
    return state.mnemonic;
  },
  [types.WALLET]: (state) => {
    return state.wallet;
  },
  [types.WORDS_NUMBER_ALLOWED]: (state) => {
    return state.wordsNumbersAllowed;
  }
};

