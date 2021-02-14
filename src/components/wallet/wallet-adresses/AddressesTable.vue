<template>
  <div>
    <v-data-table
      :headers="headers"
      :items="tableItems"
      disable-pagination
      hide-default-footer
    >
    </v-data-table>
  </div>
</template>
<script>
export default {
  data() {
    return {};
  },
  props: {
    tableItems: Array,
  },
  computed: {
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