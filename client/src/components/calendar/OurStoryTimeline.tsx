import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Heart,
  Image as ImageIcon,
  Bell,
  MapPin,
  Clock,
  Sparkles,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { api } from '../../services/api';
import { OurStoryTimelineYearGroup, OurStoryItemDTO, CalendarCategory } from '@couple/shared';

interface OurStoryTimelineProps {
  onAddSomething: () => void;
}

export const OurStoryTimeline: React.FC<OurStoryTimelineProps> = ({ onAddSomething }) => {
  const [timeline, setTimeline] = useState<OurStoryTimelineYearGroup[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/calendar/story');
      if (res.success && res.data) {
        setTimeline(res.data.timeline || []);
        setTotalCount(res.data.totalCount || 0);
      }
    } catch (err) {
      console.error('Failed to load Our Story timeline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStory();
  }, []);

  const getCategoryIcon = (categories: CalendarCategory[] = []) => {
    if (categories.includes('milestone')) {
      return <Heart className="w-4 h-4 text-rose-400" />;
    }
    if (categories.includes('memory')) {
      return <ImageIcon className="w-4 h-4 text-amber-400" />;
    }
    if (categories.includes('reminder')) {
      return <Bell className="w-4 h-4 text-purple-400" />;
    }
    return <CalendarIcon className="w-4 h-4 text-blue-400" />;
  };

  const getCategoryBadge = (categories: CalendarCategory[] = []) => {
    if (categories.includes('milestone')) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
    if (categories.includes('memory')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
    if (categories.includes('reminder')) {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-rose-400 animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-medium">Tracing our relationship story...</p>
      </div>
    );
  }

  if (timeline.length === 0 || totalCount === 0) {
    return (
      <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center border border-white/10 max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-bold text-white">Our story is just beginning</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Record memorable milestones, plan adventures together, and capture heartfelt moments to watch your shared timeline unfold.
          </p>
        </div>
        <button
          onClick={onAddSomething}
          className="btn-romantic px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Add your first chapter
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white">Our Story</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            A chronological journey of our shared love, celebrations, and memories.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
          {totalCount} chapters recorded
        </span>
      </div>

      <div className="space-y-12">
        {timeline.map((yearGroup) => (
          <div key={yearGroup.year} className="space-y-6">
            {/* Year Header */}
            <div className="sticky top-16 z-20 py-2 flex items-center gap-3">
              <span className="font-serif text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                {yearGroup.year}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/20 via-white/5 to-transparent" />
            </div>

            {/* Months within year */}
            <div className="space-y-8 pl-2 sm:pl-4 border-l-2 border-white/10 ml-3 sm:ml-4">
              {yearGroup.months.map((monthGroup) => (
                <div key={`${yearGroup.year}-${monthGroup.month}`} className="space-y-4 relative">
                  {/* Month dot anchor */}
                  <div className="flex items-center gap-2 -ml-[1.4rem]">
                    <div className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-space-950" />
                    <h3 className="font-serif text-base font-bold text-rose-300 tracking-wide">
                      {monthGroup.monthName}
                    </h3>
                  </div>

                  {/* Items for month */}
                  <div className="space-y-4 pt-1">
                    {monthGroup.items.map((item: OurStoryItemDTO) => (
                      <div
                        key={item.id}
                        className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 hover:border-white/20 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                              {getCategoryIcon(item.categories)}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-serif text-base font-bold text-white">
                                  {item.title}
                                </h4>
                                {item.categories?.map((cat) => (
                                  <span
                                    key={cat}
                                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getCategoryBadge(
                                      [cat]
                                    )}`}
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(item.date).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                                {item.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {item.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-300 leading-relaxed pl-12">
                            {item.description}
                          </p>
                        )}

                        {/* Photo Gallery Grid */}
                        {item.photos && item.photos.length > 0 && (
                          <div className="pl-12 pt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {item.photos.map((photo, idx) => (
                              <div
                                key={idx}
                                className="aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-black/20"
                              >
                                <img
                                  src={photo}
                                  alt=""
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
