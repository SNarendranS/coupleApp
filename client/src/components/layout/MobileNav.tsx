import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Heart,
  Palette,
  Gamepad2,
  Calendar,
  Image as ImageIcon,
  Bookmark,
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const location = useLocation();

  const links = [
    { to: '/dashboard', label: 'Home', icon: Heart },
    { to: '/drawing', label: 'Canvas', icon: Palette },
    { to: '/games', label: 'Games', icon: Gamepad2 },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/memories', label: 'Moments', icon: ImageIcon },
    { to: '/links', label: 'Links', icon: Bookmark },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e17]/95 backdrop-blur-xl border-t border-white/10 px-2 pt-2 pb-3 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.5)]">
      <nav className="flex items-center justify-around max-w-md mx-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-romantic-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
