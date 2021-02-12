import Vue from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import store from "./store";

Vue.config.productionTip = false;
console.log("store ",store);
new Vue({
  vuetify,
  store,
  render: h => h(App)
}).$mount('#app');
