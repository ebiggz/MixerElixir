import browser from 'webextension-polyfill';

import Bowser from 'bowser';
const browserEnv = Bowser.getParser(window.navigator.userAgent);
const onlyLocalStorage = browserEnv.satisfies({
    Linux: {
        Chrome: '>0'
    },
    'Chrome OS': {
        Chrome: '>0'
    }
});

global.settingsStorage = {
    methods: {
        fetchSettings: function() {
            let app = this;
            let defaults = app.getDefaultOptions();

            let storage = onlyLocalStorage ? browser.storage.local : browser.storage.sync;
            return storage.get({
                streamerPageOptions: defaults.streamerPageOptions,
                homePageOptions: defaults.homePageOptions,
                generalOptions: defaults.generalOptions
            });
        },
        saveAllSettings: function(settings, emitEvent = true) {
            let app = this;
            let storage = onlyLocalStorage ? browser.storage.local : browser.storage.sync;
            storage
                .set(settings)
                .then(() => {
                    if (emitEvent) {
                        app.emitSettingUpdatedEvent();
                    }
                })
                .catch(reason => {
                    console.log('ERROR WHEN SAVING SETTINGS: ' + reason);
                });
        },
        saveStreamerPageOptions: function(options) {
            this.saveAllSettings({
                streamerPageOptions: options
            });
        },
        saveHomePageOptions: function(options) {
            this.saveAllSettings({
                homePageOptions: options
            });
        },
        saveGeneralOptions: function(options) {
            let app = this;
            app.fetchSettings().then(data => {
                let combinedOptions = { ...data.generalOptions, ...options };
                this.saveAllSettings({
                    generalOptions: combinedOptions
                });
            });
        },
        getDefaultOptions: function() {
            return {
                streamerPageOptions: {
                    global: {
                        autoCloseInteractive: false,
                        autoCloseCostreams: false,
                        autoTheater: false,
                        separateChat: false,
                        alternateChatBGColor: false,
                        mentionChatBGColor: false,
                        customEmotes: true,
                        globalEmotes: true,
                        channelEmotes: true,
                        enableEmoteAutocomplete: true,
                        hideChatAvatars: false,
                        hideChannelProgression: false,
                        hideChatHeaders: false,
                        hideDeleted: false,
                        alwaysShowDeletedMessages: false,
                        showModActions: true,
                        timestampAllMessages: false,
                        showImagesInline: false,
                        lowestUserRoleLinks: 'mod',
                        inlineImgPermittedUsers: [],
                        inlineImgBlacklistedUsers: [],
                        autoForwardOnHost: false,
                        autoMute: false,
                        autoMuteOnHost: false,
                        ignoredUsers: [],
                        keywords: [],
                        hideKeywords: [],
                        hideStyle: 'blur',
                        enableHideKeywordsWhenMod: false,
                        useCustomFontSize: false,
                        textSize: 15,
                        largerVideo: true,
                        hideSkillEffects: false,
                        hideSkillMessages: false,
                        hideStickers: false,
                        hideEmberMessages: false,
                        showSlowChatCooldownTimer: true,
                        lightsOutTheaterMode: false
                    },
                    overrides: {}
                },
                homePageOptions: {
                    removeFeatured: false,
                    autoMute: false,
                    pinSearchToTop: true
                },
                generalOptions: {
                    declutterTopBar: true,
                    showInfoPanel: true,
                    showBadge: true,
                    onlyShowFavoritesCount: false,
                    favoriteFriends: [],
                    highlightFavorites: true,
                    liveNotificationsMode: 'favorites',
                    playLiveNotificationSound: false,
                    liveNotificationSoundType: 'default',
                    theme: 'default'
                }
            };
        },
        emitSettingUpdatedEvent: function() {
            // let the content script on whatever tab know the settings have been updated
            browser.tabs.query({}).then(tabs => {
                const message = { settingsUpdated: true };
                for (let tab of tabs) {
                    browser.tabs.sendMessage(tab.id, message).catch(reason => {
                        console.log('couldnt send message to tab: ' + reason, tab);
                    });
                }
            });
        }
    }
};
