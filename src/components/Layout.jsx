import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, Newspaper, Target, Heart, User, Plus } from 'lucide-react';

const navItems = [
  { path: '/', icon: Map, label: 'Map' },
  { path: '/feed', icon: Newspaper, label: 'Feed' },
  { path: '/submit', icon: Plus, label: 'Aggiungi', isCenter: true },
  { path: '/bounties', icon: Target, label: 'Bounties' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const Layout = ({ children }) => {
  const location = useLocation();

  const hideNav =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/bounties/create' ||
    location.pathname === '/submit';

  return (
    <div className="min-h-screen bg-background" data-testid="app-layout">
      <main className={hideNav ? 'h-screen' : 'pb-20'}>
        {children}
      </main>

      {!hideNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-gray-200 flex items-center justify-around z-50 safe-area-pb"
          data-testid="bottom-navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/bounties' && location.pathname.startsWith('/bounties'));

            if (item.isCenter) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center w-full h-full -mt-6"
                  data-testid="nav-aggiungi"
                >
                  <div className="w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center border-4 border-white transition-transform hover:scale-105">
                    <Icon className="w-7 h-7" strokeWidth={2.5} />
                  </div>
                  <span className="text-[11px] font-semibold text-primary mt-1">
                    Aggiungi
                  </span>
                </NavLink>
              );
            }

            const activeClass =
              item.path === '/bounties'
                ? isActive
                  ? 'text-amber-500'
                  : 'text-gray-400'
                : isActive
                ? 'text-primary'
                : 'text-gray-400';

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors touch-feedback ${activeClass}`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon
                  className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : ''}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default Layout;
