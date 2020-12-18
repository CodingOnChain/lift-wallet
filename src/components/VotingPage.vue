<template>

  <v-container>
    <v-row>
      <v-col>
        <v-sheet
          min-height="70vh"
          rounded="lg"
        >
          <v-row class="ma-0">
            <v-col md="4" class="d-flex">
              <v-btn color="primary">Create</v-btn>
            </v-col>
            <v-col md="4" offset-md="4" class="d-flex">
              <v-text-field
                v-model="ballotId"
                class="mr-2 mt-0 pt-2"
                color="accent"
                label="Ballot Id"
              ></v-text-field>
              <v-btn color="accent">Start</v-btn>
            </v-col>
          </v-row>
          <!--  -->
          <v-row>
            <v-col>

            </v-col>
          </v-row>
        </v-sheet>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  export default {
    name: 'VotingPage',
    props: [],
    data: () => ({
      ballotId: ''
    }),
  }
</script>

<style scoped>

</style>