//import styles
import './scss/injected-styles.scss';

import {
    waitForElementAvailablity,
    debounce,
    log,
    escapeHTML,
    escapeRegExp,
    determineMessageType,
    setupScrollGlueCheck,
    scrollChatIfGlued,
    scrollChatToBottom
} from './utils';

import * as api from './api';

// vue apps
import * as autocompleteAppBinder from './vue-apps/emote-autocomplete/emote-autocomplete-binder';
import * as slowChatTimerAppBinder from './vue-apps/slow-chat-timer/slow-chat-timer-binder';
import { handleEmoteModal } from './emotes/emote-modal-handler';

//import deps
import $ from 'jquery';

import * as siteWide from './pages/site-wide';
import * as chatFeed from './pages/chat-feed';
import * as chatApi from './websocket/chat';

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

global.jQuery = $;
global.$ = global.jQuery;

require('tooltipster');
require('jquery-modal');
require('./plugins/jquery.initialize');
require('jquery-toast-plugin');

global.browser = require('webextension-polyfill');

// on document ready
$(() => {
    // stuff we need to track across pages
    let settings = null;
    let cache = {};
    let initialPageLoad = true;
    let theaterMode = false;

    const ElementSelector = {
        CHAT_CONTAINER: "[class*='ChatMessages']",
        CHAT_MESSAGE: "div[class*='message_']"
    };

    // start the process
    log('Starting MixrElixr...');

    function waitForPageLoad() {
        return new Promise(resolve => {
            function doPageCheck() {
                let spinner = $('.initial-loading-overlay');
                let spinnerExists = spinner != null && spinner.length > 0;

                if (spinnerExists) {
                    // spinner still exists, check again in a bit
                    setTimeout(() => {
                        doPageCheck();
                    }, 10);
                } else {
                    log('Spinner is gone, the page should be loaded.');
                    // spinner is gone, lets party
                    setTimeout(() => {
                        resolve();
                    }, 10);
                }
            }

            doPageCheck();
        });
    }

    function runPageLogic() {
        // Channel dectection
        let channelBlock = $('b-channel-page-wrapper');
        let mobileChannelBlock = $('b-channel-mobile-page-wrapper');

        // Home detection
        let homeBlock = $('b-homepage');

        // Window location
        let url = window.location.href;

        try {
            chatApi.disconnectChat();
        } catch (err) {
            console.log('failed to disconnet from chat!', err);
        }

        // check we if we are an embeded chat window
        let embededChatRegex = /^https?:\/\/(www\.)?mixer\.com\/embed\/chat\/(\w+)/;
        let result = embededChatRegex.exec(url);
        if (result != null) {
            log('Detected embeded chat window');
            cache.currentPage = 'embedded-chat';

            let channelIdOrName = result[2];

            api.getChannelData(channelIdOrName).then(channelData => {
                cache.currentStreamerId = channelData.id;

                cacheGlobalElixrEmotes();
                cacheChannelElixrEmotes(channelData.id);

                let channelName = channelData.token;
                cache.currentStreamerName = channelName;

                try {
                    chatApi.connectToChat(channelData && channelData.id, cache.user && cache.user.id);
                } catch (err) {
                    console.log('failed to connect to chat!', err);
                }

                waitForElementAvailablity(ElementSelector.CHAT_CONTAINER).then(() => {
                    applyChatSettings(channelName);
                });
            });
        } else if (
            (channelBlock != null && channelBlock.length > 0) ||
            (mobileChannelBlock != null && mobileChannelBlock.length > 0)
        ) {
            log('detected streamer page...');
            cache.currentPage = 'streamer';

            waitForElementAvailablity("[class*='chatContainer']").then(() => {
                $("[class*='chatContainer']").addClass('me-chat-container');
            });

            // get the streamers name, this also waits for the page to load
            getStreamerName().then(channelName => {
                log('streamer page loaded...');

                api.getChannelData(channelName).then(channelData => {
                    cache.currentStreamerId = channelData.id;

                    cacheGlobalElixrEmotes();
                    cacheChannelElixrEmotes(channelData.id);

                    let channelName = channelData.token;
                    cache.currentStreamerName = channelName;

                    try {
                        chatApi.connectToChat(channelData && channelData.id, cache.user && cache.user.id);
                    } catch (err) {
                        console.log('failed to connect to chat!', err);
                    }

                    let slowChatCooldown = channelData.preferences['channel:slowchat'];
                    cache.slowChatCooldown = slowChatCooldown;
                    log(`Set slow chat cooldown to: ${slowChatCooldown}`);

                    waitForElementAvailablity(ElementSelector.CHAT_CONTAINER).then(() => {
                        log('loading streamer page options...');
                        loadStreamerPage(channelName);
                    });
                });
            });
        } else if (homeBlock != null && homeBlock.length > 0) {
            log('looks like we are on the main page');
            cache.currentPage = 'homepage';
            loadHomepage();
        } else {
            cache.currentPage = 'other';
            loadOtherPage();
            log("looks like we're on some other page");
        }

        if (!initialPageLoad) {
            siteWide.apply(settings, cache.user);
        }
    }

    function loadHomepage() {
        log('Loading up settings for homepage');

        // If the user desires to have favorites highlighted:
        if (settings.generalOptions.highlightFavorites) {
            // clear the loop so were aren't trying to run it constantly!
            if (cache.highlightLoop != null) {
                clearInterval(cache.highlightLoop);
            }

            // Lets keep checking to see if we find any new favorites
            cache.highlightLoop = setInterval(function() {
                // Checking all streamer cards of non-favorites:
                $('.card:not(".favoriteFriend")').each(function() {
                    // Which streamer did we find
                    let streamer = $(this)
                        .find('.titles small')
                        .first()
                        .text()
                        .trim()
                        .replace(/ /g, '')
                        .replace(/\r?\n|\r/g, '');
                    if (streamerIsFavorited(streamer)) {
                        // If streamer is a favorite, let's highlight the window
                        $(this)
                            .find('.titles small')
                            .first()
                            .addClass('favoriteUsername');
                        $(this).addClass('favoriteFriend');
                    } else {
                        $(this)
                            .find('.titles small')
                            .first()
                            .removeClass('favoriteUsername');
                        $(this).removeClass('favoriteFriend');
                    }
                });
            }, 500);
        } else {
            log('Highlighting Favorites is off');
            // If highlights are off, then let's remove any active highlights.
            $('.card.favoriteFriend').removeClass('favoriteFriend');

            // clear the loop so were aren't trying to run it constantly!
            if (cache.highlightLoop != null) {
                clearInterval(cache.highlightLoop);
            }
        }

        // handle searchbar
        const pinSearchBar =
            settings.homePageOptions.pinSearchToTop == null || settings.homePageOptions.pinSearchToTop === true;

        let searchBar = $('b-browse-channels-header')
            .children()
            .find('.control.input');
        let pageHeader = $('b-nav-host');

        let searchHeader = $('b-browse-framework').children('header');

        let filterButton = $('b-browse-channels-header')
            .children()
            .find('.control.control-filter');

        let filterPanel = $('b-browse-filters');

        // add or remove our css classes
        if (pinSearchBar) {
            // remove button text from language dropdown
            $('.language-button')
                .children('span')
                .text('');
            // remove button text from filter button
            let filterText = $('.control-filter')
                .children('.bui-btn')
                .children('span')
                .contents()
                .filter(function() {
                    return this.nodeType == 3;
                })
                .eq(1);
            filterText.replaceWith('');

            // block click events on filter button, handle show/hide of filter panel on our own
            let filterBtnHandler = () => {
                if (pinSearchBar) {
                    let filtersPanel = $('b-browse-filters');
                    if (filtersPanel.hasClass('visible')) {
                        filtersPanel.removeClass('visible');
                    } else {
                        filtersPanel.addClass('visible');
                    }
                    return false;
                }
                return true;
            };
            $('.control-filter')
                .children('.bui-btn')
                .off('click');
            $('.control-filter')
                .children('.bui-btn')
                .on('click', filterBtnHandler);

            pageHeader.addClass('searchPinned');
            searchHeader.addClass('searchPinned');
            searchBar.addClass('me-pinned-search me-searchbar');
            filterButton.addClass('me-pinned-search me-filterbtn');
            filterPanel.addClass('me-filterspanel');
        } else {
            $('.me-pinned-search').css('top', '');
            pageHeader.removeClass('searchPinned');
            searchHeader.removeClass('searchPinned');
            searchBar.removeClass('me-pinned-search me-searchbar');
            filterButton.removeClass('me-pinned-search me-filterbtn');
            filterPanel.removeClass('me-filterspanel');
            filterPanel.css('top', '');
            $('.elixr-badge-wrapper').remove();
        }

        // do initial searchbar position check on load
        searchbarPositionCheck();

        // do checks when page scrolled
        $(window).scroll(
            debounce(function() {
                searchbarPositionCheck();
            }, 1)
        );

        // do checks when page resized
        $(window).on(
            'resize',
            debounce(function() {
                searchbarPositionCheck();

                if (pinSearchBar) {
                    setTimeout(() => {
                        let pageHeaderCheck = $('b-nav-host');
                        pageHeaderCheck.addClass('searchPinned');
                    }, 250);
                }
            }, 100)
        );

        // do checks when a click happens anywhere in main doc
        $(document).click(function(event) {
            if (cache.currentPage === 'homepage') {
                searchbarPositionCheck();

                let filtersPanel = $('b-browse-filters');
                if (filtersPanel.length > 0 && !filtersPanel[0].contains(event.target)) {
                    if (pinSearchBar) {
                        if (filtersPanel.hasClass('visible')) {
                            filtersPanel.removeClass('visible');
                        }
                    }
                }
            }
        });

        // Remove featured streams on homepage
        waitForElementAvailablity('b-delve-featured-carousel').then(() => {
            if (settings.homePageOptions && settings.homePageOptions.removeFeatured) {
                $('b-delve-featured-carousel, b-delve-games, b-delve-oom-channels').remove();
            }
            log('Homepage carousel is loaded.');
        });

        initialPageLoad = false;
    }

    function getStreamerName() {
        return new Promise((resolve, reject) => {
            log('Looking for streamer name...');
            if (cache.currentStreamerName != null) {
                log('Found it in the cache: ' + cache.currentStreamerName);
                return resolve(cache.currentStreamerName.trim());
            }

            let isDesktopMode = $('b-channel-page-wrapper').length > 0;
            let isMobileMode = $('b-channel-mobile-page-wrapper').length > 0;

            if (isDesktopMode) {
                waitForElementAvailablity('b-channel-profile').then(() => {
                    let channelBlock = $('b-channel-profile');
                    let name = channelBlock
                        .find('h2')
                        .first()
                        .text();
                    if (name != null && name !== '') {
                        cache.currentStreamerName = name.trim();
                        log('Found it on the page: ' + cache.currentStreamerName);
                        resolve(name.trim());
                    } else {
                        setTimeout(() => {
                            getStreamerName().then(foundName => {
                                resolve(foundName);
                            });
                        }, 10);
                    }
                });
            } else if (isMobileMode) {
                waitForElementAvailablity('b-mobile-details-bar').then(() => {
                    let channelBlock = $('b-mobile-details-bar');
                    let name = channelBlock.find('.name').text();
                    if (name != null && name !== '') {
                        cache.currentStreamerName = name.trim();
                        log('Found it on the page: ' + cache.currentStreamerName);
                        resolve(cache.currentStreamerName);
                    } else {
                        setTimeout(() => {
                            getStreamerName().then(foundName => {
                                resolve(foundName);
                            });
                        }, 10);
                    }
                });
            }
        });
    }

    let hideTimeout;
    let infoBarShown = false;
    function hideInfoBar() {
        if (theaterMode) {
            $('b-channel-info-bar > .info-bar').css('opacity', '0');
            infoBarShown = false;
        }
    }

    // theater mode listeners
    let infoBarShowHide = debounce(function() {
        if (theaterMode) {
            if (!infoBarShown) {
                $('b-channel-info-bar > .info-bar').css('opacity', '1');
                infoBarShown = true;
            }
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(hideInfoBar, 3000);
        }
    }, 50);

    function cacheGlobalElixrEmotes() {
        return new Promise(resolve => {
            // Gets user emotes if there are any, and caches the results.
            log('Looking for global emotes...');
            if (cache.globalEmotes != null) {
                log('Found cached global emotes.');
                resolve();
                return;
            }

            let ts = new Date().getTime();
            let rootUrl = `https://crowbartools.com/user-content/emotes/global/emotes.json?cache=${ts}`;
            $.getJSON(rootUrl, function(data) {
                log('Global emotes retrieved.');
                cache.globalEmotes = data;
                resolve();
            }).fail(function(_, textStatus, error) {
                log('No global emotes were found!');
                console.log(error);
                cache.globalEmotes = null;
                resolve();
            });
        });
    }

    function cacheChannelElixrEmotes(channelId) {
        return new Promise(resolve => {
            if (channelId == null) {
                log('Undefined channel id passed to custom emote cacher.');
                resolve();
                return;
            }

            // Gets user emotes if there are any, and caches the results.
            log('Looking for custom emotes...');
            if (cache.currentStreamerEmotes != null) {
                log('Found cached custom emotes for: ' + cache.currentStreamerName);
                resolve();
                return;
            }

            let ts = new Date().getTime();
            let rootUrl = `https://crowbartools.com/user-content/emotes/live/${channelId}/emotes.json?cache=${ts}`;
            $.getJSON(rootUrl, function(data) {
                log('Custom emotes retrieved for: ' + cache.currentStreamerName);
                cache.currentStreamerEmotes = Array.isArray(data) ? data[0] : data;
                resolve();
            }).fail(function(_, textStatus, error) {
                log('No custom emotes for: ' + cache.currentStreamerName);
                console.log(error);
                cache.currentStreamerEmotes = null;
                resolve();
            });
        });
    }

    // Gets channel id by name
    function getChannelId() {
        return getStreamerName().then(name => {
            return new Promise(resolve => {
                log(`current id cache: ${cache.currentStreamerId}`);
                if (cache.currentStreamerId != null) {
                    resolve(cache.currentStreamerId);
                }

                $.get(`https://mixer.com/api/v1/channels/${name}?fields=id`)
                    .done(data => {
                        cache.currentStreamerId = data.id;
                        log('Got channel id');

                        cacheGlobalElixrEmotes();
                        cacheChannelElixrEmotes(data.id);

                        resolve(data.id);
                    })
                    .fail(() => {
                        // We reached our target server, but it returned an error
                        log('Failed to get channel id');
                        resolve(null);
                    });
            });
        });
    }

    // Gets channel id by name
    function userIsModInCurrentChannel() {
        return getChannelId().then(id => {
            return new Promise(resolve => {
                if (!cache.user || !cache.currentStreamerName) {
                    return resolve(false);
                }

                let userLowerCase = cache.user.username.toLowerCase();
                log(`${userLowerCase} == ${cache.currentStreamerName.toLowerCase()}`);
                if (userLowerCase === cache.currentStreamerName.toLowerCase()) {
                    log('User is streamer so is mod');
                    return resolve(true);
                }

                $.get(
                    `https://mixer.com/api/v1/channels/${id}/users/mod?where=username:eq:${userLowerCase}&fields=username`
                )
                    .done(data => {
                        let isMod = data.length > 0;
                        resolve(isMod);
                    })
                    .fail(() => {
                        // We reached our target server, but it returned an error
                        log('Failed to check mod status');
                        resolve(false);
                    });
            });
        });
    }

    function getChannelNameById(id) {
        return new Promise((resolve, reject) => {
            let request = new XMLHttpRequest();
            request.open('GET', `https://mixer.com/api/v1/channels/${id}`, true);

            request.onload = function() {
                if (request.status >= 200 && request.status < 400) {
                    // Success!
                    log('Got channel data');
                    let data = JSON.parse(request.responseText);

                    cache.currentStreamerId = data.id;

                    cacheGlobalElixrEmotes();
                    cacheChannelElixrEmotes(data.id);

                    resolve(data.token);
                } else {
                    reject('Error getting channel details');
                }
            };

            request.onerror = function() {
                // There was a connection error of some sort
                reject('Error getting channel details');
            };

            request.send();
        });
    }

    function loadOtherPage() {
        log('Loading up other page settings.');
        // If the user desires to have favorites highlighted:
        if (settings.generalOptions.highlightFavorites) {
            // clear the loop so were aren't trying to run it constantly!
            if (cache.highlightLoop != null) {
                clearInterval(cache.highlightLoop);
            }

            // Lets keep checking to see if we find any new favorites
            cache.highlightLoop = setInterval(function() {
                // Checking all streamer cards of non-favorites:
                $('.card:not(".favoriteFriend")').each(function() {
                    // Which streamer did we find
                    let streamer = $(this)
                        .find('.titles small')
                        .first()
                        .text()
                        .trim()
                        .replace(/ /g, '')
                        .replace(/\r?\n|\r/g, '');
                    if (streamerIsFavorited(streamer)) {
                        // If streamer is a favorite, let's highlight the window
                        $(this)
                            .find('.titles small')
                            .first()
                            .addClass('favoriteUsername');
                        $(this).addClass('favoriteFriend');
                    } else {
                        $(this)
                            .find('.titles small')
                            .first()
                            .removeClass('favoriteUsername');
                        $(this).removeClass('favoriteFriend');
                    }
                });
            }, 500);
        } else {
            log('Highlighting Favorites is off');
            // If highlights are off, then let's remove any active highlights.
            $('.card.favoriteFriend').removeClass('favoriteFriend');

            // clear the loop so were aren't trying to run it constantly!
            if (cache.highlightLoop != null) {
                clearInterval(cache.highlightLoop);
            }
        }

        initialPageLoad = false;
    }

    async function loadStreamerPage(streamerName) {
        log(`Loading streamer page for: ${streamerName}`);

        if (!settings.streamerPageOptions) {
            log('No streamer page settings saved.');
            return;
        }

        let options = settings.streamerPageOptions.global || {};

        // override the options if there is streamer specific options available
        let overrides = settings.streamerPageOptions.overrides;
        if (overrides != null) {
            let overrideKeys = Object.keys(overrides);
            for (let i = 0; i < overrideKeys.length; i++) {
                let key = overrideKeys[i];
                if (key.toLowerCase() === streamerName.toLowerCase()) {
                    log(`found override options for ${streamerName}`);
                    options = overrides[key];
                }
                break;
            }
        }

        waitForElementAvailablity('.stage').then(() => {
            if (options.largerVideo === false) {
                $('.stage').removeClass('me-video-stage');
            } else {
                $('.stage').addClass('me-video-stage');
            }
        });

        // Auto Close Costreams
        if (options.autoCloseCostreams && initialPageLoad) {
            let costreamPage = detectCostreams();
            if (costreamPage) {
                log('Costream detected. Waiting for profiles to load');
                await closeCostreams(streamerName);
            } else {
                log('No costream detected');
            }
        }

        // Auto Mute Stream
        if (options.autoMute && initialPageLoad) {
            triggerAutomute();
        }

        $('.channel-page').on('mousemove', function() {
            infoBarShowHide();
        });

        if (settings.generalOptions.highlightFavorites) {
            // Let's get the Costream ID via API call
            let costreamID = getCostreamID(streamerName);
            costreamID.then(result => {
                if (result == null) {
                    // If result is null, then this is not a costream.
                    log(streamerName + ' is not costreaming.');

                    // Let's if we are following this streamer
                    let isFollowed = streamerIsFollowed(streamerName);

                    // Once we get some info back from the API
                    isFollowed.then(result => {
                        if (result.isFollowed) {
                            // Which streamer is this?
                            let streamer = result.streamerName;

                            // If the streamer is followed,
                            // Let's show the favorite button, but it's state is based on whether streamed is faved.
                            addFavoriteButton(streamer, streamerIsFavorited(streamer));
                        } else {
                            // User doesn't follow the streamer.

                            // If not followed but is favorited, favorite status should be removed automatically.
                            if (streamerIsFavorited(streamerName)) {
                                syncFavorites(removeFavorite(streamerName));
                            }

                            // We should also attach an event to the follow button that will make the favorite button appear when a streamer is followed.
                            $('bui-icon[icon="heart-full"]')
                                .closest('div.bui-btn-raised')
                                .click(function() {
                                    // log('Now following current streamer!');
                                    addFavoriteButton(streamerName, streamerIsFavorited(streamerName));

                                    // Remove the action from the follow button.
                                    $('bui-icon[icon="heart-full"]')
                                        .closest('div.bui-btn-raised')
                                        .off('click');
                                });
                        }
                    });
                } else {
                    // If result has value, then this is a co-stream.
                    log(streamerName + ' is currently costreaming.');

                    // Let's see who is part of this co-stream collective.
                    let costreamers = getCostreamers(result);
                    costreamers.then(result => {
                        log('Costreamers: ' + result);
                        costreamers = result;
                        // Let's check each co-streamer
                        $.each(costreamers, function(i) {
                            // This is the current co-streamer.
                            let currentStreamer = costreamers[i];

                            // Check to see if this streamer is followed.
                            let isFollowed = streamerIsFollowed(currentStreamer);

                            isFollowed.then(result => {
                                // Let's see which streamer we checked
                                let streamer = result.streamerName;

                                if (result.isFollowed) {
                                    // The streamer is followed, so let's create the favorite button.
                                    addFavoriteButton(streamer, streamerIsFavorited(streamer), true);
                                } else {
                                    // The current streamer is not followed
                                    // log("Costreamer '" + streamer+"' is not followed.");

                                    // If not followed but is favorited, favorite status should be removed automatically.
                                    if (streamerIsFavorited(streamer)) {
                                        syncFavorites(removeFavorite(streamer));
                                    }

                                    // We need to find the follow button for this streamer.
                                    let followButtonElement = $('a.avatar-block[href="/' + streamer + '"]')
                                        .siblings('div.owner-block')
                                        .find('div.bui-btn');

                                    // We should also attach an event to the follow button that will make the favorite button appear when a streamer is followed.
                                    followButtonElement.click(function() {
                                        // Find out which streamer's follow button we are hitting.
                                        let thisStreamer = $(this)
                                            .parents('div.head')
                                            .find('a.avatar-block')
                                            .attr('href')
                                            .substr(1);

                                        // Add a favorite button for this streamer
                                        addFavoriteButton(thisStreamer, streamerIsFavorited(thisStreamer), true);

                                        // remove event from the follow button.
                                        followButtonElement.off('click');
                                    });
                                }
                            });
                        });
                    });
                }
            });
        } else {
            log("Highlights not active. So we don't do this.");
            $('div.owner-block h2:first-of-type').removeClass('favoriteUsername');
            $('#ME_favorite-btn').removeClass('faved');
        }

        // Auto close interactive
        if (options.autoCloseInteractive && initialPageLoad) {
            waitForElementAvailablity('.toggle-interactive')
                .then(() => {
                    let minimizeInteractiveBtn = $('.toggle-interactive');

                    if (minimizeInteractiveBtn != null && minimizeInteractiveBtn.hasClass('open')) {
                        let hideInteractiveTries = 0;

                        let hideInteractiveInterval = setInterval(function() {
                            // click the hide button
                            minimizeInteractiveBtn.click();

                            setTimeout(() => {
                                // get a fresh copy of the toggle button, this will reflect any changes in the DOM that
                                // happenedafter we clicked it
                                let updatedBtn = $('.toggle-interactive');

                                // this will be true if there is a costream and multiple streamers in the costream have
                                // interactive on
                                if (detectCostreams() && updatedBtn.length === 0) {
                                    log('Pressed the toggle interactive button successfully.');
                                    clearInterval(hideInteractiveInterval);

                                    // wait half a sec
                                    setTimeout(() => {
                                        // click X close button
                                        $('[icon="MixerBan"]').click();
                                        log('Pressed the close interactive button.');
                                    }, 200);
                                }
                                // this will be true if theres no costreamer or only one streamer in costream has interactive on
                                else if (updatedBtn.length !== 0 && !updatedBtn.hasClass('open')) {
                                    log('Hid the interactive panel successfully.');
                                    clearInterval(hideInteractiveInterval);
                                } else if (hideInteractiveTries < 10) {
                                    hideInteractiveTries++;
                                    log('Cant find interactive hide button. Trying again.');
                                } else {
                                    clearInterval(hideInteractiveInterval);
                                    log('Tried to hide interactive for 10 seconds and failed.');
                                }
                            }, 100);
                        }, 1000);
                    }
                })
                .catch(() => {
                    log('Couldnt find interactive, streamer might not have it running.');
                });
        }

        // Host Loop
        // This checks every second to see if the channel hosted someone.
        if (options.autoForwardOnHost || options.autoMuteOnHost) {
            if (cache.hostLoop != null) {
                clearInterval(cache.hostLoop);
            }

            cache.hostLoop = setInterval(function() {
                let updatedOptions = getStreamerOptionsForStreamer(streamerName);

                let hosting = $('.host-name').is(':visible');
                if (hosting) {
                    let hostName = $('.hostee span')
                        .text()
                        .trim();

                    // Auto forward the person on host.
                    if (updatedOptions.autoForwardOnHost && hostName !== streamerName) {
                        // Check to make sure we're not trying to forward again accidently (which sometimes occured if interval fired during page load after a redirect)
                        log('Redirecting to ' + hostName + ' because forwarding on host is on.');
                        document.location.href = 'https://mixer.com/' + hostName;
                    }

                    // Auto mute when a stream hosts someone.
                    if (updatedOptions.autoMuteOnHost && streamerName !== cache.mutedHost) {
                        triggerAutomute();
                        cache.mutedHost = streamerName;
                    }
                }
            }, 1000);
        }

        // streamer online/offline check
        if (cache.onlineInterval != null) {
            clearInterval(cache.onlineInterval);
        }

        cache.onlineInterval = setInterval(function() {
            let offlineMessage = $('.offline-message');

            let streamerOnline = offlineMessage != null && offlineMessage.length > 0;

            if (cache.streamerOnlineStatus == null) {
                cache.streamerOnlineStatus = streamerOnline;
            } else {
                let onlineStatusChanged = cache.streamerOnlineStatus !== streamerOnline;
                if (onlineStatusChanged) {
                    // turn off theater mode of streamer went offline
                    if (!streamerOnline && theaterModeEnabled()) {
                        toggleTheaterMode();
                    }
                }
                cache.streamerOnlineStatus = streamerOnline;
            }
        }, 1000);

        // add theater mode btn
        // wait for video controls to load
        waitForElementAvailablity('.spectre-player').then(() => {
            let findFullscreenBtn = () => {
                log('attempting to create theater mode button...');

                // copy the fullscreen button so we can make it into the theater btn
                let fullscreenBtn;

                let icons = $('i.material-icons');
                icons.each(function() {
                    let icon = $(this);
                    if (icon.text() === 'fullscreen') {
                        fullscreenBtn = icon.parent().parent();
                    }
                });

                if (fullscreenBtn == null || fullscreenBtn.length < 1) {
                    log('Couldnt find fullscreen button... trying again in a bit.');
                    setTimeout(() => findFullscreenBtn(), 250);
                    return;
                }

                const currentTheaterButton = $('[theater-mode-btn-container]');
                if (currentTheaterButton != null && currentTheaterButton.length > 0) {
                    log('Theater mode btn already exists.');
                    return;
                }

                log('Found fullscreen button!');
                let theaterBtn = fullscreenBtn.clone();

                // add an attr for us to check for it later
                theaterBtn.attr('theater-mode-btn-container', '');

                // change the icon
                theaterBtn.find('i').text('event_seat');

                // change tooltip text
                theaterBtn.find('span').text('MixrElixr: Theater Mode [Ctrl + Alt + T]');

                // add click handler
                theaterBtn.on('click', function() {
                    toggleTheaterMode();
                });

                theaterBtn.insertBefore(fullscreenBtn);
            };

            setTimeout(() => {
                findFullscreenBtn();
            }, 250);
        });

        let urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('clip')) {
            waitForElementAvailablity('[class*="chatContainer_"]').then(chatContainer => {
                if (options.lightsOutTheaterMode) {
                    chatContainer.addClass('me-lights-out');
                } else {
                    chatContainer.removeClass('me-lights-out');
                }
            });
        }
        if (options.autoTheater && initialPageLoad && !urlParams.has('clip')) {
            toggleTheaterMode();
        }

        waitForElementAvailablity(ElementSelector.CHAT_CONTAINER).then(() => {
            applyChatSettings(streamerName);
        });
    }

    function theaterModeEnabled() {
        return $('body').hasClass('theaterMode');
    }

    function toggleTheaterMode() {
        let theaterElements = $(
            'body,b-desktop-header, .channel-info-container, b-skills-button-host-component, b-nav-host > div, b-channel-info-bar,.profile-header,.profile-blocks, b-notifications,.channel-page,b-desktop-header,.chat,.stage.aspect-16-9'
        );
        if (theaterElements.hasClass('theaterMode')) {
            theaterMode = false;
            clearTimeout(hideTimeout);
            infoBarShown = true;
            $('b-channel-info-bar > .info-bar').css('opacity', '1');
            theaterElements.removeClass('theaterMode');
            $('.stage').addClass('me-video-stage');

            $('.me-chat-container').removeClass('theaterMode');

            if ($('#me-quick-host-button').length > 0) {
                $('#me-quick-host-button').remove();
            }

            // hacky way to toggle "position: relative" on and off to force the chat element to rerender with proper positioning
            setTimeout(() => {
                $('.chat').addClass('relative');
                setTimeout(() => {
                    $('.chat').removeClass('relative');
                }, 25);
            }, 25);

            let stage = $('addedBuiAr');
            if (stage != null && stage.length > 0) {
                stage.removeClass('addedBuiAr');
                stage.removeClass('bui-arContent');
                $('.stage').removeClass('aspect-16-9');
            }

            $.toast().reset('all');
        } else {
            const isLive = $('.offline-message').length < 1;
            if (isLive) {
                theaterMode = true;

                let minimizeInteractiveBtn = $('.hide-interactive');
                if (minimizeInteractiveBtn != null) {
                    let isHideBtn = $('.icon-indeterminate_check_box');
                    if (isHideBtn != null && isHideBtn.length > 0) {
                        minimizeInteractiveBtn.click();
                    }
                }

                if ($('#me-quick-host-button').length > 0) {
                    $('#me-quick-host-button').remove();
                }

                const currentViewerCount = $('b-channel-info-bar').find('.viewers.layout-row');
                $(`
          <div id="me-quick-host-button">
            <div>Host</div>
          </div>
        `).insertAfter(currentViewerCount);

                const onQuickHostClick = function() {
                    $('b-channel-owners-block')
                        .find('.menu-btn')
                        .click();
                    $('b-host-target-button')
                        .children('button')
                        .click();
                };

                $('#me-quick-host-button').off('click', onQuickHostClick);
                $('#me-quick-host-button').on('click', onQuickHostClick);

                setTimeout(() => {
                    theaterElements.addClass('theaterMode');

                    $.toast({
                        text: 'Press <span style="font-weight:bold;">ESC</span> at any time to exit.',
                        heading: 'Theater Mode Enabled',
                        showHideTransition: 'fade',
                        allowToastClose: true,
                        hideAfter: 3250,
                        stack: false,
                        position: 'top-center',
                        bgColor: '#151C29',
                        textColor: '#fff',
                        textAlign: 'center',
                        loader: true,
                        loaderBg: '#1FBAED'
                    });
                }, 1);

                $('b-stage').addClass('bui-arContent addedBuiAr');
                $('.stage').addClass('aspect-16-9 theaterMode');
                $('.stage').removeClass('me-video-stage');
                $('.me-chat-container').addClass('theaterMode');
            }
        }
    }

    function closeCostreams(streamerName) {
        return new Promise(async resolve => {
            if (streamerName == null) return resolve();

            log('Closing feeds for everyone except ' + streamerName);

            const profileSelector = '.costream-rollout .profile';

            $.deinitialize(profileSelector);
            $.initialize(profileSelector, function() {
                let streamerFeed = $(this);
                let text = streamerFeed.text();
                if (text && text.trim() !== streamerName.trim()) {
                    let closeBtn = streamerFeed
                        .siblings()
                        .eq(0)
                        .children()[2];
                    if (closeBtn) {
                        closeBtn.click();
                    }
                }
            });

            resolve();
        });
    }

    function detectCostreams() {
        if ($('.costream-avatars').length > 0) {
            return true;
        }
        return false;
    }

    async function applyChatSettings(streamerName) {
        if (!settings.streamerPageOptions) {
            log('No streamer page settings saved.');
            return;
        }

        log('Applying chat settings...');

        let options = getStreamerOptionsForStreamer(streamerName);

        chatFeed.setup(options);

        $('#elixr-chat-styles').remove();

        $('body').prepend(`
      <style id="elixr-chat-styles">

      ${
          options.showWhoDeletedMessage !== false
              ? `
            b-chat-client-host-component div[class*="deleted_"] {
                  text-decoration: none !important;
            }

            b-chat-client-host-component div[class*="deleted_"] > div[class*="messageContent_"] {
                text-decoration: line-through;
                padding-bottom: 0 !important;
          }`
              : ''
      }
        

       ${
           options.useCustomFontSize
               ? `
          b-chat-client-host-component div[class*="messageContent"] {
              font-size: ${options.textSize}px;
              line-height: ${options.textSize + 9}px;
          }
       `
               : ''
       }
    
       ${
           options.hideChatAvatars
               ? `               
          b-chat-client-host-component img[class*="ChatAvatar"] {
              display: none;
          }

          b-chat-client-host-component div[class*="messageContent"] {
              margin-left: 4px;
          }
        `
               : ''
       }

       ${
           options.hideChannelProgression
               ? `               
            b-chat-client-host-component div[class*="messageContent"] span[class*="badge"] {
                display: none;
            }
       `
               : ''
       }


       ${
           options.hideSkillEffects
               ? `               
            #skills-chat-wrapper, b-skill-mobile-execution-host {
                display: none !important;
            }
       `
               : ''
       }

       ${
           options.hideEmberMessages
               ? `               
            b-chat-client-host-component div[class*="stickerMessage_"] {
                display: none;
            }
       `
               : ''
       }

       b-use-app-btn-host {
           display: none !important;
       }
       
      </style>
    `);

        if (options.customEmotes !== false && options.channelEmotes !== false) {
            // If custom emotes enabled, go try to get our json.
            await cacheChannelElixrEmotes(cache.currentStreamerId);
        }

        if (options.customEmotes !== false && options.globalEmotes !== false) {
            // If global emotes are enabled.
            await cacheGlobalElixrEmotes();
        }

        try {
            cache.userIsMod = await userIsModInCurrentChannel();
            log(`User is mod: ${cache.userIsMod}`);
        } catch (err) {
            log('Error getting user mod status');
            console.log(err);
        }

        // add custom css class to chat message container so its easier for us to query
        $(ElementSelector.CHAT_CONTAINER)
            .children()
            .addClass('elixr-chat-container');

        setupScrollGlueCheck();

        // Mention BG Color
        if (options.mentionChatBGColor) {
            let chatContainer = $('.elixr-chat-container');
            if (chatContainer != null && chatContainer.length > 0) {
                chatContainer.addClass('chat-mention-bg');
            }
        } else if (!options.mentionChatBGColor) {
            let chatContainer = $('.elixr-chat-container');
            if (chatContainer != null && chatContainer.length > 0) {
                chatContainer.removeClass('chat-mention-bg');
            }
        }

        // Keyword BG Color
        if (options.keywords && options.keywords.length > 0) {
            let chatContainer = $('.elixr-chat-container');
            if (chatContainer != null && chatContainer.length > 0) {
                chatContainer.addClass('chat-keyword-bg');
            }
        } else {
            let chatContainer = $('.elixr-chat-container');
            if (chatContainer != null && chatContainer.length > 0) {
                chatContainer.removeClass('chat-keyword-bg');
            }
        }

        // Remove prev Inline Image Links, they will be readded later if needed
        $('img[elixr-img]').each(function() {
            $(this)
                .parent()
                .parent()
                .remove();
        });
        let chatContainer = $('.elixr-chat-container');
        chatContainer.scrollTop(chatContainer[0].scrollHeight);

        // remove all prev custom timestamps if feature is turned off
        if (!options.timestampAllMessages) {
            $('.elixrTime').remove();
        }

        if (options.hideChatHeaders) {
            $('.transcluded-section').hide();
        } else {
            $('.transcluded-section').show();
        }

        const isMobileMode = $('b-channel-mobile-page-wrapper').length > 0;
        const composerBlockSelecter = isMobileMode
            ? "[class*='mobileWebComposerBlock']"
            : "[class*='webComposerBlock']";
        waitForElementAvailablity(composerBlockSelecter).then(composerBlock => {
            // bind custom emote auto complete app
            autocompleteAppBinder.bindEmoteAutocompleteApp(
                composerBlock,
                options,
                cache.globalEmotes,
                cache.currentStreamerEmotes,
                cache.currentStreamerId
            );

            // bind slow chat app
            if (cache.slowChatCooldown >= 2000 && !cache.userIsMod && options.showSlowChatCooldownTimer !== false) {
                slowChatTimerAppBinder.bindSlowChatTimerApp(composerBlock, cache.slowChatCooldown);
            }
        });

        handleEmoteModal(options, cache);

        // get rid of any previous registered callbacks for chat messages
        $.deinitialize(ElementSelector.CHAT_MESSAGE);

        // This will run the callback for every message that already exists as well as any new ones added.
        // We can use this to do any tweaks and modifications to chat as they come in
        // message__
        $.initialize(ElementSelector.CHAT_MESSAGE, async function() {
            let messageContainer = $(this);

            const messageType = determineMessageType(messageContainer);

            let shouldHide = false;
            switch (messageType) {
                case 'ember-donation':
                    shouldHide = options.hideEmberMessages;
                    break;
                case 'sticker':
                    shouldHide = options.hideStickers;
                    break;
                case 'skill-used':
                    shouldHide = options.hideSkillMessages;
                    break;
                case 'regular-message':
                default:
                    break;
            }

            if (shouldHide) {
                messageContainer.parent().hide();
                return;
            }

            if (messageType !== 'regular-message') {
                messageContainer.parent().show();
            }

            let alreadyChecked = messageContainer.attr('elixrfied');
            // check to see if we have already looked at this chat messsage.
            if (alreadyChecked) {
                return;
            }

            messageContainer.attr('elixrfied', 'true');

            // Give chat messages a chat message class for easier targeting.
            messageContainer.addClass('chat-message');

            let messageAuthor = messageContainer
                .find("[class*='username']")
                .text()
                .trim()
                .split(' ')[0]; // we do this to cut out the progression level

            if (cache.user != null) {
                if (messageType === 'regular-message' && messageAuthor === cache.user.username && !cache.userIsMod) {
                    slowChatTimerAppBinder.messageDetected();
                }
            }

            if (options.ignoredUsers && options.ignoredUsers.includes(messageAuthor)) {
                messageContainer.hide();
            } else {
                if (!messageContainer.is(':visible')) {
                    messageContainer.show();
                }
            }

            // Give any message with a mention of our user a class.
            let messageText = messageContainer
                .find('span:not([class])')
                .text()
                .toLowerCase()
                .trim();

            let userTagged = messageContainer
                .find('.tagComponent')
                .text()
                .toLowerCase()
                .trim()
                .replace('@', '');
            if (cache.user != null) {
                let userLowerCase = cache.user.username.toLowerCase();

                let userRegex = new RegExp(`\\b${escapeRegExp(userLowerCase)}\\b`, 'i');
                if (userRegex.test(messageText) || userRegex.test(userTagged)) {
                    messageContainer.addClass('user-mentioned');
                }
            }

            let chatFromCurrentChannel = true;
            let chatTabs = $('b-channel-chat-tabs');
            if (chatTabs != null && chatTabs.length > 0) {
                let selectedTab = chatTabs.find('.selected');
                if (selectedTab != null && selectedTab.length > 0) {
                    let chatChannelName = selectedTab.text().trim();
                    chatFromCurrentChannel = chatChannelName === cache.currentStreamerName;
                }
            }

            let showChannelEmotes =
                options.customEmotes !== false &&
                options.channelEmotes !== false &&
                cache.currentStreamerEmotes != null &&
                cache.currentStreamerEmotes.emotes != null &&
                chatFromCurrentChannel;

            let showGlobalEmotes =
                options.customEmotes !== false &&
                options.globalEmotes !== false &&
                cache.globalEmotes != null &&
                cache.globalEmotes.emotes != null;

            if (showChannelEmotes || showGlobalEmotes) {
                let foundEmote = false;
                messageContainer.find('span:not([class])').each(function() {
                    let component = $(this);
                    // we've already replaced emotes on this, skip it
                    if (component.hasClass('me-custom-emote')) {
                        return;
                    }

                    let text = component.text().trim();

                    // loop through all emotes
                    let channelEmotes, globalEmotes;

                    let allEmoteNames = [];

                    if (showChannelEmotes) {
                        channelEmotes = Object.values(cache.currentStreamerEmotes.emotes);
                        allEmoteNames = allEmoteNames.concat(channelEmotes.map(e => e.name));
                    }

                    if (showGlobalEmotes) {
                        globalEmotes = Object.values(cache.globalEmotes.emotes);
                        allEmoteNames = allEmoteNames.concat(globalEmotes.map(e => e.name));
                    }

                    // remove dupes
                    allEmoteNames = [...new Set(allEmoteNames)];

                    // build emote name group end result will look like: "emoteName1|emoteName2|emoteName3"
                    let emoteNameRegexGroup = '';
                    for (let emote of allEmoteNames) {
                        if (emoteNameRegexGroup.length > 0) {
                            emoteNameRegexGroup += '|';
                        }
                        emoteNameRegexGroup += escapeRegExp(emote);
                    }

                    let regexPattern = `(?:^|\\s)(?:${emoteNameRegexGroup})(?=\\s|$)`;

                    // emote name regex
                    let emoteNameRegex;
                    try {
                        emoteNameRegex = new RegExp(regexPattern, 'gm');
                    } catch (err) {
                        console.log('REGEX ERROR!', err);
                    }

                    //html escape current text
                    text = escapeHTML(text);

                    // replace emote names with img tags
                    text = text.replace(emoteNameRegex, match => {
                        match = match && match.trim();
                        log('found emote match: ' + match);

                        // search for channel emote first
                        let emote;
                        if (channelEmotes) {
                            emote = channelEmotes.find(e => e.name === match);
                        }

                        // if we didnt find anything, search global if enabled
                        let isGlobal = false;
                        if (emote == null && globalEmotes) {
                            emote = globalEmotes.find(e => e.name === match);
                            isGlobal = true;
                        }

                        if (emote) {
                            foundEmote = true;

                            let url;
                            if (isGlobal) {
                                url = `https://crowbartools.com/user-content/emotes/global/${escapeHTML(
                                    emote.filename
                                )}`;
                            } else {
                                url = `https://crowbartools.com/user-content/emotes/live/${
                                    cache.currentStreamerId
                                }/${escapeHTML(emote.filename)}`;
                            }

                            let sizeClass = mapEmoteSizeToClass(emote.maxSize);

                            let imgTag = `
									<span class="elixr-custom-emote ${sizeClass} me-tooltip" title="Mixr Elixr: Custom emote '${escapeHTML(
                                emote.name
                            )}'" style="display: inline-block;">
										<img src="${url}">
									</span>`;

                            return imgTag;
                        }
                        return match;
                    });

                    if (foundEmote) {
                        // update component html with text containing img tags
                        component.html(text.trim());

                        component
                            .find('.elixr-custom-emote')
                            .children('img')
                            .on('load', function() {
                                let username = messageContainer.find("[class*='Username']");
                                if (username != null && username.length > 0) {
                                    let usernameTop = username.position().top;

                                    let avatar = messageContainer.find("[class*='ChatAvatar']");
                                    if (usernameTop > 6 && avatar != null && avatar.length > 0) {
                                        avatar.css('top', usernameTop - 3 + 'px');
                                    }
                                }

                                setTimeout(() => {
                                    scrollChatIfGlued();
                                }, 5);
                            });

                        // tag this component so we dont attempt to look for emotes again
                        component.addClass('me-custom-emote');
                    }
                });
            }

            // highlight keywords
            if (options.keywords && options.keywords.length > 0) {
                options.keywords.forEach(w => {
                    let keywordRegex = new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i');
                    if (keywordRegex.test(messageText)) {
                        messageContainer.addClass('keyword-mentioned');
                    }
                });
            }

            if (!cache.userIsMod || options.enableHideKeywordsWhenMod) {
                // Add class on hide keyword mention.
                if (options.hideKeywords != null && options.hideKeywords.length > 0) {
                    messageContainer.find('span:not([class])').each(function() {
                        let component = $(this);

                        let text = component.text();

                        function generateReplaceText(count) {
                            let buffer = '';

                            for (let i = 0; i < count; i++) {
                                buffer += '*';
                            }

                            return buffer;
                        }

                        options.hideKeywords.forEach(w => {
                            let keywordRegex = new RegExp(`\\b${escapeRegExp(w)}\\b`, 'ig');

                            let hideStyle = options.hideStyle || 'blur';

                            if (hideStyle === 'remove') {
                                if (keywordRegex.test(messageText)) {
                                    messageContainer.addClass('hide-word-mentioned hide-remove');
                                }
                            } else {
                                text = text.replace(keywordRegex, match => {
                                    log('found match: ' + match + ' style: ' + hideStyle);
                                    let text = null;
                                    if (hideStyle === 'asterisk') {
                                        let replaced = generateReplaceText(match.length);
                                        text = `<span title="${match}">${replaced}</span>`;
                                    } else if (hideStyle === 'blur') {
                                        text = `<span class="hide-word-mentioned hide-blur">${match}</span>`;
                                    }
                                    return text;
                                });

                                component.html(text);
                            }
                        });
                    });
                }
            }

            // Timestamps on each message
            if (options.timestampAllMessages) {
                let parent = messageContainer;

                // check that the current message doesnt already have a native or custom timestamp
                let msgAlreadyHasStamp =
                    parent.parent().find("[class*='timeStamp']").length > 0 || parent.find('.elixrTime').length > 0;

                // should we add a timestamp?
                if (!msgAlreadyHasStamp) {
                    let timeOptions = { hour12: true, hour: '2-digit', minute: '2-digit' };
                    let time = new Date().toLocaleString([], timeOptions);

                    let timeStampTemplate = `
						<div class="elixrTime">
								<span>${time}</span>
						</div>
					`;

                    parent.append(timeStampTemplate);
                }
            }

            if (options.showImagesInline) {
                let userBlacklisted = false;
                if (options.inlineImgBlacklistedUsers != null && options.inlineImgBlacklistedUsers.length > 0) {
                    userBlacklisted = options.inlineImgBlacklistedUsers.includes(messageAuthor);
                }

                if (!userBlacklisted) {
                    let links = messageContainer.find("a[target='_blank']");

                    if (links.length > 0) {
                        links.each(async function() {
                            let link = $(this);
                            let url = link.attr('href');

                            if (urlIsAnImage(url)) {
                                let lowestPermittedRoleRank = getUserRoleRank(options.lowestUserRoleLinks);
                                let rolePermitted = false;

                                let currentStreamerName = await getStreamerName();

                                // Get the author roles in an array.
                                getUserRoles(cache.currentStreamerId, messageAuthor).then(roles => {
                                    // Check to make sure the correct role is in the user array.

                                    if (currentStreamerName === messageAuthor) {
                                        roles.push('Owner');
                                    }

                                    for (let role of roles) {
                                        let roleRank = getUserRoleRank(role);
                                        if (roleRank <= lowestPermittedRoleRank) {
                                            rolePermitted = true;
                                        }
                                    }

                                    let userTrusted = false;
                                    if (
                                        options.inlineImgPermittedUsers != null &&
                                        options.inlineImgPermittedUsers.length > 0
                                    ) {
                                        userTrusted = options.inlineImgPermittedUsers.includes(messageAuthor);
                                    }

                                    if (rolePermitted === true || userTrusted) {
                                        let previousImage = messageContainer.find(`img[src='${url}']`);

                                        // deleted
                                        let messageIsDeleted = messageContainer.is('[class^="deleted"]');

                                        if (
                                            (previousImage == null || previousImage.length < 1) &&
                                            (messageIsDeleted == null ||
                                                messageIsDeleted === false ||
                                                messageIsDeleted.length < 1)
                                        ) {
                                            let inlineImg = $(`<span style="display:block;">
													<span style="position: relative; display: block;">
														<span class="hide-picture-btn" style="position:absolute; left:3px; top:3px;">x</span>
														<img class="elixr-chat-img" src="${url}" style="max-width: 200px; max-height: 125px; object-fit:contain;" 
															onerror="this.onerror=null;this.src='${url.replace('https://', 'http://')}';"
															elixr-img>
													</span>
												</span>`);

                                            inlineImg.find('img').on('load', function() {
                                                scrollChatIfGlued();
                                                $(this).off('load', '**');
                                            });

                                            inlineImg.insertBefore(link);

                                            // Note(ebiggz): The above "onerror" js code is a bandaid for a weird issue where an image sometimes wont load.
                                            // Switching from https to http seems to work, but I dont like this fix. There must be something else going on.
                                            // Will need to investigate further.

                                            // remove previously bound click events
                                            $('.hide-picture-btn').off('click', '**');

                                            // add updated click event
                                            $('.hide-picture-btn').click(function(event) {
                                                event.stopPropagation();
                                                $(this)
                                                    .parent()
                                                    .parent()
                                                    .remove();
                                            });
                                        }
                                    } // End role permitted if statement.
                                }); // End authorRoles.then statement
                            }
                        });
                    }
                }
            }
        });

        setTimeout(() => {
            scrollChatToBottom();
        }, 10);

        initialPageLoad = false;
    }

    function searchbarPositionCheck() {
        if (cache.currentPage !== 'homepage') return;

        const pinSearchBar =
            settings.homePageOptions.pinSearchToTop == null || settings.homePageOptions.pinSearchToTop === true;

        if (!pinSearchBar) return;

        // see if the header element has the 'collapsed' class (only has it when page is scrolled down a bit)
        let topNavCollapsed = $('b-notifications').hasClass('headerCollapsed');
        let cachedCollapsed = cache.topNavCollapsed || false;
        let collapsedChanged = topNavCollapsed !== cachedCollapsed;

        if (topNavCollapsed) {
            $('.me-searchbar').addClass('me-nav-collapsed');
        } else {
            $('.me-searchbar').removeClass('me-nav-collapsed');
        }

        let logoAndNavBtnsWidth = $('a.logo').outerWidth() + $('nav').outerWidth() + 15;
        let searchbarPosition = $('.me-searchbar').position();
        let searchbarStartsAt = searchbarPosition ? searchbarPosition.left : 0;

        let browserCompact = logoAndNavBtnsWidth >= searchbarStartsAt;
        let cachedCompact = cache.browserCompact || false;
        let compactChanged = browserCompact !== cachedCompact;

        // current collapsed and compact state matches current value, nothing new here, return now.
        if (!collapsedChanged && !compactChanged) return;

        // update our caches
        cache.topNavCollapsed = topNavCollapsed;
        cache.browserCompact = browserCompact;

        // find searchbar
        let pinnedItems = $('.me-pinned-search');
        if (pinnedItems) {
            // update searchbar css
            let searchTopAmount = topNavCollapsed ? 4 : 23;
            if (browserCompact) {
                searchTopAmount = searchTopAmount + (topNavCollapsed ? 60 : 65);
            }
            $('.me-searchbar').css('top', searchTopAmount + 'px');

            let filterTopAmount = topNavCollapsed ? 12 : 31;
            if (browserCompact) {
                filterTopAmount = filterTopAmount + (topNavCollapsed ? 60 : 65);
            }
            $('.me-filterbtn').css('top', filterTopAmount + 'px');

            let filterPanelTopAmount = topNavCollapsed ? 60 : 79;
            if (browserCompact) {
                filterPanelTopAmount = filterPanelTopAmount + (topNavCollapsed ? 60 : 65);
            }
            $('.me-filterspanel').css('top', filterPanelTopAmount + 'px');

            // add or remove box shadow if needed
            if (compactChanged) {
                if (browserCompact) {
                    pinnedItems.css('box-shadow', '0px 0px 5px 2px rgba(0,0,0,0.2)');
                } else {
                    pinnedItems.css('box-shadow', 'inherit');
                }
            }
        }
    }

    // This inserts a button that toggles favorite status of the specified streamer.
    // This also modifies the coloration on the user name.
    function addFavoriteButton(streamerName, isFavorited = false, isCostream = false) {
        let favoriteBtnTarget = `.ME_favorite-btn[streamer='${streamerName}']`;

        // Removing the favorite button to avoid any duplication
        // we dont want to filter to the streamer name here so we also remove any
        // favorite buttons from other streamers pages
        $('.ME_favorite-btn').remove();

        // Before we add any button, we need to find the DOM objects that will be impacted by our insertions.
        let avatarBlock, preceedingElement, userNameTarget;
        if (isCostream) {
            // The avatar block is the key to finding out which co-streamer we are working with
            avatarBlock = $('a.avatar-block[href="/' + streamerName + '"]');
            preceedingElement = avatarBlock.siblings('div.owner-block').find('div.follow-block');
            userNameTarget = avatarBlock.siblings('div.owner-block').find('h2:first-of-type');
        } else {
            preceedingElement = $('div.follow-block');
            userNameTarget = $('div.owner-block h2:first-of-type');
        }

        // Now we need to do the actual button and CSS insertions.
        // This adds the favorite button with either a hollow star (non-favorite), or filled star (favorite).
        // It also marks the streamer's name depending on favorite status.
        preceedingElement.after(
            `<div streamer="${streamerName}" class="ME_favorite-btn me-tooltip" title="MixrElixr: Favorite"><span>&#9733;</span></div>`
        );
        if (isFavorited) {
            userNameTarget.addClass('favoriteUsername');
            $(favoriteBtnTarget).addClass('faved');
        } else {
            userNameTarget.removeClass('favoriteUsername');
            $(favoriteBtnTarget).removeClass('faved');
        }

        // We now set some actions to the button we just added.
        // This will toggle the favorite status of the streamer, as well the button's state.
        $(favoriteBtnTarget).click(function() {
            let streamer = $(this).attr('streamer');
            addOrRemoveFavorite(streamer);
            setFavoriteButtonState(streamer, streamerIsFavorited(streamer));
        });
    }

    // This toggles on-screen DOM elements based on the specified streamer's favorite status.
    function setFavoriteButtonState(streamerName, isFavorited = false, isCostream = false) {
        // First, let's find out which streamer we're working on.
        let buttonTarget = $(".ME_favorite-btn[streamer='" + streamerName + "']");

        // Now we need to find the user name element so we can modifiy it.
        let userNameTarget;
        if (isCostream) {
            userNameTarget = $('a.avatar-block[href="/' + streamerName + '"')
                .siblings('div.owner-block')
                .find('h2:first-of-type');
        } else {
            userNameTarget = $('div.owner-block h2:first-of-type');
        }

        if (isFavorited) {
            // If streamer is faved: fill in star, change user name to green.
            buttonTarget.html('<span>&#9733;</span>');
            buttonTarget.addClass('faved');
            userNameTarget.addClass('favoriteUsername');
        } else {
            // If streamer is not faved: empty star, change user name to normal.
            buttonTarget.html('<span>&#9734;</span>');
            buttonTarget.removeClass('faved');
            userNameTarget.removeClass('favoriteUsername');
        }
    }

    function getStreamerOptionsForStreamer(streamerName) {
        if (!settings.streamerPageOptions) {
            log('No streamer page settings saved.');
            return {};
        }

        let options = settings.streamerPageOptions.global || {};

        // override the options if there is streamer specific options available
        let overrides = settings.streamerPageOptions.overrides;
        if (overrides != null) {
            let overrideKeys = Object.keys(overrides);
            for (let i = 0; i < overrideKeys.length; i++) {
                let key = overrideKeys[i];
                if (key.toLowerCase() === streamerName.toLowerCase()) {
                    options = overrides[key];
                    break;
                }
            }
        }

        return options;
    }

    function loadSettings() {
        return new Promise(resolve => {
            getSettings().then(savedSettings => {
                settings = savedSettings;
                resolve();
            });
        });
    }

    function getSettings() {
        let storage = onlyLocalStorage ? browser.storage.local : browser.storage.sync;

        return storage.get({
            streamerPageOptions: { channelEmotes: true, globalEmotes: true },
            homePageOptions: { pinSearchToTop: true },
            generalOptions: { highlightFavorites: true }
        });
    }

    function runUrlWatcher() {
        let interval = null;
        let previousUrl = window.location.href;

        if (interval != null) {
            clearInterval(interval);
        }

        interval = setInterval(() => {
            let currentUrl = window.location.href;
            if (previousUrl !== currentUrl) {
                // fire event
                let detail = { current: currentUrl.toString(), previous: previousUrl.toString() };
                let event = new CustomEvent('url-change', { detail: detail });
                window.dispatchEvent(event);

                previousUrl = currentUrl;
            }
        }, 500);
    }

    /* Helpers */

    function getUserRoleRank(role = '') {
        switch (role) {
            case '':
                return -1;
            case 'Owner':
                return 1;
            case 'ChannelEditor':
            case 'Mod':
                return 2;
            case 'Subscriber':
                return 3;
            case 'Pro':
                return 4;
            case 'User':
                return 5;
            case 'all':
            default:
                return 6;
        }
    }

    function checkValidDomain(url) {
        if (typeof URL !== 'function') {
            // url checks not supported in this browser
            return false;
        }

        url = new URL(url);

        // Enforce https
        if (url.protocol !== 'https:') {
            return false;
        }

        // Split hostname by period so we get something like
        // Helps with all of the variations from different domains
        // ['i', 'imgur', 'com']
        let urlHostArray = url.hostname.split('.');

        // Valid domain list.
        let validDomains = ['imgur', 'instagram', 'giphy', 'tenor', 'flickr', 'photobucket', 'deviantart'];

        // Search hostname array against valid domains.
        let found = urlHostArray.some(r => validDomains.includes(r));
        if (found) {
            return true;
        }

        return false;
    }

    let urlIsAnImage = function(uri) {
        let validDomain = checkValidDomain(uri);
        if (validDomain === false) {
            return false;
        }

        // make sure we remove any nasty GET params
        uri = uri.split('?')[0];
        // moving on now
        let parts = uri.split('.');
        let extension = parts[parts.length - 1];
        let imageTypes = ['jpg', 'jpeg', 'tiff', 'png', 'gif', 'bmp', 'webp'];
        if (imageTypes.indexOf(extension) !== -1) {
            return true;
        }
    };

    // Get user info
    // This gets user info of current logged in person
    function loadUserInfo() {
        return new Promise(resolve => {
            $.get('https://mixer.com/api/v1/users/current')
                .done(data => {
                    log('Got user settings');
                    cache.user = data;
                    resolve(data);
                })
                .fail(() => {
                    // We reached our target server, but it returned an error
                    log('No user logged in.');
                    cache.user = null;
                    resolve(null);
                });
        });
    }

    // Checks Mixer API to see if streamer is followed.
    // Returns object with following status and streamer name.
    function streamerIsFollowed(streamerName) {
        return new Promise((resolve, reject) => {
            if (cache.user != null) {
                let userId = cache.user.id;

                // Let's create the data we want to return
                let streamerData = {};
                streamerData.streamerName = streamerName;
                streamerData.isFollowed = false;

                // Now check the API to see if this streamer is followed.
                $.getJSON(
                    `https://mixer.com/api/v1/users/${userId}/follows?fields=token&where=token:eq:${streamerName}`,
                    function(data) {
                        if (data.length > 0) {
                            // Found the streamer in the user's followers.
                            streamerData.isFollowed = true;
                            resolve(streamerData);
                        } else {
                            // Did not find the streamer in the user's followers.
                            streamerData.isFollowed = false;
                            resolve(streamerData);
                        }
                    }
                );
            } else {
                reject(false);
            }
        });
    }

    // Returns boolean based on whether or not a streamer is favorited.
    function streamerIsFavorited(streamerName) {
        // If general options is null, we need to create the object so we have something to read the data from.
        if (settings.generalOptions == null) {
            settings.generalOptions = {};
            settings.generalOptions.favoriteFriends = Array();
        }

        // Are there any favorites?
        if (settings.generalOptions.favoriteFriends != null) {
            let favoriteFriends = settings.generalOptions.favoriteFriends;

            // Is there data in the friends array?
            if (favoriteFriends != null) {
                // If there is data, is there anything in it?
                if (favoriteFriends.indexOf(streamerName) >= 0) {
                    // If streamer is a favorite, then we want.
                    return true;
                }
            }
        }

        return false;
    }

    // Adds or Removes a streamer to the favorite list
    function addOrRemoveFavorite(streamerName) {
        // log("addOrRemoveFavorite("+streamerName+")")

        // If general options is null, we need to create the object so we have something to attach the data to.
        if (settings.generalOptions == null) {
            settings.generalOptions = {};
            settings.generalOptions.favoriteFriends = Array();
        }

        let favorites = settings.generalOptions.favoriteFriends;

        if (streamerIsFavorited(streamerName)) {
            favorites = removeFavorite(streamerName);
        } else {
            log('Adding favorite: ' + streamerName);
            favorites.push(streamerName);
        }

        syncFavorites(favorites);
    }

    function removeFavorite(streamerName) {
        let favorites = settings.generalOptions.favoriteFriends;
        const index = favorites.indexOf(streamerName);

        if (index !== -1) {
            favorites.splice(index, 1);
        }
        return favorites;
    }

    async function syncFavorites(favorites) {
        log('Syncing Favorites list: ' + favorites);

        let storage = onlyLocalStorage ? browser.storage.local : browser.storage.sync;

        if (!settings) {
            await loadSettings();
        }

        let generalOptions = settings.generalOptions || {};
        generalOptions.favoriteFriends = favorites;

        storage.set({
            generalOptions: generalOptions
        });
    }

    // Checks the Mixer API to find a co-stream id.
    function getCostreamID(streamerName) {
        return new Promise(resolve => {
            // Check Mixer API to see if active streamer is currently costreaming.
            $.getJSON(`https://mixer.com/api/v1/channels/${streamerName}?fields=costreamId`, function(data) {
                if (data['costreamId'] != null) {
                    // If user is co-streaming, resolve with costream id.
                    resolve(data.costreamId);
                } else {
                    // If user is co-streaming, resolve with null.
                    resolve(null);
                }
            });
        });
    }

    // Gets list of costreamers via Mixer API
    function getCostreamers(costreamID) {
        return new Promise(resolve => {
            // Check Mixer API with co-stream ID to see who is participaiting in the co-stream.
            $.getJSON(`https://mixer.com/api/v1/costreams/${costreamID}`, function(data) {
                let channels = data['channels'];
                let participants = Array();

                // Check each channel from API data and insert into participants array.
                $.each(channels, function(i) {
                    participants.push(channels[i].token);
                });

                // Resolve array of co-stream participants
                resolve(participants);
            });
        });
    }

    // Gets user roles from api.
    function getUserRoles(channelId, username) {
        return new Promise(resolve => {
            // Check Mixer API with co-stream ID to see who is participaiting in the co-stream.
            let url = 'https://mixer.com/api/v1/channels/' + channelId + '/users?where=username:eq:' + username;

            $.getJSON(url, function(data) {
                if (!data || data.length < 1) return resolve([]);
                let groups = data[0].groups;
                let roles = Array();

                // Check each group from API data and insert into roles array.
                $.each(groups, function(i) {
                    roles.push(groups[i].name);
                });

                // Resolve array of co-stream participants
                resolve(roles);
            });
        });
    }

    function loadUserAndSettings() {
        let userInfoLoad = loadUserInfo();
        let settingsLoad = loadSettings();

        // wait for both user info and settings to load.
        Promise.all([userInfoLoad, settingsLoad])
            .then(() => {
                siteWide.apply(settings, cache.user);

                return waitForPageLoad();
            })
            .then(() => {
                log('page loaded');

                // Listen for url changes
                window.addEventListener('url-change', function() {
                    initialPageLoad = true;
                    cache.currentStreamerName = null;
                    cache.currentStreamerId = null;
                    runPageLogic();
                });

                // run page logic for the first load
                runPageLogic();

                // then let the url watcher trigger it from then on
                runUrlWatcher();
            });
    }

    loadUserAndSettings();

    // listen for an event from the Options page. This fires everytime the user updates a setting
    browser.runtime.onMessage.addListener((request, _, sendResponse) => {
        if (request.settingsUpdated) {
            loadSettings().then(() => {
                runPageLogic();
            });
        } else if (request.query === 'currentStreamerName') {
            if (cache.currentPage === 'streamer') {
                sendResponse({ streamerName: cache.currentStreamerName });
            }
        }
    });

    // escape press listener
    $(document).keyup(function(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            if (theaterModeEnabled()) {
                toggleTheaterMode();
            }
        }
    });

    // Ctrl + Alt + T theater toggle listener
    $(document).keydown(function(evt) {
        if (evt.ctrlKey && evt.altKey && evt.code === 'KeyT') {
            toggleTheaterMode();
        }
    });

    function mapEmoteSizeToClass(size) {
        switch (size) {
            case 24:
                return 'twentyfour';
            case 30:
                return 'thirty';
            case 50:
            default:
                return 'fifty';
        }
    }

    function triggerAutomute() {
        log('Attempting to auto mute...');
        waitForElementAvailablity('.spectre-player').then(() => {
            log('Found video toolbar!');
            let muteButton = $('.spectre-player')
                .children('div')
                .children()
                .eq(1)
                .children()
                .eq(2)
                .children()
                .children()
                .eq(1)
                .children()
                .eq(1)
                .children('button');

            let muteBtnType = muteButton.children('i').text();

            log('Checking if stream is already muted...');

            if (muteBtnType !== 'volume_off') {
                log('Muting stream!');
                muteButton.click();
            }
        });
    }

    function getLastChangeLog() {
        let storage = onlyLocalStorage ? browser.storage.local : browser.storage.sync;

        return storage
            .get({
                internal: {
                    lastChangeLog: null
                }
            })
            .then(options => {
                return options.internal.lastChangeLog;
            });
    }

    function setLastChangeLog(version) {
        let storage = onlyLocalStorage ? browser.storage.local : browser.storage.sync;
        storage.set({
            internal: {
                lastChangeLog: version
            }
        });
    }

    async function changeLogModalCheck() {
        let lastChangeLog = await getLastChangeLog();
        if (lastChangeLog !== '2.0.0') {
            log('***Showing change log modal***');
            $(`
				<div id="mixr-change-log" class="modal">
					<div style="text-align: center;">
						<img style="width: 175px;" src="${browser.runtime.getURL('resources/images/mixrelixr2logo.png')}">
					</div>
					<div style="margin-top: 30px;text-align: center;font-size: 14px;">
						<p>Thanks for using MixrElixr! We have a big update for you and wanted to share the highlights.</p>
					</div>
					<div class="changelog-header">Change Log</div>
					<h2 class="changelog-feature">All New Look and Feel</h2>
					<p class="changelog-feature-description">To better match Mixer's current theme.</p>
					<h2 class="changelog-feature">Custom Emotes</h2>
					<p class="changelog-feature-description">Emotes for everyone! Head to <a href="https://crowbartools.com/emotes" target="_blank">our website</a> to learn more.</p>
					<h2 class="changelog-feature">Desktop Notifications</h2>
					<p class="changelog-feature-description">Get notifications when your follows and favorites go live!</p>
					<h2 class="changelog-feature">Pinned Search</h2>
					<p class="changelog-feature-description">The searchbar is now pinned to the top on Mixers homepage, where it has always belonged <3</p>
					<h2 class="changelog-feature">Auto Theater Mode</h2>
					<p class="changelog-feature-description">New option to automatically go into Theater Mode when loading a channel page.</p>
					<div style="padding: 12px 0;text-align: center;opacity: 0.8;">
						<span>Questions? Stop by our <a href="https://discord.gg/2CGrbA4" target="_blank">Discord</a> or send us a <a href="https://twitter.com/mixrelixr" target="_blank">tweet</a>!</span>
					</div>
				</div>
		  `).modal({
                modalClass: 'modal mixr-modal'
            });

            setLastChangeLog('2.0.0');
        }
    }

    //changeLogModalCheck();

    // tooltip listener
    $.initialize('.me-tooltip', function() {
        let meTooltip = $(this);

        meTooltip.tooltipster({
            animation: 'fade',
            delay: 10,
            animationDuration: 50,
            contentAsHTML: true,
            theme: 'tooltipster-borderless'
        });
    });
});
