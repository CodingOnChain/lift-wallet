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
                                    <v-simple-table>
                                        <template v-slot:default>
                                            <thead>
                                                <tr>
                                                <th class="text-left">
                                                    Index
                                                </th>
                                                <th class="text-left">
                                                    Address
                                                </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr
                                                v-for="item in addresses"
                                                :key="item.id"
                                                >
                                                <td>{{ item.index }}</td>
                                                <td>{{ item.address }}</td>
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
                                                @focus="addressFocusIn"
                                                :disabled="isSendingAda"
                                                ></v-text-field>

                                             
                                            <v-text-field
                                                v-model="sendForm.amountFormatted"
                                                :error-messages="amountErrors"
                                                label="Amount (ADA)"
                                                @input="$v.amount.$touch()"
                                                @blur="sendAdaFocusOut" 
                                                @focus="sendAdaFocusIn"
                                                :hint="`Est. Fee: ${sendForm.feeFormatted}`"
                                                persistent-hint
                                                :disabled="isSendingAda || sendForm.readonlyAmount"
                                                required
                                                >
                                            </v-text-field>

                                            <v-checkbox
                                                v-model="sendForm.readonlyAmount"
                                                class="mt-5"
                                                label="Send All"
                                                @change="toggleSendAll"
                                                ></v-checkbox>


                                            <v-input
                                                class="mt-5"
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
                                                :disabled="isSendingAda"
                                                @click:append="showPassphrase = !showPassphrase"
                                                @input="$v.passphrase.$touch()"
                                                @blur="$v.passphrase.$touch()"
                                                @focus="passphraseFocusIn"
                                                >
                                            </v-text-field>

                                            <v-file-input
                                                v-model="sendForm.metadataFile"
                                                label="Metadata File">
                                            </v-file-input>
                                        </v-card-text>
                                        <v-card-actions>
                                            <v-btn 
                                                color="primary" 
                                                v-if="!isSendingAda"
                                                :disabled="$v.$invalid" 
                                                @click="submitSendAda">
                                                Submit
                                            </v-btn>
                                            <Loader v-if="isSendingAda" />
                                        </v-card-actions>
                                    </v-form>
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
  const { ipcRenderer, shell } = require('electron')
  import { mapGetters } from 'vuex';
  import * as walletTypes from '../../store/wallet/types';
  import dayjs from 'dayjs'
  import { validationMixin } from 'vuelidate'
  import Loader from '../Loader'

  export default {
    name: 'WalletDetails',
    props: ['walletId','focus'],
    mixins: [validationMixin],
    components: { Loader },
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
        sendForm: {
            address: '',
            amount: 0,
            amountFormatted: '0.000000',
            fee: 0,
            feeFormatted: '0.000000',
            total: 0,
            totalFormatted: '0.000000',
            tokenAmmount: '0.000000',
            passphrase: '',
            metadataFile: null,
            validAddress: true,
            validPassphrase: true,
            validAmount: true,
            readonlyAmount: false
        },
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
                console.log('focus false')
                clearInterval(this.getWalletInterval)
            }else {
                this.transactions = null;
                this.isSendingAda = false;
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
                this.tabIndex = 0;
                this.transactions = null;
                this.isSendingAda = false;
                this.addresses = [];
                console.log('new wallet id')
                this.pollWallet();
            }
        }
    },
    computed: {
         ...mapGetters({
          network: walletTypes.NAMESPACE + walletTypes.NETWORK
        }),
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
            !this.sendForm.validAmount && errors.push('Amount needs to be at least 1 ADA');
            return errors;
        },
        passphraseErrors: function() {
            const errors = [];
            if (!this.$v.passphrase.$dirty) return errors
            this.sendForm.passphrase.length == 0 && errors.push('Passphrase is required.')
            !this.sendForm.validPassphrase && errors.push('Incorrect passphrase')
            return errors;
        }
    },
    destroyed() {
        console.log('destroy')
        clearInterval(this.getWalletInterval)
        this.getWalletInterval = null;
        this.transactions = null;
        this.isSendingAda = false;
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
        ipcRenderer.on('res:mint-asset', this.transactionResult)
    },
    methods: {
        toggleSendAll() {
            const shouldSendAll = this.sendForm.readonlyAmount;
            if (shouldSendAll) {
                this.sendForm.amount = this.wallet.balance/1000000;
                this.sendForm.amountFormatted = `${parseFloat(this.sendForm.amount).toFixed(6)}`;
                this.getFee();
            }
        },
        sendToken(){
            console.log("send token");
        },
        transactionResult(_, args) {
            this.isSendingAda = false;
            console.log('transaction result', args.transaction);
            if(args.transaction.error){
                alert(args.transaction.error);
            }else {
                this.sendForm = {
                    address: '',
                    amount: 0,
                    amountFormatted: '0.000000',
                    fee: 0,
                    feeFormatted: '0.000000',
                    total: 0,
                    totalFormatted: '0.000000',
                    passphrase: '',
                    validAddress: true,
                    validPassphrase: true,
                    validAmount: true
                };
                this.mintForm = {
                    asset: 'lift',
                    amount: 1,
                    passphrase: '',
                    metadataFile: null,
                };
                this.$v.$reset();
                this.tabIndex = 0;
            }

            // if(args.transaction.code == 'wrong_encryption_passphrase') {
            //     this.sendForm.validPassphrase = false;
            //     this.$v.passphrase.$touch();
            // } else if(args.transaction.code == 'utxo_too_small') {
            //     this.sendForm.validAmount = false;
            //     this.$v.amount.$touch();
            // }
        },
        setTransactions(_, args) {
            this.transactions = args.transactions;
        },
        setFee(_, args) {
            console.log('fees',args);
            if(args.fee != undefined) {
                const fee = args.fee/1000000

                this.sendForm.validAddress = true;
                this.setSendAdaFee(fee);

                if (this.sendForm.readonlyAmount) {
                    const availableWithoutFee = this.wallet.balance - args.fee;

                    this.sendForm.amount = availableWithoutFee/1000000;
                    this.sendForm.amountFormatted = `${parseFloat(availableWithoutFee/1000000).toFixed(6)}`;

                    this.sendForm.total =  this.wallet.balance;
                    this.sendForm.totalFormatted = `${parseFloat(this.sendForm.total/1000000).toFixed(6)}`;
                }
            }else{
                this.sendForm.validAddress = false;
            }
        },
        setAddresses(_, args) {
            console.log(args);
            this.addresses = args.addresses;
        },
        updateWallet(_, args) { 
            //args.isSuccessful needs to be handled
            this.setWallet(args.data);
            console.log('got wallet', this.wallet)
            if(this.wallet != null) {
                ipcRenderer.send('req:get-transactions', { network: 'testnet', wallet: this.walletId })
                if(this.addresses.length == 0) ipcRenderer.send('req:get-addresses', { name: this.walletId, network: 'testnet' })
            }
        },
        setWallet(wallet) {
            console.log(wallet)
            this.wallet = wallet;
        },
        displayADA(lovelaces) {
            return `${parseFloat(lovelaces/1000000).toFixed(6)} ADA`
        },
        pollWallet() {
            ipcRenderer.send('req:get-wallet', { name: this.walletId, network: 'testnet' })
            this.getWalletInterval = setInterval(() => {  
                ipcRenderer.send('req:get-wallet', { name: this.walletId, network: 'testnet' });
            }, 5000)
        },
        getFee() {
            if(this.sendForm.address.length > 0)
            {
                const amount = (this.sendForm.amount < 1000000) ? 1000000 : this.sendForm.amount;
                ipcRenderer.send('req:get-fee', { network: 'testnet', wallet: this.walletId, address: this.sendForm.address, amount: amount})
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
            this.sendForm.validAmount = true;
            // Unformat display value before user starts modifying it
            this.sendForm.amountFormatted = this.sendForm.amount.toString();
        },
        passphraseFocusIn: function() {
            this.sendForm.validPassphrase = true;
        },
        addressFocusIn: function() {
            this.sendForm.validAddress = true;
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
                this.isSendingAda = true;
                let metadata = null;
                if(this.sendForm.metadataFile != null) metadata = this.sendForm.metadataFile.path;
                console.log(metadata)
                ipcRenderer.send(
                    'req:send-transaction', 
                    { 
                        network: 'testnet', 
                        wallet: this.walletId, 
                        address: this.sendForm.address, 
                        amount: this.sendForm.amount*1000000 , 
                        passphrase: this.sendForm.passphrase,
                        metadata: metadata    
                    })
            }
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
                    })
        },
        getFormattedDate(txDate){
            return dayjs(txDate).format('MMM D, YYYY h:mm A')
        },
        navigateToTx(url) {
            shell.openExternal(url)
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
