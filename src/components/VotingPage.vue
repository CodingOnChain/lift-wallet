<template>

  <v-container>
    <v-row>
      <v-col cols="2">
        <v-sheet rounded="lg">
          <v-list nav>
            <v-list-item-group
              v-model="selectedOption"
              color="primary"
            >
              <v-list-item
                v-for="option in votingOptions"
                :key="option"
              >
                <v-list-item-title>
                  {{option}}
                </v-list-item-title>
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </v-sheet>
      </v-col>

      <v-col>
        <v-sheet
          min-height="70vh"
          rounded="lg"
        >
          <!--  -->
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
      
      votingOptions: [
        'Create Ballot',
        'Cast Ballot'
      ],
      selectedOption: 0
    }),
  }
</script>

<style scoped>

</style>