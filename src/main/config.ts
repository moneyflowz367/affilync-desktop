/** Central constants for the desktop shell. No secrets live here — it is a shell. */

export const APP_URL = process.env.AFFILYNC_APP_URL || 'https://app.affilync.com';

/**
 * Hostnames the shell window may navigate to. Everything else opens in the
 * system browser (OAuth/Stripe/help links belong there, not embedded).
 */
export const ALLOWED_HOST_SUFFIX = '.affilync.com';
export const ALLOWED_HOSTS = ['affilync.com'];

export function isAllowedUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return (
      ALLOWED_HOSTS.includes(url.hostname) || url.hostname.endsWith(ALLOWED_HOST_SUFFIX)
    );
  } catch {
    return false;
  }
}

/** Persistent session partition — cookies (httpOnly auth) survive restarts. */
export const PARTITION = 'persist:affilync';

/** Origin granted mic/notification permissions. Everything else is denied. */
export const TRUSTED_ORIGIN = new URL(APP_URL).origin;

export const APP_USER_MODEL_ID = 'com.affilync.desktop';
export const PROTOCOL_SCHEME = 'affilync';

/** electron-updater: first check delay + recheck interval. */
export const UPDATE_FIRST_CHECK_MS = 30_000;
export const UPDATE_INTERVAL_MS = 4 * 60 * 60 * 1000;
