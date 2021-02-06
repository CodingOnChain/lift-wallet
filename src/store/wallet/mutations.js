import * as types from './types';
export default {
  [types.SET_MNEMONIC]: (state, mnemonic) => {
    state.mnemonic = mnemonic;
  }
};
