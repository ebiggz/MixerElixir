<template>
    <span>
        <checkbox-toggle :value.sync="value" @changed="valueUpdated()" label="Show Custom MixrElixr Emotes">
            <a
                @click="showModal"
                style="cursor: pointer;color: rgb(0, 167, 255);font-size: 12px;margin-left: 10px;margin-top: 1px;"
            >
                More Info
            </a>
        </checkbox-toggle>
        <b-modal
            id="customEmotesInfoModal"
            ref="customEmotesInfoModal"
            title="Custom Emotes FAQ"
            header-bg-variant="dark"
            header-text-variant="light"
            body-bg-variant="dark"
            body-text-variant="light"
            footer-bg-variant="dark"
            footer-text-variant="light"
            :ok-only="true"
            ok-title="Ok"
        >
            <h4 style="font-weight: 400;">What are Custom Emotes?</h4>
            <p style="font-size: 15px;color: #e0e0e0;">
                Custom emotes are emotes uploaded to our website and are available to all viewers that have MixrElixr
                installed.
            </p>
            <h4 style="margin-top:1.5rem;font-weight: 400;">Are they safe?</h4>
            <p style="font-size: 15px;color: #e0e0e0;">
                All emotes go through a submission process and must be approved before they are shown on a channel. We
                do our best to ensure all emotes adhere to Mixer's TOS.
            </p>
            <p style="font-size: 15px;color: #e0e0e0;">
                As a viewer, you can show/hide custom emotes as you wish. Additionally, you can use the per Streamer
                Overrides feature to only enable emotes for select channels.
            </p>
            <h4 style="margin-top:1.5rem;font-weight: 400;">How do I upload emotes for my channel?</h4>
            <p style="font-size: 15px;color: #e0e0e0;">
                If you would like to upload emotes for your own channel, you can do so by going to
                <a href="https://crowbartools.com/emotes" target="_blank">crowbartools.com/emotes</a>
            </p>
            <h4 style="margin-top:1.5rem;font-weight: 400;">Do I have to be a Partner?</h4>
            <p style="font-size: 15px;color: #e0e0e0;">
                Nope! However, we do have some small account age/follower requirements. Visit
                <a href="https://crowbartools.com/emotes" target="_blank">our website</a> for more info.
            </p>
        </b-modal>
    </span>
</template>

<script>
export default {
    data() {
        return {};
    },
    props: ['value'],
    methods: {
        showModal: function() {
            this.$refs.customEmotesInfoModal.show();
        },
        valueUpdated: function() {
            this.$emit('update:value', this.value);
            this.$emit('changed', this.value);
        }
    }
};
</script>

<style lang="scss" scoped>
p {
    font-size: 20px;
}
</style>
