<template>
    <div>
        <div v-if="!loadingMixerUser && mixerUserFound">
            <div style="margin: 0 50px 15px;">
                <search :query.sync="searchQuery" placeholder="Search follows"></search>
            </div>
            <div class="online-type-title">
                <span class="online-title">Favorites</span>
                <b-badge style="background-color:#0faf27;">{{ favorites.length }}</b-badge>
            </div>
            <div
                class="muted online-list-message"
                v-if="!loadingMixerUser && mixerUserFound && favorites.length === 0 && savedFavoritesList.length !== 0"
            >
                No favorites are currently streaming :(
            </div>
            <div
                class="muted online-list-message"
                v-if="!loadingMixerUser && mixerUserFound && savedFavoritesList.length === 0"
            >
                No favorites set. Click the
                <i class="fa fa-star-o" aria-hidden="true"></i> on a streamer to add your first one!
            </div>
            <div class="channels-row" style="margin-bottom: 15px;">
                <live-channel-card
                    v-for="friend in filteredFavorites"
                    v-bind:key="friend.id"
                    :friend="friend"
                    :favorite="true"
                    @remove-favorite="favoriteRemoved"
                ></live-channel-card>
            </div>

            <div class="online-type-title">
                <span class="online-title">Following</span>
                <b-badge style="background-color:#18ABE9;">{{ friends.length }}</b-badge>
            </div>
            <div class="muted online-list-message" v-if="!loadingMixerUser && mixerUserFound && friends.length === 0">
                No one is currently streaming :(
            </div>
            <div class="channels-row">
                <live-channel-card
                    v-for="friend in filteredFriends"
                    v-bind:key="friend.id"
                    :friend="friend"
                    :favorite="false"
                    @add-favorite="favoriteAdded"
                ></live-channel-card>
            </div>
        </div>
        <div v-if="!loadingMixerUser && !mixerUserFound">
            To see who follow, go to
            <a href="https://mixer.com" target="_blank">Mixer.com</a> and log in.
        </div>
        <div class="muted" v-if="loadingMixerUser">Loading online friends...</div>
    </div>
</template>

<script>
export default {
    props: ['active'],
    mixins: [settingsStorage, friendFetcher],
    data: function() {
        return {
            savedFavoritesList: [],
            favorites: [],
            friends: [],
            friendsLimit: 10,
            loadingMixerUser: true,
            mixerUserFound: false,
            showBadge: true,
            onlyFavoritesCount: false,
            searchQuery: ''
        };
    },
    watch: {
        searchQuery: function() {
            this.friendsLimit = 10;
        }
    },
    computed: {
        filteredFavorites: function() {
            if (this.searchQuery == null || this.searchQuery.length < 1) {
                return this.favorites;
            }
            return this.favorites.filter(f => {
                return f.token.toLowerCase().includes(this.searchQuery.toLowerCase());
            });
        },
        filteredFriends: function() {
            let sublist = this.friends.slice(0, this.friendsLimit);
            if (this.searchQuery == null || this.searchQuery.length < 1) {
                return sublist;
            }
            return this.friends.filter(f => {
                return f.token.toLowerCase().includes(this.searchQuery.toLowerCase());
            });
        }
    },
    methods: {
        addMoreFriendsToView: function() {
            // This grabs the next 10 friends and shows them.
            let friendsCount = this.friends.length;
            let newLimit = this.friendsLimit + 10;
            this.friendsLimit = newLimit > friendsCount ? friendsCount : newLimit;
        },
        updateIconBadge: function() {
            let text = '';
            let color = '#18ABE9';
            let friends = this.friends;
            let favorites = this.favorites;
            if (this.showBadge !== false && friends != null && favorites != null) {
                let onlineCount;
                if (this.onlyFavoritesCount) {
                    onlineCount = favorites.length;
                } else {
                    onlineCount = friends.length + favorites.length;
                }
                if (onlineCount > 0) {
                    text = onlineCount.toString();
                }
                if (favorites.length > 0) {
                    color = '#0faf27';
                }
            }
            browser.browserAction.setBadgeText({ text: text });
            browser.browserAction.setBadgeBackgroundColor({ color: color });
        },
        loadFriends: function() {
            let app = this;
            return new Promise((resolve, reject) => {
                let getSettings = app.fetchSettings();
                let getFriends = app.outputMixerFollows();

                Promise.all([getSettings, getFriends]).then(
                    values => {
                        let favoriteFriends = values[0].generalOptions.favoriteFriends;

                        app.savedFavoritesList = favoriteFriends;

                        app.showBadge = values[0].generalOptions.showBadge;
                        app.onlyFavoritesCount = values[0].generalOptions.onlyShowFavoritesCount;

                        let onlineFriends = values[1];

                        // seperate favorites and non favorites
                        let favoritesOnly = [];
                        let followingOnly = [];
                        onlineFriends.forEach(f => {
                            if (favoriteFriends.includes(f.token)) {
                                favoritesOnly.push(f);
                            } else {
                                followingOnly.push(f);
                            }
                        });

                        app.favorites = favoritesOnly;
                        app.friends = followingOnly;

                        app.updateIconBadge();

                        resolve();
                    },
                    () => {
                        reject();
                    }
                );
            });
        },
        findMixerId: function() {
            return this.getMixerId();
        },
        favoriteAdded: function(name) {
            this.updateFavorite(name, true, true);
        },
        favoriteRemoved: function(name) {
            this.updateFavorite(name, false, true);
        },
        updateFavorite: function(name, isAdd, shouldSave) {
            let app = this;
            if (isAdd) {
                app.savedFavoritesList = app.savedFavoritesList.concat([name]);

                let friendFind = app.friends.filter(f => f.token === name);
                if (friendFind != null && friendFind.length > 0) {
                    let friend = friendFind[0];
                    app.favorites = app.favorites.concat([friend]).sort((a, b) => b.viewersCurrent - a.viewersCurrent);
                    app.friends = app.friends.filter(f => f.id !== friend.id);

                    app.friendsLimit = 10;
                }
            } else {
                app.savedFavoritesList = app.savedFavoritesList.filter(n => n !== name);

                let friendFind = app.favorites.filter(f => f.token === name);
                if (friendFind != null && friendFind.length > 0) {
                    let friend = friendFind[0];
                    app.friends = app.friends.concat([friend]).sort((a, b) => b.viewersCurrent - a.viewersCurrent);
                    app.favorites = app.favorites.filter(f => f.id !== friend.id);

                    app.friendsLimit = 10;
                }
            }

            app.updateIconBadge();

            if (shouldSave) {
                app.saveGeneralOptions({
                    favoriteFriends: app.savedFavoritesList
                });
                bus.$emit('favorites-updated', app.savedFavoritesList);
            }
        }
    },
    mounted: function() {
        let app = this;
        // When Vue is ready
        app.getMixerId().then(
            () => {
                // id found
                app.mixerUserFound = true;
            },
            () => {
                // no current user
                app.mixerUserFound = false;
            }
        );

        app.loadFriends()
            .then(() => {}, () => {})
            .then(() => {
                app.loadingMixerUser = false;
            });
    },
    created: function() {
        let app = this;
        bus.$on('friends-scrolled', function() {
            console.log('We found more friends!');
            if (app.friendsLimit < app.friends.length) {
                console.log('adding more');
                app.addMoreFriendsToView();
                console.log(app.friendsLimit);
            }
        });

        bus.$on('remove-favorite', function(name) {
            app.updateFavorite(name, false, false);
        });

        bus.$on('add-favorite', function(name) {
            app.updateFavorite(name, true, false);
        });

        bus.$on('badge-update', function(showBadge, favoritesOnly) {
            app.showBadge = showBadge;
            app.onlyFavoritesCount = favoritesOnly;
            app.updateIconBadge();
        });
    }
};
</script>
