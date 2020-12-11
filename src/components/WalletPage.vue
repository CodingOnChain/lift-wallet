<template>

  <v-container>
    <v-row>
      <v-col cols="2">
        <v-sheet rounded="lg">

          <v-list nav>
            <v-list-item>
              <v-btn color="primary">New Wallet</v-btn>
            </v-list-item>
            <v-list-item-group
              v-model="selectedWallet"
              color="primary"
            >
              <v-list-item
                v-for="(wallet, i) in wallets"
                :key="i"
              >
                <v-list-item-title>
                  {{wallet.name}}
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
    name: 'WalletPage',
    props: [],
    data: () => ({
      selectedWallet: null,
      wallets: [
        { name: 'Wallet 1', balance: '12k'},
        { name: 'Wallet 2', balance: '234'},
        { name: 'Wallet 3', balance: '100k'},
        { name: 'Wallet 4', balance: '1.2m'}
      ]
    }),
    mounted() {
      this.selectedWallet = 0;
    }
  }
</script>

<style scoped>

</style>