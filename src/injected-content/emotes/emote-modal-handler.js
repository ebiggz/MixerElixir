import { mapEmoteSizeToClass } from './emote-manager';
import { escapeHTML, updateChatTextfield } from '../utils';

export function handleEmoteModal(options, cache) {
    // get rid of any previous registered callbacks for chat modals
    $.deinitialize("[class*='modal']");

    $.initialize("[class*='modal']", async function() {
        let modal = $(this);

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

        waitForModalContainer(modal)
            .then(emotesContainer => {
                let classes = emotesContainer.attr('class').split(/\s+/);

                let isListModal = classes.some(c => {
                    return c.startsWith('listModal');
                });

                if (!isListModal) {
                    if (showChannelEmotes || showGlobalEmotes) {
                        emotesContainer.addClass('mixer-emotes-wrapper');
                        emotesContainer.show();

                        if ($('.me-emote-tabs').length > 0) {
                            $('.me-emote-tabs').remove();
                        }

                        $(`
                        <div class="me-emote-tabs">
                            <div class="me-emote-tab me-tooltip mixer  me-tab-selected" title="Mixer Emotes">
                                <img src="${browser.runtime.getURL('resources/images/MixerMerge_Dark.svg')}">
                            </div>
                            <div class="me-emote-tab me-tooltip elixr" title="MixrElixr Emotes">
                                <img src="${browser.runtime.getURL('resources/images/elixr-light-128.png')}">
                            </div>
                        </div>
                    `).insertAfter(emotesContainer);

                        $('.me-emote-tab').off('click');
                        $('.me-emote-tab').on('click', function() {
                            let clickedTab = $(this);
                            if (!clickedTab.hasClass('me-tab-selected')) {
                                clickedTab.addClass('me-tab-selected');
                                let otherTabType = clickedTab.hasClass('elixr') ? 'mixer' : 'elixr';
                                $(`.${otherTabType}`).removeClass('me-tab-selected');
                                let elixrEmotes = $('.me-emotes-wrapper');
                                let mixerEmotes = $('.mixer-emotes-wrapper');
                                if (otherTabType === 'mixer') {
                                    mixerEmotes.hide();
                                    elixrEmotes.show();
                                } else {
                                    elixrEmotes.hide();
                                    mixerEmotes.show();
                                }
                            }
                        });

                        if ($('.me-emotes-wrapper').length > 0) {
                            $('.me-emotes-wrapper').remove();
                        }

                        let elixrEmotesContainer = $(`<div class="me-emotes-wrapper"></div>`);
                        elixrEmotesContainer.hide();

                        if (showGlobalEmotes) {
                            let header = 'MixrElixr Global Emotes';
                            let globalEmotes = Object.values(cache.globalEmotes.emotes);
                            let baseUrl = 'https://crowbartools.com/user-content/emotes/global/';

                            let emotesSection = buildEmotesSection(header, globalEmotes, baseUrl);
                            elixrEmotesContainer.prepend(emotesSection);
                        }

                        if (showChannelEmotes) {
                            let header = `${cache.currentStreamerName}'s Custom Emotes`;
                            let streamerEmotes = Object.values(cache.currentStreamerEmotes.emotes);
                            let baseUrl = `https://crowbartools.com/user-content/emotes/live/${cache.currentStreamerId}/`;

                            let emotesSection = buildEmotesSection(header, streamerEmotes, baseUrl);
                            elixrEmotesContainer.prepend(emotesSection);
                        }

                        elixrEmotesContainer.insertBefore(emotesContainer);

                        $('.me-emote-preview').off('click');
                        $('.me-emote-preview').on('click', function() {
                            let emoteName = $(this).attr('emote-name');
                            let chatTextarea = $('#chat-input').children('textarea');
                            let currentValue = chatTextarea.val();
                            let newValue = `${currentValue}${currentValue === '' ? ' ' : ''}${emoteName} `;
                            updateChatTextfield(newValue);
                        });
                    }
                }
            })
            .catch(() => {});
    });
}

function buildEmotesSection(header, emotes, baseUrl) {
    let customEmotesWrapper = $(
        `<div><h3 class="elixrEmoteGroupHeader">${header}</h3><div class="elixrEmoteList"></div></div>`
    );
    let emoteList = customEmotesWrapper.children('.elixrEmoteList');

    // loop through all emotes
    for (let emote of emotes) {
        let url = `${baseUrl}/${escapeHTML(emote.filename)}`;
        let name = escapeHTML(emote.name);
        let sizeClass = mapEmoteSizeToClass(emote.maxSize);
        emoteList.append(`
        <span class="elixr-custom-emote ${sizeClass} me-tooltip me-emote-preview" title="${name}" emote-name="${name}" style="display: inline-block;">
            <img src="${url}">
        </span>`);
    }

    return customEmotesWrapper;
}

let waitForModalContainer = function(modal, counter = 0) {
    return new Promise((resolve, reject) => {
        if (counter >= 20) {
            return reject();
        }
        counter++;

        let emotesContainer = modal.find("[class*='container']");

        if (emotesContainer == null || emotesContainer.length < 1) {
            setTimeout(() => {
                resolve(waitForModalContainer(modal, counter));
            }, 100);
        } else {
            resolve(emotesContainer);
        }
    });
};
