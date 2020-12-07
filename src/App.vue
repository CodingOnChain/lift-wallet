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
      <LoadingCnode v-show="bootingCnode" />
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
    })

    ipcRenderer.on('res:get-network', (_, args) => {
      if(args.network.sync_progress.status == 'syncing')
      {
        console.log(`${args.network.sync_progress.progress.quantity}%`)
        setTimeout(() => {  ipcRenderer.send('req:get-network'); }, 5000);
      }
    })
  },

  data: () => ({
    toggleStartCnode: false,
    bootingCnode: false
  }),

  methods: {
    startCnode: function() {
      ipcRenderer.send('req:start-cnode', 'top');
    },
    stopCnode: function() {
      ipcRenderer.send('req:stop-cnode', 'top');
    }
  }
};
</script>
