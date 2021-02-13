<template>
  <v-container fluid>
    <WalletPage v-show="this.page == 'Wallets'" v-bind:render="this.page == 'Wallets'"/>
    <StakingPage v-show="this.page == 'Staking'"/>
  </v-container>
</template>

<script>
  import WalletPage from './WalletPage';
  import StakingPage from './StakingPage';

  export default {
    name: 'MainView',
    components: {
      WalletPage,
      StakingPage
    },
    props: ['page'],
    data: () => ({
      
    }),
  };
</script>

<style scoped>

</style>