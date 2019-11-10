import { Carina } from 'carina';
import * as infoPanel from '../pages/info-panel';

let ca;
export function start(userId) {
    stop();
    ca = new Carina({ isBot: true }).open();
    ca.subscribe(`user:${userId}:update`, data => {
        infoPanel.updateInfo(data);
    });
}

export function stop() {
    if (ca != null) {
        ca.close();
        ca = null;
    }
}
