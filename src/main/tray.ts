/**
 * Tray: the app's resident presence. Close hides here; quit lives here.
 *
 * Status is DISPLAY-ONLY, driven by the web app via setTrayStatus — the tray
 * never mutates agent state (that logic lives in the web softphone).
 */

import { Menu, Tray, app, nativeImage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import { TrayStatus } from '../shared/ipc-channels';
import { getAutoLaunch, setAutoLaunch } from './auto-launch';
import { checkForUpdatesInteractive } from './updater';
import { setQuitting, showMainWindow } from './window';

let tray: Tray | null = null;
let currentStatus: TrayStatus = 'available';

const STATUS_LABELS: Record<TrayStatus, string> = {
  available: 'Status: Available',
  ringing: 'Status: Incoming call…',
  oncall: 'Status: On a call',
  away: 'Status: Away',
  offline: 'Status: Offline — sign in',
};

function trayIconPath(status: TrayStatus): string {
  const base = path.join(__dirname, '..', '..', 'resources', 'tray');
  const variant: Record<TrayStatus, string> = {
    available: 'tray-idle.png',
    ringing: 'tray-ringing.png',
    oncall: 'tray-oncall.png',
    away: 'tray-away.png',
    offline: 'tray-away.png',
  };
  const candidate = path.join(base, variant[status]);
  return fs.existsSync(candidate) ? candidate : path.join(base, 'tray-idle.png');
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: 'Open Affilync', click: () => showMainWindow() },
    { type: 'separator' },
    { label: STATUS_LABELS[currentStatus], enabled: false },
    { type: 'separator' },
    {
      label: 'Start on login',
      type: 'checkbox',
      checked: getAutoLaunch(),
      click: (item) => setAutoLaunch(item.checked),
    },
    { label: 'Check for updates…', click: () => void checkForUpdatesInteractive() },
    { type: 'separator' },
    {
      label: 'Quit Affilync',
      click: () => {
        setQuitting(true);
        app.quit();
      },
    },
  ]);
}

/** Returns false when no tray is available (e.g. stock GNOME/Wayland). */
export function createTray(): boolean {
  try {
    const image = nativeImage.createFromPath(trayIconPath('available'));
    tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
    tray.setToolTip('Affilync');
    tray.setContextMenu(buildMenu());
    if (process.platform !== 'darwin') {
      tray.on('click', () => showMainWindow());
    }
    return true;
  } catch (err) {
    // GNOME without the AppIndicator extension has no tray. The caller
    // switches close-to-hide off so users aren't stranded.
    console.warn('tray unavailable:', err);
    tray = null;
    return false;
  }
}

export function updateTrayStatus(status: TrayStatus): void {
  currentStatus = status;
  if (!tray) return;
  try {
    const image = nativeImage.createFromPath(trayIconPath(status));
    if (!image.isEmpty()) tray.setImage(image);
    tray.setToolTip(`Affilync — ${STATUS_LABELS[status].replace('Status: ', '')}`);
    tray.setContextMenu(buildMenu());
  } catch (err) {
    console.warn('tray update failed:', err);
  }
}

export function hasTray(): boolean {
  return tray !== null;
}
