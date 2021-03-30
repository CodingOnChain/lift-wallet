import Vue from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import store from "./store";
import i18n from './lang';

Vue.config.productionTip = false;
console.log("store ",store);
new Vue({
  vuetify,
  i18n,
  store,
  render: h => h(App)
}).$mount('#app');
