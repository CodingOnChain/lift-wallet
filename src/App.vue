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
        <v-btn
          v-for="link in links"
          :key="link"
          color="primary"
          v-on:click="setActivePage(link)"
          :text="link != activePage"
          :depressed="link == activePage"
          class="mr-2"
        >
          {{ link }}
        </v-btn>
        <v-btn-toggle
          v-model="selectedWalletType"
          mandatory
        >
          <v-btn 
            :color="selectedWalletType == 0 ? 'accent' : 'default'"
            :style="{ color: selectedWalletType == 0 ? 'white' : 'black' }">
            Lite
          </v-btn>
          <v-btn 
            :color="selectedWalletType == 1 ? 'accent' : 'default'"
            :style="{ color: selectedWalletType == 1 ? 'white' : 'black' }">
            Full
          </v-btn>
        </v-btn-toggle>
      </v-container>
    </v-app-bar>

    <v-main class="grey lighten-3">
      <MainView v-bind:page="activePage" />
    </v-main>
  </v-app>
</template>

<script>
import MainView from './components/MainView'

export default {
  name: 'App',

  components: {
    MainView
  },

  data: () => ({
    links: ['Wallets', 'Staking', 'Voting'],
    activePage: 'Wallets',
    walletTypes: ['Lite', 'Full Node'],
    selectedWalletType: 0
  }),

  methods: {
    setActivePage: function(page) {
      this.activePage = page;
    }
  }
};
</script>
