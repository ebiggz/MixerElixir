settingsStorage = {
	methods: {
		fetchSettings: function() {
			var app = this;
			return new Promise((resolve) => {
				var defaults = this.getDefaultOptions();

				chrome.storage.sync.get({
					'streamerPageOptions': defaults.streamerPageOptions,
					'homePageOptions': defaults.homePageOptions,
					'generalOptions': defaults.generalOptions
				}, function(data) {
					resolve(data);
				});
			});
		},
		saveAllSettings: function(settings, emitEvent = true) {
			var app = this;
			chrome.storage.sync.set(settings, () => {
				if(emitEvent) {
					app.emitSettingUpdatedEvent();
				}
			});
		},
		saveStreamerPageOptions: function(options) {
			this.saveAllSettings({
				'streamerPageOptions': options
			});
		},
		saveHomePageOptions: function(options) {
			this.saveAllSettings({
				'homePageOptions': options
			});
		},
		saveGeneralOptions: function(options) {
			this.saveAllSettings({
				'generalOptions': options
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
						hideDeleted: false,
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
						hideStyle: 'blur'
					},
					overrides: {}
				},
				homePageOptions: {
					removeFeatured: false,
					autoMute: false
				},
				generalOptions: {
					showBadge: true,
					favoriteFriends: [],
					highlightFavorites: true
				}
			};
		},
		emitSettingUpdatedEvent: function() {
		// let the content script on whatever tab know the settings have been updated
			chrome.tabs.query({}, function(tabs) {
				var message = { settingsUpdated: true };
				for (var i = 0; i < tabs.length; ++i) {
					chrome.tabs.sendMessage(tabs[i].id, message);
				}
			});
		}
	}
};