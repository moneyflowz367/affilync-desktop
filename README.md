# Affilync Desktop

Electron desktop app for the Affilync platform — built for **call-center agents** who need an
always-available softphone, and anyone who wants the brand dashboard as a native app.

The app is a **remote shell**: it loads https://app.affilync.com in a hardened Electron window and adds
what a browser tab can't do:

- **Ring while "closed"** — closing the window hides the app to the system tray; the softphone stays
  registered and incoming calls fire native OS notifications + taskbar flash + ringtone.
- **Tray presence** — live agent status (Available / Ringing / On a call / Away / Offline).
- **Keep-awake during calls**, wake-recovery after sleep (auto re-registers the softphone).
- **Start on login**, `affilync://` deep links, auto-updates from GitHub Releases.

No renderer code lives in this repo. Web deploys of app.affilync.com update the app content instantly;
this shell only changes when native behavior changes.

## Install

Download the latest release from [Releases](https://github.com/affilync/affilync-desktop/releases):

| Platform | File | Notes |
|---|---|---|
| Windows | `Affilync-Setup-*.exe` | Per-user install, no admin needed. Unsigned for now → SmartScreen shows "unknown publisher"; click *More info → Run anyway*. |
| macOS | `Affilync-*.dmg` | **Unsigned**: Gatekeeper blocks it. Right-click → Open, or `xattr -dr com.apple.quarantine /Applications/Affilync.app`. Auto-update does not work on unsigned macOS builds — reinstall manually. |
| Linux | `Affilync-*.AppImage` / `.deb` | GNOME needs the AppIndicator extension for the tray icon; without a tray, closing the window quits instead of hiding. |

## Development

```bash
npm ci
npm start          # tsc build + launch Electron against https://app.affilync.com
npm run typecheck  # strict TS check (main + preload)
npm run dist:dir   # unpackaged build in release/ for local testing
```

Point the shell at a different environment with `AFFILYNC_APP_URL=https://staging.affilync.com npm start`.

## Release

1. Bump `version` in `package.json`, commit.
2. `git tag v<version> && git push origin v<version>`.
3. GitHub Actions builds Windows/macOS/Linux and uploads to a **draft** release.
4. Publish the release — running apps auto-update (Windows/Linux) within 4 hours or on next launch.

`workflow_dispatch` runs a dry build (artifacts only, no release).

## Signing runbook (operator follow-ups)

**Windows (removes SmartScreen warning):** buy an OV/EV code-signing cert or use Azure Trusted Signing;
set repo secrets `WIN_CSC_LINK` (base64 pfx) + `WIN_CSC_KEY_PASSWORD` — electron-builder picks them up.

**macOS (required for normal install + auto-update):** join the Apple Developer Program, create a
Developer ID Application cert. Set secrets `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`; in `electron-builder.yml` set
`mac.hardenedRuntime: true` and add `afterSign: scripts/notarize.js`.

## Notes

- Expected memory footprint is that of a Chromium tab (~300–500 MB). The page is deliberately never
  unloaded while hidden — that would kill the softphone registration, which is the app's reason to exist.
- Sessions persist in the `persist:affilync` partition. On shared machines, log out before handing off.
- The web app integrates via the `window.affilyncDesktop` bridge (see `src/preload/index.ts` for the
  contract; the consuming code is `affilync-web/src/utils/desktopBridge.ts` + `Softphone.tsx`).
