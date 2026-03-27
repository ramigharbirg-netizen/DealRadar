import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, Newspaper, MessageCircle, User, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Layout = ({ children }) => {
  const location = useLocation();
  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    const loadChatCount = async () => {
      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      setChatCount(count || 0);
    };

    loadChatCount();
  }, [location.pathname]);

  const hideNav =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/submit';

  return (
    <div className="min-h-screen bg-background" data-testid="app-layout">
      <main className={hideNav ? 'h-screen' : 'pb-20'}>
        {children}
      </main>

      {!hideNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-gray-200 flex items-center justify-around z-50"
          data-testid="bottom-navigation"
        >
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`
            }
          >
            <Map className="w-5 h-5" />
            <span className="text-xs font-medium">Map</span>
          </NavLink>

          <NavLink
            to="/feed"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`
            }
          >
            <Newspaper className="w-5 h-5" />
            <span className="text-xs font-medium">Feed</span>
          </NavLink>

          <NavLink
            to="/submit"
            className="relative -mt-5 flex items-center justify-center"
          >
            <div className="h-14 w-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center border-4 border-white">
              <Plus className="w-6 h-6" />
            </div>
          </NavLink>

          <NavLink
            to="/chats"
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`
            }
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {chatCount > 0 && (
                <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {chatCount > 99 ? '99+' : chatCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">Chat</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`
            }
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Profile</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
};

export default Layout;