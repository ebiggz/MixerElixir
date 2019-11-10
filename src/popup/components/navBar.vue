<template>
    <nav class="navbar navbar-expand navbar-dark bg-dark">
        <a class="navbar-brand">
            <img src="/resources/images/elixr-light-128.png" width="30" height="30" alt="" />
        </a>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav mr-auto">
                <li
                    class="nav-item clickable me-nav-item"
                    :class="{ active: onlineActive }"
                    @click="changeTab('online')"
                >
                    <a class="nav-link">Live Now</a>
                </li>
                <li class="nav-item clickable" :class="{ active: optionsActive }" @click="changeTab('options')">
                    <a class="nav-link">Options</a>
                </li>
            </ul>
            <ul class="navbar-nav flex-row">
                <li class="nav-item clickable mixerAlert" v-bind:status="mixerStatus" v-if="mixerStatus !== 'none'">
                    <a
                        href="https://status.mixer.com"
                        target="_blank"
                        class="nav-link"
                        :title="'Mixer Service Status: ' + mixerStatus"
                        ><i class="fa fa-exclamation-circle" aria-hidden="true"></i
                    ></a>
                </li>
                <li class="nav-item clickable mixer-icon">
                    <a class="nav-link" href="https://mixer.com" target="_blank">
                        <img src="/popup/resources/images/MixerMerge_Dark.svg" width="16" height="16" />
                    </a>
                </li>
                <li class="nav-item clickable">
                    <a class="nav-link" href="https://twitter.com/MixrElixr" target="_blank"
                        ><i class="fa fa-twitter" aria-hidden="true"></i
                    ></a>
                </li>
                <li class="nav-item clickable">
                    <a class="nav-link" href="https://github.com/crowbartools/MixrElixr" target="_blank"
                        ><i class="fa fa-github" aria-hidden="true"></i
                    ></a>
                </li>
            </ul>
        </div>
    </nav>
</template>

<script>
export default {
    data: function() {
        return {
            activeTab: 'online',
            onlineActive: true,
            optionsActive: false,
            mixerStatus: 'none'
        };
    },
    props: ['onlineCount'],
    methods: {
        scrollToTop: function(smooth) {
            document.getElementById('app-wrapper').scroll({
                top: 0,
                left: 0,
                behavior: smooth ? 'smooth' : undefined
            });
        },
        changeTab: function(tab) {
            this.scrollToTop(this.activeTab === tab);
            this.onlineActive = tab === 'online';
            this.optionsActive = tab === 'options';
            this.activeTab = tab;
            this.$emit('tab-changed', tab);
            bus.$emit('tab-changed', tab);
        },
        serviceStatus: function() {
            return new Promise(function(resolve, reject) {
                const request = new XMLHttpRequest();
                request.open('GET', 'https://00qbcbkrqn0y.statuspage.io/api/v2/status.json', true);

                request.onload = function() {
                    if (request.status >= 200 && request.status < 400) {
                        // Success!
                        const data = JSON.parse(request.responseText);

                        resolve(data.status.indicator);
                    } else {
                        // We reached our target server, but it returned an error
                        console.log('Error getting mixer status.');
                        reject('Error getting mixer status.');
                    }
                };

                request.onerror = function() {
                    // There was a connection error of some sort
                    console.log('Error getting mixer status.');
                    reject('Error getting mixer status.');
                };

                request.send();
            });
        }
    },
    mounted: function() {
        // Check mixer status
        this.serviceStatus().then(res => {
            this.mixerStatus = res;
        });
    }
};
</script>
