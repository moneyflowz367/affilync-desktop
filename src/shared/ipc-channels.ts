/**
 * IPC channel names + payload types shared between main and preload.
 *
 * The bridge is deliberately tiny and explicit: every capability is a named
 * channel with a validated payload — no generic invoke escape hatch. Bump
 * BRIDGE_VERSION on any breaking change so the web app can gate features.
 */

export const BRIDGE_VERSION = 1 as const;

export const IPC = {
  FLASH_FRAME: 'affilync:flash-frame',
  SET_BADGE: 'affilync:set-badge',
  SET_TRAY_STATUS: 'affilync:set-tray-status',
  SHOW_WINDOW: 'affilync:show-window',
  POWER_SAVE_START: 'affilync:power-save-start',
  POWER_SAVE_STOP: 'affilync:power-save-stop',
  DEEP_LINK: 'affilync:deep-link',
} as const;

export const TRAY_STATUSES = [
  'available',
  'ringing',
  'oncall',
  'away',
  'offline',
] as const;

export type TrayStatus = (typeof TRAY_STATUSES)[number];
