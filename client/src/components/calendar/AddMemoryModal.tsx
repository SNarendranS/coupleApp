import React, { useState } from 'react';
import { Image as ImageIcon, MapPin, X, AlertCircle, Sparkles } from 'lucide-react';
import { CalendarEventDTO } from '@couple/shared';
import { ImageUploader } from '../ui/ImageUploader';

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; imageUrls: string[]; location: string }) => Promise<void>;
  event: CalendarEventDTO;
}

export const AddMemoryModal: React.FC<AddMemoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  event,
}) => {
  const [title, setTitle] = useState(`Memory of ${event.title}`);
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [location, setLocation] = useState(event.location || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a title for your memory');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        imageUrls: photoUrl ? [photoUrl] : [],
        location: location.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to attach memory');
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
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
            <Sparkles className="w-3.5 h-3.5" /> Cherish The Moment
          </div>
          <h2 className="font-serif text-xl font-bold text-white tracking-tight mt-1">
            Add Memory for {event.title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Attach photographs and lovely reflections to this calendar event.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Memory Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Photo</label>
            <ImageUploader
              value={photoUrl}
              onChange={(url) => setPhotoUrl(url)}
              onRemove={() => setPhotoUrl('')}
              category="memory"
              aspectRatio="wide"
              placeholderText="Upload photo for this memory"
              compact={true}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes & Story</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What made this date so unforgettable..."
              className="glass-input w-full px-3.5 py-2 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Location</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where you made this memory"
                className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs text-white"
              />
            </div>
          </div>

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
              className="btn-romantic px-5 py-2 text-xs font-semibold"
            >
              {isSubmitting ? 'Attaching...' : 'Save to Memories'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
