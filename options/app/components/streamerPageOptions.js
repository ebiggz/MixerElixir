Vue.component('streamer-page-options', {
	template: `
		<div class="settings-section">
			<div class="settings-section-header">
				<span class="title">Streamer Page</span> <streamer-override-dropdown :overrideNames="overrideNames" 
						:selected="selected"
						@override-added="overrideAdded"
						@override-selected="overrideSelected"
						@override-deleted="overrideDeleted">
					</streamer-override-dropdown>
			</div>
			<div class="settings-section-settings">
				<span class="setting-subcategory">General</span>
				<checkbox-toggle :value.sync="autoCloseInteractive" @changed="saveSettings()" label="Auto close Interactive boards"></checkbox-toggle>
				<checkbox-toggle :value.sync="autoCloseCostreams" @changed="saveSettings()" label="Auto Close Costreams" tooltip="This will close all streamers in a costream except for the streamer whom you are visiting."></checkbox-toggle>
				<checkbox-toggle :value.sync="autoMute" @changed="saveSettings()" label="Auto Mute Streams"></checkbox-toggle>
				<checkbox-toggle :value.sync="autoTheater" @changed="saveSettings()" label="Auto Theater Mode"></checkbox-toggle>

				<span class="setting-subcategory">Chat</span>
				<checkbox-toggle :value.sync="separateChat" @changed="saveSettings()" label="Separate Chat Lines"></checkbox-toggle>
				<checkbox-toggle :value.sync="alternateChatBGColor" @changed="saveSettings()" label="Alternate Chat BG Color"></checkbox-toggle>
				<checkbox-toggle :value.sync="timestampAllMessages" @changed="saveSettings()" label="Timestamp All Messages" tooltip="Please note that timestamps will only be added to new messages as there is no way for us to tell when previous messages were sent."></checkbox-toggle>
				<checkbox-toggle :value.sync="mentionChatBGColor" @changed="saveSettings()" label="Highlight When Mentioned" tooltip="Apply a special background behind messages when you are mentioned."></checkbox-toggle>
				<checkbox-toggle :value.sync="hideDeleted" @changed="saveSettings()" label="Mask Deleted Messages" tooltip="Hides deleted messages behind a blur. Hover over the deleted message to reveal it. Great way to hide spoilers or toxic messages."></checkbox-toggle>

				<div class="option-wrapper">
					<div style="padding-bottom: 5px;">Highlight Keywords<option-tooltip name="highlightKeywords" title="Any messages containing these keywords will have a special background."></option-tooltip></div>
					<edittable-list class="option" :value.sync="keywords" :options="[]" tag-placeholder="Press enter to add keyword" placeholder="Type to add keyword" @changed="saveSettings()"></edittable-list>
				</div>

				<div class="option-wrapper" style="padding: 10px 0;">
					<div style="padding-bottom: 5px;">Word Blacklist<option-tooltip name="hideKeywords" title="Any words in this list will be automatically hidden via the below style. Note: If you are a mod for the currently viewed channel, this feature is disabled."></option-tooltip>
						<a @click="showWordBlacklist = !showWordBlacklist" style="cursor: pointer; color: #00A7FF; font-size: 12px; padding-left: 5px">
							{{showWordBlacklist ? 'Hide Blacklist' : 'Show Blacklist'}}
						</a>
					</div>
					<b-collapse class="mt-2" v-model="showWordBlacklist" id="wordBlacklistCollapse"> 
						<edittable-list class="option" :value.sync="hideKeywords" :options="[]" tag-placeholder="Press enter to add keyword" placeholder="Type to add keyword" @changed="saveSettings()"></edittable-list>
						<div style="padding-left: 10px">
							<div style="padding-bottom: 3px">Hide Style <option-tooltip name="hideStyle" title="How the word will be hidden. Hovering over the hidden word will reveal it (except for Remove style)."></option-tooltip></div>
							<b-form-select v-model="hideStyle" :options="hideStyles" class="mb-3 option"></b-form-select>
						</div>
					</b-collapse>
				</div>

				<div class="option-wrapper" style="margin-bottom: 20px;">
					<div style="padding-bottom: 5px;">Ignored Users<option-tooltip name="ignoredUsers" title="You will not see messages from users listed here."></option-tooltip></div>
					<edittable-list class="option" :value.sync="ignoredUsers" :options="viewers" tag-placeholder="Press enter to add user" placeholder="Select or type to add" @changed="saveSettings()"></edittable-list>
				</div>

				<inline-img-toggle :value.sync="showImagesInline" @changed="saveSettings()"></inline-img-toggle>
				<div v-show="showImagesInline" class="option-wrapper suboption">
					<div style="padding-bottom: 5px;">Permitted User Roles<option-tooltip name="permUserRoles" title="See images from anyone in the selected role (and higher), unless the user is blacklisted below."></option-tooltip></div>
					<b-form-select v-model="lowestUserRoleLinks" :options="userRoles" class="mb-3 option"></b-form-select>
					<div style="padding-bottom: 5px;">Trusted Users<option-tooltip name="permUsers" title="Images from these users will ALWAYS show, even if they aren't in a permitted role above."></div>
					<edittable-list class="option" :value.sync="inlineImgPermittedUsers" :options="viewers" tag-placeholder="Press enter to add user" placeholder="Select or type to add" @changed="saveSettings()"></edittable-list>
					<div style="padding-bottom: 5px;">Blacklisted Users<option-tooltip name="blacklistedUsers" title="Images from these users will NEVER show, even if they are in a permitted role above."></option-tooltip></div>
					<edittable-list class="option" :value.sync="inlineImgBlacklistedUsers" :options="viewers" tag-placeholder="Press enter to add user" placeholder="Select or type to add" @changed="saveSettings()"></edittable-list>
				</div>

				<span class="setting-subcategory">Hosts</span>
				<checkbox-toggle :value.sync="autoForwardOnHost" @changed="saveSettings()" label="Redirect on Host" tooltip="If the channel you are viewing hosts someone else, this will automatically redirect you to the hosted channel."></checkbox-toggle>
				<checkbox-toggle :value.sync="autoMuteOnHost" @changed="saveSettings()" label="Auto Mute Stream on Host"></checkbox-toggle>
			</div>
        </div>
	`,
	mixins: [settingsStorage, scriptCommunication],
	methods: {
		overrideSelected: function(name) {
			var selectedType = null;

			if(name === 'Global') {
				selectedType = name;
			} else {
				// search for a matching override case insensitive
				var match = this.getOverrideNames().filter((o) => {
					return o.toLowerCase() === name.toLowerCase();
				});
	
				if(match.length > 0) {
					selectedType = match[0];
				}
			}

			if(selectedType != null) {
				this.selected = selectedType;
				this.setModel(this.getSelectedOptions());
			}
		},
		overrideAdded: function(name) {
			this.selected = name;

			var defaults = this.getDefaultOptions().streamerPageOptions.global;
			
			var defaultsCopy = JSON.parse(JSON.stringify(defaults));

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
			var model = this.getModel();

			if(this.selected === 'Global') {
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
			var app = this;
			app.selected = 'Global';
			this.fetchSettings().then((data) => {
				var streamerPageOptions = data.streamerPageOptions;
				app.setModel(streamerPageOptions.global);
				app.global = streamerPageOptions.global;
				app.overrides = streamerPageOptions.overrides;
				app.overrideNames = app.getOverrideNames();
			});
		},
		getOverrideNames: function() {
			return Object.keys(this.overrides);
		},
		getSelectedOptions: function() {
			if(this.selected === 'Global') {
				return this.global;
			} else {
				return this.overrides[this.selected];
			}
		},
		setModel: function(options) {
			var app = this;
			var g = app.global;

			//copy over any settings from global that dont exist yet in this override (this happens when new settings are added);
			Object.keys(g).forEach((k) => {
				if(options[k] == null) {
					options[k] = JSON.parse(JSON.stringify(g[k]));
				}
			});

			Object.keys(options).forEach((k) => {
				app[k] = options[k];
			});
		},
		getModel: function() {
			var app = this;
			
			var builtModel = {};
			var options = app.getSelectedOptions();	
			
			Object.keys(options).forEach((k) => {
				builtModel[k] = app[k];
			});

			return builtModel;
		},
		getViewersForCurrentChannel: function() {
			var app = this;
			app.getCurrentStreamerNameInOpenTab().then((name) => {
				if(name == null) return;
				app.$http.get(`https://mixer.com/api/v1/channels/${encodeURIComponent(name)}?fields=id`, {responseType: 'json'})
					.then((response) => {
						if(!response.ok) return;

						var id = response.body.id;
						app.$http.get(`https://mixer.com/api/v1/chats/${id}/users?fields=userName`, {responseType: 'json'})
							.then((response) => {
								if(!response.ok) return;
								app.viewers = response.body.map(v => v.userName);
							});					
					});
			});
		}
	},
	watch: {
		lowestUserRoleLinks: function(newRole) {
			this.saveSettings();
		},
		hideStyle: function(newStyle) {
			console.log('saving hide style');
			this.saveSettings();
		}
	},
	data: function() {

		var dataObj = {
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
			overrideNames: [],
			viewers: []
		};

		var defaults = this.getDefaultOptions().streamerPageOptions;

		// fill out our model with the default settings
		var global = defaults.global;		
		Object.keys(global).forEach((k) => {
			dataObj[k] = global[k];
		});

		dataObj.global = global;
		dataObj.overrides = defaults.overrides;

		return dataObj;
	},
	mounted: function() {
		this.loadSettings();
		this.getCurrentStreamerNameInOpenTab().then((name) => {
			if(name != null) {
				this.overrideSelected(name);
			}
		});

		this.getViewersForCurrentChannel();
	}
});
