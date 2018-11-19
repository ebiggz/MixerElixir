Vue.component('nav-bar', {
	template: `
		<nav class="navbar navbar-expand navbar-dark bg-dark">
			<a class="navbar-brand">
				<img src="/resources/images/elixr-light-128.png" width="30" height="30" alt="">
			</a>
			<div class="collapse navbar-collapse" id="navbarNav">
				<ul class="navbar-nav mr-auto">
					<li class="nav-item" class="clickable" :class="{active: onlineActive}" @click="changeTab('online')">
						<a class="nav-link">Who's Online</a>
					</li>
					<li class="nav-item" class="clickable" :class="{active: optionsActive}" @click="changeTab('options')">
						<a class="nav-link"><i class="fa fa-cog" aria-hidden="true"></i> Options</a>
					</li>
				</ul>
				<ul class="navbar-nav flex-row">
					<li class="nav-item clickable" class="mixerAlert" v-bind:status="mixerStatus" v-if="mixerStatus !== 'none'">
						<a href="https://status.mixer.com" target="_blank" class="nav-link" :title="'Mixer Service Status: '+mixerStatus"><i class="fa fa-exclamation-circle" aria-hidden="true"></i></a>
					</li>
					<li class="nav-item clickable">
						<a class="nav-link" href="https://twitter.com/MixrElixr" target="_blank"><i class="fa fa-twitter" aria-hidden="true"></i></a>
					</li>
					<li class="nav-item clickable">
						<a class="nav-link" href="https://github.com/crowbartools/MixrElixr" target="_blank"><i class="fa fa-github" aria-hidden="true"></i></a>
					</li>
				</ul>
			</div>
		</nav>
	`,
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
		changeTab: function(tab) {
			this.onlineActive = tab === 'online';
			this.optionsActive = tab === 'options';
			this.$emit('tab-changed', tab);
			bus.$emit('tab-changed', tab);
		},
		serviceStatus: function(){
			return new Promise(function(resolve, reject) {
				var request = new XMLHttpRequest();
				request.open('GET', 'https://00qbcbkrqn0y.statuspage.io/api/v2/status.json', true);
	
				request.onload = function() {
					if (request.status >= 200 && request.status < 400) {
						// Success!
						var data = JSON.parse(request.responseText);

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
		this.serviceStatus()
			.then((res) =>{
				this.mixerStatus = res;
			});
	}
});