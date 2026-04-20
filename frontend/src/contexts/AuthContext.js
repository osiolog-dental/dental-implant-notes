import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { toast } from 'sonner';
import { auth, googleProvider } from '../lib/firebase';
import client from '../api/client';
import { registerForNotifications, unregisterNotifications } from '../lib/notifications';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // user = null  → still loading
  // user = false → not logged in
  // user = { _needsRegistration: true, firebaseUser } → Firebase account exists, DB row missing
  // user = { id, name, email, ... } → fully registered and logged in
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(false);
        setLoading(false);
        return;
      }
      // Firebase says a user is signed in — hold ProtectedRoute in the loading
      // state until we have resolved the DB-backed profile. Without this,
      // ProtectedRoute sees (loading=false, user=false) during the async /me
      // fetch and bounces the browser back to /login mid-sign-in.
      setLoading(true);
      try {
        // Force-refresh the ID token so the backend always sees a fresh one,
        // even right after a sign-in when Firebase hasn't cached one yet.
        await firebaseUser.getIdToken(true);
        const { data } = await client.get('/api/auth/me');
        setUser(data);
        // Register for push notifications after profile is loaded — non-blocking
        registerForNotifications();
      } catch (err) {
        if (err.response?.status === 404) {
          // Firebase account exists but not yet in our DB (e.g. first Google sign-in)
          setUser({ _needsRegistration: true, firebaseUser });
        } else if (err.response) {
          // Real HTTP error from our API — sign out so Firebase and our DB stay in sync.
          await signOut(auth).catch(() => {});
          setUser(false);
          toast.error(err.response.data?.detail || 'Sign-in failed. Please try again.');
        } else {
          // No response = network error. On Android the usual culprit is the
          // backend URL (emulator can't reach Mac's localhost). Sign out so the
          // user can retry cleanly instead of being left half-authenticated.
          await signOut(auth).catch(() => {});
          setUser(false);
          toast.error('Cannot reach the server. Check that the backend is running.');
        }
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    // Keep loading true through the whole handoff: signInWithEmailAndPassword →
    // onAuthStateChanged → /api/auth/me. Login.js calls navigate('/') as soon
    // as this resolves, so if loading flips to false before /me returns,
    // ProtectedRoute briefly sees user=false and redirects back to /login.
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Don't set loading=false here — onAuthStateChanged will do it once the
      // DB profile is loaded.
      return { success: true };
    } catch (err) {
      setLoading(false);
      return { success: false, error: _friendlyError(err) };
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      return { success: true };
    } catch (err) {
      setLoading(false);
      return { success: false, error: _friendlyError(err) };
    }
  };

  const register = async (userData) => {
    try {
      const { user: fbUser } = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      const token = await fbUser.getIdToken();
      const { data } = await client.post(
        '/api/auth/register',
        {
          name: userData.name,
          email: userData.email,
          phone: userData.phone || null,
          country: userData.country || null,
          registration_number: userData.registration_number || null,
          college: userData.college || null,
          college_place: userData.college_place || null,
          specialization: userData.specialization || null,
          place: userData.address_city || userData.place || null,
          bio: userData.bio || null,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setUser(data);
      // Send welcome/verification email — non-blocking, don't fail registration if this errors
      sendEmailVerification(fbUser).catch(() => {});
      return { success: true };
    } catch (err) {
      if (auth.currentUser) await signOut(auth).catch(() => {});
      return {
        success: false,
        error: err.response?.data?.detail || _friendlyError(err),
      };
    }
  };

  const completeGoogleRegistration = async (profileData) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const { data } = await client.post(
        '/api/auth/register',
        { ...profileData, email: auth.currentUser.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(data);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || _friendlyError(err),
      };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err) {
      return { success: false, error: _friendlyError(err) };
    }
  };

  const logout = async () => {
    await unregisterNotifications();
    await signOut(auth);
    setUser(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithGoogle, register, completeGoogleRegistration, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

function _friendlyError(err) {
  const code = err?.code || '';
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || err?.message || 'Something went wrong. Please try again.';
}
