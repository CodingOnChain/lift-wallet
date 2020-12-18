<template>

  <v-container>
    <v-row>
      <v-col>
        <v-sheet
          min-height="70vh"
          rounded="lg"
        >
          <!--  -->
          <VotingList 
            v-if="page == 1" 
            v-on:goto-create="gotoCreate"
            v-on:goto-cast="gotoCast" />
          <VotingCreate 
            v-if="page == 2"
            v-on:cancel="gotoList" />
          <VotingCast 
            v-if="page == 3"
            v-on:cancel="gotoList" />
        </v-sheet>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  import VotingList from './voting/VotingList'
  import VotingCreate from './voting/VotingCreate'
  import VotingCast from './voting/VotingCast'

  export default {
    name: 'VotingPage',
    props: ['render'],
    components: {
      VotingList,
      VotingCreate,
      VotingCast
    },
    data: () => ({
      page: 1, //1 - List, 2 - Create, 3 - Cast
    }),
    methods: {
      gotoList() {
        this.page = 1
      },
      gotoCreate() {
        this.page = 2
      },
      gotoCast() {
        this.page = 3
      }
    }
  }
</script>

<style scoped>

</style>