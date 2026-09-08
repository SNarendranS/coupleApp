import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { RomanticOrbitCanvas } from '../components/3d/RomanticOrbitCanvas';
import { Heart } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden bg-space-950">
      {/* Background 3D Orbit */}
      <RomanticOrbitCanvas className="absolute inset-0 h-full w-full opacity-30" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-2 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-romantic-600 to-lavender-500 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Heart className="w-6 h-6 text-white fill-white/80" />
            </div>
            <h1 className="font-serif text-2xl font-bold bg-gradient-to-r from-rose-200 via-pink-100 to-purple-200 bg-clip-text text-transparent">
              UsTwo
            </h1>
          </Link>
          <p className="text-xs text-slate-400 font-medium">A private realtime sanctuary for two</p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
