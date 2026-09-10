import React, { useEffect, useState } from 'react';
import {
  Clock,
  Heart,
  Calendar as CalendarIcon,
  Sparkles,
  Star,
  Check,
  Loader2,
  CalendarDays,
  MapPin,
} from 'lucide-react';
import { api } from '../../services/api';
import { CountdownItemDTO, CalendarEventDTO } from '@couple/shared';

interface CountdownsViewProps {
  onAddSomething: () => void;
  onSelectEvent?: (eventId: string) => void;
}

export const CountdownsView: React.FC<CountdownsViewProps> = ({
  onAddSomething,
  onSelectEvent,
}) => {
  const [countdowns, setCountdowns] = useState<CountdownItemDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCountdowns = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/calendar/countdowns');
      if (res.success && res.data) {
        setCountdowns(res.data);
      }
    } catch (err) {
      console.error('Failed to load countdowns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCountdowns();
  }, []);

  const handleSetPrimary = async (eventId: string) => {
    try {
      await api.patch(`/calendar/${eventId}`, {
        countdown: {
          enabled: true,
          isPrimary: true,
        },
      });
      fetchCountdowns();
    } catch (err) {
      console.error('Failed to update primary countdown:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-rose-400 animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-medium">Calculating our countdowns...</p>
      </div>
    );
  }

  const primaryCountdown = countdowns.find((c) => c.isPrimary) || countdowns[0];
  const secondaryCountdowns = countdowns.filter((c) => c.eventId !== primaryCountdown?.eventId);

  if (countdowns.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center border border-white/10 max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-bold text-white">No active countdowns</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Create an anniversary, upcoming trip, or date night and enable countdown to watch the days count down together.
          </p>
        </div>
        <button
          onClick={onAddSomething}
          className="btn-romantic px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Start a countdown
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white">Countdowns</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Looking forward to our upcoming adventures and special moments.
          </p>
        </div>
        <button
          onClick={onAddSomething}
          className="btn-romantic px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" /> Add Countdown
        </button>
      </div>

      {/* Featured Primary Countdown */}
      {primaryCountdown && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-purple-500/5 to-transparent shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <Star className="w-3.5 h-3.5 fill-rose-400 text-rose-400" /> Featured on Home
            </span>
          </div>

          <div className="max-w-md space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                Next Major Milestone
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {primaryCountdown.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                {new Date(primaryCountdown.targetDate).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {primaryCountdown.targetTime && ` at ${primaryCountdown.targetTime}`}
              </p>
            </div>

            {/* Countdown Big Display */}
            <div className="flex items-baseline gap-4 pt-2">
              <div>
                <span className="font-serif text-5xl sm:text-6xl font-black text-white tracking-tight">
                  {Math.max(0, primaryCountdown.daysRemaining)}
                </span>
                <span className="text-sm font-semibold text-rose-300 ml-2">days to go</span>
              </div>
              {primaryCountdown.hoursRemaining > 0 && primaryCountdown.daysRemaining <= 2 && (
                <div className="text-xs text-slate-400">
                  ({primaryCountdown.hoursRemaining} hours)
                </div>
              )}
            </div>

            {primaryCountdown.status === 'today' && (
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>Today is the day! Enjoy every second together.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secondary & Upcoming Countdowns Grid */}
      {secondaryCountdowns.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-serif text-base font-bold text-white">All Active Countdowns</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {secondaryCountdowns.map((c) => (
              <div
                key={c.eventId}
                className="glass-card rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                        {c.category}
                      </span>
                      <h4 className="font-serif text-lg font-bold text-white mt-1.5">{c.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(c.targetDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-serif text-2xl font-bold text-white">
                        {Math.max(0, c.daysRemaining)}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">days</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(c.eventId)}
                    className="text-slate-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Star className="w-3.5 h-3.5" /> Make Primary
                  </button>

                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      c.status === 'today'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : c.status === 'upcoming'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
