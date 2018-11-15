Vue.component('online-friend', {
	template: `
        <div class="mixerFriend">
            <div class="friendPreview" @mouseover="hover = true" @mouseleave="hover = false, videoReady = false">
                <a v-bind:href="channelLink" target="_blank" class="friendLink">
                    <div class="thumbnail">
                        <img v-bind:src="channelImgUrl" v-show="videoReady === false">
                        <video autoplay="true" loop="true" @canplay="if(hover) { videoReady = true }" v-if="hover === true" v-show="videoReady === true" v-bind:src="channelVidUrl">
                        </video>
                        <div class="friend-header">
							<span class="friendName">{{friend.token}}
								<span class="favorite-btn" @click="addOrRemoveFavorite($event)">
									<i :id="friend.token" class="fa" :class="favorite ? 'fa-star' : 'fa-star-o'" aria-hidden="true"></i>
									<b-tooltip :target="friend.token" :title="favorite ? 'Remove Favorite' : 'Add Favorite'" no-fade="true"></b-tooltip>
								</span>
							</span>
                            <span class="friendViewers"><i class="fa fa-eye" aria-hidden="true"></i>{{friend.viewersCurrent}}</span>
						</div>
						<div :id="friend.token + friend.audience" class="friend-audience" :class="{ eighteen: friend.audience === '18+' }">
							<span>{{friend.audience}}</span>	
						</div>
						<b-tooltip :target="friend.token + friend.audience" :title="'Stream Audience'" no-fade="true"></b-tooltip>
						
						<div class="friend-icons">
							<i v-if="friend.interactive" class="fa fa-gamepad" title="Interactive"></i>
							<i v-if="friend.costreamId" class="fa fa-users" title="Costream"></i>
						</div>
                    </div>
					<div class="info-container">
						<div class="friendGame" :title="channelGame">{{channelGame}}</div>
						<div class="friendTitle" :title="channelTitle">{{channelTitle}}</div>
                    </div>
                </a>
            </div>
        </div>
	`,
	props: ['friend', 'favorite'],
	data: function() {
		return {
			hover: false,
			videoReady: false
		};
	},
	computed: {
		channelImgUrl: function() {
			return `https://thumbs.mixer.com/channel/${this.friend.id}.small.jpg`;
		},
		channelVidUrl: function() {
			return `https://thumbs.mixer.com/channel/${this.friend.id}.m4v`;
		},
		channelLink: function(){
			return `https://mixer.com/${this.friend.token}`;
		},
		channelTitle: function(){
			return this.friend.name;
		},
		channelGame: function(){
			if(this.friend.type == null) return '';
			return this.friend.type.name;
		}
	},
	methods: {
		addOrRemoveFavorite: function(event) {
			if(event) event.preventDefault();
			if(this.favorite) {
				this.$emit('remove-favorite', this.friend.token);
			} else {
				this.$emit('add-favorite', this.friend.token);
			}
		}
	}
});