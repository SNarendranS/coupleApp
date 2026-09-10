import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usePresenceStore } from '../stores/presenceStore';
import { useCalendarStore } from '../stores/calendarStore';
import { api } from '../services/api';
import { CanvasPreview } from '../components/drawing/CanvasPreview';
import { CoupleAvatar } from '../components/couple/CoupleAvatar';
import {
  Heart,
  Palette,
  Gamepad2,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  Bookmark,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Flame,
  Bell,
  Star,
  PlusCircle,
  Camera,
  Play,
  CalendarDays,
} from 'lucide-react';
import { CountdownItemDTO, CalendarEventDTO } from '@couple/shared';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, partner, couple } = useAuthStore();
  const { isPartnerOnline, partnerActivity } = usePresenceStore();
  const { setActiveTab } = useCalendarStore();

  const [coupleDetails, setCoupleDetails] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventDTO[]>([]);
  const [primaryCountdown, setPrimaryCountdown] = useState<CountdownItemDTO | null>(null);
  const [nextMilestone, setNextMilestone] = useState<CalendarEventDTO | null>(null);
  const [recentMemories, setRecentMemories] = useState<any[]>([]);
  const [recentLinks, setRecentLinks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [boardStrokes, setBoardStrokes] = useState<any[]>([]);
  const [boardBg, setBoardBg] = useState<'#ffffff' | '#121214'>('#ffffff');

  useEffect(() => {
    const fetchDashboardData = async () => {
      const [coupleRes, eventsRes, countdownsRes, memoriesRes, linksRes, activityRes, boardRes] =
        await Promise.all([
          api.get('/couple'),
          api.get('/calendar'),
          api.get('/calendar/countdowns'),
          api.get('/memories'),
          api.get('/links'),
          api.get('/activity'),
          api.get('/drawing'),
        ]);

      if (coupleRes.success) setCoupleDetails(coupleRes.data);

      if (eventsRes.success && Array.isArray(eventsRes.data)) {
        const nowStr = new Date().toISOString().split('T')[0];
        const future = eventsRes.data.filter((e: any) => (e.startDate || e.date) >= nowStr);
        setUpcomingEvents(future.slice(0, 4));

        // Find next milestone
        const milestone = future.find(
          (e: any) => e.milestone?.isMilestone || e.eventTypes?.includes('milestone')
        );
        if (milestone) setNextMilestone(milestone);
      }

      if (countdownsRes.success && Array.isArray(countdownsRes.data) && countdownsRes.data.length > 0) {
        setPrimaryCountdown(countdownsRes.data[0]);
      }

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

  // Next Anniversary Calculation
  const getNextAnniversaryInfo = () => {
    if (!couple?.relationshipStartDate) return null;
    const start = new Date(couple.relationshipStartDate);
    const now = new Date();

    let targetYear = now.getFullYear();
    const thisYearAnniversary = new Date(targetYear, start.getMonth(), start.getDate());
    if (thisYearAnniversary < now) {
      targetYear++;
    }

    const nextAnniversaryDate = new Date(targetYear, start.getMonth(), start.getDate());
    const diffMs = nextAnniversaryDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const yearsTogether = targetYear - start.getFullYear();

    return {
      years: yearsTogether,
      date: nextAnniversaryDate.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      daysRemaining,
    };
  };

  const nextAnniversary = getNextAnniversaryInfo();

  const handleOpenCountdowns = () => {
    setActiveTab('countdowns');
    navigate('/calendar');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Welcome & Presence Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-romantic-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <CoupleAvatar size="lg" editable={true} />
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Private Couple Sanctuary
              </div>
              <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
                {couple?.name || `${user?.displayName} & ${partner?.displayName}`}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                {daysTogether > 0 ? (
                  <>
                    Together for <strong className="text-white">{daysTogether} days</strong> of shared laughter, love, and memories.
                  </>
                ) : (
                  <>Welcome to day one of your shared digital space together.</>
                )}
              </p>
            </div>
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

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/calendar"
          className="p-3.5 rounded-2xl glass-card border border-white/10 hover:border-rose-500/40 transition-all flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-white">Plan Something</span>
            <span className="block text-[10px] text-slate-400">Our Calendar</span>
          </div>
        </Link>

        <Link
          to="/moments"
          className="p-3.5 rounded-2xl glass-card border border-white/10 hover:border-amber-500/40 transition-all flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-white">Add Memory</span>
            <span className="block text-[10px] text-slate-400">Save moments</span>
          </div>
        </Link>

        <Link
          to="/canvas"
          className="p-3.5 rounded-2xl glass-card border border-white/10 hover:border-purple-500/40 transition-all flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-white">Open Canvas</span>
            <span className="block text-[10px] text-slate-400">Draw together</span>
          </div>
        </Link>

        <Link
          to="/games"
          className="p-3.5 rounded-2xl glass-card border border-white/10 hover:border-blue-500/40 transition-all flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-white">Play Together</span>
            <span className="block text-[10px] text-slate-400">4 couple games</span>
          </div>
        </Link>
      </div>

      {/* Main Grid: Interactive Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Shared Canvas Preview (1st Card) */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Realtime
              </span>
            </div>
            <h2 className="font-serif text-lg font-bold text-white mb-1">Shared Canvas</h2>
            <p className="text-xs text-slate-400 mb-3">
              Live preview of your shared drawing board.
            </p>
            <CanvasPreview
              strokes={boardStrokes}
              backgroundColor={boardBg}
              className="h-40 sm:h-44"
            />
          </div>

          <Link
            to="/canvas"
            className="btn-secondary w-full py-2.5 text-xs font-semibold text-center"
          >
            Draw Together
          </Link>
        </div>

        {/* 2. Enhanced Our Journey Card */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Flame className="w-5 h-5 text-rose-400" />
              </div>
              <span className="text-xs font-semibold text-slate-400">Our Timeline</span>
            </div>

            <h2 className="font-serif text-lg font-bold text-white">Our Journey</h2>

            <div className="my-3">
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

            {nextAnniversary && (
              <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-300 flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Next Anniversary
                </span>
                <p className="text-xs font-semibold text-white">
                  {nextAnniversary.years} Years Together
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>{nextAnniversary.date}</span>
                  <span className="text-rose-300 font-bold">{nextAnniversary.daysRemaining} days left</span>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/calendar"
            className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 pt-2 border-t border-white/5"
          >
            View Our Calendar <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 3. Primary Featured Countdown Card */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <button
                onClick={handleOpenCountdowns}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-300">
              <Star className="w-3 h-3 fill-purple-400" /> Countdown
            </div>

            {primaryCountdown ? (
              <div className="mt-2 space-y-3">
                <h3 className="font-serif text-xl font-bold text-white">
                  {primaryCountdown.title}
                </h3>

                <div className="my-2">
                  <span className="text-4xl sm:text-5xl font-serif font-black text-white">
                    {Math.max(0, primaryCountdown.daysRemaining)}
                  </span>
                  <span className="text-xs text-slate-300 ml-2 font-medium">days to go</span>
                </div>

                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(primaryCountdown.targetDate).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {primaryCountdown.targetTime && ` · ${primaryCountdown.targetTime}`}
                </p>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-slate-400">No active countdowns yet.</p>
                <Link
                  to="/calendar"
                  className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1 mt-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Start a countdown
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={handleOpenCountdowns}
            className="btn-secondary w-full py-2.5 text-xs font-semibold text-center mt-2"
          >
            All Countdowns
          </button>
        </div>

        {/* 4. Coming Up Section */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-amber-400" />
              </div>
              <Link to="/calendar" className="text-xs text-rose-400 hover:text-rose-300 font-medium">
                View Calendar
              </Link>
            </div>

            <h2 className="font-serif text-lg font-bold text-white mb-2">Coming Up</h2>

            <div className="space-y-2.5">
              {upcomingEvents.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-slate-500">Nothing scheduled soon.</p>
                  <Link
                    to="/calendar"
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium block"
                  >
                    + Plan a date together
                  </Link>
                </div>
              ) : (
                upcomingEvents.map((evt) => {
                  const isMilestone = evt.eventTypes?.includes('milestone');
                  const isReminder = evt.eventTypes?.includes('reminder');

                  return (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors"
                    >
                      <div className="space-y-0.5 max-w-[70%]">
                        <p className="text-xs font-semibold text-white truncate">{evt.title}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(evt.startDate || evt.date || '').toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                          {evt.startTime && ` · ${evt.startTime}`}
                        </p>
                      </div>

                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1 ${
                          isMilestone
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : isReminder
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {isMilestone ? (
                          <Heart className="w-2.5 h-2.5" />
                        ) : isReminder ? (
                          <Bell className="w-2.5 h-2.5" />
                        ) : (
                          <CalendarIcon className="w-2.5 h-2.5" />
                        )}
                        {evt.eventTypes?.[0] || 'plan'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Link
            to="/calendar"
            className="btn-secondary w-full py-2 text-xs font-semibold text-center mt-2"
          >
            Open Full Calendar
          </Link>
        </div>

        {/* 5. Couple Games */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-slate-400">Multiplayer</span>
            </div>
            <h2 className="font-serif text-lg font-bold text-white mb-1">Couple Games</h2>
            <p className="text-xs text-slate-400 mb-4">
              Play Battleship, Checkers, XO, and Couple Bingo in realtime.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/games"
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-colors"
              >
                <span className="text-sm font-bold text-blue-400 block">Battleship</span>
                <span className="text-[10px] text-slate-400">Naval strategy</span>
              </Link>
              <Link
                to="/games"
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-colors"
              >
                <span className="text-sm font-bold text-rose-400 block">Checkers</span>
                <span className="text-[10px] text-slate-400">Tournament rules</span>
              </Link>
              <Link
                to="/games"
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-colors"
              >
                <span className="text-sm font-bold text-emerald-400 block">XO</span>
                <span className="text-[10px] text-slate-400">Tic-Tac-Toe</span>
              </Link>
              <Link
                to="/games"
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-colors"
              >
                <span className="text-sm font-bold text-purple-400 block">Bingo</span>
                <span className="text-[10px] text-slate-400">5x5 Boards</span>
              </Link>
            </div>
          </div>

          <Link
            to="/games"
            className="btn-secondary w-full py-2.5 text-xs font-semibold text-center"
          >
            Play Now
          </Link>
        </div>

        {/* 6. Recent Memories */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-amber-400" />
              </div>
              <Link to="/moments" className="text-xs text-rose-400 hover:text-rose-300 font-medium">
                View all
              </Link>
            </div>
            <h2 className="font-serif text-lg font-bold text-white mb-2">Recent Memories</h2>
            <div className="space-y-3">
              {recentMemories.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">No memories added yet.</p>
              ) : (
                recentMemories.map((mem) => (
                  <div key={mem.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white truncate">{mem.title}</p>
                      <span className="text-[10px] text-slate-400">{mem.date}</span>
                    </div>
                    {mem.imageUrls && mem.imageUrls.length > 0 && (
                      <div className="h-24 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                        <img
                          src={mem.imageUrls[0]}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            to="/moments"
            className="btn-secondary w-full py-2.5 text-xs font-semibold text-center"
          >
            Open Moments
          </Link>
        </div>
      </div>
    </div>
  );
};
