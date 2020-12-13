    <template>
    <v-container fluid :style="cssProps">
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
                                            class="bordered-panel"
                                            >
                                        <v-expansion-panel-header class="pl-5 pr-5 pt-0 pb-0">
                                            <v-row>
                                                <v-col sm="12">
                                                    <v-row>
                                                        <v-col sm="12" v-if="item.status == 'in_ledger'" class="pt-0 pb-2">
                                                            <v-chip small label color="danger" v-if="item.direction == 'outgoing'">
                                                                Sent
                                                            </v-chip>
                                                            <v-chip small label color="success" v-if="item.direction == 'incoming'">
                                                                Received
                                                            </v-chip>
                                                        </v-col>
                                                        <v-col sm="12" v-if="item.status == 'pending'" class="pt-0 pb-2">
                                                            <v-chip small label color="accent">
                                                                Pending
                                                            </v-chip>
                                                        </v-col>
                                                    </v-row>
                                                    <v-row>
                                                        <v-col sm="12" class="pt-0 pb-2">
                                                            {{displayADA(item.amount.quantity)}}
                                                        </v-col>
                                                    </v-row>
                                                </v-col>
                                            </v-row>
                                        </v-expansion-panel-header>
                                        <v-expansion-panel-content class="pa-0">
                                            <v-sheet class="pa-5" color="primary lighten-5" max-width="100vw">
                                                <v-row dense>
                                                    <v-col>
                                                        <p class="text-subtitle-2">Transaction Id</p>
                                                        <p class="text-body-2">{{item.id}}</p>
                                                    </v-col>
                                                </v-row>
                                                <v-divider></v-divider>
                                                <v-row dense>
                                                    <v-col>
                                                        <p class="text-subtitle-2">Inputs</p>
                                                        <div class="pa-0" v-for="(input,inputIndex) in item.inputs" :key="inputIndex">
                                                           <p class="text-caption">{{input.id}}</p>
                                                        </div>
                                                    </v-col>
                                                </v-row>
                                                <v-divider></v-divider>
                                                <v-row dense>
                                                    <v-col>
                                                        <p class="text-subtitle-2">Outputs</p>
                                                        <div class="pa-0" v-for="(output,outputIndex) in item.outputs" :key="outputIndex">
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
                                    <v-form
                                        v-model="sendFormValid"
                                        ref="form"
                                        lazy-validation>
                                        <!-- <v-card-text>
                                            <v-text-field
                                                v-model="walletForm.name"
                                                :counter="50"
                                                :rules="rules.name"
                                                label="Name"
                                                required
                                                >
                                            </v-text-field>

                                            <v-text-field
                                                v-model="walletForm.mnemonic"
                                                :rules="rules.mnemonic"
                                                label="Mnemonic"
                                                required
                                                >
                                            </v-text-field>

                                            <v-text-field
                                                :append-icon="showPassphrase ? 'mdi-eye' : 'mdi-eye-off'"
                                                v-model="walletForm.passphrase"
                                                :type="showPassphrase ? 'text' : 'password'"
                                                :rules="rules.passphrase"
                                                label="Passphrase"
                                                required
                                                @click:append="showPassphrase = !showPassphrase"
                                                >
                                            </v-text-field>
                                        </v-card-text>
                                        <v-card-actions>
                                            <v-btn color="primary" @click="submitAddWalletForm" :disabled="!walletFormValid">
                                                Submit
                                            </v-btn>
                                        </v-card-actions> -->
                                    </v-form>
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
    props: ['walletId','focus'],
    components: {
        WalletSyncing  
    },
    data: () => ({ 
        wallet: null,
        getWalletInterval: null,
        transactions: [],
        addresses: [],
        sendFormValid: true,
        showPassphrase: false,
        sendForm: {
            address: '',
            amount: '',
            passphrase: ''
        },
        rules: {
            name:[
                v => !!v || 'Name is required'
            ],
            amount:[
                v => !!v || 'Amount is required'
            ],
            passphrase:[
                v => !!v || 'Passphrase is required'
            ]
        }
    }),
    watch: {
        focus: function(newVal) {
            if(!newVal) {
                console.log('lost focus')
                if(this.getWalletInterval) clearInterval(this.getWalletInterval)
            }else {
                console.log('focused again')
                this.transactions = [];
                this.addresses = [];
                this.pollWallet();
            }
        },
        walletId: function(newVal, oldVal) {
            console.log('new',newVal);
            console.log('old',oldVal);
            if(newVal != oldVal) {
                if(this.getWalletInterval != null) {
                    clearInterval(this.getWalletInterval);
                    this.getWalletInterval = null;
                }
                this.transactions = [];
                this.addresses = [];
                this.pollWallet();
            }
        }
    },
    computed: {
        cssProps () {
            return {
                '--primary-color': this.$vuetify.theme.themes.light.primary.base
            }
        },
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
        this.pollWallet();

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
                
            this.setWallet(args.wallet);

            if(this.wallet != null && !this.isSyncing) {
                ipcRenderer.send('req:get-transactions', { walletId: this.walletId })
                if(this.addresses.length == 0) ipcRenderer.send('req:get-addresses', { walletId: this.walletId })
            }
        })
    },
    methods: {
        setWallet(wallet) {
            this.wallet = wallet;
        },
        displayADA(lovelaces) {
            return `${parseFloat(lovelaces/1000000).toFixed(6)} ADA`
        },
        pollWallet() {
            ipcRenderer.send('req:get-wallet', { walletId: this.walletId })
            this.getWalletInterval = setInterval(() => {  
                ipcRenderer.send('req:get-wallet', { walletId: this.walletId });
            }, 5000)
        }
    }
  }
</script>

<style scoped>
.bordered-panel
{
    border-bottom-color: var(--primary-color);
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-left-radius: 0px !important;
    border-bottom-right-radius: 0px !important;
}
</style>