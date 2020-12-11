    <template>
    <v-container>
        <v-row no-gutters>
            <v-col>
                <v-card flat v-show="wallet != null">
                    <v-toolbar flat>
                        <v-toolbar-title>{{wallet.name}}</v-toolbar-title>

                        <v-spacer></v-spacer>

                        <v-progress-circular
                            v-show="isSyncing"
                            :rotate="360"
                            :value="syncProgress"
                            color="teal"
                            icon
                            >
                            {{ syncProgress }}
                        </v-progress-circular>
                    </v-toolbar>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
  export default {
    name: 'WalletDetails',
    props: ['wallet'],
    data: () => ({
        wallet: null
    }),
    computed: {
        isSyncing: function() {
            if(this.wallet == null) return false;
            return this.wallet.state.status !== "ready" && this.wallet.state.progress.quantity < 100;
        },
        syncProgress: function() {
            if(this.wallet == null) return '';
            return `${this.wallet.state.progress.quantity}%`
        }
    }
  }
</script>