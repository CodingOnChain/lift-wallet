<template>
  <v-container>
    <v-row>
      <v-col cols="2">
        <v-sheet rounded="lg">

          <v-list nav>
            <v-list-item>
              <v-btn color="primary" block v-on:click="startNewWallet">Add</v-btn>
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
          <NoWallet v-show="!hasWallets && !addingWallet" />
          <AddWallet v-show="addingWallet" v-on:cancel-add="cancelAdd" v-on:added-wallet="newWalletAdded" />
          <WalletDetails v-show="hasWallets && !addingWallet" v-bind:wallet="wallets[selectedWallet]" />
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
  import NoWallet from './wallet/NoWallet'
  import AddWallet from './wallet/AddWallet'
  import WalletDetails from './wallet/WalletDetails'

  export default {
    name: 'WalletPage',
    props: ['render'],
    components: {
      NoWallet,
      AddWallet,
      WalletDetails
    },
    watch: {
      render: function(newVal, oldVal) {
        if(!oldVal && newVal) {
          this.getWallets();
        }
      }
    },
    computed: {
      hasWallets: function () {
        // `this` points to the vm instance
        return this.wallets.length > 0
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
      newMnemonic: '',
      addingWallet: false
    }),
    mounted() {
      this.getWallets();

      ipcRenderer.on('res:get-wallets', (_, args) => {
        console.log('wallets',args);
        this.wallets = args.wallets;
        if(this.wallets.length > 0 && !this.selectedWallet) this.selectedWallet = 0
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
      },
      startNewWallet: function() {
        this.addingWallet = true;
      },
      cancelAdd: function() {
        this.addingWallet = false;
      },
      newWalletAdded: function(e) {
        this.wallets.push(e.wallet);
        this.selectedWallet = this.wallets.length - 1;
        this.addingWallet = false;
      }
    }
  }
</script>

<style scoped>

</style>