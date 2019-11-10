import browser from 'webextension-polyfill';
global.scriptCommunication = {
    methods: {
        getCurrentStreamerNameInOpenTab: function() {
            return new Promise(resolve => {
                browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
                    browser.tabs.sendMessage(tabs[0].id, { query: 'currentStreamerName' }).then(response => {
                        if (response != null) {
                            return resolve(response.streamerName);
                        }
                        resolve('');
                    });
                });
            });
        }
    }
};
