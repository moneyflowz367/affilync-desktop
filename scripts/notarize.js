/**
 * macOS notarization hook — DISABLED until an Apple Developer ID exists.
 *
 * To enable (see README "Signing runbook"):
 *   1. Set secrets: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID,
 *      CSC_LINK, CSC_KEY_PASSWORD.
 *   2. In electron-builder.yml set mac.hardenedRuntime: true and add
 *      `afterSign: scripts/notarize.js`.
 */

exports.default = async function notarize(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (!process.env.APPLE_ID) {
    console.log('notarize: APPLE_ID not set — skipping (unsigned build)');
    return;
  }
  const { notarize: notarizeApp } = require('@electron/notarize');
  const appName = context.packager.appInfo.productFilename;
  await notarizeApp({
    appPath: `${context.appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
