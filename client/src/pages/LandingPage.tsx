import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RomanticOrbitCanvas } from '../components/3d/RomanticOrbitCanvas';
import { useAuthStore } from '../stores/authStore';
import {
  Heart,
  Palette,
  Gamepad2,
  Calendar,
  Image as ImageIcon,
  Bookmark,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 selection:bg-romantic-500 selection:text-white flex flex-col">
      {/* Navigation Header */}
      <header className="px-6 py-4 border-b border-white/5 glass-panel sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-romantic-600 to-lavender-500 flex items-center justify-center shadow-glow">
              <Heart className="w-5 h-5 text-white fill-white/80" />
            </div>
            <span className="font-serif text-xl font-bold bg-gradient-to-r from-rose-200 via-pink-100 to-purple-200 bg-clip-text text-transparent">
              UsTwo
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-romantic px-4 py-2 text-xs font-semibold">
                Open Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1.5 inline" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary px-4 py-2 text-xs font-semibold">
                  Sign In
                </Link>
                <Link to="/register" className="btn-romantic px-4 py-2 text-xs font-semibold">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with 3D Orbit */}
      <section className="relative pt-12 pb-20 px-6 overflow-hidden flex-1 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-romantic-300 mb-6 backdrop-blur-md">
            <SparkleIcon /> Designed Exclusively For Exactly Two Connected People
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight mb-6">
            A Private Realtime Sanctuary <br />
            <span className="bg-gradient-to-r from-rose-300 via-pink-200 to-purple-300 bg-clip-text text-transparent">
              Just For You Two.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Realtime collaborative canvas, intimate couple games, shared calendar milestones, and timeless memories.
            No public feeds. No algorithms. Just your private world.
          </p>

          {/* Interactive 3D Orbit Scene */}
          <div className="my-2">
            <RomanticOrbitCanvas className="h-56 sm:h-72 w-full max-w-md mx-auto" />
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <Link to="/register" className="btn-romantic px-8 py-3 text-sm font-semibold w-full sm:w-auto">
              Create Your Space Together
            </Link>
            <Link to="/login" className="btn-secondary px-8 py-3 text-sm font-semibold w-full sm:w-auto">
              I Have An Account
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-16 px-6 border-t border-white/5 bg-space-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-2">
              Everything A Couple Needs To Stay Close
            </h2>
            <p className="text-xs text-slate-400">Handcrafted realtime tools for meaningful connection</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-white mb-2">Live Shared Drawing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Draw hearts, write notes, and doodle together live. Watch each stroke appear with ultra-low latency.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-white mb-2">Realtime XO & Bingo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Playful couple games with server-authoritative turns, score tracking, and celebratory confetti.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-white mb-2">Milestones & Calendar</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Keep track of anniversaries, upcoming date nights, and special memories with countdown banners.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-white mb-2">Timeless Memories</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A shared digital scrapbook of your favorite trips, midnight talks, and milestones.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Bookmark className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-white mb-2">Shared Bookmarks</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Save restaurants to try, dream vacation spots, and funny clips organized into clean categories.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-white mb-2">Private & Cryptographically Isolated</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict server authorization. Exactly 2 members per couple. Zero cross-couple data leakage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-white/5 text-center text-xs text-slate-500">
        <p>UsTwo &copy; 2026 — Crafted with romantic elegance & realtime precision.</p>
      </footer>
    </div>
  );
};

function SparkleIcon() {
  return <span className="text-rose-400">✦</span>;
}
