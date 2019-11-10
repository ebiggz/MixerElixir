<template>
    <div style="position: relative;">
        <input type="text" class="me-search" :placeholder="placeholder" v-model="query" @keyup="valueUpdated" />
        <span class="search-icon"><i class="fa fa-search" aria-hidden="true"></i></span>
    </div>
</template>

<script>
import debounce from 'lodash/debounce';
export default {
    data() {
        return {};
    },
    props: ['placeholder', 'query'],
    methods: {
        valueUpdated: debounce(function() {
            this.$emit('update:query', this.query);
            this.$emit('changed');
        }, 350)
    }
};
</script>
