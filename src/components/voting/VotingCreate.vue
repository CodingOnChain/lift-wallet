<template>
    <v-container>
        <h2>Create a Ballot</h2>
        <v-btn color="danger" @click="cancel">Cancel</v-btn>
    </v-container>
</template>

<script>
  export default {
    name: 'VotingCreate',
    props: [],
    data: () => ({
        
    }),
    methods: {
        cancel: function() {
            this.$emit('cancel');
        }
    }
  }
</script>

<style scoped>

</style>