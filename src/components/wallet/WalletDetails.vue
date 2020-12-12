    <template>
    <v-container>
        <v-row no-gutters>
            <v-col>
                <v-card flat v-if="wallet != null">
                    <v-toolbar flat>
                        <v-toolbar-title>{{wallet.name}}</v-toolbar-title>

                        <v-spacer></v-spacer>

                        <v-toolbar-title v-if="isSyncing">
                        Sync Status: {{ syncProgress }}
                        </v-toolbar-title>
                        <v-toolbar-title v-if="!isSyncing">
                        Sync Status: Complete
                        </v-toolbar-title>
                    </v-toolbar>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
  const { ipcRenderer } = require('electron')
  export default {
    name: 'WalletDetails',
    props: ['walletId'],
    data: () => ({ 
        wallet: null,
        getWalletInterval: null
    }),
    watch: {
        walletId: function(newVal, oldVal) {
            console.log('new',newVal);
            console.log('old',oldVal);
            if(newVal != oldVal) {
                if(this.getWalletInterval != null) {
                    clearInterval(this.getWalletInterval);
                    this.getWalletInterval = null;
                }

                ipcRenderer.send('req:get-wallet', { walletId: newVal });
            }
        }
    },
    computed: {
        isSyncing: function() {
            if(this.wallet == null) return false;
            if(this.wallet.state.status != "ready")
            {
                if(this.wallet.state.progress != null
                    && this.wallet.state.progress != undefined) {
                    if(this.wallet.state.progress?.quantity < 100) {
                        console.log("im still syncing");
                        return true;
                    }
                }
            }
            return false;
        },
        syncProgress: function() {
            if(this.wallet == null) return '';
            if(this.wallet.state.progress != null
                && this.wallet.state.progress != undefined) {
                return `${this.wallet.state.progress.quantity}%`
            }
            return '';
        }
    },
    mounted() {
        ipcRenderer.send('req:get-wallet', { walletId: this.walletId });

        ipcRenderer.on('res:get-wallet', (_, args) => {
            console.log('walletId', this.walletId)
            console.log('wallet', this.wallet)
            console.log('args.wallet', args.wallet)
            if(this.wallet != null) {
                console.log('same check',this.walletId == this.wallet.id)
            }
            if(this.wallet == null) {
                console.log('just starting')
                this.setWallet(args.wallet);
                
                if(this.isSyncing && this.getWalletInterval == null){
                    this.getWalletInterval = setInterval(() => {  
                    ipcRenderer.send('req:get-wallet', { walletId: this.walletId });
                    }, 5000)
                } 
            }else if(this.walletId != this.wallet.id)
            {
                console.log('diff wallet')
                this.setWallet(args.wallet);
                if(this.getWalletInterval != null) clearInterval(this.getWalletInterval);
                
                if(this.isSyncing){
                    this.getWalletInterval = setInterval(() => {  
                    ipcRenderer.send('req:get-wallet', { walletId: this.walletId });
                    }, 5000)
                } 
            }else if(this.walletId == this.wallet.id) {
                console.log('same wallet')
                this.setWallet(args.wallet);
                if(!this.isSyncing && this.getWalletInterval != null) {
                    clearInterval(this.getWalletInterval);
                }
            }
        })
    },
    methods: {
        setWallet(wallet) {
            this.wallet = wallet;
        }
    }
  }
</script>