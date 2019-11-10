<template>
    <span>
        <checkbox-toggle
            :value.sync="value"
            @changed="toggleChanged()"
            label="Show Image Links Inline"
        ></checkbox-toggle>
        <b-modal
            id="inlineImgWarning"
            ref="inlineImgWarning"
            title="Warning"
            header-bg-variant="danger"
            header-text-variant="light"
            body-bg-variant="dark"
            body-text-variant="light"
            footer-bg-variant="dark"
            footer-text-variant="light"
            cancel-title="Nevermind"
            cancel-variant="link"
            ok-title="Confirm"
            @ok="handleConfirmation"
        >
            <span>{{ warningMsg }}</span>
            <br /><br />
            <span
                >Don't worry though! If you use this feature, you can utilize the per-streamer options, user role
                permissions, and the user whitelist/blacklist to only show images from people you trust.</span
            >
            <br /><br />
            <span>If you'd still like to use inline images, click <b>Confirm</b>.</span>
        </b-modal>
    </span>
</template>

<script>
export default {
    props: ['value'],
    data: function() {
        return {
            warningMsg:
                'Quick heads up: Malicious users could potentionally use inline images to capture your IP address. This is the same risk you take if you were to click a link and open it, but we just want to make sure you are aware before using inline images.'
        };
    },
    watch: {
        value: function(newValue, oldValue) {}
    },
    methods: {
        toggleChanged: function(newValue) {
            if (this.value) {
                this.value = false;
                this.$refs.inlineImgWarning.show();
            } else {
                this.valueUpdated();
            }
        },
        valueUpdated: function(val) {
            this.$emit('update:value', this.value);
            this.$emit('changed', this.value);
        },
        handleConfirmation: function() {
            this.value = true;
            this.valueUpdated();
        }
    }
};
</script>
