import state from './state';
import getters from './getters';
import mutations from './mutations';
import actions from './actions';

//req:mint-asset
//ipcRenderer.on('res:mint-asset', callback);
//args.network, args.walletName, args.assetName, args.tokenAmount, args.passphrase, args.metadata
export default {
  namespaced: true,  
  state,
  getters,
  mutations,
  actions
};
