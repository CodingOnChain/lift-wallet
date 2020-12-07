<template>
  <v-container>
    <v-row class="text-center">
      <v-col cols="12">
        <v-progress-circular
          :size="100"
          color="primary"
          indeterminate
        ></v-progress-circular>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  export default {
    name: 'LoadingCnode',

    data: () => ({
      
    }),
  }
</script>
