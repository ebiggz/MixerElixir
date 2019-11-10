// dependancies
import Vue from 'vue';
import BootstrapVue from 'bootstrap-vue';
import VueMultiselect from 'vue-multiselect';
import VueSlider from 'vue-slider-component';

import './scss/styles.scss';

// the app
import App from './App';

// our mixins
import './mixins/friendFetcher';
import './mixins/scriptCommunication';
import './mixins/settingsStorage';

// components
import checkboxToggle from './components/checkboxToggle.vue';
import optionTooltip from './components/optionTooltip.vue';
import inlineImageToggle from './components/inlineImageToggle.vue';
import edittableList from './components/edittableList.vue';
import userList from './components/userList.vue';
import homePageOptions from './components/homePageOptions.vue';
import madeWithLove from './components/madeWithLove.vue';
import navBar from './components/navBar.vue';
import onlineFriendsList from './components/onlineFriendsList.vue';
import onlineFriend from './components/onlineFriend.vue';
import liveChannelCard from './components/liveChannelCard.vue';
import streamerOverrideDropdown from './components/streamerOverrideDropdown.vue';
import streamerPageOptions from './components/streamerPageOptions.vue';
import sitewideOptions from './components/sitewideOptions.vue';
import generalOptions from './components/generalOptions.vue';
import search from './components/search.vue';
import customEmotesToggle from './components/customEmotesToggle.vue';
import globalEmotesToggle from './components/globalEmotesToggle.vue';

// our mixins
require('./mixins/friendFetcher');
require('./mixins/scriptCommunication');
require('./mixins/settingsStorage');

global.browser = require('webextension-polyfill');
Vue.prototype.$browser = global.browser;

Vue.use(BootstrapVue);

Vue.component('multiselect', VueMultiselect);
Vue.component('vueSlider', VueSlider);

Vue.component('checkboxToggle', checkboxToggle);
Vue.component('optionTooltip', optionTooltip);
Vue.component('inlineImgToggle', inlineImageToggle);
Vue.component('edittableList', edittableList);
Vue.component('userList', userList);
Vue.component('homePageOptions', homePageOptions);
Vue.component('madeWithLove', madeWithLove);
Vue.component('navBar', navBar);
Vue.component('onlineFriendsList', onlineFriendsList);
Vue.component('onlineFriend', onlineFriend);
Vue.component('liveChannelCard', liveChannelCard);
Vue.component('streamerOverrideDropdown', streamerOverrideDropdown);
Vue.component('streamerPageOptions', streamerPageOptions);
Vue.component('generalOptions', generalOptions);
Vue.component('sitewideOptions', sitewideOptions);
Vue.component('search', search);
Vue.component('customEmotesToggle', customEmotesToggle);
Vue.component('globalEmotesToggle', globalEmotesToggle);

// global bus we use for sending events across components.
// eslint-disable-next-line no-unused-vars
global.bus = new Vue();

/* eslint-disable no-new */
new Vue({
    el: '#app',
    render: h => h(App)
});
