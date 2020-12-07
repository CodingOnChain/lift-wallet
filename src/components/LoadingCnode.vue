<template>
  <v-container class="max-height">
    <v-row align="center" justify="center" class="text-center max-height">
      <v-col cols="12" v-show="loading">
        <v-progress-circular
          :size="100"
          color="primary"
          indeterminate
        ></v-progress-circular>
        <h2>Loading the Cardano Node</h2>
      </v-col>
      <v-col cols="12" v-show="syncing">
        <v-progress-circular
          :rotate="360"
          :size="100"
          :width="15"
          :value="progress"
          color="primary"
        >{{progress}}%</v-progress-circular>
        <h2>Syncing...</h2>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  export default {
    name: 'LoadingCnode',
    props: ['loading', 'syncing', 'progress'],
    data: () => ({
      
    }),
  }
</script>

<style scoped>
.max-height {
  height: 100%
}
</style>