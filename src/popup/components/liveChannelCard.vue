<template>
    <div class="me-card" @mouseover="hover = true" @mouseleave="(hover = false), (videoReady = false)">
        <a v-bind:href="channelLink" target="_blank">
            <span class="sr-only">{{ friend.token }}</span>
            <span class="sr-only"> streaming {{ channelGame }}</span>
            <span class="sr-only">{{ friend.viewersCurrent }} viewers </span>

            <div aria-hidden="true" class="thumbnail">
                <img v-bind:src="channelImgUrl" @error="channelImgFail" />
                <video
                    autoplay="true"
                    loop="true"
                    v-if="hover === true"
                    v-show="videoReady === true"
                    v-bind:src="channelVidUrl"
                ></video>
                <div class="liveAndViewers">
                    <span class="favorite-btn" @click="addOrRemoveFavorite($event)" :id="friend.token + 'fav'">
                        <i class="fa" :class="favorite ? 'fa-star' : 'fa-star-o'" aria-hidden="true"></i>
                    </span>
                    <b-tooltip
                        :target="friend.token + 'fav'"
                        :title="favorite ? 'Remove Favorite' : 'Add Favorite'"
                        :no-fade="true"
                    ></b-tooltip>
                    <div class="viewersBadge">
                        <i class="fa fa-eye" aria-hidden="true" style="margin-right:5px;"></i
                        >{{ friend.viewersCurrent }}
                    </div>
                </div>

                <div v-if="friend.interactive" class="interactive icon" :id="friend.token + 'interactive'">
                    <i class="fa fa-gamepad" title="MixPlay"></i>
                </div>
                <b-tooltip
                    :target="friend.token + 'interactive'"
                    :title="'MixPlay Enabled'"
                    :no-fade="true"
                ></b-tooltip>

                <div v-if="friend.costreamId" class="costream icon" :id="friend.token + friend.costreamId">
                    <i class="fa fa-users" title="Costream"></i>
                </div>
                <b-tooltip
                    :target="friend.token + friend.costreamId"
                    :title="'In a Costream'"
                    :no-fade="true"
                ></b-tooltip>

                <div
                    :id="friend.token + friend.audience"
                    class="audience icon"
                    :class="{ eighteen: friend.audience === '18+' }"
                >
                    <span>{{ friend.audience }}</span>
                </div>
                <b-tooltip
                    :target="friend.token + friend.audience"
                    :title="'Stream Audience'"
                    :no-fade="true"
                ></b-tooltip>
            </div>

            <div aria-hidden="true" class="footer">
                <div class="channel-avatar" size="52" style="width: 52px; height: 52px;">
                    <img alt="Channel Badge" v-bind:src="channelAvatarUrl" style="width: 52px; height: 52px;" />
                </div>
                <div class="titles">
                    <h2>
                        <div class="truncated-text">
                            <div class="wrapper" :aria-label="channelTitle" :id="friend.token + friend.title">
                                {{ channelTitle }}
                                <b-tooltip
                                    :target="friend.token + friend.title"
                                    :title="channelTitle"
                                    :no-fade="true"
                                    placement="bottom"
                                ></b-tooltip>
                            </div>
                        </div>
                    </h2>
                    <small> {{ friend.token }} </small>
                    <small>
                        <div class="truncated-text">
                            <div class="wrapper" :aria-label="channelGame" :id="friend.token + friend.game">
                                {{ channelGame }}
                            </div>
                        </div>
                    </small>
                </div>
            </div>
        </a>
    </div>
</template>

<script>
export default {
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
        channelAvatarUrl: function() {
            return `https://mixer.com/api/v1/users/${this.friend.user.id}/avatar?w=64&h=64`;
        },
        channelLink: function() {
            return `https://mixer.com/${this.friend.token}`;
        },
        channelTitle: function() {
            return this.friend.name;
        },
        channelGame: function() {
            if (this.friend.type == null) return '';
            return this.friend.type.name;
        }
    },
    methods: {
        addOrRemoveFavorite: function(event) {
            if (event) event.preventDefault();
            if (this.favorite) {
                this.$emit('remove-favorite', this.friend.token);
            } else {
                this.$emit('add-favorite', this.friend.token);
            }
        },
        channelImgFail: function(e) {
            e.target.style.display = 'none';
        }
    }
};
</script>
