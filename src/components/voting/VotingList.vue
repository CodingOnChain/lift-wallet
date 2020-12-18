<template>
    <v-container>
        <v-row class="ma-0">
            <v-col md="4" class="d-flex">
                <v-btn class="mr-2" color="primary" @click="create">Create</v-btn>
                <v-btn color="accent" @click="cast">Cast</v-btn>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
  export default {
    name: 'VotingList',
    props: [],
    data: () => ({
      ballotId: ''
    }),
    methods: {
        create: function() {
            this.$emit('goto-create');
        },
        cast: function() {
            this.$emit('goto-cast');
        }
    }
  }
</script>

<style scoped>

</style>