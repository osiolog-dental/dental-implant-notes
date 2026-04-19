importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Config is injected at build time via workbox/CRA's service worker mechanism.
// These values are safe to be public — they identify the Firebase project but
// do not grant any privileged access.
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || '%REACT_APP_FIREBASE_API_KEY%',
  authDomain: self.FIREBASE_AUTH_DOMAIN || '%REACT_APP_FIREBASE_AUTH_DOMAIN%',
  projectId: self.FIREBASE_PROJECT_ID || '%REACT_APP_FIREBASE_PROJECT_ID%',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || '%REACT_APP_FIREBASE_STORAGE_BUCKET%',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '%REACT_APP_FIREBASE_MESSAGING_SENDER_ID%',
  appId: self.FIREBASE_APP_ID || '%REACT_APP_FIREBASE_APP_ID%',
});

const messaging = firebase.messaging();

// Handle background messages (app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  if (!title) return;

  self.registration.showNotification(title, {
    body: body || '',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: payload.data || {},
  });
});
