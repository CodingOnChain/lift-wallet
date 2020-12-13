<template>
  <v-container fluid>
    <WalletPage v-show="this.page == 'Wallets'" v-bind:render="this.page == 'Wallets'"/>
    <StakingPage v-show="this.page == 'Staking'"/>
    <VotingPage v-show="this.page == 'Voting'"/>
  </v-container>
</template>

<script>
  import WalletPage from './WalletPage'
  import StakingPage from './StakingPage'
  import VotingPage from './VotingPage'

  export default {
    name: 'MainView',
    components: {
      WalletPage,
      StakingPage,
      VotingPage
    },
    props: ['page'],
    data: () => ({
      
    }),
  }
</script>

<style scoped>

</style>