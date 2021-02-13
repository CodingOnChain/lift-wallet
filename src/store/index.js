import Vue from 'vue';
import Vuex from 'vuex';
// we first import the module
import wallet from './wallet';


Vue.use(Vuex);
export default function (/* { ssrContext } */) {
  const Store = new Vuex.Store({
    modules: {
      wallet
    },

    // enable strict mode (adds overhead!)
    // for dev mode only
    strict: process.env.DEV
  });

  return Store;
}
