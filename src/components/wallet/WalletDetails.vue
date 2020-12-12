    <template>
    <v-container>
        <v-row no-gutters>
            <v-col>
                <v-card flat v-show="wallet != null">
                    <v-toolbar flat>
                        <v-toolbar-title>{{wallet.name}}</v-toolbar-title>

                        <v-spacer></v-spacer>

                        <v-toolbar-items v-if="isSyncing">
                        Sync Status: {{ syncProgress }}
                        </v-toolbar-items>
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
    computed: {
        isSyncing: function() {
            if(this.wallet == null) return false;
            console.log(this.wallet);
            if(this.wallet.state.status != "ready")
            {
                if(this.wallet.state.progress != null
                    && this.wallet.state.progress != undefined) {
                    console.log(this.wallet.state.progress);
                    if(this.wallet.state.progress?.quantity < 100) return true;
                }
            }
            return false;
        },
        syncProgress: function() {
            if(this.wallet == null) return '';
            if(this.wallet.state.progress != null
                && this.wallet.state.progress != undefined) {
                console.log(this.wallet.state.progress);
                return `${this.wallet.state.progress.quantity}%`
            }
            return '';
        }
    }
  }
</script>