    <template>
    <v-container>
        <v-row no-gutters>
            <v-col>
                <v-card flat v-if="wallet != null">
                    <v-card-title>Total: {{ displayADA(wallet.balance.total.quantity) }}</v-card-title>
                </v-card>
            </v-col>
        </v-row>
        <v-row no-gutters>
            <v-col>
                <v-card flat v-if="wallet != null">
                    <WalletSyncing v-bind:progress="syncProgress" v-if="isSyncing" />
                    <v-sheet v-if="!isSyncing" height="100%" width="100%">
                        <v-tabs centered grow background-color="primary" dark>
                            <v-tab>Transactions</v-tab>
                            <v-tab>Receive</v-tab>
                            <v-tab>Send</v-tab>

                            <v-tab-item>
                                <v-expansion-panels>
                                    <v-expansion-panel
                                            v-for="(item,i) in transactions"
                                            :key="i"
                                            >
                                        <v-expansion-panel-header >
                                            <v-row>
                                                <v-col md="2" sm="12" v-if="item.status == 'in_ledger'">
                                                    <v-chip label color="danger" v-if="item.direction == 'outgoing'">
                                                        Sent
                                                    </v-chip>
                                                    <v-chip label color="success" v-if="item.direction == 'incoming'">
                                                        Received
                                                    </v-chip>
                                                </v-col>
                                                <v-col md="2" sm="12" v-if="item.status == 'pending'">
                                                    <v-chip label color="accent">
                                                        Pending
                                                    </v-chip>
                                                </v-col>
                                                <v-col md="10" sm="12" class="pa-5">
                                                    {{displayADA(item.amount.quantity)}}
                                                </v-col>
                                            </v-row>
                                        </v-expansion-panel-header>
                                        <v-expansion-panel-content>
                                            <v-sheet class="pa-5" color="primary lighten-5">
                                                <v-row>
                                                    <v-col>
                                                        <p class="text-subtitle-2">Transaction Id</p>
                                                        <p class="text-body-2">{{item.id}}</p>
                                                    </v-col>
                                                </v-row>
                                                <v-divider></v-divider>
                                                <v-row>
                                                    <v-col>
                                                        <p class="text-subtitle-2">Inputs</p>
                                                        <div v-for="(input,inputIndex) in item.inputs" :key="inputIndex">
                                                           <p class="text-caption">{{input.id}}</p>
                                                        </div>
                                                    </v-col>
                                                </v-row>
                                                <v-divider></v-divider>
                                                <v-row>
                                                    <v-col>
                                                        <p class="text-subtitle-2">Outputs</p>
                                                        <div v-for="(output,outputIndex) in item.outputs" :key="outputIndex">
                                                            <p class="text-caption">
                                                                {{output.address}}<br/>
                                                                {{displayADA(output.amount.quantity)}}
                                                            </p>
                                                        </div>
                                                    </v-col>
                                                </v-row>
                                            </v-sheet>
                                        </v-expansion-panel-content>
                                    </v-expansion-panel>
                                </v-expansion-panels>
                            </v-tab-item>

                            <v-tab-item>
                                <v-card>
                                    <v-simple-table>
                                        <template v-slot:default>
                                        <thead>
                                            <tr>
                                            <th class="text-left">
                                                Addresses
                                            </th>
                                            <th class="text-left">
                                                State
                                            </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr
                                            v-for="item in addresses"
                                            :key="item.id"
                                            >
                                            <td>{{ item.id }}</td>
                                            <td>{{ item.state }}</td>
                                            </tr>
                                        </tbody>
                                        </template>
                                    </v-simple-table>
                                </v-card>
                            </v-tab-item>

                            <v-tab-item>
                                <v-card>
                                    a form to send ada
                                </v-card>
                            </v-tab-item>
                        </v-tabs>
                    </v-sheet>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
  const { ipcRenderer } = require('electron')
    import WalletSyncing from './wallet-details/WalletSyncing'

  export default {
    name: 'WalletDetails',
    props: ['walletId'],
    components: {
        WalletSyncing  
    },
    data: () => ({ 
        wallet: null,
        getWalletInterval: null,
        transactions: [],
        addresses: []
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
            if(this.wallet == null) return 0;
            if(this.wallet.state.progress != null
                && this.wallet.state.progress != undefined) {
                return this.wallet.state.progress.quantity
            }
            return 0;
        }
    },
    mounted() {
        if(this.getWalletInterval != null) clearInterval(this.getWalletInterval)

        ipcRenderer.send('req:get-wallet', { walletId: this.walletId });

        ipcRenderer.on('res:get-transactions', (_, args) => {
            this.transactions = args.transactions;
            console.log(this.transactions)
        });

        ipcRenderer.on('res:get-addresses', (_, args) => {
            this.addresses = args.addresses;
        });

        ipcRenderer.on('res:get-wallet', (_, args) => {
            console.log('walletId', this.walletId)
            console.log('wallet', this.wallet)
            console.log('args.wallet', args.wallet)

            if(this.wallet != null)
                if(this.walletId != this.wallet.id) 
                    if(this.getWalletInterval != null) 
                        clearInterval(this.getWalletInterval);
                
            this.setWallet(args.wallet);

            if(this.getWalletInterval == null) {
                this.getWalletInterval = setInterval(() => {  
                    ipcRenderer.send('req:get-wallet', { walletId: this.walletId });
                    }, 5000)
            }

            if(this.wallet != null && !this.isSyncing) {
                ipcRenderer.send('req:get-transactions', { walletId: this.walletId })
                ipcRenderer.send('req:get-addresses', { walletId: this.walletId })
            }
        })
    },
    methods: {
        setWallet(wallet) {
            this.wallet = wallet;
        },
        displayADA(lovelaces) {
            return `${parseFloat(lovelaces/1000000).toFixed(6)} ADA`
        }
    }
  }
</script>