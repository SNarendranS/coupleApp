import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usePresenceStore } from '../stores/presenceStore';
import { api } from '../services/api';
import { CanvasPreview } from '../components/drawing/CanvasPreview';
import {
  Heart,
  Palette,
  Gamepad2,
  Calendar,
  Image as ImageIcon,
  Bookmark,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Flame,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, partner, couple } = useAuthStore();
  const { isPartnerOnline, partnerActivity } = usePresenceStore();

  const [coupleDetails, setCoupleDetails] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentMemories, setRecentMemories] = useState<any[]>([]);
  const [recentLinks, setRecentLinks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [boardStrokes, setBoardStrokes] = useState<any[]>([]);
  const [boardBg, setBoardBg] = useState<'#ffffff' | '#121214'>('#ffffff');

  useEffect(() => {
    const fetchDashboardData = async () => {
      const [coupleRes, eventsRes, memoriesRes, linksRes, activityRes, boardRes] =
        await Promise.all([
          api.get('/couple'),
          api.get('/calendar'),
          api.get('/memories'),
          api.get('/links'),
          api.get('/activity'),
          api.get('/drawing'),
        ]);

      if (coupleRes.success) setCoupleDetails(coupleRes.data);
      if (eventsRes.success) setUpcomingEvents(eventsRes.data.slice(0, 3));
      if (memoriesRes.success) setRecentMemories(memoriesRes.data.slice(0, 2));
      if (linksRes.success) setRecentLinks(linksRes.data.slice(0, 3));
      if (activityRes.success) setActivities(activityRes.data.slice(0, 5));
      if (boardRes.success && boardRes.data) {
        setBoardStrokes(boardRes.data.strokes || []);
        setBoardBg(boardRes.data.backgroundColor || '#ffffff');
      }
    };

    fetchDashboardData();
  }, []);

  const daysTogether = coupleDetails?.daysTogether || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Welcome & Presence Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-romantic-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
              <Sparkles className="w-3.5 h-3.5" /> Private Couple Sanctuary
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
              {couple?.name || `${user?.displayName} & ${partner?.displayName}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {daysTogether > 0 ? (
                <>Together for <strong className="text-white">{daysTogether} days</strong> of shared laughter, love, and memories.</>
              ) : (
                <>Welcome to day one of your shared digital space together.</>
              )}
            </p>
          </div>

          {/* Partner Status Pill */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0">
            <div className="relative">
              <img
                src={partner?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                alt={partner?.displayName}
                className="w-12 h-12 rounded-full object-cover border border-purple-400"
              />
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-space-950 ${
                  isPartnerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                }`}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{partner?.displayName}</p>
              <p className="text-[11px] text-slate-300">
                {isPartnerOnline ? (
                  <span className="text-emerald-400 font-medium">
                    {partnerActivity ? partnerActivity : 'Active now'}
                  </span>
                ) : (
                  <span className="text-slate-400">Offline</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* ❤️ 1. Couple Days & Anniversaries Card */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-romantic-500/20 text-romantic-400 flex items-center justify-center">
                <Flame className="w-5 h-5 text-rose-400" />
              </div>
              <span className="text-xs font-semibold text-slate-400">Love Meter</span>
            </div>
            <h2 className="font-serif text-lg font-bold text-white mb-1">Our Journey</h2>
            <div className="my-4">
              <span className="text-4xl sm:text-5xl font-serif font-extrabold text-white">
                {daysTogether}
              </span>
              <span className="text-xs text-slate-400 ml-2">days together</span>
            </div>
            <p className="text-xs text-slate-400">
              Relationship started:{' '}
              <strong className="text-slate-200">
                {couple?.relationshipStartDate
                  ? new Date(couple.relationshipStartDate).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Just begun'}
              </strong>
            </p>
          </div>
          <Link
            to="/settings"
            className="mt-4 text-xs text-romantic-400 hover:text-romantic-300 font-medium flex items-center gap-1"
          >
            Update anniversary in settings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 🎨 2. Shared Drawing Card with Live Preview */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Palette className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Realtime
              </span>
            </div>
            <h2 className="font-serif text-lg font-bold text-white mb-1">Shared Canvas</h2>
            <p className="text-xs text-slate-400 mb-3">
              Live preview of your shared drawing board. Tap anywhere on the canvas to draw together.
            </p>
            <CanvasPreview
              strokes={boardStrokes}
              backgroundColor={boardBg}
              className="h-44 sm:h-48"
            />
          </div>
        </div>

        {/* 🎮 3. Games Card (XO & Bingo) */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">2-Player</span>
            </div>
            <h2 className="font-serif text-lg font-bold text-white mb-1">Couple Games</h2>
            <p className="text-xs text-slate-400 mb-4">
              Challenge {partner?.displayName} in realtime Tic-Tac-Toe or Romantic Couple Bingo.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/games"
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-colors"
              >
                <span className="text-lg font-bold text-rose-400 block">XO</span>
                <span className="text-[10px] text-slate-400">Tic-Tac-Toe</span>
              </Link>
              <Link
                to="/games"
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-colors"
              >
                <span className="text-lg font-bold text-purple-400 block">Bingo</span>
                <span className="text-[10px] text-slate-400">5x5 Boards</span>
              </Link>
            </div>
          </div>
          <Link
            to="/games"
            className="btn-secondary w-full py-2.5 text-xs font-semibold mt-4 text-center"
          >
            Play Now
          </Link>
        </div>

        {/* 📅 4. Shared Calendar Milestones */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <Link to="/calendar" className="text-xs text-romantic-400 hover:text-romantic-300 font-medium">
                View all
              </Link>
            </div>
            <h2 className="font-serif text-lg font-bold text-white mb-2">Upcoming Moments</h2>
            <div className="space-y-2.5">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">No upcoming plans yet. Plan a date!</p>
              ) : (
                upcomingEvents.map((evt) => (
                  <div key={evt.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">{evt.title}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {evt.date} {evt.startTime && `· ${evt.startTime}`}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300">
                      {evt.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <Link to="/calendar" className="mt-4 text-xs text-slate-300 hover:text-white flex items-center gap-1">
            Open couple calendar <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 🧠 5. Recent Memories */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <Link to="/memories" className="text-xs text-romantic-400 hover:text-romantic-300 font-medium">
                View story
              </Link>
            </div>
            <h2 className="font-serif text-lg font-bold text-white mb-2">Favorite Memories</h2>
            {recentMemories.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">Your scrapbook is ready for its first photo.</p>
            ) : (
              <div className="space-y-2">
                {recentMemories.map((mem) => (
                  <div key={mem.id} className="flex gap-3 items-center p-2 rounded-xl bg-white/5 border border-white/5">
                    {mem.imageUrls?.[0] && (
                      <img
                        src={mem.imageUrls[0]}
                        alt={mem.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{mem.title}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> {mem.date}
                        {mem.location && (
                          <>
                            · <MapPin className="w-2.5 h-2.5" /> {mem.location}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link to="/memories" className="mt-4 text-xs text-slate-300 hover:text-white flex items-center gap-1">
            Open memories gallery <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 🔗 6. Shared Bookmarks & Links */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Bookmark className="w-5 h-5" />
              </div>
              <Link to="/links" className="text-xs text-romantic-400 hover:text-romantic-300 font-medium">
                View all
              </Link>
            </div>
            <h2 className="font-serif text-lg font-bold text-white mb-2">Saved Links</h2>
            <div className="space-y-2">
              {recentLinks.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">Save recipes, travel ideas, and music to share.</p>
              ) : (
                recentLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center gap-2.5 transition-colors block"
                  >
                    {link.thumbnail ? (
                      <img src={link.thumbnail} alt="" className="w-6 h-6 rounded-md object-cover" />
                    ) : (
                      <Bookmark className="w-4 h-4 text-slate-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{link.title}</p>
                      <span className="text-[9px] uppercase font-bold text-slate-500">{link.category}</span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
          <Link to="/links" className="mt-4 text-xs text-slate-300 hover:text-white flex items-center gap-1">
            Explore all saved bookmarks <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Activity Feed */}
      {activities.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-white/10">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Recent Couple Activity
          </h2>
          <div className="divide-y divide-white/5">
            {activities.map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-slate-300">
                    <strong className="text-white font-medium">{act.userId?.displayName || 'Partner'}:</strong>{' '}
                    {act.details || act.action}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(act.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
