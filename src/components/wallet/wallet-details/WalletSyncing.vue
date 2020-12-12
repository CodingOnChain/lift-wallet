<template>
    <v-container>
        <v-row align="center" justify="center" class="text-center max-height">
            <v-col cols="12">
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
    name: 'WalletSyncing',
    props: ['progress']
}
</script>