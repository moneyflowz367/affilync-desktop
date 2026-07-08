/**
 * Single registration point for all ipcMain handlers.
 *
 * Every payload from the (remote!) renderer is validated here — the page is
 * production web content, but defense-in-depth costs nothing: clamp numbers,
 * whitelist enum strings, accept no arbitrary channels.
 */

import { app, ipcMain } from 'electron';

import { IPC, TRAY_STATUSES, TrayStatus } from '../shared/ipc-channels';
import { powerSaveStart, powerSaveStop } from './power';
import { updateTrayStatus } from './tray';
import { getMainWindow, showMainWindow } from './window';

export function registerIpcHandlers(): void {
  ipcMain.on(IPC.FLASH_FRAME, (_event, on: unknown) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.flashFrame(on === true);
  });

  ipcMain.on(IPC.SET_BADGE, (_event, count: unknown) => {
    const n = typeof count === 'number' && Number.isFinite(count) ? count : 0;
    app.setBadgeCount(Math.max(0, Math.min(99, Math.floor(n))));
  });

  ipcMain.on(IPC.SET_TRAY_STATUS, (_event, status: unknown) => {
    if (typeof status === 'string' && (TRAY_STATUSES as readonly string[]).includes(status)) {
      updateTrayStatus(status as TrayStatus);
      // Incoming call while hidden to tray: surface the window ourselves
      // (without stealing focus) instead of relying on OS toasts — Windows
      // suppresses toasts from apps lacking Start-menu registration (e.g.
      // unpackaged runs), which would leave the agent with ringtone only.
      if (status === 'ringing') {
        const win = getMainWindow();
        if (win && !win.isDestroyed() && !win.isVisible()) {
          win.showInactive();
          win.flashFrame(true);
        }
      }
    }
  });

  ipcMain.on(IPC.SHOW_WINDOW, () => showMainWindow());

  ipcMain.on(IPC.POWER_SAVE_START, () => powerSaveStart());
  ipcMain.on(IPC.POWER_SAVE_STOP, () => powerSaveStop());
}
