import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCalendarStore } from '../stores/calendarStore';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { CalendarEventDTO, CalendarEventType, SOCKET_EVENTS } from '@couple/shared';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  Heart,
  ImageIcon,
} from 'lucide-react';
import { ImageUploader } from '../components/ui/ImageUploader';

export const CalendarPage: React.FC = () => {
  const { user, partner, couple } = useAuthStore();
  const { events, selectedDate, setEvents, addEvent, updateEvent, deleteEvent, setSelectedDate } =
    useCalendarStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    allDay: true,
    type: 'plan' as CalendarEventType,
    location: '',
    imageUrl: '',
    imagePublicId: '',
    isRecurringYearly: false,
  });

  // 1. Fetch Events
  useEffect(() => {
    const fetchEvents = async () => {
      const res = await api.get('/calendar');
      if (res.success && res.data) {
        setEvents(res.data);
      }
    };
    fetchEvents();
  }, []);

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

  // 3. Calendar Grid Generation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  // Filter events for selected date or month
  const selectedDayEvents = events.filter((e) => e.date === selectedDate);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/calendar', form);
    if (res.success && res.data) {
      addEvent(res.data);
      setIsModalOpen(false);
      setForm({
        title: '',
        description: '',
        date: selectedDate,
        startTime: '',
        endTime: '',
        allDay: true,
        type: 'plan',
        location: '',
        imageUrl: '',
        imagePublicId: '',
        isRecurringYearly: false,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this event?')) {
      deleteEvent(id);
      await api.delete(`/calendar/${id}`);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'anniversary':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'date_night':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'memory':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
            <CalendarIcon className="w-4 h-4 text-blue-400" /> Shared Couple Calendar
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Plans & Milestones
          </h1>
        </div>

        <button
          onClick={() => {
            setForm((f) => ({ ...f, date: selectedDate }));
            setIsModalOpen(true);
          }}
          className="btn-romantic px-4 py-2.5 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Event / Date
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month View (Left 2 columns) */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-bold text-white">
              {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 border border-white/10"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {blanksArray.map((_, i) => (
              <div key={`blank-${i}`} className="h-12 sm:h-20 rounded-xl sm:rounded-2xl bg-white/[0.02]" />
            ))}

            {daysArray.map((d) => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayEvents = events.filter((e) => e.date === dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-12 sm:h-20 p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between text-left ${
                    isSelected
                      ? 'bg-romantic-500/20 border-romantic-500/50 shadow-glow'
                      : isToday
                      ? 'bg-white/10 border-white/20'
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-rose-300 font-bold' : isToday ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {d}
                  </span>

                  {dayEvents.length > 0 && (
                    <div className="flex gap-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <span
                          key={idx}
                          className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"
                          title={e.title}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-slate-500">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events List (Right column) */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Events for Date</h3>
                <p className="text-xs text-slate-400">{selectedDate}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300 font-medium">
                {selectedDayEvents.length} scheduled
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {selectedDayEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Nothing scheduled for this date.
                  <button
                    onClick={() => {
                      setForm((f) => ({ ...f, date: selectedDate }));
                      setIsModalOpen(true);
                    }}
                    className="mt-3 block mx-auto text-romantic-400 hover:text-romantic-300 font-medium"
                  >
                    + Add date or plan
                  </button>
                </div>
              ) : (
                selectedDayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 relative group space-y-2.5"
                  >
                    {evt.imageUrl && (
                      <div className="w-full h-32 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                        <img src={evt.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getTypeBadge(
                            evt.type
                          )}`}
                        >
                          {evt.type}
                        </span>
                        <h4 className="text-sm font-semibold text-white mt-1.5">{evt.title}</h4>
                        {evt.description && (
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{evt.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                          {evt.startTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {evt.startTime} {evt.endTime && `- ${evt.endTime}`}
                            </span>
                          )}
                          {evt.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {evt.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(evt.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-all"
                        title="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-serif text-xl font-bold text-white mb-1">Add Couple Event</h2>
            <p className="text-xs text-slate-400 mb-5">Plan dates, celebrate anniversaries, or record special memories</p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Candlelight Dinner at Beach"
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as CalendarEventType })}
                    className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                  >
                    <option value="plan">Plan / Date</option>
                    <option value="date_night">Date Night</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="birthday">Birthday</option>
                    <option value="memory">Special Memory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                  >
                  </input>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Time (Optional)</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Location (Optional)</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Skyline Rooftop"
                    className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Special reservations or cute surprises..."
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Event Photo (Optional)</label>
                <ImageUploader
                  value={form.imageUrl}
                  onChange={(url, mediaId) => setForm({ ...form, imageUrl: url, imagePublicId: mediaId || '' })}
                  onRemove={() => setForm({ ...form, imageUrl: '', imagePublicId: '' })}
                  category="event"
                  aspectRatio="wide"
                  placeholderText="Upload photo for this event"
                  compact={true}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recur"
                  checked={form.isRecurringYearly}
                  onChange={(e) => setForm({ ...form, isRecurringYearly: e.target.checked })}
                  className="accent-romantic-500 rounded"
                />
                <label htmlFor="recur" className="text-xs text-slate-300 cursor-pointer">
                  Repeats every year (e.g. annual anniversary)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-romantic px-5 py-2 text-xs font-semibold">
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
