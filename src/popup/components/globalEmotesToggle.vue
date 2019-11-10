<template>
    <span>
        <checkbox-toggle
            :value.sync="value"
            @changed="valueUpdated()"
            label="Show Global MixrElixr Emotes"
        ></checkbox-toggle>
    </span>
</template>

<script>
export default {
    data() {
        return {};
    },
    props: ['value'],
    methods: {
        valueUpdated: function() {
            this.$emit('update:value', this.value);
            this.$emit('changed', this.value);
        }
    }
};
</script>
