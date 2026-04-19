/**
 * Post-build script: replaces %REACT_APP_*% placeholders in the Firebase
 * service worker with actual env var values so FCM works in production.
 * CRA does not process public/ files through webpack, so we do it manually.
 */
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'build', 'firebase-messaging-sw.js');

if (!fs.existsSync(swPath)) {
  console.warn('[inject-sw-env] firebase-messaging-sw.js not found in build/ — skipping');
  process.exit(0);
}

const replacements = {
  '%REACT_APP_FIREBASE_API_KEY%': process.env.REACT_APP_FIREBASE_API_KEY || '',
  '%REACT_APP_FIREBASE_AUTH_DOMAIN%': process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  '%REACT_APP_FIREBASE_PROJECT_ID%': process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  '%REACT_APP_FIREBASE_STORAGE_BUCKET%': process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  '%REACT_APP_FIREBASE_MESSAGING_SENDER_ID%': process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  '%REACT_APP_FIREBASE_APP_ID%': process.env.REACT_APP_FIREBASE_APP_ID || '',
};

let content = fs.readFileSync(swPath, 'utf8');
for (const [placeholder, value] of Object.entries(replacements)) {
  content = content.replaceAll(placeholder, value);
}
fs.writeFileSync(swPath, content);
console.log('[inject-sw-env] Firebase service worker env vars injected.');
