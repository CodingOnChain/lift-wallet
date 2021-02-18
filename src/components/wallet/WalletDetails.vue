<template>
    <v-container fluid :style="cssProps">
        <v-row no-gutters>
            <v-col>
                <v-card flat v-if="wallet != null">
                    <v-card-title>Total: {{ displayADA(wallet.balance) }}</v-card-title>
                </v-card>
            </v-col>
        </v-row>
        <v-row no-gutters>
            <v-col>
                <v-card flat v-if="wallet != null">
                    <v-sheet height="100%" width="100%">
                        <v-tabs v-model="tabIndex" centered grow background-color="primary" dark>
                            <v-tab>Transactions</v-tab>
                            <v-tab>Receive</v-tab>
                            <v-tab>Send</v-tab>
                            <v-tab>Mint</v-tab>
                            <v-tab-item>
                                <Loader v-if="transactions == null" />
                                <v-row no-gutters v-if="transactions != null && transactions.length == 0">
                                    <v-col
                                        md="6"
                                        offset-md="3"
                                    >
                                        <v-card
                                            class="pa-2 text-center"
                                            flat
                                        >
                                            <v-card-subtitle>Doesn't look like you have any transactions</v-card-subtitle>
                                        </v-card>
                                    </v-col>
                                </v-row>
                                <v-simple-table v-if="transactions != null && transactions.length > 0">
                                    <template v-slot:default>
                                        <tbody>
                                            <tr v-for="tx in transactions"
                                                :key="tx.hash"
                                                >
                                            <td class="pa-4">
                                                {{ tx.amount }} ADA<br/>
                                                <v-chip small label :color="tx.direction == 'Sent' ? 'error' : 'success'">
                                                    {{tx.direction}}
                                                </v-chip>
                                            </td>
                                            <td class="pa-4">
                                                <a target="_blank" @click="navigateToTx(`https://explorer.cardano-testnet.iohkdev.io/en/transaction?id=${tx.hash}`)">{{ tx.hash }}</a>
                                            </td>
                                            <td class="pa-4">{{ getFormattedDate(tx.datetime) }}</td>
                                            </tr>
                                        </tbody>
                                    </template>
                                </v-simple-table>
                            </v-tab-item>

                            <v-tab-item>
                                <v-card>
                                    <AddressesTable :tableItems=addresses></AddressesTable>                                    
                                </v-card>
                            </v-tab-item>

                            <v-tab-item>
                                <v-card>
                                   <WalletSend :isSync=isSendingAda></WalletSend>              
                                </v-card>
                            </v-tab-item>

                            <v-tab-item>
                                <v-card>
                                    <v-form>
                                        <v-card-text>
                                            <v-text-field
                                                v-model="mintForm.asset"
                                                label="Asset Name"
                                                ></v-text-field>

                                             <v-text-field
                                                v-model="mintForm.amount"
                                                label="Amount"
                                                ></v-text-field>

                                            <v-text-field
                                                :append-icon="showMintPassphrase ? 'mdi-eye' : 'mdi-eye-off'"
                                                v-model="mintForm.passphrase"
                                                :type="showMintPassphrase ? 'text' : 'password'"
                                                label="Passphrase"
                                                @click:append="showMintPassphrase = !showMintPassphrase"
                                                >
                                            </v-text-field>

                                            <v-file-input
                                                v-model="mintForm.metadataFile"
                                                label="Metadata File">
                                            </v-file-input>
                                             
                                            <v-btn 
                                                color="primary"                                             
                                                @click="mintAsset">
                                                Mint
                                            </v-btn>

                                          
                                      </v-card-text>
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
  const { ipcRenderer, shell } = require('electron');
  import dayjs from 'dayjs';
  import { validationMixin } from 'vuelidate';
  import Loader from '../Loader';
  import AddressesTable from '../wallet/wallet-adresses/AddressesTable';
  import WalletSend from '../wallet/wallet-details/WalletSend';

  export default {
    name: 'WalletDetails',
    props: ['walletId','focus'],
    mixins: [validationMixin],
    components: { Loader,AddressesTable,WalletSend },
    validations: {
      address: {  },
      amount: {  },
      passphrase: {  }
    },
    data: () => ({ 
        wallet: null,
        tabIndex: 0,
        getWalletInterval: null,
        transactions: null,
        addresses: [],
        sendFormValid: false,
        showPassphrase: false,
        showMintPassphrase: false,
        isSendingAda: false,       
        mintForm: {
            asset: 'lift',
            amount: 1,
            passphrase: '',
            metadataFile: null,
        } 
    }),
    watch: {
        focus: function(newVal) {
            if(!newVal) {
                console.log('focus false');
                clearInterval(this.getWalletInterval);
            }else {
                this.transactions = null;
                this.isSendingAda = false;
                this.addresses = [];
                clearInterval(this.getWalletInterval);
                console.log('focus true');
                this.pollWallet();
            }
        },
        walletId: function(newVal, oldVal) {
            if(newVal != oldVal) {
                clearInterval(this.getWalletInterval);
                this.getWalletInterval = null;
                this.tabIndex = 0;
                this.transactions = null;
                this.isSendingAda = false;
                this.addresses = [];
                console.log('new wallet id');
                this.pollWallet();
            }
        }
    },
    computed: {
        cssProps () {
            return {
                '--primary-color': this.$vuetify.theme.themes.light.primary.base
            };
        },
        isSyncing: function() {
            if(this.wallet == null) return false;
            if(this.wallet.state.status != "ready")
            {
                if(this.wallet.state.progress != null
                    && this.wallet.state.progress != undefined) {
                    if(this.wallet.state.progress?.quantity < 100) {
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
                return this.wallet.state.progress.quantity;
            }
            return 0;
        },      
    },
    destroyed() {
        // console.log('destroy');
        // clearInterval(this.getWalletInterval);
        // this.getWalletInterval = null;
        // this.transactions = null;
        // this.isSendingAda = false;
        // ipcRenderer.off('res:get-transactions', this.setTransactions);
        // ipcRenderer.off('res:get-fee', this.setFee);
        // ipcRenderer.off('res:get-addresses', this.setAddresses);
        // ipcRenderer.off('res:get-wallet', this.updateWallet);
    },
    mounted() {        
        this.pollWallet();
    },
    methods: {                             
        displayADA(lovelaces) {
            return `${parseFloat(lovelaces/1000000).toFixed(6)} ADA`;
        },
        pollWallet() {
            ipcRenderer.send('req:get-wallet', { name: this.walletId, network: 'testnet' });
            this.getWalletInterval = setInterval(() => {  
                ipcRenderer.send('req:get-wallet', { name: this.walletId, network: 'testnet' });
            }, 5000);
        },       
        
        mintAsset() {
            let metadata = null;
            if(this.mintForm.metadataFile != null) metadata = this.mintForm.metadataFile.path;
            ipcRenderer.send(
                    'req:mint-asset', 
                    { 
                        network: 'testnet', 
                        walletName: this.walletId, 
                        assetName: this.mintForm.asset, 
                        assetAmount: this.mintForm.amount, 
                        passphrase: this.mintForm.passphrase,
                        metadata: metadata    
                    });
        },
        getFormattedDate(txDate){
            return dayjs(txDate).format('MMM D, YYYY h:mm A');
        },
        navigateToTx(url) {
            shell.openExternal(url);
        }
    }
  };
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
