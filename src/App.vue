<template>
  <v-app id="inspire">
    <v-app-bar
      app
      flat
    >
      <v-container class="py-0 fill-height">
        <v-avatar
          class="mr-5"
          size="32"
        ></v-avatar>

        <div class="d-flex align-center">
          <h1>LIFT</h1>
        </div>


        <v-spacer></v-spacer>
        <!-- <v-btn
          v-for="link in links"
          :key="link"
          color="primary"
          v-on:click="setActivePage(link)"
          :text="link != activePage"
          :depressed="link == activePage"
          class="mr-2"
        >
          {{ link }}
        </v-btn> -->
        <v-btn-toggle
          v-model="network"
          mandatory
        >
          <v-btn 
            :color="selectedNetwork == 0 ? 'accent' : 'default'"
            :style="{ color: selectedNetwork == 0 ? 'white' : 'black' }"
            disabled>
            Testnet
          </v-btn>
          <v-btn 
            :color="selectedNetwork == 1 ? 'accent' : 'default'"
            :style="{ color: selectedNetwork == 1 ? 'white' : 'black' }"
            disabled>
            Mainnet
          </v-btn>
        </v-btn-toggle>

        <div class="d-flex align-right ml-5">
          <h6>{{ $t('lang.language') }}</h6>
        </div>

      </v-container>
    </v-app-bar>

    <v-main class="grey lighten-3">
      <MainView v-bind:page="activePage" />
    </v-main>
  </v-app>
</template>

<script>
import MainView from './components/MainView';

export default {
  name: 'App',

  components: {
    MainView
  },

  data: () => ({
    links: ['Wallets', 'Staking', 'Voting'],
    activePage: 'Wallets',
    network: ['Testnet', 'Mainnet'],
    selectedNetwork: 0
  }),

  methods: {
    setActivePage: function(page) {
      this.activePage = page;
    }
  }
};
</script>
