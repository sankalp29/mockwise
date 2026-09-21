import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { AUTH_BYPASS, BYPASS_ACCESS_TOKEN, BYPASS_USER } from './utils/authBypass';
import { logger } from './utils/logger';

const SupabaseAuthContext = createContext({});

const MISSING_SUPABASE_ERROR = new Error(
  'Supabase is not configured. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
);

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

export const SupabaseAuthProvider = ({ children, showToast }) => {
  const [user, setUser] = useState(AUTH_BYPASS ? BYPASS_USER : null);
  const [session, setSession] = useState(AUTH_BYPASS ? { user: BYPASS_USER } : null);
  const [loading, setLoading] = useState(!AUTH_BYPASS);

  useEffect(() => {
    // Testing: skip Supabase auth entirely
    if (AUTH_BYPASS) {
      setUser(BYPASS_USER);
      setSession({ user: BYPASS_USER });
      setLoading(false);
      return undefined;
    }

    // Env missing: allow public pages (home) to render without a blank screen
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return undefined;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('Auth state changed:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Use localStorage so the toast doesn't reappear when opening pages in the same browser session/tabs
      const loginToastKey = 'login_toast_shown_global';
      if (event === 'SIGNED_IN') {
        // Only show once per sign-in across this tab session
        const alreadyShown = (typeof window !== 'undefined') && localStorage.getItem(loginToastKey) === 'true';
        if (!alreadyShown && showToast) {
          showToast('You have logged in successfully', 'success');
          try { localStorage.setItem(loginToastKey, 'true'); } catch {}
        }
      } else if (event === 'SIGNED_OUT') {
        // Reset flag so next successful login can show again
        try { localStorage.removeItem(loginToastKey); } catch {}
        if (showToast) {
          showToast('Logged out', 'danger');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [showToast]);

  // Sign up with email and password
  const signUp = async (email, password, options = {}) => {
    if (AUTH_BYPASS) {
      return { data: { user: BYPASS_USER }, error: null };
    }
    if (!supabase) {
      return { data: null, error: MISSING_SUPABASE_ERROR };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/home`,
          ...options,
        },
      });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      logger.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    if (AUTH_BYPASS) {
      setUser(BYPASS_USER);
      setSession({ user: BYPASS_USER });
      return { data: { user: BYPASS_USER, session: { user: BYPASS_USER } }, error: null };
    }
    if (!supabase) {
      return { data: null, error: MISSING_SUPABASE_ERROR };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (AUTH_BYPASS) {
      setUser(BYPASS_USER);
      setSession({ user: BYPASS_USER });
      return { data: { user: BYPASS_USER }, error: null };
    }
    if (!supabase) {
      return { data: null, error: MISSING_SUPABASE_ERROR };
    }
    try {
      const redirectUri = `${window.location.origin}/home`;
      logger.debug('Google OAuth redirect URI:', redirectUri);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Google sign in error:', error);
      return { data: null, error };
    }
  };

  // Sign out
  const signOut = async () => {
    if (AUTH_BYPASS) {
      logger.warn('[MockWise] signOut ignored while AUTH BYPASS is ON');
      return;
    }
    if (!supabase) {
      return;
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      logger.error('Sign out error:', error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    if (AUTH_BYPASS) {
      return { data: {}, error: null };
    }
    if (!supabase) {
      return { data: null, error: MISSING_SUPABASE_ERROR };
    }
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Reset password error:', error);
      return { data: null, error };
    }
  };

  // Update password
  const updatePassword = async (newPassword) => {
    if (AUTH_BYPASS) {
      return { data: { user: BYPASS_USER }, error: null };
    }
    if (!supabase) {
      return { data: null, error: MISSING_SUPABASE_ERROR };
    }
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Update password error:', error);
      return { data: null, error };
    }
  };

  // Resend verification email
  const resendVerificationEmail = async (email) => {
    if (AUTH_BYPASS) {
      return { data: {}, error: null };
    }
    if (!supabase) {
      return { data: null, error: MISSING_SUPABASE_ERROR };
    }
    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/home`
        }
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Resend verification error:', error);
      return { data: null, error };
    }
  };

  // Stable reference — must not be a new function every render (downstream
  // useCallback/useEffect chains for stub loading depend on this).
  const getAccessToken = useCallback(async () => {
    if (AUTH_BYPASS) {
      return BYPASS_ACCESS_TOKEN;
    }
    if (!supabase) return null;

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return currentSession?.access_token || null;
    } catch (error) {
      logger.error('Get access token error:', error);
      return null;
    }
  }, []);

  const loginManually = useCallback(async () => {
    if (AUTH_BYPASS) {
      setUser(BYPASS_USER);
      setSession({ user: BYPASS_USER });
      return;
    }
    if (!supabase) {
      setUser(null);
      setSession(null);
      return;
    }
    const { data: { session: next } } = await supabase.auth.getSession();
    setSession(next);
    setUser(next?.user ?? null);
  }, []);

  const clearAuthError = useCallback(() => {}, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    resendVerificationEmail,
    updatePassword,
    getAccessToken,
    // Compatibility with existing auth context
    userLoggedIn: !!user,
    isAuthLoading: loading,
    authBypass: AUTH_BYPASS,
    supabaseConfigured: isSupabaseConfigured,
    authError: null,
    clearAuthError,
    loginManually,
    logout: signOut,
  }), [
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    resendVerificationEmail,
    updatePassword,
    getAccessToken,
    clearAuthError,
    loginManually,
  ]);

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export { SupabaseAuthContext };
