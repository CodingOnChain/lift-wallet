 <template>
  <div>
    <loading
      :active="isLoading"
      :can-cancel="true"
      :is-full-page="fullPage"
    ></loading>
    <v-form>
      <v-card-text>
        <v-text-field v-model="asset" label="Asset Name"></v-text-field>
        <v-text-field v-model="amount" label="Amount"></v-text-field>
        <v-text-field
          :append-icon="showMintPassphrase ? 'mdi-eye' : 'mdi-eye-off'"
          v-model="passphrase"
          :type="showMintPassphrase ? 'text' : 'password'"
          label="Passphrase"
          @click:append="showMintPassphrase = !showMintPassphrase"
        >
        </v-text-field>
        <v-file-input v-model="metadataFile" label="Metadata File">
        </v-file-input>
        <v-btn color="primary" @click="mintAsset"> Mint </v-btn>
      </v-card-text>
    </v-form>
  </div>
</template>


<script>
import Loading from "vue-loading-overlay";
import "vue-loading-overlay/dist/vue-loading.css";
import * as walletTypes from "../../../store/wallet/types";
import { mapActions} from "vuex";

export default {
  name: "WalletMint",
  components: { Loading },
  data: () => ({
    isLoading: false,
    fullPage: false,
    showMintPassphrase:false,
    asset: "lift",
    amount: 1,
    passphrase: "",
    metadataFile: null,
  }),
  watch: {},
  computed: {    
  },
  mounted() {},
  methods: {
    ...mapActions({
      setMintAsset: walletTypes.NAMESPACE + walletTypes.SET_MINT_ASSET_TRANSACTION
    }),
    mintAsset() {
      let metadata = null;
      if (this.metadataFile != null) {
        metadata = this.metadataFile.path;
      }    
      this.isLoading = true;
      const dataTransferObject = {        
        assetName: this.asset,
        assetAmount: this.amount,
        passphrase: this.passphrase,
        metadata: metadata
      };      
      this.setMintAsset(dataTransferObject).then(() => {
        console.log("mint asset completed");
        this.isLoading = false;
      });
    },
  },
};
</script>

