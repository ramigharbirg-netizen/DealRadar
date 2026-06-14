import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

const mapSupabaseUser = async (supabaseUser) => {
  if (!supabaseUser) return null;

  const metadata = supabaseUser.user_metadata || {};
  const appMetadata = supabaseUser.app_metadata || {};

  const mappedUser = {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name:
      metadata.name ||
      metadata.full_name ||
      metadata.display_name ||
      supabaseUser.email,
    avatar_url: metadata.avatar_url || metadata.picture || null,
    provider: appMetadata.provider || null,
    created_at: supabaseUser.created_at,
    email_confirmed_at: supabaseUser.email_confirmed_at || null,
  };

  try {
    localStorage.setItem('user', JSON.stringify(mappedUser));
  } catch (err) {
    console.error('Error saving mapped user:', err);
  }

  return mappedUser;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearLocalAuth = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  const applySession = useCallback(
    async (nextSession) => {
      if (nextSession?.user) {
        const mapped = await mapSupabaseUser(nextSession.user);

        setSession(nextSession);
        setUser(mapped);

        if (nextSession.access_token) {
          localStorage.setItem('token', nextSession.access_token);
        } else {
          localStorage.removeItem('token');
        }

        return mapped;
      }

      setSession(null);
      setUser(null);
      clearLocalAuth();

      return null;
    },
    [clearLocalAuth]
  );

  const refreshSession = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      return await applySession(currentSession);
    } catch (err) {
      console.error('Refresh session error:', err);
      await applySession(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      await applySession(null);
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      setLoading(true);

      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (!mounted) return;

        await applySession(currentSession);
      } catch (err) {
        console.error('Auth bootstrap error:', err);

        if (!mounted) return;

        await applySession(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION'
      ) {
        await applySession(nextSession);
      }

      if (event === 'SIGNED_OUT') {
        await applySession(null);
      }

      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const login = useCallback(
    async (email, password) => {
      setLoading(true);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const mapped = await applySession(data.session);

        return mapped;
      } finally {
        setLoading(false);
      }
    },
    [applySession]
  );

  const register = useCallback(
    async (name, email, password) => {
      setLoading(true);

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });

        if (error) throw error;

        const mapped = await applySession(data.session);

        return mapped;
      } finally {
        setLoading(false);
      }
    },
    [applySession]
  );

  const updateUser = useCallback(
    async (updates) => {
      if (!user) return null;

      setLoading(true);

      try {
        const { data, error } = await supabase.auth.updateUser({
          data: {
            name: updates.name ?? user.name,
          },
        });

        if (error) throw error;

        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession?.user) {
          return await applySession(currentSession);
        }

        const mapped = await mapSupabaseUser(data.user);
        setUser(mapped);
        return mapped;
      } finally {
        setLoading(false);
      }
    },
    [user, applySession]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        register,
        logout,
        updateUser,
        refreshSession,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;