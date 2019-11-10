const clientId = 'd2158e591bb347931751bef151ee3bf3e5c8cb9608924a7a';

global.friendFetcher = {
    methods: {
        getMixerId: function() {
            // This gets a channel id using a mixer username.
            return new Promise(function(resolve, reject) {
                let request = new XMLHttpRequest();

                request.open('GET', 'https://mixer.com/api/v1/users/current', true);
                request.setRequestHeader('Client-ID', clientId);

                request.onload = function() {
                    if (request.status >= 200 && request.status < 400) {
                        // Success!
                        let data = JSON.parse(request.responseText);
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
        getMixerFollows: function(userId, page, followList, onlyOnline = true) {
            let app = this;
            // This will get 100 follows on a specific page.
            return new Promise(function(resolve, reject) {
                // To test a lot of follows, uncomment the line below.
                // var userId = 313842;

                const pageSize = 100;

                console.log('Trying page ' + page + ' of follows for userId ' + userId);

                let url = `https://mixer.com/api/v1/users/${userId}/follows?fields=id,online,name,token,viewersCurrent,partnered,costreamId,interactive,type,audience,user&where=online:eq:true&order=viewersCurrent:desc&limit=${pageSize}&page=${page}`;
                if (!onlyOnline) {
                    // when we get all followers, we only need the id and their name, cuts down on how much data we bring over the wire
                    url = `https://mixer.com/api/v1/users/${userId}/follows?fields=id,token&limit=${pageSize}&page=${page}`;
                }
                let request = new XMLHttpRequest();
                request.open('GET', url, true);

                request.onload = function() {
                    if (request.status >= 200 && request.status < 400) {
                        // Success!
                        let data = JSON.parse(request.responseText);

                        // Loop through data and throw in array.
                        for (let friend of data) {
                            followList.push(friend);
                        }

                        if (data.length >= pageSize) {
                            app.getMixerFollows(userId, page + 1, followList, onlyOnline).then(f => {
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
        outputMixerFollows: function(onlyOnline = true) {
            let app = this;
            // This combines two functions so that we can get a full list of online followed channels with a username.
            return new Promise((resolve, reject) => {
                let page = 0;
                app.getMixerId()
                    .then(userId => {
                        app.getMixerFollows(userId, page, [], onlyOnline)
                            .then(followList => {
                                resolve(followList);
                            })
                            .catch(err => {
                                reject(err);
                            });
                    })
                    .catch(err => {
                        reject(err);
                    });
            });
        }
    }
};
