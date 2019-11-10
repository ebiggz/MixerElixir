import moment from 'moment';
import TTLCache from './TTLCache';

import Bowser from 'bowser';
const browserEnv = Bowser.getParser(window.navigator.userAgent);
const onlyLocalStorage = browserEnv.satisfies({
    Linux: {
        Chrome: '>0'
    },
    'Chrome OS': {
        Chrome: '>0'
    }
});

global.browser = require('webextension-polyfill');

// constants
const ELIXR_CLIENT_ID = 'd2158e591bb347931751bef151ee3bf3e5c8cb9608924a7a';
const CURRENT_USER_URL = 'https://mixer.com/api/v1/users/current';
const PAGE_LIMIT = 100;
const FOLLOWS_URL = `https://mixer.com/api/v1/users/{userId}/follows?fields=id,token,name,type,user&where=online:eq:true&limit=${PAGE_LIMIT}`;
const TOTAL_COUNT_HEADER = 'x-total-count';
const FOLLOW_DATE_URL = 'https://mixer.com/api/v1/channels/{channelId}/follow?where=id:eq:{currentUserId}';

let sentNotifications = [];

async function getCurrentUserId() {
    try {
        let response = await fetch(CURRENT_USER_URL, {
            credentials: 'include',
            headers: {
                'Client-ID': ELIXR_CLIENT_ID
            }
        });
        if (response.ok) {
            let user = await response.json();
            return user && user.id;
        } else {
            console.log('Failed to get current user.', response.statusText);
            return null;
        }
    } catch (err) {
        console.log('Unable to get current user.', err);
        return null;
    }
}

async function getOnlineFollows(userId, page = 0, list) {
    if (list == null) {
        list = [];
    }

    if (userId == null) {
        console.log('Unable to get follows, current user id is null.');
        return list;
    }

    let followsUrl = FOLLOWS_URL.replace('{userId}', userId) + `&page=${page}`;

    try {
        let response = await fetch(followsUrl, {
            credentials: 'include',
            headers: {
                'Client-ID': ELIXR_CLIENT_ID
            }
        });
        if (response.ok) {
            let liveFollows = await response.json();

            list = list.concat(
                liveFollows.map(f => {
                    return {
                        channelId: f.id,
                        channelName: f.token,
                        avatarUrl: f.user && f.user.avatarUrl,
                        streamTitle: f.name,
                        gameName: f.type && f.type.name
                    };
                })
            );

            // check the total count header, make sure we are getting all follows
            if (response.headers.has(TOTAL_COUNT_HEADER)) {
                let countStr = response.headers.get(TOTAL_COUNT_HEADER);
                if (Number.isInteger(countStr)) {
                    let count = parseInt(countStr);
                    if (count > list.length) {
                        return getOnlineFollows(userId, page + 1, list);
                    }
                }
            }
            return list;
        } else {
            console.log('Failed to get user follows.', response.statusText);
            return list;
        }
    } catch (err) {
        console.log('Unable to get user follows.', err);
        return list;
    }
}

async function getFollowDate(channelId, currentUserId) {
    let followDateUrl = FOLLOW_DATE_URL.replace('{channelId}', channelId).replace('{currentUserId}', currentUserId);

    try {
        let response = await fetch(followDateUrl, {
            credentials: 'include',
            headers: {
                'Client-ID': ELIXR_CLIENT_ID
            }
        });
        if (response.ok) {
            let followerData = await response.json();

            if (followerData == null || followerData.length < 1) {
                return null;
            }

            let user = followerData[0];

            return user && user.followed && user.followed.createdAt;
        } else {
            console.log('Failed to get user follow date.', response.statusText);
            return null;
        }
    } catch (err) {
        console.log('Unable to get user follow date.', err);
        return null;
    }
}

async function isNewFollower(channelId, currentUserId) {
    let rawFollowDate = await getFollowDate(channelId, currentUserId);

    // hmm they dont appear to have follow date, assume they are a new follower to be safe.
    if (rawFollowDate == null) return true;

    let followDate = moment(rawFollowDate);
    let now = moment();

    let minutesSinceFollowed = now.diff(followDate, 'minutes');

    return minutesSinceFollowed <= 3;
}

function getGeneralOptions() {
    let storage = onlyLocalStorage ? browser.storage.local : browser.storage.sync;

    return storage
        .get({
            generalOptions: {
                showBadge: true,
                favoriteFriends: [],
                highlightFavories: false,
                liveNotificationsMode: 'favorites',
                playLiveNotificationSound: true,
                liveNotificationSoundType: 'default'
            }
        })
        .then(data => {
            return data.generalOptions;
        });
}

function showNotification(followedUser, options) {
    let title = `${followedUser.channelName} has gone live!`;
    let icon = followedUser.avatarUrl || '/resources/images/elixr-light-128.png';
    let image = `https://thumbs.mixer.com/channel/${followedUser.channelId}.small.jpg`;
    let text = `${followedUser.streamTitle}${followedUser.gameName ? ` | ${followedUser.gameName}` : ''}`;

    let notificationsMode = options.liveNotificationsMode || 'favorites';

    console.log(`Checking user setting for notification mode: ${notificationsMode}`);

    if (notificationsMode === 'all' || (notificationsMode === 'favorites' && followedUser.favorite)) {
        console.log('Displaying notification...');
        // create notification, this automatically displays it too
        let notification = new Notification(title, {
            body: text,
            icon: icon,
            badge: icon,
            tag: followedUser.channelName,
            image: image,
            silent: true
        });

        if (options.playLiveNotificationSound) {
            console.log('Playing sound...');
            let url = '/resources/sounds/notification_alert.mp3';
            let audio = new Audio(url);
            audio.volume = 0.1;
            audio.play();
        }

        notification.onclick = function(event) {
            // prevent the browser from focusing the Notification's tab
            event.preventDefault();
            window.open(`https://mixer.com/${event.srcElement.tag}`, '_blank');
            sentNotifications = sentNotifications.filter(n => n !== event.srcElement);
        };

        setTimeout(notification.close.bind(notification), 20000);

        sentNotifications.push(notification);
    } else {
        console.log("User doesn't have notifications enabled for this follow type. Not showing notifications.");
    }
}

function updateBadge(onlineCount, favoriteOnline) {
    let text = '';
    let color = '#18ABE9';

    if (onlineCount > 0) {
        text = onlineCount.toString();
        if (favoriteOnline) {
            color = '#0faf27';
        }
    }

    browser.browserAction.setBadgeText({ text: text });
    browser.browserAction.setBadgeBackgroundColor({ color: color });
}

// cache of user ids
let currentlyLiveCache = new TTLCache({
    ttl: 60000 * 30 // 30 mins
});

let firstRun = true;
async function run() {
    console.log('Running online check...');

    let currentUserId = await getCurrentUserId();
    let follows = await getOnlineFollows(currentUserId);
    let options = await getGeneralOptions();
    let favoriteFriends = options.favoriteFriends;
    follows.forEach(f => {
        f.favorite = favoriteFriends.includes(f.channelName);
    });

    console.log(`There are ${follows.length} friend(s) online.`);

    if (!firstRun) {
        console.log('Checking if any have gone live since our last check...');

        // loop through all followed channels
        for (let followedUser of follows) {
            // see if this channel has gone live since we last checked
            if (currentlyLiveCache.get(followedUser.channelId) == null) {
                console.log(`It looks like ${followedUser.channelName} has just gone live.`);

                console.log("Checking to make sure we aren't just a fresh follower.");
                // we dont want to display a notification if a user just followed this channel while they are live
                let newFollower = await isNewFollower(followedUser.channelId, currentUserId);
                if (!newFollower) {
                    console.log("We aren't a fresh follower, trigger notification.");
                    showNotification(followedUser, options);
                }
            }
        }
    } else {
        firstRun = false;
    }

    // update badge
    if (options.showBadge !== false) {
        let favoriteIsOnline = follows.some(f => favoriteFriends.includes(f.channelName));
        console.log('Updating badge...');

        let onlineCount;
        if (options.onlyShowFavoritesCount) {
            onlineCount = follows.filter(f => f.favorite).length;
        } else {
            onlineCount = follows.length;
        }

        updateBadge(onlineCount, favoriteIsOnline);
    }

    // update our cache
    follows.forEach(f => currentlyLiveCache.put(f.channelId, true));
    console.log('... Completed currently live check.');
}

console.log('Starting online check interval...');
// do initial run
run();
// run every 15 secs thereafter
setInterval(run, 15000);
