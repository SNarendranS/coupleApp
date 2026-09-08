import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { NotificationDropdown } from './NotificationDropdown';
import {
  Heart,
  Palette,
  Gamepad2,
  Calendar,
  Image as ImageIcon,
  Bookmark,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, partner, couple, logout } = useAuthStore();
  const { isPartnerOnline, partnerActivity } = usePresenceStore();
  const { unreadCount, toggleOpen } = useNotificationStore();

  const navLinks = [
    { to: '/dashboard', label: 'Home', icon: Heart },
    { to: '/drawing', label: 'Canvas', icon: Palette },
    { to: '/games', label: 'Games', icon: Gamepad2 },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/memories', label: 'Memories', icon: ImageIcon },
    { to: '/links', label: 'Bookmarks', icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-romantic-600 to-lavender-500 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 text-white fill-white/80" />
          </div>
          <div>
            <span className="font-serif text-lg font-semibold tracking-wide bg-gradient-to-r from-rose-200 via-pink-100 to-purple-200 bg-clip-text text-transparent">
              UsTwo
            </span>
          </div>
        </Link>

        {/* Center: Couple Avatar Connection Visualizer */}
        {partner && couple && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            {/* User Avatar */}
            <div className="relative flex items-center">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={user?.displayName}
                className="w-7 h-7 rounded-full object-cover border border-rose-400"
              />
            </div>

            {/* Glowing Connection Bridge */}
            <div className="flex items-center gap-1 px-1">
              <span className="h-[2px] w-3 bg-gradient-to-r from-rose-500 to-purple-500 animate-pulse" />
              <Heart className="w-3.5 h-3.5 text-romantic-500 fill-romantic-500 animate-pulse-slow" />
              <span className="h-[2px] w-3 bg-gradient-to-r from-purple-500 to-rose-500 animate-pulse" />
            </div>

            {/* Partner Avatar + Online Indicator */}
            <div className="relative flex items-center">
              <img
                src={partner?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                alt={partner?.displayName}
                className="w-7 h-7 rounded-full object-cover border border-purple-400"
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-space-900 ${
                  isPartnerOnline ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
                title={isPartnerOnline ? 'Partner is online' : 'Partner is offline'}
              />
            </div>

            <div className="text-[11px] font-medium text-slate-300 pl-1 pr-2">
              <span>{partner.displayName}</span>
              {isPartnerOnline ? (
                <span className="text-emerald-400 ml-1.5 font-normal">
                  {partnerActivity ? `· ${partnerActivity}` : '· Online'}
                </span>
              ) : (
                <span className="text-slate-500 ml-1.5 font-normal">· Offline</span>
              )}
            </div>
          </div>
        )}

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-romantic-400' : ''}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Notifications, Settings, Logout */}
        <div className="flex items-center gap-2 relative">
          {/* Notification Button */}
          <button
            onClick={toggleOpen}
            className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-romantic-500 ring-2 ring-space-950 animate-pulse" />
            )}
          </button>

          <NotificationDropdown />

          {/* Settings Link */}
          <Link
            to="/settings"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          {/* Logout Button */}
          <button
            onClick={() => logout()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors border border-white/10"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
