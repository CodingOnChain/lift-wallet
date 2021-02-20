<template>
  <v-form>
    <v-card-text>
      <v-text-field
        v-model="address"
        label="Address"
        @change="getFee"
        :error-messages="addressErrors"
        required
        @focus="addressFocusIn"
      ></v-text-field>

      <v-text-field
        v-model="amountFormatted"
        :error-messages="amountErrors"
        label="Amount (ADA)"
        @input="$v.amount.$touch()"
        @blur="sendAdaFocusOut"
        @focus="sendAdaFocusIn"
        :hint="`Est. Fee: ${sendForm.feeFormatted}`"
        persistent-hint
        :disabled="isSync || sendForm.readonlyAmount"
        required
      >
      </v-text-field>

      <v-checkbox
        v-model="readonlyAmount"
        class="mt-5"
        label="Send All"
        @change="toggleSendAll"
      ></v-checkbox>

      <v-input class="mt-5" label="Total (ADA)"
        >: {{ sendForm.totalFormatted }}
      </v-input>

      <v-text-field
        :append-icon="showPassphrase ? 'mdi-eye' : 'mdi-eye-off'"
        v-model="passphrase"
        :type="showPassphrase ? 'text' : 'password'"
        :error-messages="passphraseErrors"
        label="Passphrase"
        required
        :disabled="isSync"
        @click:append="showPassphrase = !showPassphrase"
        @input="$v.passphrase.$touch()"
        @blur="$v.passphrase.$touch()"
        @focus="passphraseFocusIn"
      >
      </v-text-field>

      <v-file-input v-model="metadataFile" label="Metadata File">
      </v-file-input>
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" v-if="!isSync" @click="submitSendAda">
        Submit
      </v-btn>
      <Loader v-if="isSync" />
    </v-card-actions>
  </v-form>
</template>
<script>
import { validationMixin } from "vuelidate";
import { mapGetters, mapActions } from "vuex";
import * as walletTypes from "../../../store/wallet/types";

export default {
  mixins: [validationMixin],
  validations: {
    address: {},
    amount: {},
    passphrase: {},
  },
  data() {
    return {
      showPassphrase: false,
    };
  },
  props: {
    isSync: Boolean,
  },
  computed: {
    ...mapGetters({
      wallet: walletTypes.NAMESPACE + walletTypes.WALLET,
      addresses: walletTypes.NAMESPACE + walletTypes.ADDRESSES,
      transaction: walletTypes.NAMESPACE + walletTypes.TRANSACTION,
      isValidAdress: walletTypes.NAMESPACE + walletTypes.IS_VALID_ADRESS,
      isValidAmount: walletTypes.NAMESPACE + walletTypes.IS_VALID_AMOUNT,
      isReadonlyAmount: walletTypes.NAMESPACE + walletTypes.IS_READONLY_AMOUNT,
      isValidPassphrase:
        walletTypes.NAMESPACE + walletTypes.IS_VALID_PASSPHRASE,
      amount: walletTypes.NAMESPACE + walletTypes.AMOUNT,
      amountFormatted: walletTypes.NAMESPACE + walletTypes.AMOUNT_FORMATTED,
      sendAll: walletTypes.NAMESPACE + walletTypes.SEND_ALL,
    }),
    addressErrors() {
      const errors = [];
      if (!this.$v.address.$dirty) return errors;
      this.address.length == 0 && errors.push("Address is required.");
      !this.isValidAdress && errors.push("Address is invalid.");
      return errors;
    },
    amountErrors() {
      const errors = [];
      if (!this.$v.amount.$dirty) return errors;
      this.amount.length == 0 && errors.push("Amount is required.");
      !this.isValidAmount && errors.push("Amount needs to be at least 1 ADA");
      return errors;
    },
    passphraseErrors: function () {
      const errors = [];
      if (!this.$v.passphrase.$dirty) return errors;
      this.sendForm.passphrase.length == 0 &&
        errors.push("Passphrase is required.");
      !this.sendForm.validPassphrase && errors.push("Incorrect passphrase");
      return errors;
    },
  },
  mounted() {
  },
  methods: {
    ...mapActions({
      getFee: walletTypes.NAMESPACE + walletTypes.GET_FEE,
      submitAndSendAda:
        walletTypes.NAMESPACE + walletTypes.SUBMITA_AND_SEND_ADA,
    }),
    addressFocusIn() {
      this.isValidAdress = true;
    },
    sendAdaFocusOut() {
      this.amount = parseFloat(this.amountFormatted.replace(/[^\d.]/g, ""));
      if (isNaN(this.amount)) {
        this.amount = 0;
      }
      this.amountFormatted = this.amount.toFixed(6);
      // this.setSendAdaTotal(); this need to be seted again
    },
    sendAdaFocusIn() {
      this.isValidAmount = true;
      this.amountFormatted = this.amount.toString();
    },
    toggleSendAll() {
      const shouldSendAll = this.isReadonlyAmount;
      this.sendAll = true;
      if (shouldSendAll) {
        this.amount = this.wallet.balance / 1000000;
        this.amountFormatted = `${parseFloat(this.amount).toFixed(6)}`;
        this.getFee();
      }
    },
    passphraseFocusIn() {
      this.isValidPassphrase = true;
    },
    submitSendAda() {
      this.$v.$touch();
      if (!this.$v.$invalid) {
        this.submitAndSendAda();
      }
    },
  },
};
</script>