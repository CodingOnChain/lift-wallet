<template>
  <div>    
    <v-data-table
      :headers="headers"
      :items="addresses"
      disable-pagination
      hide-default-footer
    >
    </v-data-table>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
import * as walletTypes from "../../../store/wallet/types";

export default {
  data() {
    return {};
  },
  computed: {
    ...mapGetters({
      addresses: walletTypes.NAMESPACE + walletTypes.ADDRESSES
    }),
    headers() {
      return [
        {
          text: "Imdex",
          align: "start",
          sortable: false,
          value: "index",
        },
        {
          text: "Adress",
          align: "end",
          sortable: true,
          value: "address",
        },
      ];
    },
  },
  methods: {},
};
</script>