import { waitForElementAvailablity } from '../utils';
import * as constellation from '../websocket/constellation';
import * as infoPanel from './info-panel';

function clearPreviousThemes() {
    $('body').removeClass('elixr-dark');
    $('body').removeClass('elixr-obsidian');
}
export function apply(settings, user) {
    clearPreviousThemes();
    const theme = settings.generalOptions.theme;
    if (theme != null && theme !== 'default') {
        $('body').addClass(theme);
    }

    if (settings.generalOptions.declutterTopBar !== false) {
        waitForElementAvailablity("a[href='/dashboard/onboarding']").then(() => {
            $("a[href='/dashboard/onboarding']").hide();
        });

        waitForElementAvailablity("[class*='getEmbersButton_'").then(emberBtn => {
            emberBtn.css('margin', '0');
            emberBtn
                .children()
                .first()
                .css('background', 'transparent');
            emberBtn
                .find("[class^='content_']")
                .contents()
                .filter(function() {
                    return this.nodeType == 3;
                })
                .remove();
        });
    }

    if (user != null && settings.generalOptions.showInfoPanel !== false) {
        infoPanel.createInfoPanel(user);
        constellation.start(user.id);
    } else {
        constellation.stop();
        infoPanel.removeInfoPanel();
    }
}
