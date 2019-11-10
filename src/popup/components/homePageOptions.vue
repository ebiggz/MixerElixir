<template>
    <div class="settings-section">
        <div class="settings-section-header">
            <span class="title">Homepage</span>
        </div>
        <div class="settings-section-settings" style="padding-bottom: 0;">
            <checkbox-toggle
                :value.sync="removeFeatured"
                @changed="saveSettings()"
                label="Minimal Homepage"
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="pinSearchToTop"
                @changed="saveSettings()"
                label="Pin Searchbar To Top"
            ></checkbox-toggle>
        </div>
    </div>
</template>

<script>
export default {
    mixins: [settingsStorage],
    data: function() {
        let dataObj = {};

        let defaults = this.getDefaultOptions().homePageOptions;

        // fill out our model
        Object.keys(defaults).forEach(k => {
            dataObj[k] = defaults[k];
        });

        return dataObj;
    },
    methods: {
        saveSettings: function() {
            const model = this.getModel();
            this.saveHomePageOptions(model);
        },
        loadSettings: function() {
            const app = this;
            this.fetchSettings().then(data => {
                const homePageOptions = data.homePageOptions;
                app.setModel(homePageOptions);
            });
        },
        setModel: function(options) {
            const app = this;
            Object.keys(options).forEach(k => {
                app[k] = options[k];
            });
        },
        getModel: function() {
            const app = this;

            const builtModel = {};
            const options = this.getDefaultOptions().homePageOptions;

            Object.keys(options).forEach(k => {
                builtModel[k] = app[k];
            });

            return builtModel;
        }
    },
    mounted: function() {
        this.loadSettings();
    }
};
</script>
