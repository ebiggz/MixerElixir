<template>
    <div class="settings-section">
        <div class="settings-section-header">
            <span class="title">Channel Page</span>
            <div style="margin-right:15px;">
                <streamer-override-dropdown
                    :overrideNames="overrideNames"
                    :selected="selected"
                    @override-added="overrideAdded"
                    @override-selected="overrideSelected"
                    @override-deleted="overrideDeleted"
                >
                </streamer-override-dropdown>
            </div>
        </div>
        <div class="settings-section-settings">
            <span class="setting-subcategory" style="margin-top:0;">Automation</span>
            <checkbox-toggle
                :value.sync="autoCloseInteractive"
                @changed="saveSettings()"
                label="Auto Close MixPlay"
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="autoCloseCostreams"
                @changed="saveSettings()"
                label="Auto Close Costreams"
                tooltip="This will close all streamers in a costream except for the streamer whom you are visiting."
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="autoMute"
                @changed="saveSettings()"
                label="Auto Mute Streams"
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="autoTheater"
                @changed="saveSettings()"
                label="Auto Theater Mode"
                tooltip="Automatically enters Theater Mode when loading a channel."
            ></checkbox-toggle>

            <span class="setting-subcategory">Emotes</span>
            <custom-emotes-toggle
                :value.sync="customEmotes"
                @changed="masterEmotesSwitchToggled()"
            ></custom-emotes-toggle>
            <div v-show="customEmotes" class="option-wrapper suboption">
                <checkbox-toggle
                    :value.sync="globalEmotes"
                    label="Enable Global Emotes"
                    @changed="saveSettings()"
                    tooltip="Global emotes are a set of emotes curated by the MixrElixr team that are available in all channels."
                ></checkbox-toggle>
                <checkbox-toggle
                    :value.sync="channelEmotes"
                    label="Enable Channel Emotes"
                    @changed="saveSettings()"
                    tooltip="Channel emotes are set by the channel owner and reviewed by the MixrElixr team. They are only available in the given channel."
                ></checkbox-toggle>
                <checkbox-toggle
                    :value.sync="enableEmoteAutocomplete"
                    label="Enable Emote Autocomplete Menu"
                    @changed="saveSettings()"
                    tooltip="Enables the emote autocomplete menu when typing in the chat textbox."
                ></checkbox-toggle>
            </div>

            <span class="setting-subcategory">Chat</span>
            <checkbox-toggle
                :value.sync="timestampAllMessages"
                @changed="saveSettings()"
                label="Timestamp All Messages"
                tooltip="Please note that timestamps will only be added to new messages as there is no way for us to tell when previous messages were sent."
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="mentionChatBGColor"
                @changed="saveSettings()"
                label="Highlight When Mentioned"
                tooltip="Apply a special background behind messages when you are mentioned."
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="hideChatAvatars"
                @changed="saveSettings()"
                label="Hide Viewer Avatars"
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="hideChannelProgression"
                @changed="saveSettings()"
                label="Hide Progression Levels"
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="hideChatHeaders"
                @changed="saveSettings()"
                label="Hide Upsell/Leaderboard Banners"
                tooltip="Hides the item purchase and leaderboard banners at the top of the chat view."
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="showModActions"
                @changed="saveSettings()"
                label="Show Mod Actions"
                tooltip="Shows banned, timeout, and message deletion mod actions in chat. Only visible if you're a mod, channel editor, or owner for the channel."
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="showSlowChatCooldownTimer"
                @changed="saveSettings()"
                label="Slow Chat Cooldown Timer"
                tooltip="Display a timer showing your current slow chat cooldown status (shows up once cooldown starts and only if cooldown is 2 secs or longer)"
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="useCustomFontSize"
                @changed="saveSettings()"
                label="Use Custom Text Size"
                tooltip="Allows you to define a custom font size and line height."
            ></checkbox-toggle>
            <b-collapse v-model="useCustomFontSize" id="useCustomFontSize">
                <div style="padding: 0px 0 15px 20px;">
                    <div>Text Size<option-tooltip name="textSize" title="The size of the text."></option-tooltip></div>
                    <vue-slider ref="textSizeSlider" v-model="textSize" v-bind="textSizeSliderOptions"></vue-slider>
                </div>
            </b-collapse>

            <div class="option-wrapper" style="margin: 15px 0;">
                <div style="padding-bottom: 5px;" class="option-title">Skills & Embers</div>
                <checkbox-toggle
                    :value.sync="hideSkillEffects"
                    @changed="saveSettings()"
                    label="Hide Skill Animations"
                    tooltip="Hides skill effect animations that happen on top of chat."
                ></checkbox-toggle>
                <checkbox-toggle
                    :value.sync="hideSkillMessages"
                    @changed="saveSettings()"
                    label="Hide Skill Messages"
                    tooltip="Hides 'skill used' messages in chat. EX: 'ebiggz used GIF / 5,000 sparks'"
                ></checkbox-toggle>
                <checkbox-toggle
                    :value.sync="hideStickers"
                    @changed="saveSettings()"
                    label="Hide Stickers"
                ></checkbox-toggle>
                <checkbox-toggle
                    :value.sync="hideEmberMessages"
                    @changed="saveSettings()"
                    label="Hide Ember Messages"
                    tooltip="Hides ember donation messages inside chat."
                ></checkbox-toggle>
            </div>

            <div class="option-wrapper">
                <div style="padding-bottom: 5px;" class="option-title">
                    Highlight Keywords<option-tooltip
                        name="highlightKeywords"
                        title="Any messages containing these keywords will have a special background."
                    ></option-tooltip>
                </div>
                <edittable-list
                    class="option"
                    :value.sync="keywords"
                    :options="[]"
                    tag-placeholder="Press enter to add keyword"
                    placeholder="Type to add keyword"
                    @changed="saveSettings()"
                ></edittable-list>
            </div>

            <div class="option-wrapper" style="padding: 10px 0;">
                <div style="padding-bottom: 5px;display: flex;align-items: center;" class="option-title">
                    Word Blacklist<option-tooltip
                        name="hideKeywords"
                        title="Any words in this list will be automatically hidden via the below style. Note: If you are a mod for the currently viewed channel, this feature is disabled by default."
                    ></option-tooltip>
                    <a
                        @click="showWordBlacklist = !showWordBlacklist"
                        style="cursor: pointer; color: #00A7FF; font-size: 12px; padding-left: 5px"
                    >
                        {{ showWordBlacklist ? 'Hide Blacklist' : 'Show Blacklist' }}
                    </a>
                </div>
                <b-collapse class="mt-2" v-model="showWordBlacklist" id="wordBlacklistCollapse">
                    <edittable-list
                        class="option"
                        :value.sync="hideKeywords"
                        :options="[]"
                        tag-placeholder="Press enter to add keyword"
                        placeholder="Type to add keyword"
                        @changed="saveSettings()"
                    ></edittable-list>
                    <div style="padding-left: 10px">
                        <div style="padding-bottom: 3px" class="option-title">
                            Hide Style
                            <option-tooltip
                                name="hideStyle"
                                title="How the word will be hidden. Hovering over the hidden word will reveal it (except for Remove style)."
                            ></option-tooltip>
                        </div>
                        <b-form-select v-model="hideStyle" :options="hideStyles" class="mb-3 option"></b-form-select>
                        <checkbox-toggle
                            :value.sync="enableHideKeywordsWhenMod"
                            @changed="saveSettings()"
                            label="Enable When Mod"
                            tooltip="By default, the word blacklist feature is disabled on channels you're a mod on so it doesn't get in the way of your awesome modding skills. This option can change that."
                        ></checkbox-toggle>
                    </div>
                </b-collapse>
            </div>

            <div class="option-wrapper" style="margin-bottom: 20px;">
                <div style="padding-bottom: 5px;" class="option-title">
                    Ignored Users<option-tooltip
                        name="ignoredUsers"
                        title="You will not see messages from users listed here."
                    ></option-tooltip>
                </div>
                <user-list class="option" :value.sync="ignoredUsers" @changed="saveSettings()"></user-list>
            </div>

            <inline-img-toggle :value.sync="showImagesInline" @changed="saveSettings()"></inline-img-toggle>
            <div v-show="showImagesInline" class="option-wrapper suboption">
                <div style="padding-bottom: 5px;" class="option-title">
                    Permitted User Roles<option-tooltip
                        name="permUserRoles"
                        title="See images from anyone in the selected role (and higher), unless the user is blacklisted below."
                    ></option-tooltip>
                </div>
                <b-form-select v-model="lowestUserRoleLinks" :options="userRoles" class="mb-3 option"></b-form-select>
                <div style="padding-bottom: 5px;" class="option-title">
                    Trusted Users<option-tooltip
                        name="permUsers"
                        title="Images from these users will ALWAYS show, even if they aren't in a permitted role above."
                    ></option-tooltip>
                </div>
                <user-list class="option" :value.sync="inlineImgPermittedUsers" @changed="saveSettings()"></user-list>
                <div style="padding-bottom: 5px;" class="option-title">
                    Blacklisted Users<option-tooltip
                        name="blacklistedUsers"
                        title="Images from these users will NEVER show, even if they are in a permitted role above."
                    ></option-tooltip>
                </div>
                <user-list class="option" :value.sync="inlineImgBlacklistedUsers" @changed="saveSettings()"></user-list>
            </div>

            <span class="setting-subcategory">Page</span>
            <checkbox-toggle
                :value.sync="largerVideo"
                @changed="saveSettings()"
                label="Larger Video Feed"
                tooltip="Bumps channel content down a bit so the video feed is larger by default."
            ></checkbox-toggle>

            <checkbox-toggle
                :value.sync="lightsOutTheaterMode"
                @changed="saveSettings()"
                label="Lights Out Theater Mode"
                tooltip="Make chat in theater mode nearly pitch black."
            ></checkbox-toggle>

            <span class="setting-subcategory">Hosts</span>
            <checkbox-toggle
                :value.sync="autoForwardOnHost"
                @changed="saveSettings()"
                label="Redirect on Host"
                tooltip="If the channel you are viewing hosts someone else, this will automatically redirect you to the hosted channel."
            ></checkbox-toggle>
            <checkbox-toggle
                :value.sync="autoMuteOnHost"
                @changed="saveSettings()"
                label="Auto Mute Stream on Host"
            ></checkbox-toggle>
        </div>
    </div>
</template>

<script>
export default {
    mixins: [settingsStorage, scriptCommunication],
    methods: {
        overrideSelected: function(name) {
            let selectedType = null;

            if (name === 'Global') {
                selectedType = name;
            } else {
                // search for a matching override case insensitive
                const match = this.getOverrideNames().filter(o => {
                    return o.toLowerCase() === name.toLowerCase();
                });

                if (match.length > 0) {
                    selectedType = match[0];
                }
            }

            if (selectedType != null) {
                this.selected = selectedType;
                this.setModel(this.getSelectedOptions());
            }
        },
        overrideAdded: function(name) {
            this.selected = name;

            const defaults = this.getDefaultOptions().streamerPageOptions.global;

            const defaultsCopy = JSON.parse(JSON.stringify(defaults));

            this.overrides[name] = defaultsCopy;

            this.overrideNames = this.getOverrideNames();

            this.setModel(defaultsCopy);

            this.saveSettings();
        },
        overrideDeleted: function(name) {
            delete this.overrides[name];
            this.overrideNames = this.getOverrideNames();
            this.selectModel('Global');
            this.saveSettings();
        },
        selectModel: function(name) {
            this.selected = name;
            this.setModel(this.getSelectedOptions());
        },
        saveSettings: function() {
            const model = this.getModel();

            if (this.selected === 'Global') {
                this.global = model;
            } else {
                this.overrides[this.selected] = model;
            }

            this.saveStreamerPageOptions({
                global: this.global,
                overrides: this.overrides
            });
        },
        loadSettings: function() {
            const app = this;
            app.selected = 'Global';
            this.fetchSettings().then(data => {
                const streamerPageOptions = data.streamerPageOptions;
                app.setModel(streamerPageOptions.global);
                app.global = streamerPageOptions.global;
                app.overrides = streamerPageOptions.overrides;
                app.overrideNames = app.getOverrideNames();
            });
        },
        masterEmotesSwitchToggled: function() {
            const app = this;
            let emotesEnabled = app.customEmotes;
            if (emotesEnabled) {
                app.globalEmotes = true;
                app.channelEmotes = true;
            }
            app.saveSettings();
        },
        getOverrideNames: function() {
            return Object.keys(this.overrides);
        },
        getSelectedOptions: function() {
            if (this.selected === 'Global') {
                return this.global;
            } else {
                return this.overrides[this.selected];
            }
        },
        setModel: function(options) {
            const app = this;
            const g = app.global;

            // copy over any settings from global that dont exist yet in this override (this happens when new settings are added);
            Object.keys(g).forEach(k => {
                if (options[k] == null) {
                    options[k] = JSON.parse(JSON.stringify(g[k]));
                }
            });

            Object.keys(options).forEach(k => {
                app[k] = options[k];
            });
        },
        getModel: function() {
            const app = this;

            const builtModel = {};
            const options = app.getSelectedOptions();

            Object.keys(options).forEach(k => {
                builtModel[k] = app[k];
            });

            return builtModel;
        },
        findMixerViewers: async function(query) {
            const app = this;
            app.isLoading = true;

            let response;
            try {
                response = await app.$http.get(
                    `https://mixer.com/api/v1/channels?limit=6&noCount=1&scope=all&q=${query}&search=true&fields=token`,
                    { responseType: 'json' }
                );
            } catch (err) {
                console.log('error searching for mixer viewers', err);
            }

            if (response) {
                let channels = response.data;
                app.viewers = channels.map(c => c.token);
            }

            app.isLoading = false;
        }
    },
    watch: {
        lowestUserRoleLinks: function(newRole) {
            this.saveSettings();
        },
        hideStyle: function(newStyle) {
            this.saveSettings();
        },
        useCustomFontSize: function(val) {
            if (val) {
                this.$nextTick(() => {
                    console.log(this.$refs);
                    // this.$refs.textSizeSlider.refresh();
                });
            } else {
                // reset values to default
                this.textSize = 15;
                this.lineHeight = 24;
                this.saveSettings();
            }
        },
        textSize: function() {
            this.saveSettings();
        }
    },
    data: function() {
        const dataObj = {
            selected: 'Global',
            userRoles: [
                { value: '', text: 'None' },
                { value: 'owner', text: 'Streamer' },
                { value: 'mod', text: 'Mods (& above)' },
                { value: 'subscriber', text: 'Subscribers (& above)' },
                { value: 'pro', text: 'Pro (& above)' },
                { value: 'all', text: 'All' }
            ],
            hideStyles: [
                { value: 'blur', text: 'Blur' },
                { value: 'asterisk', text: 'Asterisk (*)' },
                { value: 'remove', text: 'Remove Whole Message' }
            ],
            showWordBlacklist: false,
            sliderTest: 30,
            textSizeSliderOptions: {
                min: 10,
                max: 60,
                tooltip: false,
                lazy: true,
                processStyle: {
                    backgroundColor: '#1FBAED'
                }
            },
            overrideNames: [],
            viewers: [],
            isLoading: false
        };

        const defaults = this.getDefaultOptions().streamerPageOptions;

        // fill out our model with the default settings
        const global = defaults.global;
        Object.keys(global).forEach(k => {
            dataObj[k] = global[k];
        });

        dataObj.global = global;
        dataObj.overrides = defaults.overrides;

        return dataObj;
    },
    mounted: function() {
        this.loadSettings();
        this.getCurrentStreamerNameInOpenTab().then(name => {
            if (name != null) {
                this.overrideSelected(name);
            }
        });

        bus.$on('tab-changed', tab => {
            if (tab === 'options') {
                this.$nextTick(() => {
                    // this.$refs.textSizeSlider.refresh();
                });
            }
        });
    }
};
</script>
