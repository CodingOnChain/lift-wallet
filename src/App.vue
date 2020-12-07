<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
    >
      <div class="d-flex align-center">
        <h1>Perdix</h1>
      </div>

      <v-spacer></v-spacer>
      <v-btn color="success" v-on:click="startCnode" v-show="!toggleStartCnode" >Start Node</v-btn>
      <v-btn color="danger" v-on:click="stopCnode" v-show="toggleStartCnode" >Stop Node</v-btn>
    </v-app-bar>

    <v-main>
      <LoadingCnode v-show="bootingCnode || syncingCnode" 
        v-bind:loading="bootingCnode" 
        v-bind:syncing="syncingCnode"
        v-bind:progress="syncingProgress" />
    </v-main>
  </v-app>
</template>

<script>
const { ipcRenderer } = require('electron')
import LoadingCnode from './components/LoadingCnode'

export default {
  name: 'App',

  components: {
    LoadingCnode
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
        }
      }else {
          this.getSyncInfo = setTimeout(() => {  ipcRenderer.send('req:get-network'); }, 10000);
      }
    })
  },

  data: () => ({
    toggleStartCnode: false,
    bootingCnode: false,
    syncingCnode: false,
    activeCnode: false,
    syncingProgress: 0,
    getSyncInfo: null
  }),

  methods: {
    startCnode: function() {
      ipcRenderer.send('req:start-cnode', 'top');
    },
    stopCnode: function() {
      ipcRenderer.send('req:stop-cnode', 'top');
      clearTimeout(this.getSyncInfo);
    }
  }
};
</script>
