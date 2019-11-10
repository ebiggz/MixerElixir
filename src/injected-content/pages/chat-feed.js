import { scrollChatIfGlued } from '../utils';

let showModActions = true;
export function setup(options) {
    showModActions = options.showModActions !== false;
    if (showModActions) {
        $('.me-deleted-action').show();
        $('.me-mod-action-wrapper').show();
    } else {
        $('.me-deleted-action').hide();
        $('.me-mod-action-wrapper').hide();
    }
}

export function messagedDeleted(messageId, moderatorName) {
    if (!showModActions) return;

    let chatMessage = $(`[data-id='${messageId}']`).find("[class*='message_']");
    if (chatMessage == null || chatMessage.length < 1) return;

    //we already have a deleted message here... this shouldnt happen
    if (chatMessage.find('.me-deleted-action').length > 0) return;

    $(`
        <div class="me-deleted-action">
            <span class=" me-tooltip" title="MixrElixr: Deleted message mod action">(Deleted by ${moderatorName})</span>
        </div>
    `).appendTo(chatMessage);

    scrollChatIfGlued();
}

export function userBanned(username) {
    if (!showModActions) return;

    const chatContainer = $('[class*="scrollWrapper_"]');
    $(
        `<div class="me-mod-action-wrapper">
            <div class="me-mod-action-bubble me-tooltip" title="MixrElixr: Ban mod action">
                <span class="me-icon me-banned-icon"></span>
                <span><b>${username}</b> has been banned.</span>
            </div>
        </div>`
    ).appendTo(chatContainer);
}

export function userTimeout(username, modName) {
    if (!showModActions) return;

    const chatContainer = $('[class*="scrollWrapper_"]');
    $(
        `<div class="me-mod-action-wrapper" >
            <div class="me-mod-action-bubble me-tooltip" title="MixrElixr: Timeout mod action">
                <span class="me-icon me-timeout-icon"></span>
                <span><b>${username}</b> has been timed out by <b>${modName}</b>.</span>
            </div>
        </div>`
    ).appendTo(chatContainer);
}
