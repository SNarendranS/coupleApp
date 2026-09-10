import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Heart,
  Image as ImageIcon,
  Bell,
  Clock,
  MapPin,
  Repeat,
  Sparkles,
  ChevronLeft,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  CalendarCategory,
  CalendarEventDTO,
  MilestoneType,
  EventRecurrenceFrequency,
} from '@couple/shared';
import { ImageUploader } from '../ui/ImageUploader';

interface AddSomethingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: any) => Promise<void>;
  initialDate: string;
  initialEvent?: CalendarEventDTO | null;
}

const CATEGORY_OPTIONS: {
  key: CalendarCategory;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  colorClass: string;
}[] = [
  {
    key: 'plan',
    title: 'Plan',
    subtitle: "Something we're going to do",
    icon: CalendarIcon,
    colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/50',
  },
  {
    key: 'milestone',
    title: 'Milestone',
    subtitle: 'Something important to us',
    icon: Heart,
    colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:border-rose-500/50',
  },
  {
    key: 'memory',
    title: 'Memory',
    subtitle: 'Something we want to keep',
    icon: ImageIcon,
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50',
  },
  {
    key: 'reminder',
    title: 'Reminder',
    subtitle: "Something we shouldn't miss",
    icon: Bell,
    colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20 hover:border-purple-500/50',
  },
];

const REMINDER_PRESETS = [
  { label: 'At event time', minutes: 0 },
  { label: '10 min before', minutes: 10 },
  { label: '30 min before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
  { label: '3 days before', minutes: 4320 },
  { label: '1 week before', minutes: 10080 },
];

export const AddSomethingModal: React.FC<AddSomethingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialDate,
  initialEvent,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CalendarCategory | null>(
    initialEvent ? (initialEvent.eventTypes?.[0] || 'plan') : null
  );

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [notes, setNotes] = useState(initialEvent?.notes || '');
  const [startDate, setStartDate] = useState(initialEvent?.startDate || initialDate);
  const [endDate, setEndDate] = useState(initialEvent?.endDate || '');
  const [startTime, setStartTime] = useState(initialEvent?.startTime || '');
  const [endTime, setEndTime] = useState(initialEvent?.endTime || '');
  const [allDay, setAllDay] = useState(initialEvent ? initialEvent.allDay : true);
  const [location, setLocation] = useState(initialEvent?.location || '');
  const [imageUrl, setImageUrl] = useState(initialEvent?.imageUrl || '');
  const [imagePublicId, setImagePublicId] = useState(initialEvent?.imagePublicId || '');

  // Recurrence
  const [recurrenceFreq, setRecurrenceFreq] = useState<EventRecurrenceFrequency>(
    initialEvent?.recurrence?.frequency || 'none'
  );

  // Countdown
  const [countdownEnabled, setCountdownEnabled] = useState(
    Boolean(initialEvent?.countdown?.enabled)
  );
  const [countdownPrimary, setCountdownPrimary] = useState(
    Boolean(initialEvent?.countdown?.isPrimary)
  );
  const [countdownLabel, setCountdownLabel] = useState(
    initialEvent?.countdown?.customLabel || ''
  );

  // Milestone
  const [milestoneType, setMilestoneType] = useState<MilestoneType>(
    initialEvent?.milestone?.milestoneType || 'anniversary'
  );
  const [showOnHome, setShowOnHome] = useState(
    initialEvent?.milestone?.showOnHome !== undefined ? initialEvent.milestone.showOnHome : true
  );

  // Reminders
  const [selectedReminders, setSelectedReminders] = useState<number[]>(
    initialEvent?.reminders?.map((r) => r.minutesBefore) || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCategorySelect = (cat: CalendarCategory) => {
    setSelectedCategory(cat);
    if (cat === 'milestone') {
      setCountdownEnabled(true);
      setShowOnHome(true);
    }
  };

  const toggleReminder = (minutes: number) => {
    if (selectedReminders.includes(minutes)) {
      setSelectedReminders(selectedReminders.filter((m) => m !== minutes));
    } else {
      setSelectedReminders([...selectedReminders, minutes]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a title for your event');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const categories: CalendarCategory[] = selectedCategory ? [selectedCategory] : ['plan'];
    if (countdownEnabled && !categories.includes('plan')) {
      // keep categories clean
    }

    const remindersPayload = selectedReminders.map((mins) => ({
      minutesBefore: mins,
      notifyPartner: true,
    }));

    const eventPayload = {
      title: title.trim(),
      description: description.trim(),
      notes: notes.trim(),
      startDate,
      date: startDate,
      endDate: endDate || undefined,
      startTime: allDay ? '' : startTime,
      endTime: allDay ? '' : endTime,
      allDay,
      eventTypes: categories,
      location: location.trim(),
      imageUrl,
      imagePublicId,
      recurrence: {
        frequency: recurrenceFreq,
        interval: 1,
      },
      reminders: remindersPayload,
      countdown: {
        enabled: countdownEnabled,
        isPrimary: countdownPrimary,
        customLabel: countdownLabel.trim(),
      },
      milestone: {
        isMilestone: selectedCategory === 'milestone',
        milestoneType: selectedCategory === 'milestone' ? milestoneType : undefined,
        showOnHome: selectedCategory === 'milestone' ? showOnHome : false,
      },
    };

    try {
      await onSubmit(eventPayload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save calendar event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel rounded-3xl p-5 sm:p-8 max-w-lg w-full border border-white/10 shadow-2xl relative my-auto animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* STEP 1: Lightweight Category Selector */}
        {!selectedCategory && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
                <Sparkles className="w-3.5 h-3.5" /> Our Calendar
              </div>
              <h2 className="font-serif text-2xl font-bold text-white tracking-tight mt-1">
                Add something
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose what you would like to bring into your shared life.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORY_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleCategorySelect(opt.key)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-3 group ${opt.colorClass}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-white group-hover:translate-x-0.5 transition-transform">
                        {opt.title}
                      </h3>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        {opt.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Adaptive Form */}
        {selectedCategory && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <button
                type="button"
                onClick={() => {
                  if (!initialEvent) setSelectedCategory(null);
                }}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to choices
              </button>

              <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-white/10 text-rose-300">
                {selectedCategory}
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {selectedCategory === 'milestone'
                  ? 'Milestone Name'
                  : selectedCategory === 'memory'
                  ? 'Memory Title'
                  : selectedCategory === 'reminder'
                  ? 'What should we remember?'
                  : 'Title of Plan'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  selectedCategory === 'milestone'
                    ? 'e.g. 5 Years Together or First Kiss'
                    : selectedCategory === 'memory'
                    ? 'e.g. Pondicherry Beach Sunrise'
                    : selectedCategory === 'reminder'
                    ? 'e.g. Book anniversary rooftop table'
                    : 'e.g. Candlelight Dinner at Skyline'
                }
                className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-white focus:ring-1 focus:ring-rose-400"
              />
            </div>

            {/* Date & All Day */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Timing</label>
                <div className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    id="allDayCheck"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                  <label htmlFor="allDayCheck" className="text-xs text-slate-300 cursor-pointer">
                    All-day event
                  </label>
                </div>
              </div>
            </div>

            {/* Specific Times (when not all-day) */}
            {!allDay && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="glass-input w-full px-3 py-1.5 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    End Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="glass-input w-full px-3 py-1.5 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
            )}

            {/* Milestone Specific Options */}
            {selectedCategory === 'milestone' && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-rose-300 mb-1">
                    Milestone Category
                  </label>
                  <select
                    value={milestoneType}
                    onChange={(e) => setMilestoneType(e.target.value as MilestoneType)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs text-white bg-space-900"
                  >
                    <option value="anniversary">Relationship Anniversary</option>
                    <option value="first_date">First Date</option>
                    <option value="first_meeting">First Meeting</option>
                    <option value="engagement">Engagement</option>
                    <option value="birthday">Partner Birthday</option>
                    <option value="custom">Custom Milestone</option>
                  </select>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Show as Next Milestone on Home</span>
                  <input
                    type="checkbox"
                    checked={showOnHome}
                    onChange={(e) => setShowOnHome(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                </div>
              </div>
            )}

            {/* Location (Plan or Memory) */}
            {(selectedCategory === 'plan' || selectedCategory === 'memory') && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Marina Beach, Pondicherry"
                    className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
            )}

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {selectedCategory === 'memory' ? 'Memory Story / Notes' : 'Notes & Details'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Special thoughts, outfit plans, reservation notes..."
                className="glass-input w-full px-3.5 py-2 rounded-xl text-xs text-white"
              />
            </div>

            {/* Photo Uploader (For Memory or Plan) */}
            {(selectedCategory === 'memory' || selectedCategory === 'plan') && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {selectedCategory === 'memory' ? 'Memory Photo' : 'Event Photo (Optional)'}
                </label>
                <ImageUploader
                  value={imageUrl}
                  onChange={(url, mediaId) => {
                    setImageUrl(url);
                    setImagePublicId(mediaId || '');
                  }}
                  onRemove={() => {
                    setImageUrl('');
                    setImagePublicId('');
                  }}
                  category={selectedCategory === 'memory' ? 'memory' : 'event'}
                  aspectRatio="wide"
                  placeholderText="Upload photo for this moment"
                  compact={true}
                />
              </div>
            )}

            {/* Reminders Presets */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-purple-400" /> Remind us before
              </label>
              <div className="flex flex-wrap gap-1.5">
                {REMINDER_PRESETS.map((p) => {
                  const active = selectedReminders.includes(p.minutes);
                  return (
                    <button
                      key={p.minutes}
                      type="button"
                      onClick={() => toggleReminder(p.minutes)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                        active
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                          : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {active ? <Check className="w-3 h-3 inline mr-1" /> : null}
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Countdown & Recurrence Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Recurrence */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-blue-400" /> Repeat
                </label>
                <select
                  value={recurrenceFreq}
                  onChange={(e) => setRecurrenceFreq(e.target.value as EventRecurrenceFrequency)}
                  className="glass-input w-full px-2.5 py-1.5 rounded-xl text-xs text-white bg-space-900"
                >
                  <option value="none">Doesn't repeat</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                  <option value="yearly">Every year (annual)</option>
                </select>
              </div>

              {/* Countdown */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-400" /> Enable Countdown
                  </span>
                  <input
                    type="checkbox"
                    checked={countdownEnabled}
                    onChange={(e) => setCountdownEnabled(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                </div>

                {countdownEnabled && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                    <span>Feature as Primary on Home</span>
                    <input
                      type="checkbox"
                      checked={countdownPrimary}
                      onChange={(e) => setCountdownPrimary(e.target.checked)}
                      className="accent-rose-500 rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-4 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-romantic px-5 py-2 text-xs font-semibold flex items-center gap-2"
              >
                {isSubmitting ? 'Saving...' : initialEvent ? 'Update Event' : 'Save to Our Calendar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
