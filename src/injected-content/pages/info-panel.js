import { waitForElementAvailablity } from '../utils';
let panelCreated = false;

export async function removeInfoPanel() {
    $('#me-info-panel').remove();
}

export async function createInfoPanel(user) {
    panelCreated = false;
    removeInfoPanel();

    if (user == null) {
        return;
    }

    await waitForElementAvailablity('b-nav-host [class*="right_"] [class^="chevron_"]');

    const accountButton = $('b-nav-host')
        .find("[class*='right_']")
        .children()
        .last();

    $(`
        <div id="me-info-panel">
            <div id="me-username">${user.username}</div>
            <div class="me-info-data">
                <div id="me-user-level">LVL ${user.level}</div>
                <div>
                    <img aria-label="spark" class="spark-coin" style="height: 14px;vertical-align: text-top;" src="_static/img/design/ui/spark-coin/spark-coin.svg">
                </div>     
                <div id="me-user-sparks">${formatSparks(user.sparks)}</div>
            </div>
        </div>
    `).insertBefore(accountButton);

    panelCreated = true;
}

function formatSparks(count) {
    if (!count == null) return 0;
    return count.toLocaleString();
}

export function updateInfo(user) {
    if (!panelCreated || user == null) return;
    if (user.sparks) {
        $('#me-user-sparks').text(formatSparks(user.sparks));
    }
    if (user.level) {
        $('#me-user-level').text(`LVL ${user.level}`);
    }
}
