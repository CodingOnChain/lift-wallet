<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-btn
          color="error lighten-1"
          class="float-right"
          v-on:click="cancelAdd"
          >Cancel Wallet Creation</v-btn
        >
      </v-col>
    </v-row>

    <v-stepper v-model="e6" vertical>
      <!-- Step 1 -->
      <v-stepper-step :complete="e6 > 1" step="1">
        Create / Import
      </v-stepper-step>

      <v-stepper-content step="1">
        <v-card flat>
          <v-row>
            <v-col lg="6" md="12">
              <v-sheet outlined color="primary" rounded>
                <v-card class="pa-2" outlined>
                  <v-card-title>Create a Wallet</v-card-title>
                  <v-card-subtitle
                    >I do not already have a wallet.</v-card-subtitle
                  >
                  <v-card-actions>
                    <v-btn color="primary" @click="getNewMnemonic">
                      Create Now
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-sheet>
            </v-col>
            <v-col lg="6" md="12">
              <v-sheet outlined color="secondary" rounded>
                <v-card class="pa-2" outlined>
                  <v-card-title>Import a Wallet</v-card-title>
                  <v-card-subtitle
                    >I already have a wallet. I have my mnemonic
                    words.</v-card-subtitle
                  >
                  <v-card-actions>
                    <v-btn color="secondary" @click="importWords">
                      Import Now
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-sheet>
            </v-col>
          </v-row>
        </v-card>
      </v-stepper-content>

      <!-- Step 2 -->
      <v-stepper-step :complete="e6 > 2" step="2">
        Generate Mnemonics
      </v-stepper-step>

      <v-stepper-content step="2">
        <v-card flat>
          <v-row>
            <v-col sm="12">
              <v-sheet outlined color="primary" rounded>
                <v-card class="pa-2" outlined>
                  <v-card-title>Record Your Mnemonic Words</v-card-title>
                  <v-card-subtitle
                    >After this step, Perdix will not be able to show you these
                    words. Please be responsible and write these down. <br />You
                    will be required to re-enter this words during the next
                    step.</v-card-subtitle
                  >
                  <v-card-text>
                    <v-sheet class="pa-5" color="primary lighten-4" rounded="">
                      <h3>{{ newMnemonic }}</h3>
                    </v-sheet>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn color="primary" @click="importWords">
                      Continue
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-sheet>
            </v-col>
          </v-row>
        </v-card>
      </v-stepper-content>

      <!-- Step 3 -->
      <v-stepper-step :complete="e6 > 3" step="3"> Add Wallet </v-stepper-step>

      <v-stepper-content step="3">
        <v-card flat>
          <v-row>
            <v-col sm="12">
              <v-sheet outlined color="primary" rounded>
                <v-card class="pa-2" outlined>
                  <v-card-title>Complete Form</v-card-title>
                  <v-card-subtitle
                    >Please fill out the form to complete your wallet
                    creation.</v-card-subtitle
                  >
                  <v-form v-model="walletFormValid" ref="form" lazy-validation>
                    <v-card-text>
                      <v-text-field
                        v-model="walletForm.name"
                        :counter="50"
                        :rules="rules.name"
                        label="Name"
                        :disabled="isSubmitting"
                        required
                      >
                      </v-text-field>

                      <v-text-field
                        v-model="walletForm.mnemonic"
                        :rules="rules.mnemonic"
                        label="Mnemonic"
                        :disabled="isSubmitting"
                        required
                      >
                      </v-text-field>

                      <v-text-field
                        :append-icon="
                          showPassphrase ? 'mdi-eye' : 'mdi-eye-off'
                        "
                        v-model="walletForm.passphrase"
                        :type="showPassphrase ? 'text' : 'password'"
                        :rules="rules.passphrase"
                        label="Passphrase"
                        required
                        :disabled="isSubmitting"
                        @click:append="showPassphrase = !showPassphrase"
                      >
                      </v-text-field>
                    </v-card-text>
                    <v-card-actions>
                      <v-btn
                        color="primary"
                        v-if="!isSubmitting"
                        @click="submitAddWalletForm"
                        :disabled="!walletFormValid"
                      >
                        Submit
                      </v-btn>
                      <Loader v-if="isSubmitting" />
                    </v-card-actions>
                  </v-form>
                </v-card>
              </v-sheet>
            </v-col>
          </v-row>
        </v-card>
      </v-stepper-content>
    </v-stepper>
  </v-container>
</template>

<script>
    const { ipcRenderer } = require('electron');
    import { mapActions } from 'vuex';
    import * as walletTypes from '../../store/wallet/types';
    import Loader from '../Loader';

    export default {
        name: "AddWallet",
        components: { Loader },
        data: () => ({
            e6: 1,
            newMnemonic: '',
            walletFormValid: true,
            showPassphrase: false,
            isSubmitting: false,
            walletForm: {
                name: '',
                mnemonic: '',
                passphrase: '',
                network: 'testnet'
            },
            rules: {
                name:[
                    v => !!v || 'Name is required',
                    v => (v && v.length <= 50) || 'Name must be less than 50 characters',
                ],
                mnemonic:[
                    v => !!v || 'Mnemonic is required',
                    v => (v && !!(v.split(" ").length == 9 || v.split(" ").length == 12 || v.split(" ").length == 15 || v.split(" ").length == 18 || v.split(" ").length == 21 || v.split(" ").length == 24)) 
                    || 'Mnemonic must have 9, 12 ,15, 18, 21 or 24 words'
                ],
                passphrase:[
                    v => !!v || 'Passphrase is required',
                    v => (v && v.length >= 10) || 'Passphrase must be greater than 10 characters',
                ]
            }
        }),
        mounted() {
            this.setUpWallet();
            ipcRenderer.on('res:generate-recovery-phrase', (_, args) => {
                console.log('phrase',args);
                if(args.isSuccessful) {
                    this.newMnemonic = args.data;
                    this.e6 = 2;
                }else {
                    console.log(args.data);
                }
            });

            ipcRenderer.on('res:add-wallet', (_, args) => {
                this.isSubmitting = false;
                console.log('new wallet', args);
                if(args.isSuccessful) {
                    this.e6 = 1;
                    this.newMnemonic = '';
                    this.$emit('added-wallet', { wallet: args.data });
                }else {
                    //err
                }
            });
        },
        methods: {
            ...mapActions({
                setUpWallet: walletTypes.NAMESPACE + walletTypes.SET_UP_WALLET,            
                getNewNemonic: walletTypes.NAMESPACE + walletTypes.GET_NEW_MNEMONIC,            
            }),
            getNewMnemonic: function() {
                ipcRenderer.send('req:generate-recovery-phrase');
            },
            importWords: function() {
                this.newMnemonic = '';
                this.e6 = 3;
            },
            cancelAdd: function(){
                this.e6 = 1;
                this.newMnemonic = '';
                this.$emit('cancel-add');
            },
            submitAddWalletForm: function() {
                this.isSubmitting = true;
                ipcRenderer.send('req:add-wallet', this.walletForm);
            }
        }
    };
</script>