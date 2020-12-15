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
                                                        <v-col sm="12" v-if="item.status == 'expired'" class="pt-0 pb-2">
                                                            <v-chip small label color="error">
                                                                Expired
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
                                    <v-form>
                                        <v-card-text>
                                            <v-text-field
                                                v-model="sendForm.address"
                                                label="Address"
                                                @change="getFee"
                                                :error-messages="addressErrors"
                                                required
                                                @input="$v.address.$touch()"
                                                @blur="$v.address.$touch()"
                                                ></v-text-field>

                                            <v-text-field
                                                v-model="sendForm.amountFormatted"
                                                :error-messages="amountErrors"
                                                label="Amount (ADA)"
                                                @input="$v.amount.$touch()"
                                                @blur="sendAdaFocusOut" 
                                                @focus="sendAdaFocusIn"
                                                required
                                                >
                                            </v-text-field>

                                            <v-input
                                                label="Est. Fee (ADA)"
                                                >: {{sendForm.feeFormatted}}
                                                </v-input>

                                            <v-input
                                                label="Total (ADA)"
                                                >: {{sendForm.totalFormatted}}
                                                </v-input>

                                            <v-text-field
                                                :append-icon="showPassphrase ? 'mdi-eye' : 'mdi-eye-off'"
                                                v-model="sendForm.passphrase"
                                                :type="showPassphrase ? 'text' : 'password'"
                                                :error-messages="passphraseErrors"
                                                label="Passphrase"
                                                required
                                                @click:append="showPassphrase = !showPassphrase"
                                                @input="$v.passphrase.$touch()"
                                                @blur="$v.passphrase.$touch()"
                                                >
                                            </v-text-field>
                                        </v-card-text>
                                        <v-card-actions>
                                            <v-btn color="primary" :disabled="$v.$invalid" @click="submitSendAda">
                                                Submit
                                            </v-btn>
                                        </v-card-actions>
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
  import { validationMixin } from 'vuelidate'
  import WalletSyncing from './wallet-details/WalletSyncing'

  export default {
    name: 'WalletDetails',
    props: ['walletId','focus'],
    components: {
        WalletSyncing  
    },
    mixins: [validationMixin],

    validations: {
      address: {  },
      amount: {  },
      passphrase: {  }
    },
    data: () => ({ 
        wallet: null,
        getWalletInterval: null,
        transactions: [],
        addresses: [],
        sendFormValid: false,
        showPassphrase: false,
        sendForm: {
            address: '',
            amount: 0,
            amountFormatted: '0.000000',
            fee: 0,
            feeFormatted: '0.000000',
            total: 0,
            totalFormatted: '0.000000',
            passphrase: '',
            validAddress: true
        }
    }),
    watch: {
        focus: function(newVal) {
            if(!newVal) {
                console.log('focus false')
                clearInterval(this.getWalletInterval)
            }else {
                this.transactions = [];
                this.addresses = [];
                clearInterval(this.getWalletInterval)
                console.log('focus true')
                this.pollWallet();
            }
        },
        walletId: function(newVal, oldVal) {
            if(newVal != oldVal) {
                clearInterval(this.getWalletInterval);
                this.getWalletInterval = null;
                
                this.transactions = [];
                this.addresses = [];
                console.log('new wallet id')
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
        },
        addressErrors: function() {
            const errors = [];
            if (!this.$v.address.$dirty) return errors
            this.sendForm.address.length == 0 && errors.push('Address is required.')
            !this.sendForm.validAddress && errors.push('Address is invalid.')
            return errors;
        },
        amountErrors: function() {
            const errors = [];
            if (!this.$v.amount.$dirty) return errors
            this.sendForm.amount.length == 0 && errors.push('Amount is required.')
            return errors;
        },
        passphraseErrors: function() {
            const errors = [];
            if (!this.$v.passphrase.$dirty) return errors
            this.sendForm.passphrase.length == 0 && errors.push('Passphrase is required.')
            return errors;
        },
    },
    destroyed() {
        console.log('destroy')
        clearInterval(this.getWalletInterval)
        this.getWalletInterval = null;
        ipcRenderer.off('res:get-transactions', this.setTransactions);
        ipcRenderer.off('res:get-fee', this.setFee);
        ipcRenderer.off('res:get-addresses', this.setAddresses);
        ipcRenderer.off('res:get-wallet', this.updateWallet)
    },
    mounted() {
        console.log('mounted poll')
        this.pollWallet();

        ipcRenderer.on('res:get-transactions', this.setTransactions);
        ipcRenderer.on('res:get-fee', this.setFee);
        ipcRenderer.on('res:get-addresses', this.setAddresses);
        ipcRenderer.on('res:get-wallet', this.updateWallet);
        ipcRenderer.on('res:send-transaction', this.transactionResult)
    },
    methods: {
        transactionResult(_, args) {
            console.log(args.transaction);
        },
        setTransactions(_, args) {
            this.transactions = args.transactions;
        },
        setFee(_, args) {
            console.log('fees',args);
            if(args.fee.estimated_max != undefined) {
                const fee = args.fee.estimated_max.quantity/1000000

                this.sendForm.validAddress = true;
                this.setSendAdaFee(fee);
            }else{
                this.sendForm.validAddress = false;
            }
        },
        setAddresses(_, args) {
            this.addresses = args.addresses;
        },
        updateWallet(_, args) {                
            this.setWallet(args.wallet);
            console.log('got wallet', this.walletId)
            if(this.wallet != null && !this.isSyncing) {
                ipcRenderer.send('req:get-transactions', { walletId: this.walletId })
                if(this.addresses.length == 0) ipcRenderer.send('req:get-addresses', { walletId: this.walletId })
            }
        },
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
        },
        getFee() {
            if(this.sendForm.address.length > 0)
            {
                const amount = (this.sendForm.amount < 1000000) ? 1000000 : this.sendForm.amount;
                ipcRenderer.send('req:get-fee', {walletId: this.walletId, address: this.sendForm.address, amount: amount})
            }
            
        },
        sendAdaFocusOut: function() {
            // Recalculate the currencyValue after ignoring "$" and "," in user input
            this.sendForm.amount = parseFloat(this.sendForm.amountFormatted.replace(/[^\d.]/g, ""))
            // Ensure that it is not NaN. If so, initialize it to zero.
            // This happens if user provides a blank input or non-numeric input like "abc"
            if (isNaN(this.sendForm.amount)) {
                this.sendForm.amount = 0
            }
						// Format display value based on calculated currencyValue
            this.sendForm.amountFormatted = this.sendForm.amount.toFixed(6)
            this.setSendAdaTotal();
        },
        sendAdaFocusIn: function() {
            // Unformat display value before user starts modifying it
            this.sendForm.amountFormatted = this.sendForm.amount.toString();
        },
        setSendAdaFee(ada) {
            // Recalculate the currencyValue after ignoring "$" and "," in user input
            this.sendForm.fee = parseFloat(ada)
            // Ensure that it is not NaN. If so, initialize it to zero.
            // This happens if user provides a blank input or non-numeric input like "abc"
            if (isNaN(ada)) {
                console.log('nan')
                this.sendForm.fee = 0
            }
						// Format display value based on calculated currencyValue
            this.sendForm.feeFormatted = ada.toFixed(6)
            this.setSendAdaTotal();
        },
        setSendAdaTotal() {
            this.sendForm.total = parseFloat(this.sendForm.amount) + parseFloat(this.sendForm.fee);
            this.sendForm.totalFormatted = this.sendForm.total.toFixed(6)
            console.log(this.sendForm)
        },
        submitSendAda() {
            this.$v.$touch()
            if (!this.$v.$invalid) {
                console.log('valid')

                ipcRenderer.send('req:send-transaction', {walletId: this.walletId, address: this.sendForm.address, amount: this.sendForm.amount*1000000, passphrase: this.sendForm.passphrase})
            }
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