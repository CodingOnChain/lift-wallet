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
          <h1>Perdix</h1>
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
        <v-btn color="success" v-on:click="startCnode" v-show="!toggleStartCnode" >Start Node</v-btn>
        <v-btn color="danger" v-on:click="stopCnode" v-show="toggleStartCnode" >Stop Node</v-btn>
      </v-container>
    </v-app-bar>

    <v-main class="grey lighten-3">
      <LoadingCnode v-show="bootingCnode || syncingCnode" 
        v-bind:loading="bootingCnode" 
        v-bind:syncing="syncingCnode"
        v-bind:progress="syncingProgress" />
      <MainView v-bind:page="activePage" />
    </v-main>
  </v-app>
</template>

<script>
const { ipcRenderer } = require('electron')
import LoadingCnode from './components/LoadingCnode'
import MainView from './components/MainView'

export default {
  name: 'App',

  components: {
    LoadingCnode,
    MainView
  },

  created(){
    ipcRenderer.on('res:start-cnode', (_, args) => {
      if(args.cnode) {
        this.toggleStartCnode = true;
        this.bootingCnode = true;
        ipcRenderer.send('req:get-network');
      }
    })

    ipcRenderer.on('res:stop-cnode', () => {
      this.toggleStartCnode = false;
      this.bootingCnode = false;
      this.syncingCnode = false;
      this.activeCnode = false;
    })

    ipcRenderer.on('res:get-network', (_, args) => {
      console.log(args);
      if(args.network != null) {
        if(args.network.sync_progress.status == 'syncing')
        {
          this.bootingCnode = false;
          this.syncingCnode = true;
          this.syncingProgress = args.network.sync_progress.progress.quantity;
          console.log(`${args.network.sync_progress.progress.quantity}%`)
          this.getSyncInfo = setTimeout(() => {  ipcRenderer.send('req:get-network'); }, 10000);
        }else {
          console.log('synced!')
          clearTimeout(this.getSyncInfo);
          this.bootingCnode = false;
          this.syncingCnode = false;
          this.activeCnode = true;
        }
      }else {
        if(this.toggleStartCnode) this.getSyncInfo = setTimeout(() => {  ipcRenderer.send('req:get-network'); }, 10000);
      }
    })
  },

  data: () => ({
    toggleStartCnode: false,
    bootingCnode: false,
    syncingCnode: false,
    activeCnode: false,
    syncingProgress: 0,
    getSyncInfo: null,
    links: ['Wallets', 'Staking', 'Voting'],
    activePage: 'Wallets'
  }),

  methods: {
    startCnode: function() {
      ipcRenderer.send('req:start-cnode', 'top');
    },
    stopCnode: function() {
      ipcRenderer.send('req:stop-cnode', 'top');
      clearTimeout(this.getSyncInfo);
    },
    setActivePage: function(page) {
      this.activePage = page;
    }
  }
};
</script>
