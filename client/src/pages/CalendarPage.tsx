import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCalendarStore } from '../stores/calendarStore';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { CalendarEventDTO, CalendarCategory, SOCKET_EVENTS } from '@couple/shared';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Heart,
  Image as ImageIcon,
  Bell,
  CalendarDays,
  Camera,
  Repeat,
  User as UserIcon,
} from 'lucide-react';
import { AddSomethingModal } from '../components/calendar/AddSomethingModal';
import { AddMemoryModal } from '../components/calendar/AddMemoryModal';
import { OurStoryTimeline } from '../components/calendar/OurStoryTimeline';
import { CountdownsView } from '../components/calendar/CountdownsView';

export const CalendarPage: React.FC = () => {
  const { user, partner } = useAuthStore();
  const {
    events,
    selectedDate,
    activeTab,
    setEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    setSelectedDate,
    setActiveTab,
  } = useCalendarStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventDTO | null>(null);
  const [memoryModalEvent, setMemoryModalEvent] = useState<CalendarEventDTO | null>(null);

  // 1. Fetch Events for Month Range
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const fetchMonthEvents = async () => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const res = await api.get(`/calendar?month=${monthStr}`);
    if (res.success && res.data) {
      setEvents(res.data);
    }
  };

  useEffect(() => {
    fetchMonthEvents();
  }, [year, month]);

  // 2. Realtime Synchronization
  useEffect(() => {
    const handleCreated = (event: CalendarEventDTO) => addEvent(event);
    const handleUpdated = (event: CalendarEventDTO) => updateEvent(event);
    const handleDeleted = (payload: { id: string }) => deleteEvent(payload.id);

    socketService.on(SOCKET_EVENTS.CALENDAR_EVENT_CREATED, handleCreated);
    socketService.on(SOCKET_EVENTS.CALENDAR_EVENT_UPDATED, handleUpdated);
    socketService.on(SOCKET_EVENTS.CALENDAR_EVENT_DELETED, handleDeleted);

    return () => {
      socketService.off(SOCKET_EVENTS.CALENDAR_EVENT_CREATED, handleCreated);
      socketService.off(SOCKET_EVENTS.CALENDAR_EVENT_UPDATED, handleUpdated);
      socketService.off(SOCKET_EVENTS.CALENDAR_EVENT_DELETED, handleDeleted);
    };
  }, []);

  // 3. Navigation Controls
  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // Calendar Grid Generation
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Selected Day Events
  const selectedDayEvents = events.filter((e) => (e.startDate || e.date) === selectedDate);

  // Event Mutations
  const handleSaveEvent = async (eventData: any) => {
    if (editingEvent) {
      const res = await api.patch(`/calendar/${editingEvent.id}`, eventData);
      if (res.success && res.data) {
        updateEvent(res.data);
      }
    } else {
      const res = await api.post('/calendar', eventData);
      if (res.success && res.data) {
        addEvent(res.data);
      }
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this event from Our Calendar?')) {
      deleteEvent(id);
      await api.delete(`/calendar/${id}`);
    }
  };

  const handleAttachMemory = async (data: any) => {
    if (!memoryModalEvent) return;
    const res = await api.post(`/calendar/${memoryModalEvent.id}/memory`, data);
    if (res.success && res.data?.event) {
      updateEvent(res.data.event);
    }
  };

  const getCategoryIcon = (category: CalendarCategory) => {
    switch (category) {
      case 'milestone':
        return <Heart className="w-3.5 h-3.5 text-rose-400" />;
      case 'memory':
        return <ImageIcon className="w-3.5 h-3.5 text-amber-400" />;
      case 'reminder':
        return <Bell className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const getCategoryBadgeClass = (category: CalendarCategory) => {
    switch (category) {
      case 'milestone':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'memory':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'reminder':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header & Primary Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
            <Heart className="w-4 h-4 text-rose-400" /> Relationship Sanctuary
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight mt-0.5">
            Our Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Where we plan, celebrate, and cherish our life together.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => {
              setEditingEvent(null);
              setIsAddModalOpen(true);
            }}
            className="btn-romantic px-4 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-glow"
          >
            <Plus className="w-4 h-4" /> Add something
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Month View, Our Story, Countdowns) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('month')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'month'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Month View
        </button>

        <button
          onClick={() => setActiveTab('story')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'story'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Heart className="w-4 h-4" /> Our Story
        </button>

        <button
          onClick={() => setActiveTab('countdowns')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'countdowns'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" /> Countdowns
        </button>
      </div>

      {/* TAB 1: MONTH VIEW */}
      {activeTab === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Month Calendar Grid (2 Cols) */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-5 sm:p-7 border border-white/10 shadow-2xl space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 border border-white/10 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 py-1 border-b border-white/5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {blanksArray.map((_, i) => (
                <div
                  key={`blank-${i}`}
                  className="h-14 sm:h-24 rounded-xl sm:rounded-2xl bg-white/[0.01]"
                />
              ))}

              {daysArray.map((d) => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayEvents = events.filter((e) => (e.startDate || e.date) === dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-14 sm:h-24 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between text-left ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500/60 shadow-glow'
                        : isToday
                        ? 'bg-white/10 border-white/20 ring-1 ring-white/30'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected
                            ? 'text-rose-300 font-bold'
                            : isToday
                            ? 'text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        {d}
                      </span>

                      {isToday && (
                        <span className="hidden sm:inline text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Accessible Event Indicators (Icons + Title) */}
                    {dayEvents.length > 0 && (
                      <div className="w-full space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((evt, idx) => {
                          const primaryCat = (evt.eventTypes?.[0] || 'plan') as CalendarCategory;
                          return (
                            <div
                              key={idx}
                              className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-slate-200 truncate px-1 py-0.5 rounded bg-white/10 border border-white/5"
                              title={evt.title}
                            >
                              {getCategoryIcon(primaryCat)}
                              <span className="truncate">{evt.title}</span>
                            </div>
                          );
                        })}

                        {/* Mobile indicator dots with icons */}
                        <div className="flex sm:hidden gap-1 items-center">
                          {dayEvents.slice(0, 3).map((evt, idx) => {
                            const primaryCat = (evt.eventTypes?.[0] || 'plan') as CalendarCategory;
                            return (
                              <span
                                key={idx}
                                className="w-2 h-2 rounded-full bg-rose-400 shrink-0"
                                title={evt.title}
                              />
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-[8px] text-slate-400">+{dayEvents.length - 3}</span>
                          )}
                        </div>

                        {dayEvents.length > 2 && (
                          <div className="hidden sm:block text-[9px] text-slate-400 font-medium pl-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Activity Column (1 Col) */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                    Selected Day
                  </span>
                  <h3 className="font-serif text-lg font-bold text-white">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h3>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300 font-medium border border-white/10">
                  {selectedDayEvents.length} scheduled
                </span>
              </div>

              {/* Event Cards List */}
              <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                {selectedDayEvents.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <p className="text-xs text-slate-400 font-medium">
                      Nothing planned yet for this date.
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Add something you both want to remember or look forward to.
                    </p>
                    <button
                      onClick={() => {
                        setEditingEvent(null);
                        setIsAddModalOpen(true);
                      }}
                      className="btn-romantic px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to this date
                    </button>
                  </div>
                ) : (
                  selectedDayEvents.map((evt) => {
                    const isCreatedByMe = evt.createdBy === user?.id;
                    const primaryCategory = (evt.eventTypes?.[0] || 'plan') as CalendarCategory;

                    return (
                      <div
                        key={evt.id}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 relative group space-y-3 hover:border-white/20 transition-all"
                      >
                        {/* Event Photo */}
                        {evt.imageUrl && (
                          <div className="w-full h-36 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                            <img
                              src={evt.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            {/* Categories Badges */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {evt.eventTypes?.map((cat) => (
                                <span
                                  key={cat}
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${getCategoryBadgeClass(
                                    cat
                                  )}`}
                                >
                                  {getCategoryIcon(cat)} {cat}
                                </span>
                              ))}

                              {evt.recurrence && evt.recurrence.frequency !== 'none' && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                                  <Repeat className="w-3 h-3" /> {evt.recurrence.frequency}
                                </span>
                              )}
                            </div>

                            <h4 className="text-base font-serif font-bold text-white mt-1">
                              {evt.title}
                            </h4>

                            {evt.description && (
                              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                                {evt.description}
                              </p>
                            )}

                            {/* Time & Location */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                              {evt.startTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {evt.startTime} {evt.endTime && `- ${evt.endTime}`}
                                </span>
                              )}
                              {evt.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {evt.location}
                                </span>
                              )}
                            </div>

                            {/* Creator attribution */}
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-1">
                              <UserIcon className="w-3 h-3" />
                              {isCreatedByMe
                                ? 'Created by you'
                                : `Created by ${partner?.displayName || 'partner'}`}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingEvent(evt);
                                setIsAddModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                              title="Edit event"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              title="Delete event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Reminders Pill List */}
                        {evt.reminders && evt.reminders.length > 0 && (
                          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-purple-300 font-semibold flex items-center gap-1">
                              <Bell className="w-3 h-3" /> Reminders:
                            </span>
                            {evt.reminders.map((r, i) => (
                              <span
                                key={r.id || i}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20"
                              >
                                {r.minutesBefore === 0
                                  ? 'At time'
                                  : r.minutesBefore < 60
                                  ? `${r.minutesBefore}m before`
                                  : r.minutesBefore < 1440
                                  ? `${Math.round(r.minutesBefore / 60)}h before`
                                  : `${Math.round(r.minutesBefore / 1440)}d before`}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Linked Memories or Add Memory Action */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                          {evt.linkedMoments && evt.linkedMoments.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> {evt.linkedMoments.length} memories attached
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">No photos attached yet</span>
                          )}

                          <button
                            onClick={() => setMemoryModalEvent(evt)}
                            className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 flex items-center gap-1 transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" /> Add Memory
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setEditingEvent(null);
                setIsAddModalOpen(true);
              }}
              className="btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add something to Our Calendar
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: OUR STORY TIMELINE */}
      {activeTab === 'story' && (
        <OurStoryTimeline
          onAddSomething={() => {
            setEditingEvent(null);
            setIsAddModalOpen(true);
          }}
        />
      )}

      {/* TAB 3: COUNTDOWNS VIEW */}
      {activeTab === 'countdowns' && (
        <CountdownsView
          onAddSomething={() => {
            setEditingEvent(null);
            setIsAddModalOpen(true);
          }}
        />
      )}

      {/* Add / Edit Event Modal */}
      {isAddModalOpen && (
        <AddSomethingModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingEvent(null);
          }}
          onSubmit={handleSaveEvent}
          initialDate={selectedDate}
          initialEvent={editingEvent}
        />
      )}

      {/* Add Memory to Event Modal */}
      {memoryModalEvent && (
        <AddMemoryModal
          isOpen={Boolean(memoryModalEvent)}
          onClose={() => setMemoryModalEvent(null)}
          onSubmit={handleAttachMemory}
          event={memoryModalEvent}
        />
      )}
    </div>
  );
};
