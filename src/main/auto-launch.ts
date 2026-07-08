/**
 * Start-on-login. Windows/macOS use the native login-item API; Linux writes a
 * freedesktop autostart entry (no extra dependency needed).
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { readSettings, writeSettings } from './store';

const LINUX_AUTOSTART_DIR = path.join(os.homedir(), '.config', 'autostart');
const LINUX_DESKTOP_FILE = path.join(LINUX_AUTOSTART_DIR, 'affilync.desktop');

export function getAutoLaunch(): boolean {
  if (process.platform === 'linux') {
    return readSettings().autoLaunch ?? fs.existsSync(LINUX_DESKTOP_FILE);
  }
  return app.getLoginItemSettings().openAtLogin;
}

export function setAutoLaunch(enabled: boolean): void {
  writeSettings({ autoLaunch: enabled });
  if (process.platform === 'linux') {
    try {
      if (enabled) {
        fs.mkdirSync(LINUX_AUTOSTART_DIR, { recursive: true });
        fs.writeFileSync(
          LINUX_DESKTOP_FILE,
          [
            '[Desktop Entry]',
            'Type=Application',
            'Name=Affilync',
            `Exec=${process.execPath}`,
            'X-GNOME-Autostart-enabled=true',
            '',
          ].join('\n')
        );
      } else if (fs.existsSync(LINUX_DESKTOP_FILE)) {
        fs.unlinkSync(LINUX_DESKTOP_FILE);
      }
    } catch (err) {
      console.warn('linux autostart update failed:', err);
    }
    return;
  }
  app.setLoginItemSettings({ openAtLogin: enabled });
}
