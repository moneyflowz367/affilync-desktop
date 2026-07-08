/** Tiny JSON settings persistence (userData/settings.json). No dependency needed. */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface Settings {
  autoLaunch?: boolean;
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function readSettings(): Settings {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) as Settings;
  } catch {
    return {};
  }
}

export function writeSettings(patch: Partial<Settings>): Settings {
  const merged = { ...readSettings(), ...patch };
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2));
  } catch (err) {
    console.warn('settings write failed:', err);
  }
  return merged;
}
