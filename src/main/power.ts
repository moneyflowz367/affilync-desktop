/**
 * Keep-awake during calls + wake recovery.
 *
 * powerSaveBlocker is refcounted and only active during calls by design —
 * blocking sleep 24/7 on agent machines would be hostile. After sleep/unlock
 * the softphone's websockets are likely dead, so the simplest reliable
 * recovery is a page reload: useSoftphone re-registers on mount.
 */

import { powerMonitor, powerSaveBlocker } from 'electron';

import { getMainWindow } from './window';

let blockerId: number | null = null;
let refCount = 0;

export function powerSaveStart(): void {
  refCount += 1;
  if (blockerId === null || !powerSaveBlocker.isStarted(blockerId)) {
    blockerId = powerSaveBlocker.start('prevent-app-suspension');
    console.info('powerSaveBlocker started (call active)');
  }
}

export function powerSaveStop(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && blockerId !== null && powerSaveBlocker.isStarted(blockerId)) {
    powerSaveBlocker.stop(blockerId);
    console.info('powerSaveBlocker stopped');
    blockerId = null;
  }
}

export function isCallActive(): boolean {
  return refCount > 0;
}

export function registerWakeRecovery(): void {
  const reload = (reason: string) => {
    // Never reload mid-call — the blocker refcount doubles as call presence.
    if (isCallActive()) return;
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      console.info(`reloading after ${reason} to re-register softphone`);
      win.webContents.reload();
    }
  };
  powerMonitor.on('resume', () => reload('resume'));
  powerMonitor.on('unlock-screen', () => reload('unlock-screen'));
}
