<template>
  <v-form>
    <v-card-text>
      <loading
        :active="isLoadingData"
        :can-cancel="true"
        :is-full-page="false"
      ></loading>
      <v-text-field
        v-model="address"
        label="Address"
        @change="getFee"
        required
        @focus="addressFocusIn"
      ></v-text-field>

      <v-text-field
        v-model="newAmountToBeFormatted"
        label="Amount (ADA)"
        @blur="sendAdaFocusOut"
        @focus="sendAdaFocusIn"
        :hint="`Est. Fee: ${feeFormatted}`"
        persistent-hint
        :disabled="isSync || isReadonlyAmount"
        required
      >
      </v-text-field>

      <v-checkbox
        v-model="isReadonlyAmount"
        class="mt-5"
        label="Send All"
        @change="toggleSendAll"
      ></v-checkbox>

      <v-input class="mt-5" label="Total (ADA)"
        >: {{ totalFormatted }}
      </v-input>

      <v-text-field
        :append-icon="showPassphrase ? 'mdi-eye' : 'mdi-eye-off'"
        v-model="passphrase"
        :type="showPassphrase ? 'text' : 'password'"
        label="Passphrase"
        required
        :disabled="isSync"
        @click:append="showPassphrase = !showPassphrase"
        @focus="passphraseFocusIn"
      >
      </v-text-field>

      <v-file-input v-model="metadataFileToSend" label="Metadata File">
      </v-file-input>
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" v-if="!isSync" @click="submitSendAda">
        Submit
      </v-btn>
    </v-card-actions>
  </v-form>
</template>
<script>
import Loading from "vue-loading-overlay";
import "vue-loading-overlay/dist/vue-loading.css";
import { validationMixin } from "vuelidate";
import { mapGetters, mapActions } from "vuex";
import * as walletTypes from "../../../store/wallet/types";

export default {
  mixins: [validationMixin],
  components: { Loading },
  data() {
    return {
      address: null,
      showPassphrase: false,
      isLoadingData: false,
      passphrase: null,
      isValidPassphrase: false,
      isReadonlyAmount: false,
      metadataFileToSend: null,
      newAmountToBeFormatted: "0.000000",
    };
  },
  props: {
    isSync: Boolean,
  },
  computed: {
    ...mapGetters({
      wallet: walletTypes.NAMESPACE + walletTypes.WALLET,
      isValidAdress: walletTypes.NAMESPACE + walletTypes.IS_VALID_ADRESS,
      isValidAmount: walletTypes.NAMESPACE + walletTypes.IS_VALID_AMOUNT,
      amount: walletTypes.NAMESPACE + walletTypes.AMOUNT,
      amountFormatted: walletTypes.NAMESPACE + walletTypes.AMOUNT_FORMATTED,
      fee: walletTypes.NAMESPACE + walletTypes.FEE,
      feeFormatted: walletTypes.NAMESPACE + walletTypes.FEE_FORMATTED,
      sendAll: walletTypes.NAMESPACE + walletTypes.SEND_ALL,
      total: walletTypes.NAMESPACE + walletTypes.TOTAL,
      totalFormatted: walletTypes.NAMESPACE + walletTypes.TOTAL_FORMATTED,
    }),
    // addressErrors() {
    //   const errors = [];
    //   if (!this.$v.address.$dirty) return errors;
    //   this.address.length == 0 && errors.push("Address is required.");
    //   !this.isValidAdress && errors.push("Address is invalid.");
    //   return errors;
    // },
    // amountErrors() {
    //   const errors = [];
    //   if (!this.$v.amount.$dirty) return errors;
    //   this.amount.length == 0 && errors.push("Amount is required.");
    //   !this.isValidAmount && errors.push("Amount needs to be at least 1 ADA");
    //   return errors;
    // },
    // passphraseErrors: function () {
    //   const errors = [];
    //   if (!this.$v.passphrase.$dirty) return errors;
    //   this.passphrase.length == 0 && errors.push("Passphrase is required.");
    //   !this.isValidPassphrase && errors.push("Incorrect passphrase");
    //   return errors;
    // },
  },
  mounted() {
    this.isLoadingData = this.isSync;
  },
  methods: {
    ...mapActions({
      getFee: walletTypes.NAMESPACE + walletTypes.GET_FEE,
      submitAndSendAda: walletTypes.NAMESPACE + walletTypes.SUBMIT_AND_SEND_ADA,
      changeIsValidAdress:
        walletTypes.NAMESPACE + walletTypes.CHANGE_IS_VALID_ADRESS,
      changeSendAll: walletTypes.NAMESPACE + walletTypes.CHANGE_SEND_ALL,
      changeAmount: walletTypes.NAMESPACE + walletTypes.CHANGE_AMOUNT,
    }),
    addressFocusIn() {
      const dataTransferObject = {
        newValueForIsValidAdress: true,
      };
      this.changeIsValidAdress(dataTransferObject);
    },
    sendAdaFocusOut() {
      const dataTransferObject = {
        newAddress: this.address,
        newAmount: parseFloat(
          this.newAmountToBeFormatted.replace(/[^\d.]/g, "")
        ),
        newAmountFormatted: `${parseFloat(this.amount).toFixed(6)}`,
        newIsValidAmount: this.isValidAmount,
      };
      if (isNaN(this.amount)) {
        dataTransferObject.newAmount = 0;
      }
      dataTransferObject.newAmountFormatted = dataTransferObject.newAmount.toFixed(
        6
      );
      this.changeAmount(dataTransferObject);
      this.getFee().then(() => {
        console.log("fees has been calculated");
      });
      // this.setSendAdaTotal(); this need to be seted again
    },
    sendAdaFocusIn() {
      const dataTransferObject = {
        newAmount: this.amount,
        newAmountFormatted: `${parseFloat(this.amount).toFixed(6)}`,
        newIsValidAmount: true,
      };
      this.changeAmount(dataTransferObject);
    },
    toggleSendAll() {
      const shouldSendAll = this.isReadonlyAmount;
      const dataTransferObject = {
        newValueForSendAll: true,
      };
      this.changeSendAll(dataTransferObject);

      if (shouldSendAll) {
        const dataTransferObject = {
          newAmount: this.wallet.balance / 1000000,
          newAmountFormatted: `${parseFloat(this.amount).toFixed(6)}`,
          newIsValidAmount: this.isValidAmount,
        };
        this.changeAmount(dataTransferObject);
        this.getFee().then(() => {
          console.log("fees has been calculated");
        });
      }
    },
    passphraseFocusIn() {
      this.isValidPassphrase = true;
    },
    submitSendAda() {
      this.isLoadingData = true;
      let _this = this;
      const dataTransferObject = {
        passphrase: this.passphrase,
      };
      this.submitAndSendAda(dataTransferObject).then(() => {
        console.log("money sent");
        _this.isLoadingData = false;
        this.$emit("money-sent");
      });
    },
  },
};
</script>