<template>
    <span>
        <b-dropdown id="ddown1" v-bind:text="selected" variant="link" right class="m-md-2 white-link">
            <b-dropdown-item @click="selectOverride('Global')"
                >Global<option-tooltip
                    name="globalOr"
                    title="Global settings apply to all channels that don't have an override created."
                ></option-tooltip
            ></b-dropdown-item>
            <b-dropdown-header id="header1"
                >Channel Overrides<option-tooltip
                    name="channelOrs"
                    title="Channel overrides allow you to have different settings on a channel by channel basis."
                ></option-tooltip
            ></b-dropdown-header>
            <b-dropdown-item
                aria-describedby="header1"
                v-for="(name, index) in overrideNames"
                :key="index"
                @click="selectOverride(name)"
                >{{ name }}</b-dropdown-item
            >
            <b-dropdown-item v-if="overrideNames.length === 0" disabled>None</b-dropdown-item>
            <b-dropdown-divider></b-dropdown-divider>
            <b-dropdown-item @click="showModal">+ Add Channel Override</b-dropdown-item>
            <b-dropdown-item @click="deleteOverride" v-if="selected !== 'Global'" style="color: red"
                ><i class="fa fa-trash"></i> Delete '{{ selected }}' Override</b-dropdown-item
            >
        </b-dropdown>
        <b-modal
            id="newOverrideModal"
            ref="newOverrideModal"
            size="sm"
            title="Enter channel Name"
            header-bg-variant="dark"
            header-text-variant="light"
            body-bg-variant="dark"
            body-text-variant="light"
            footer-bg-variant="dark"
            footer-text-variant="light"
            @ok="handleOk"
            @shown="clearName"
        >
            <b-form-input
                type="text"
                placeholder="Name"
                v-model="newName"
                ref="nameInput"
                @keyup.native.enter="handleOk"
            ></b-form-input>
            <span v-if="newNameError" style="color:red; margin-top: 10px;">Please enter a channel name!</span>
        </b-modal>
    </span>
</template>

<script>
export default {
    mixins: [scriptCommunication],
    props: ['overrideNames', 'selected'],
    data: function() {
        return {
            newName: '',
            newNameError: false,
            selectedName: this.selected
        };
    },
    methods: {
        selectOverride: function(name) {
            this.$emit('override-selected', name);
        },
        clearName: function() {
            const app = this;

            app.newName = '';

            app.getCurrentStreamerNameInOpenTab().then(
                name => {
                    if (name != null) {
                        // search for a matching override case insensitive
                        const match = this.overrideNames.filter(o => {
                            return o.toLowerCase() === name.toLowerCase();
                        });

                        if (match.length < 1) {
                            app.newName = name;
                        }
                    }
                },
                () => {
                    console.log('Couldnt find current streamer name');
                }
            );

            app.$refs.nameInput.focus();
        },
        deleteOverride: function() {
            this.$emit('override-deleted', this.selected);
        },
        showModal: function() {
            this.$refs.newOverrideModal.show();
        },
        handleOk: function(evt) {
            // Prevent modal from closing
            evt.preventDefault();
            if (!this.newName || this.newName.toLowerCase() === 'global') {
                this.newNameError = true;
            } else {
                this.handleSubmit();
            }
        },
        handleSubmit: function() {
            const nameCopy = JSON.parse(JSON.stringify(this.newName));
            this.$emit('override-added', nameCopy);

            this.clearName();

            this.selectOverride(nameCopy);

            // Hide the modal manually
            this.$nextTick(() => {
                this.$refs.newOverrideModal.hide();
            });
        }
    }
};
</script>
