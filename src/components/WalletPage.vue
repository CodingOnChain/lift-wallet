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
              v-model="selectedWalletIndex"
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
          <NoWallet v-if="!hasWallets && !addingWallet" />
          <AddWallet v-if="addingWallet" v-on:cancel-add="cancelAdd" v-on:added-wallet="newWalletAdded" />
          <WalletDetails v-if="hasWallets && !addingWallet" v-bind:wallet="selectedWallet" />
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
      },
      selectedWalletIndex: function(newVal, oldVal) {
        if(oldVal != newVal) {
          if(this.getWalletInterval != null) {
            clearInterval(this.getWalletInterval);
            this.getWalletInterval = null;
          }

          this.selectedWallet = this.wallets[newVal];
          
          if(this.isSyncing && this.getWalletInterval == null){
            this.getWalletInterval = setInterval(() => {  
              ipcRenderer.send('req:get-wallet', { walletId: this.selectedWallet.id }); 
            }, 5000)
          }
        }
      }
    },
    computed: {
      hasWallets: function () {
        // `this` points to the vm instance
        return this.wallets.length > 0
      },
      isSyncing: function() {
          if(this.selectedWallet == null) return false;
          if(this.selectedWallet.state.status != "ready")
          {
            if(this.selectedWallet.state.progress != null
              && this.selectedWallet.state.progress != undefined) {
                console.log(this.selectedWallet.state.progress)
                if(this.selectedWallet.state.progress?.quantity < 100) return true;
              }
          }
          return false;
      },
      syncProgress: function() {
          if(this.selectedWallet == null) return '';
          if(this.selectedWallet.state.progress != null
            && this.selectedWallet.state.progress != undefined) {
            return `${this.selectedWallet.state.progress.quantity}%`
          }
          return '';
      }
    },
    data: () => ({
      selectedWalletIndex: null,
      selectedWallet: null,
      wallets: [],
      newWallet: {
        name: '',
        mnemonic: '',
        passphrase: ''
      },
      newMnemonic: '',
      addingWallet: false,
      getWalletInterval: null
    }),
    mounted() {
      this.getWallets();

      ipcRenderer.on('res:get-wallets', (_, args) => {
        console.log('wallets',args);
        this.wallets = args.wallets;
        if(this.wallets.length > 0 && !this.selectedWalletIndex) {
          this.selectedWalletIndex = 0
        }
      })

      ipcRenderer.on('res:generate-recovery-phrase', (_, args) => {
        console.log('phrase',args);
        if(! args.error) this.newMnemonic = args.passphrase;
      })

      ipcRenderer.on('res:get-wallet', (_, args) => {
          console.log(args);
          this.selectedWallet = args.wallet;
          this.wallets[this.selectedWalletIndex] = this.selectedWallet;
          if(!this.isSyncing && this.getWalletInterval != null) clearInterval(this.getWalletInterval);
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
        this.selectedWalletIndex = this.wallets.length - 1;
        this.addingWallet = false;
      }
    }
  }
</script>

<style scoped>

</style>