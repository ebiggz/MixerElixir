<template>
    <div v-cloak @scroll="addMoreFriendsCheck" id="app-wrapper">
        <div class="sentinel"></div>
        <div class="sticky">
            <nav-bar @tab-changed="updateActiveTab"></nav-bar>
        </div>
        <div class="page-wrapper">
            <div class="tabs-wrapper">
                <div v-show="activeTab == 'online'" id="onlineFriends" class="tab-content">
                    <online-friends-list></online-friends-list>
                </div>
                <div v-show="activeTab == 'options'" class="tab-content" style="padding: 20px 0;">
                    <sitewide-options></sitewide-options>
                    <streamer-page-options></streamer-page-options>
                    <home-page-options></home-page-options>
                    <general-options></general-options>
                    <div style="text-align: center">
                        <made-with-love></made-with-love>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    data: function() {
        return {
            activeTab: 'online',
            navStuck: false
        };
    },
    methods: {
        updateActiveTab: function(tab) {
            console.log('tab changed: ' + tab);
            this.activeTab = tab;
        },
        addMoreFriendsCheck: function() {
            // If we scroll 80% through our current friends, add some more.
            if (this.activeTab === 'online') {
                const obj = this.$el;
                const percent = (obj.scrollHeight - obj.offsetHeight) * 0.8;
                if (obj.scrollTop >= percent) {
                    bus.$emit('friends-scrolled');
                }
            }
        }
    },
    mounted: function() {
        let $ = document.querySelector.bind(document);

        let observer = new IntersectionObserver(entries => {
            let entry = entries[0];

            let stickyNav = $('.sticky');

            stickyNav.classList.toggle('stuck', !entry.isIntersecting);
        });

        observer.observe($('.sentinel'));
    }
};
</script>
