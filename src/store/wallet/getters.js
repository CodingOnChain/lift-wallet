import * as types from './types';
export default {
  [types.MNEMONIC]: (state) => {
    return state.mnemonic;
  },
  [types.WORDS_NUMBER_ALLOWED]: (state) => {
    return state.wordsNumbersAllowed;
  }
};

