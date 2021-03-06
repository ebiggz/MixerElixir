import Vue from 'vue';
import SlowChatTimerApp from './slow-chat-timer';
import $ from '../../plugins/jquery-wrapper.js';
import { waitForElement } from '../../utils/wait-for.js';

let app = null;
let expectingMessage = false;
let expectingTimeoutId = null;
let currentChatText = '';

// current text
function inputListener() {
    let textArea = $(this);
    currentChatText = textArea.val();
}

function checkIfMessageSent() {
    if (currentChatText != null && currentChatText.length > 0) {
        expectingMessage = true;
        currentChatText = '';

        if (expectingTimeoutId) {
            clearTimeout(expectingTimeoutId);
        }
        expectingTimeoutId = setTimeout(() => {
            expectingMessage = false;
            expectingTimeoutId = null;
        }, 6000);
    }
}
function keydownListener(e) {
    // if enter is pressed
    if (e.which === 13) {
        checkIfMessageSent();
    }
}

function clickListener() {
    checkIfMessageSent();
}

export function bindSlowChatTimerApp(composerBlock, slowChatMils) {
    // remove previous
    if ($('#elixr-slow-chat-timer').length > 0) {
        $('#elixr-slow-chat-timer').remove();
    }

    composerBlock.prepend('<div id="elixr-slow-chat-timer-binder"></div>');

    let appHost = new Vue({
        el: '#elixr-slow-chat-timer-binder',
        render: h => h(SlowChatTimerApp)
    });

    app = appHost.$children[0] || {};

    app.cooldown = slowChatMils / 1000;

    $('#chat-input')
        .children('textarea')
        .off('input', inputListener);
    $('#chat-input')
        .children('textarea')
        .on('input', inputListener);
    $('#chat-input')
        .children('textarea')
        .off('keydown', keydownListener);
    $('#chat-input')
        .children('textarea')
        .on('keydown', keydownListener);

    waitForElement("[class*='send_']").then(sendSpan => {
        let sendBtn = sendSpan
            .parent()
            .parent()
            .parent();
        sendBtn.off('click', clickListener);
        sendBtn.on('click', clickListener);
    });
}

export function messageDetected() {
    if (app == null) return;
    if (expectingMessage) {
        if (expectingTimeoutId) {
            clearTimeout(expectingTimeoutId);
            expectingTimeoutId = null;
        }
        app.startTimer();
        expectingMessage = false;
    }
}
