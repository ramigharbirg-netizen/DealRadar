import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  const mappedUser = {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: metadata.name || metadata.full_name || supabaseUser.email,
  };

  try {
    localStorage.setItem('user', JSON.stringify(mappedUser));
  } catch (e) {
    console.error('Error saving mapped user:', e);
  }

  return mappedUser;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearLocalAuth = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearLocalAuth();
      setUser(null);
    }
  }, [clearLocalAuth]);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.user) {
          const mapped = await mapSupabaseUser(session.user);

          if (!mounted) return;

          setUser(mapped);

          if (session.access_token) {
            localStorage.setItem('token', session.access_token);
          } else {
            localStorage.removeItem('token');
          }
        } else {
          if (!mounted) return;

          setUser(null);
          clearLocalAuth();
        }
      } catch (err) {
        console.error('Auth bootstrap error:', err);

        if (!mounted) return;

        setUser(null);
        clearLocalAuth();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const mapped = await mapSupabaseUser(session.user);

        if (!mounted) return;

        setUser(mapped);

        if (session.access_token) {
          localStorage.setItem('token', session.access_token);
        } else {
          localStorage.removeItem('token');
        }
      } else {
        setUser(null);
        clearLocalAuth();
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearLocalAuth]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    const mapped = await mapSupabaseUser(data.user);

    if (data.session?.access_token) {
      localStorage.setItem('token', data.session.access_token);
    } else {
      localStorage.removeItem('token');
    }

    setUser(mapped);
    return mapped;
  };

  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      throw error;
    }

    const mapped = await mapSupabaseUser(data.user);

    if (data.session?.access_token) {
      localStorage.setItem('token', data.session.access_token);
    } else {
      localStorage.removeItem('token');
    }

    setUser(mapped);
    return mapped;
  };

  const updateUser = async (updates) => {
    if (!user) return null;

    const { data, error } = await supabase.auth.updateUser({
      data: {
        name: updates.name ?? user.name,
      },
    });

    if (error) {
      throw error;
    }

    const mapped = await mapSupabaseUser(data.user);
    setUser(mapped);
    return mapped;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;