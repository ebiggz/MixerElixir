<template>
    <div style="display: flex;align-items: center;">
        <label class="control toggle" :class="{ checked: value }">
            <input type="checkbox" v-model.lazy="value" @change="valueUpdated" />
            <div class="toggler chrome">
                <div></div>
            </div>
            <span class="option-title">
                {{ label }}
            </span>
        </label>
        <option-tooltip
            v-if="tooltip != null"
            :name="tooltipName"
            :title="tooltip"
            :type="tooltipType"
        ></option-tooltip>
        <slot></slot>
    </div>
</template>

<script>
export default {
    data() {
        return {};
    },
    props: ['value', 'label', 'tooltip', 'tooltipType'],
    methods: {
        valueUpdated: function() {
            this.$emit('update:value', this.value);
            this.$emit('changed');
        }
    },
    computed: {
        tooltipName: function() {
            return this.label.replace(' ', '-').toLowerCase();
        }
    }
};
</script>

<style lang="scss" scoped>
p {
    font-size: 20px;
}
</style>
