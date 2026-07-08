/**
 * Main window: a remote shell over https://app.affilync.com.
 *
 * The load-bearing settings:
 * - partition 'persist:affilync' → httpOnly auth cookies survive restarts.
 * - backgroundThrottling: false → the HIDDEN window keeps its softphone SIP
 *   registration + websockets alive, which is the entire point of the app
 *   (native ringing while "closed" to tray).
 * - contextIsolation + sandbox + no nodeIntegration → the remote page only
 *   sees the tiny window.affilyncDesktop bridge.
 */

import { BrowserWindow, app, session, shell } from 'electron';
import * as path from 'path';

import { APP_URL, PARTITION, isAllowedUrl } from './config';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

export function setQuitting(value: boolean): void {
  isQuitting = value;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function showMainWindow(): void {
  const win = mainWindow ?? createMainWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

const RETRY_PAGE = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<meta charset="utf-8"><title>Affilync</title>
<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#0a0e1a;color:#e6e9f2">
<div style="text-align:center">
<h2 style="font-weight:600">Can't reach Affilync</h2>
<p style="color:#8b93a7">Check your internet connection. Retrying automatically…</p>
</div>
<script>setTimeout(()=>location.replace(${JSON.stringify(APP_URL)}), 5000)</script>
</body>`)}`;

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0e1a',
    icon: path.join(__dirname, '..', '..', 'resources', 'icon.png'),
    webPreferences: {
      partition: PARTITION,
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: true,
      additionalArguments: [`--affilync-version=${app.getVersion()}`],
    },
  });

  // Segment desktop traffic server-side without any web-app change.
  const ua = session.fromPartition(PARTITION).getUserAgent();
  mainWindow.webContents.setUserAgent(`${ua} AffilyncDesktop/${app.getVersion()}`);

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  void mainWindow.loadURL(APP_URL);

  // Close → hide to tray; the app (and softphone registration) stays alive.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Navigation guards: stay on *.affilync.com; the rest goes to the browser.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url)) return { action: 'allow' };
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // A remote shell is only as good as its reload story.
  mainWindow.webContents.on('did-fail-load', (_e, code, _desc, validatedUrl, isMainFrame) => {
    // -3 = ERR_ABORTED (in-app navigation races) — not a real failure.
    if (!isMainFrame || code === -3) return;
    if (validatedUrl.startsWith('data:')) return;
    void mainWindow?.loadURL(RETRY_PAGE);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.warn('renderer gone:', details.reason);
    if (details.reason !== 'clean-exit' && mainWindow && !mainWindow.isDestroyed()) {
      void mainWindow.loadURL(APP_URL);
    }
  });

  return mainWindow;
}
