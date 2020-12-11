<template>

  <v-container>
    <v-row>
      <v-col cols="2">
        <v-sheet rounded="lg">

          <v-list nav>
            <v-list-item>
              <v-btn color="primary" block v-on:click="getMnemonic">Add</v-btn>
            </v-list-item>
            <v-list-item-group
              v-model="selectedWallet"
              color="primary"
            >
              <v-list-item
                v-for="(wallet, i) in wallets"
                :key="i"
              >
                <v-list-item-title>
                  {{wallet.name}}
                </v-list-item-title>
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </v-sheet>
      </v-col>

      <v-col>
        <v-sheet
          min-height="70vh"
          rounded="lg"
        >
          <!-- 
            Views:
              - No Wallets - Add now!
              - Show Mnemonic
              - Input Name, Mnemonic and Passphrase
              - Show selected wallet
                - Home Screen
                  - Name
                  - Current Balance
                  - Transactions
                - Send Ada
                - Receive Ada
                  - Show Address
           -->
        </v-sheet>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  const { ipcRenderer } = require('electron')
  export default {
    name: 'WalletPage',
    props: ['render'],
    watch: {
      render: function(newVal, oldVal) {
        if(!oldVal && newVal) {
          this.getWallets();
        }
      }
    },
    data: () => ({
      selectedWallet: null,
      wallets: [],
      newWallet: {
        name: '',
        mnemonic: '',
        passphrase: ''
      },
      newMnemonic: ''
    }),
    mounted() {
      ipcRenderer.on('res:get-wallets', (_, args) => {
        console.log('wallets',args);
      })

      ipcRenderer.on('res:generate-recovery-phrase', (_, args) => {
        console.log('phrase',args);
        if(! args.error) this.newMnemonic = args.passphrase;
      })
    },
    methods: {
      addWallet: function() {
        
      },
      getWallets: function() {
        console.log('get wallets');
        ipcRenderer.send('req:get-wallets');
      },
      getMnemonic: function() {
        ipcRenderer.send('req:generate-recovery-phrase');
      }
    }
  }
</script>

<style scoped>

</style>