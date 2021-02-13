import Vue from 'vue';
import VueI18n from 'vue-i18n';
import en from '../lang/locals/en_US.json';
import es from '../lang/locals/es_ES.json';

Vue.use(VueI18n);

export default new VueI18n({
  locale: 'en',
  messages: {
    en: {
      lang: en
    },
    es: {
      lang: es
    }
  }
});