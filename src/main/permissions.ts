/**
 * Permission policy: the app.affilync.com origin gets microphone +
 * notifications (so the softphone's getUserMedia and the existing
 * `new Notification('Incoming call · Relay')` path work with zero prompts);
 * every other origin and permission type is denied.
 */

import { session, systemPreferences } from 'electron';

import { PARTITION, TRUSTED_ORIGIN } from './config';

const GRANTED = new Set(['media', 'notifications', 'clipboard-sanitized-write']);

function originOf(requestingUrl: string): string {
  try {
    return new URL(requestingUrl).origin;
  } catch {
    return '';
  }
}

export function registerPermissionHandlers(): void {
  const ses = session.fromPartition(PARTITION);

  ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
    const requestingOrigin = originOf(details.requestingUrl);
    if (requestingOrigin !== TRUSTED_ORIGIN) return callback(false);
    if (permission === 'media') {
      // Audio only — the softphone needs the mic, nothing needs the camera.
      const mediaTypes = (details as { mediaTypes?: string[] }).mediaTypes ?? [];
      return callback(!mediaTypes.includes('video'));
    }
    callback(GRANTED.has(permission));
  });

  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    if (originOf(requestingOrigin + '/') !== TRUSTED_ORIGIN && requestingOrigin !== TRUSTED_ORIGIN) {
      return false;
    }
    return GRANTED.has(permission);
  });
}

/** macOS: the OS-level mic consent dialog (needed once, even unsigned). */
export async function ensureMacMicrophoneAccess(): Promise<void> {
  if (process.platform !== 'darwin') return;
  try {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    if (status !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone');
    }
  } catch (err) {
    console.warn('macOS mic access request failed:', err);
  }
}
