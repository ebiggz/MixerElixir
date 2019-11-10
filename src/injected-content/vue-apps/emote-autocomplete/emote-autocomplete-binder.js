import Vue from 'vue';
import AutocompleteApp from './emote-autocomplete';
import { waitForElementAvailablity, debounce } from '../../utils';

let app = null;
export function bindEmoteAutocompleteApp(
    composerBlock,
    options,
    globalEmotesCache,
    channelEmotesCache,
    currentStreamerId
) {
    //clean up any previous
    if ($('#me-emote-autocomplete').length > 0) {
        $('#me-emote-autocomplete').remove();
    }

    let keyupListenerFunc = debounce(keyupListener, 100);

    $('#chat-input')
        .children('textarea')
        .off('keyup', keyupListenerFunc);
    $('#chat-input')
        .children('textarea')
        .off('keydown', keydownListenerFunc);

    if (options.enableEmoteAutocomplete === false) {
        return;
    }

    let showGlobalEmotes =
        options.customEmotes !== false &&
        options.globalEmotes !== false &&
        globalEmotesCache !== null &&
        globalEmotesCache.emotes !== null;

    let showChannelEmotes =
        options.customEmotes !== false &&
        options.channelEmotes !== false &&
        channelEmotesCache !== null &&
        channelEmotesCache.emotes !== null;

    let globalEmotes = [];
    if (showGlobalEmotes) {
        globalEmotes = Object.values(globalEmotesCache.emotes);
        globalEmotes.forEach(e => (e.global = true));
    }

    let channelEmotes = [];
    if (showChannelEmotes) {
        channelEmotes = Object.values(channelEmotesCache.emotes);
        channelEmotes.forEach(e => (e.global = false));
    }

    composerBlock.prepend('<ul id="me-autocomplete-binder" role="listbox"></ul>');

    app = new Vue({
        el: '#me-autocomplete-binder',
        render: h => h(AutocompleteApp)
    });

    let child = app.$children[0] || {};

    child.emotes = globalEmotes.concat(channelEmotes).sort(function(a, b) {
        const aName = a.name.toLowerCase(),
            bName = b.name.toLowerCase();

        if (aName < bName) {
            return -1;
        }
        if (aName > bName) {
            return 1;
        }
        return 0;
    });

    child.currentStreamerId = currentStreamerId;

    let keydownListenerFunc = keydownListener;

    $('#chat-input')
        .children('textarea')
        .on('keyup', keyupListenerFunc);
    $('#chat-input')
        .children('textarea')
        .on('keydown', keydownListenerFunc);

    const chatSendBtnListener = function() {
        let child = app.$children[0] || {};
        child.query = '';
    };

    waitForElementAvailablity("[class*='send_']").then(sendSpan => {
        let sendBtn = sendSpan
            .parent()
            .parent()
            .parent();
        sendBtn.off('click', chatSendBtnListener);
        sendBtn.on('click', chatSendBtnListener);
    });
}

function keydownListener(e) {
    const child = app.$children[0] || {};

    if (child.showMenu) {
        switch (e.which) {
            case 37: //left
                child.decrementSelectedEmote();
                e.preventDefault();
                e.stopPropagation();
                return false;
            case 38: // up
                child.decrementSelectedEmoteRow();
                e.preventDefault();
                e.stopPropagation();
                return false;
            case 39: // right
                child.incrementSelectedEmote();
                e.preventDefault();
                e.stopPropagation();
                return false;
            case 40: // down
                child.incrementSelectedEmoteRow();
                e.preventDefault();
                e.stopPropagation();
                return false;
            case 13: // enter
                child.query = '';
                break;
            case 9: // tab
                child.autocompleteSelectedEmote();
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
        }
    }
}

function keyupListener(e) {
    let child = app.$children[0] || {};

    if (e.which === 27) {
        //esc
        if (child.showMenu) {
            child.query = '';
            return;
        }
    }

    let query = '';

    let allText = $('#chat-input')
        .children('textarea')
        .val();
    if (allText && allText.trim().length > 0 && !allText.endsWith(' ')) {
        let words = allText.split(' ');
        if (words.length > 0) {
            let lastWord = words[words.length - 1];
            if (lastWord != null && lastWord.trim().length >= 3) {
                query = lastWord;
            }
        }
    }

    child.query = query;
}
