friendFetcher = { 
	getMixerId: function() {
		// This gets a channel id using a mixer username.
		return new Promise(function(resolve, reject) {

			var request = new XMLHttpRequest();
			request.open('GET', 'https://mixer.com/api/v1/users/current', true);

			request.onload = function() {
				if (request.status >= 200 && request.status < 400) {
					// Success!
					var data = JSON.parse(request.responseText);
					resolve(data.id);
				} else {
					// We reached our target server, but it returned an error
					reject('Login at Mixer.com to see your online friends.');
				}
			};

			request.onerror = function() {
				// There was a connection error of some sort
				reject('Error getting userId');
			};

			request.send();
		});
	},
	getMixerFollows: function(userId, page, followList, onlyOnline = true){
		var app = friendFetcher;
		// This will get 100 follows on a specific page.
		return new Promise(function(resolve, reject) {
			// To test a lot of follows, uncomment the line below.
			//var userId = 313842;

			const pageSize = 100;
				
			console.log('Trying page '+page+' of follows for userId '+userId);


			var url = `https://mixer.com/api/v1/users/${userId}/follows?fields=id,online,name,token,viewersCurrent,partnered,costreamId,interactive,type,audience&where=online:eq:true&order=viewersCurrent:desc&limit=${pageSize}&page=${page}`;
			if(!onlyOnline) {
				// when we get all followers, we only need the id and their name, cuts down on how much data we bring over the wire
				url = `https://mixer.com/api/v1/users/${userId}/follows?fields=id,token&limit=${pageSize}&page=${page}`;
			}
			var request = new XMLHttpRequest();
			request.open('GET', url, true);

			request.onload = function() {
				if (request.status >= 200 && request.status < 400) {
					// Success!
					var data = JSON.parse(request.responseText);

					// Loop through data and throw in array.
					for (friend of data){
						followList.push(friend);
					}

					if(data.length >= pageSize) {
						friendFetcher.getMixerFollows(userId, page+1, followList, onlyOnline).then((f) => {
							resolve(f);
						});
					} else {
						// If we hit 50 friends, cycle again because we've run out of friends on this api call.
						resolve(followList);
					}

				} else {
					// We reached our target server, but it returned an error
					reject('Error getting followed channels.');
				}
			};

			request.onerror = function() {
				// There was a connection error of some sort
				reject('Error while getting followed channels.');
			};

			request.send();
		});
	},
	outputMixerFollows: function(onlyOnline = true){
		var app = friendFetcher;
		// This combines two functions so that we can get a full list of online followed channels with a username.
		return new Promise((resolve, reject) => {
			var page = 0;
			app.getMixerId()
				.then((userId) =>{
					app.getMixerFollows(userId, page, [], onlyOnline)
						.then((followList) =>{
							resolve(followList);
						})
						.catch((err) => {
							reject(err);
						});
				})
				.catch((err) => {
					reject(err);
				});
		});
	}
};

function getGeneralOptions() {
	return new Promise((resolve) => {
		chrome.storage.sync.get({
			'generalOptions': {
				showBadge: true,
				favoriteFriends: [],
				highlightFavories: false
			}
		}, function(data) {
			resolve(data);
		});
	});
}



var updateFriendCount = function() {
	console.log('updating friend count...');

	var getFriends = friendFetcher.outputMixerFollows();
	var getSettings = getGeneralOptions();

	Promise.all([getFriends, getSettings]).then(values => {
		let settings = values[1].generalOptions;

		let showBadge = settings.showBadge;
		if(!showBadge) return;

		let favoriteFriends = settings.favoriteFriends;

		let onlineFriends = values[0];

		let favoriteIsOnline = onlineFriends.some(f => favoriteFriends.includes(f.token));

		var text = '', color = '#18ABE9';
		if(onlineFriends.length > 0) {
			let onlineCount = onlineFriends.length;
			if(onlineCount > 0) {
				text = onlineCount.toString();
			}
			if(favoriteIsOnline) {
				color = '#0faf27';
			}
		}
		chrome.browserAction.setBadgeText({text: text});
		chrome.browserAction.setBadgeBackgroundColor({ color: color});
		
	});  
};

updateFriendCount();

setInterval(updateFriendCount, 1000*60*2);