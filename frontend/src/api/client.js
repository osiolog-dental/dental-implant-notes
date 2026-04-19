import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { auth } from '../lib/firebase';

/**
 * Returns the correct API base URL for the current platform.
 *
 * Android emulator → http://10.0.2.2:PORT  (emulator's alias for host Mac)
 * iOS simulator    → http://localhost:PORT  (simulator shares Mac network)
 * Web              → env var or http://localhost:PORT
 * Production       → REACT_APP_BACKEND_URL (real HTTPS server)
 */
function resolveApiUrl() {
  const configured = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8002';
  // If it's a real server URL (not localhost), use it on all platforms as-is.
  const isLocalhost = /localhost|127\.0\.0\.1/.test(configured);
  if (!isLocalhost) return configured;

  // Detect Android — try Capacitor first, fall back to userAgent
  const isAndroid =
    (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() && Capacitor.getPlatform?.() === 'android') ||
    /android/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');

  if (isAndroid) {
    // 10.0.2.2 is the Android emulator's special alias for the host machine's
    // loopback. It is the canonical, no-config-needed approach endorsed by
    // the Android and Capacitor communities.
    return configured.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
  }

  // iOS simulator and web can reach localhost directly
  return configured;
}

const client = axios.create({
  baseURL: resolveApiUrl(),
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase ID token to every request automatically
client.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, try refreshing the token once then retry
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && auth.currentUser) {
      original._retry = true;
      try {
        const token = await auth.currentUser.getIdToken(true);
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      } catch {
        // token refresh failed — AuthContext will sign out
      }
    }
    return Promise.reject(err);
  }
);

export default client;
