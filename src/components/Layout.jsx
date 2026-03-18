import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, Newspaper, Target, Heart, User } from 'lucide-react';

const navItems = [
  { path: '/', icon: Map, label: 'Map' },
  { path: '/feed', icon: Newspaper, label: 'Feed' },
  { path: '/bounties', icon: Target, label: 'Bounties' },
  { path: '/favorites', icon: Heart, label: 'Saved' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const Layout = ({ children }) => {
  const location = useLocation();
  
  // Hide bottom nav on auth pages and bounty creation
  const hideNav = location.pathname === '/login' || 
                  location.pathname === '/register' ||
                  location.pathname === '/bounties/create' ||
                  location.pathname === '/submit';

  return (
    <div className="min-h-screen bg-background" data-testid="app-layout">
      {/* Main Content */}
      <main className={hideNav ? 'h-screen' : 'pb-16'}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNav && (
        <nav 
          className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-gray-200 flex items-center justify-around z-50 safe-area-pb"
          data-testid="bottom-navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path === '/bounties' && location.pathname.startsWith('/bounties'));
            const isBounty = item.path === '/bounties';
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors touch-feedback ${
                  isActive 
                    ? isBounty ? 'text-amber-500' : 'text-primary' 
                    : 'text-gray-400'
                }`}
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
