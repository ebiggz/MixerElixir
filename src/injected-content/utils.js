import * as simulant from 'simulant';
export function log(message) {
    console.log(`[MixrElixr] ${message}`);
}

export function waitForElementAvailablity(selector) {
    log(`Waiting for element '${selector}'...`);

    let promise = new Promise(resolve => {
        $.deinitialize(selector);

        $.initialize(selector, function() {
            log(`Found element '${selector}'!`);
            $.deinitialize(selector);
            resolve($(this));
        });
    });

    return promise;
}

export function debounce(func, wait, immediate) {
    let timeout;

    return function executedFunction() {
        let context = this;
        let args = arguments;

        let later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };

        let callNow = immediate && !timeout;

        clearTimeout(timeout);

        timeout = setTimeout(later, wait);

        if (callNow) func.apply(context, args);
    };
}

export function escapeHTML(unsafeText) {
    let div = document.createElement('div');
    div.innerText = unsafeText;
    return div.innerHTML.replace(/"/g, '&quot;');
}

export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

export function determineMessageType(message) {
    /*if (message.find("span[class*='stickerMessage_']").length > 0) {
        return "ember-donation";
    }*/

    if (message.find("div[class*='sticker_']").length > 0) {
        return 'sticker';
    }

    if (message.find("img[class*='skillIcon_']").length > 0) {
        return 'skill-used';
    }

    return 'regular-message';
}

export function updateChatTextfield(newString) {
    let textAreaElement = $('#chat-input').children('textarea');

    simulant.fire(textAreaElement[0], simulant('focus'));
    textAreaElement.val(newString);
    simulant.fire(textAreaElement[0], simulant('input'));
    simulant.fire(textAreaElement[0], simulant('change'));
    simulant.fire(textAreaElement[0], simulant('blur'));
}

export function scrollChatToBottom() {
    let chatContainer = $('.elixr-chat-container');
    if (chatContainer == null || chatContainer.length < 1) return;
    chatContainer.scrollTop(chatContainer[0].scrollHeight);
    log('Scrolling to bottom!');
}

let chatScrollGlued = true;
export function scrollChatIfGlued() {
    if (chatScrollGlued) {
        scrollChatToBottom();
    }
}

export function setupScrollGlueCheck() {
    let updateScrollGlue = debounce(function() {
        let chatContainer = $('.elixr-chat-container');

        let current = chatContainer.scrollTop();
        let height = chatContainer[0].scrollHeight - chatContainer.height();
        let percent = (current / height) * 100;

        let minimumPercent = 99;

        if (percent >= minimumPercent) {
            chatScrollGlued = true;
        } else {
            chatScrollGlued = false;
        }
    }, 100);

    $('.elixr-chat-container').off('scroll', updateScrollGlue);
    $('.elixr-chat-container').on('scroll', updateScrollGlue);
}
