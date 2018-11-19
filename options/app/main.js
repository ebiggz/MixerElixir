Vue.component('multiselect', window.VueMultiselect.default);
Vue.component('vueSlider', window['vue-slider-component']);

//global bus we use for sending events across components. 
bus = new Vue();

//main app
new Vue({
	el: '#app',
	data: {
		activeTab: 'online'
	},
	methods: {
		updateActiveTab: function(tab) {
			console.log('tab changed: ' + tab);
			this.activeTab = tab;
			var container = this.$el.querySelector('.tabs-wrapper');
			container.scrollTo(0, 0);
		},	
		addMoreFriendsCheck: function(){
			// If we scroll 80% through our current friends, add some more.
			if(this.activeTab === 'online'){
				var obj = this.$el.querySelector('.tabs-wrapper');
				var percent = (obj.scrollHeight - obj.offsetHeight) * .8;
				if(obj.scrollTop >= percent){
					bus.$emit('friends-scrolled');
				}
			}
		}
	}
});
