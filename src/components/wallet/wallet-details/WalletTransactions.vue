 <template>
  <div>
    <loading
      :active="transactions == null"
      :can-cancel="true"
      :is-full-page="fullPage"
    ></loading>

    <v-row no-gutters v-if="transactions == null">
      <v-col md="6" offset-md="3">
        <v-card class="pa-2 text-center" flat>
          <v-card-subtitle
            >Loading Transactions</v-card-subtitle
          >
        </v-card>
      </v-col>
    </v-row>
    <v-row no-gutters v-if="transactions != null && transactions.length == 0">
      <v-col md="6" offset-md="3">
        <v-card class="pa-2 text-center" flat>
          <v-card-subtitle
            >Doesn't look like you have any transactions</v-card-subtitle
          >
        </v-card>
      </v-col>
    </v-row>
    <v-simple-table v-if="transactions != null && transactions.length > 0">
      <template v-slot:default>
        <tbody>
          <tr v-for="tx in transactions" :key="tx.hash">
            <td class="pa-4">
              {{ tx.amount }} ADA<br />
              <v-chip
                small
                label
                :color="tx.direction == 'Sent' ? 'error' : 'success'"
              >
                {{ tx.direction }}
              </v-chip>
            </td>
            <td class="pa-4">
              <a
                target="_blank"
                @click="
                  navigateToTx(
                    `https://explorer.cardano-testnet.iohkdev.io/en/transaction?id=${tx.hash}`
                  )
                "
                >{{ tx.hash }}</a
              >
            </td>
            <td class="pa-4">
              {{ getFormattedDate(tx.datetime) }}
            </td>
          </tr>
        </tbody>
      </template>
    </v-simple-table> 
  </div>
</template>


<script>
import Loading from "vue-loading-overlay";
import "vue-loading-overlay/dist/vue-loading.css";
import dayjs from "dayjs";
import * as walletTypes from "../../../store/wallet/types";
import { mapGetters } from "vuex";

export default {
  name: "WalletTransactions",
  props: ["walletId", "focus"],
  components: { Loading },
  data: () => ({
      fullPage: false
  }),
  watch: {
      transactions(){
         this.isLoading=false;
      }
  },
  computed: {
    ...mapGetters({
      transactions: walletTypes.NAMESPACE + walletTypes.TRANSACTION,
    }),
  },

  mounted() {},
  methods: {
    getFormattedDate(txDate) {
      return dayjs(txDate).format("MMM D, YYYY h:mm A");
    }
  },
};
</script>

