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
            <v-tabs
              v-model="tabIndex"
              centered
              grow
              background-color="primary"
              dark
            >
              <v-tab>Transactions</v-tab>
              <v-tab>Receive</v-tab>
              <v-tab>Send</v-tab>
              <v-tab>Mint</v-tab>

              <v-tab-item>
                <v-card>
                  <WalletTransactions></WalletTransactions>
                </v-card>
              </v-tab-item>

              <v-tab-item>
                <v-card>
                  <WalletAddresses></WalletAddresses>

                </v-card>
              </v-tab-item>

              <v-tab-item>
                <v-card>

                  <WalletSend
                    :isSync="isSendingAda"
                    @money-sent="theMoneyHasBeenSent"
                  ></WalletSend>
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
                        :append-icon="
                          showMintPassphrase ? 'mdi-eye' : 'mdi-eye-off'
                        "
                        v-model="mintForm.passphrase"
                        :type="showMintPassphrase ? 'text' : 'password'"
                        label="Passphrase"
                        @click:append="showMintPassphrase = !showMintPassphrase"
                      >
                      </v-text-field>

                      <v-file-input
                        v-model="mintForm.metadataFile"
                        label="Metadata File"
                      >
                      </v-file-input>

                      <v-btn color="primary" @click="mintAsset"> Mint </v-btn>
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
const { ipcRenderer, shell } = require("electron");

import { validationMixin } from "vuelidate";
import WalletAddresses from "../wallet/wallet-details/WalletAddresses";
import WalletSend from "../wallet/wallet-details/WalletSend";
import WalletTransactions from "../wallet/wallet-details/WalletTransactions";
import * as walletTypes from "../../store/wallet/types";
import { mapActions, mapGetters } from "vuex";


export default {
  name: "WalletDetails",
  props: ["walletId", "focus"],
  mixins: [validationMixin],

  components: { WalletAddresses, WalletSend, WalletTransactions },

  validations: {
    address: {},
    amount: {},
    passphrase: {},
  },
  data: () => ({

    tabIndex: 0,
    getWalletInterval: null,

    sendFormValid: false,
    showPassphrase: false,
    showMintPassphrase: false,
    isSendingAda: false,

    mintForm: {
      asset: "lift",
      amount: 1,
      passphrase: "",
      metadataFile: null,
    },
  }),
  watch: {
    focus: function (newVal) {

      if (!newVal) {
        console.log("focus false");
        clearInterval(this.getWalletInterval);
      } else {

        this.isSendingAda = false;
        clearInterval(this.getWalletInterval);
        console.log("focus true");
        this.pollWallet();
      }
    },

    walletId: function (newVal, oldVal) {
      if (newVal != oldVal) {
        clearInterval(this.getWalletInterval);
        this.getWalletInterval = null;
        this.tabIndex = 0;
        this.isSendingAda = false;
        console.log("new wallet id");
        this.pollWallet();
      }
    },
  },
  computed: {
    ...mapGetters({
      wallet: walletTypes.NAMESPACE + walletTypes.WALLET,
      transactions: walletTypes.NAMESPACE + walletTypes.TRANSACTION,
    }),
    cssProps() {
      return {
        "--primary-color": this.$vuetify.theme.themes.light.primary.base,
      };
    },
    isSyncing: function () {
      if (this.wallet == null) return false;
      if (this.wallet.state.status != "ready") {
        if (
          this.wallet.state.progress != null &&
          this.wallet.state.progress != undefined
        ) {
          if (this.wallet.state.progress?.quantity < 100) {
            return true;
          }
        }
      }
      return false;
    },
    syncProgress: function () {
      if (this.wallet == null) return 0;
      if (
        this.wallet.state.progress != null &&
        this.wallet.state.progress != undefined
      ) {
        return this.wallet.state.progress.quantity;
      }
      return 0;
    },
  },
  destroyed() {
     console.log('destroy');    
  },
  mounted() {
    this.setUpSendDataWallet();
    this.pollWallet();
  },
  methods: {
    ...mapActions({
      setUpSendDataWallet:
        walletTypes.NAMESPACE + walletTypes.SET_UP_SEND_WALLET_DATA,
    }),

    displayADA(lovelaces) {
      return `${parseFloat(lovelaces / 1000000).toFixed(6)} ADA`;
    },
    pollWallet() {
      ipcRenderer.send("req:get-wallet", {
        name: this.walletId,
        network: "testnet",
      });
      this.getWalletInterval = setInterval(() => {
        ipcRenderer.send("req:get-wallet", {
          name: this.walletId,
          network: "testnet",
        });
      }, 5000);
    },

    theMoneyHasBeenSent() {
      console.log("the money has been sent");
      this.tabIndex=0;
      this.$v.$reset();
    },
    mintAsset() {
      let metadata = null;
      if (this.mintForm.metadataFile != null)
        metadata = this.mintForm.metadataFile.path;
      ipcRenderer.send("req:mint-asset", {
        network: "testnet",
        walletName: this.walletId,
        assetName: this.mintForm.asset,
        assetAmount: this.mintForm.amount,
        passphrase: this.mintForm.passphrase,
        metadata: metadata,
      });
    },
    navigateToTx(url) {
      shell.openExternal(url);
    },
  },
};
</script>

<style scoped>
.bordered-panel {
  border-bottom-color: var(--primary-color);
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-left-radius: 0px !important;
  border-bottom-right-radius: 0px !important;
}
</style>
