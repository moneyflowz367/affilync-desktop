/**
 * Auto-update via electron-updater + GitHub Releases.
 *
 * Checks 30s after launch (never racing window creation) and every 4 hours.
 * Downloads in the background; NEVER force-restarts while a call is active —
 * the update installs on the next real quit instead.
 */

import { Notification, app } from 'electron';
import { autoUpdater } from 'electron-updater';

import { UPDATE_FIRST_CHECK_MS, UPDATE_INTERVAL_MS } from './config';
import { isCallActive } from './power';

let updateDownloaded = false;

export function initUpdater(): void {
  if (!app.isPackaged) return; // dev runs have no update feed

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true;
    // Passive prompt only — the agent restarts on their own schedule; the
    // update also applies automatically on the next quit.
    new Notification({
      title: 'Affilync update ready',
      body: `Version ${info.version} will be applied when you restart the app.`,
    }).show();
  });

  autoUpdater.on('error', (err) => {
    console.warn('updater error:', err?.message ?? err);
  });

  setTimeout(() => void safeCheck(), UPDATE_FIRST_CHECK_MS);
  setInterval(() => void safeCheck(), UPDATE_INTERVAL_MS);
}

async function safeCheck(): Promise<void> {
  try {
    if (isCallActive()) return; // don't even download mid-call on metered links
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.warn('update check failed:', err);
  }
}

/** Tray menu action. */
export async function checkForUpdatesInteractive(): Promise<void> {
  if (!app.isPackaged) return;
  try {
    if (updateDownloaded) {
      new Notification({
        title: 'Affilync update ready',
        body: 'Restart the app to apply the update.',
      }).show();
      return;
    }
    const result = await autoUpdater.checkForUpdates();
    if (!result?.updateInfo || result.updateInfo.version === app.getVersion()) {
      new Notification({
        title: 'Affilync is up to date',
        body: `You are on version ${app.getVersion()}.`,
      }).show();
    }
  } catch (err) {
    console.warn('interactive update check failed:', err);
  }
}
