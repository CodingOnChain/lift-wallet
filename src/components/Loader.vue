<template>
  <v-container class="max-height">
    <v-row align="center" justify="center" class="text-center max-height">
      <v-col cols="12">
        <v-progress-linear
          :size="100"
          color="primary"
          indeterminate
        ></v-progress-linear>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "Loader",
  data: () => ({}),
};
</script>

<style scoped>
.max-height {
  height: 100%;
}
</style>
