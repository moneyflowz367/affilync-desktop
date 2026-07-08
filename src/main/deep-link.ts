/**
 * affilync:// deep links — the same scheme the mobile apps register.
 *
 * Three OS entry paths normalize into handleDeepLink():
 *   1. cold-start argv (Windows/Linux)
 *   2. second-instance argv (Windows/Linux, app already running)
 *   3. macOS 'open-url' event
 * Links arriving before the page finishes loading are queued.
 */

import { app } from 'electron';

import { IPC } from '../shared/ipc-channels';
import { PROTOCOL_SCHEME } from './config';
import { getMainWindow, showMainWindow } from './window';

let pendingLinks: string[] = [];
let rendererReady = false;

export function extractDeepLink(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL_SCHEME}://`)) ?? null;
}

export function handleDeepLink(url: string): void {
  if (!url.startsWith(`${PROTOCOL_SCHEME}://`)) return;
  showMainWindow();
  const win = getMainWindow();
  if (rendererReady && win && !win.isDestroyed()) {
    win.webContents.send(IPC.DEEP_LINK, url);
  } else {
    pendingLinks.push(url);
  }
}

export function registerDeepLinks(): void {
  if (process.defaultApp && process.argv.length >= 2) {
    // Dev mode: `electron .` needs the exe + entry args registered.
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
      process.argv[1] as string,
    ]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
  }

  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
}

/** Call from did-finish-load: flush anything queued before the page was up. */
export function flushDeepLinks(): void {
  rendererReady = true;
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return;
  for (const url of pendingLinks) {
    win.webContents.send(IPC.DEEP_LINK, url);
  }
  pendingLinks = [];
}
