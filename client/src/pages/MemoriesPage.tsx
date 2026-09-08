import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useMemoriesStore } from '../stores/memoriesStore';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { MemoryDTO, SOCKET_EVENTS } from '@couple/shared';
import {
  Image as ImageIcon,
  Plus,
  Calendar,
  MapPin,
  Tag,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';

const SAMPLE_PHOTO_PRESETS = [
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80',
];

export const MemoriesPage: React.FC = () => {
  const { user, partner, couple } = useAuthStore();
  const { memories, setMemories, addMemory, deleteMemory } = useMemoriesStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    imageUrl: SAMPLE_PHOTO_PRESETS[0],
    location: '',
    tags: 'love, adventure',
  });

  // 1. Fetch Memories
  useEffect(() => {
    const fetchMemories = async () => {
      const res = await api.get('/memories');
      if (res.success && res.data) {
        setMemories(res.data);
      }
    };
    fetchMemories();
  }, []);

  // 2. Realtime Synchronization
  useEffect(() => {
    const handleCreated = (memory: MemoryDTO) => addMemory(memory);
    const handleDeleted = (payload: { id: string }) => deleteMemory(payload.id);

    socketService.on(SOCKET_EVENTS.MEMORY_CREATED, handleCreated);
    socketService.on(SOCKET_EVENTS.MEMORY_DELETED, handleDeleted);

    return () => {
      socketService.off(SOCKET_EVENTS.MEMORY_CREATED, handleCreated);
      socketService.off(SOCKET_EVENTS.MEMORY_DELETED, handleDeleted);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagList = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await api.post('/memories', {
      title: form.title,
      description: form.description,
      date: form.date,
      imageUrls: form.imageUrl ? [form.imageUrl] : [],
      location: form.location,
      tags: tagList,
    });

    if (res.success && res.data) {
      addMemory(res.data);
      setIsModalOpen(false);
      setForm({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        imageUrl: SAMPLE_PHOTO_PRESETS[0],
        location: '',
        tags: 'love, adventure',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this memory?')) {
      deleteMemory(id);
      await api.delete(`/memories/${id}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
            <ImageIcon className="w-4 h-4 text-pink-400" /> Couple Scrapbook
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Our Shared Story
          </h1>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-romantic px-4 py-2.5 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Memory
        </button>
      </div>

      {/* Memories Timeline & Grid */}
      {memories.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Sparkles className="w-6 h-6 text-rose-400" />
          </div>
          <h3 className="font-serif text-lg font-semibold text-white mb-1">Your story starts here</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Record your first date, spontaneous road trips, or funny moments shared together.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-romantic px-5 py-2.5 text-xs font-semibold"
          >
            Save Your First Memory
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="glass-card rounded-3xl overflow-hidden border border-white/10 flex flex-col justify-between group"
            >
              <div>
                {/* Photo Header */}
                {mem.imageUrls && mem.imageUrls[0] && (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={mem.imageUrls[0]}
                      alt={mem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-space-950 via-transparent to-transparent opacity-60" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 mb-1.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-rose-400" /> {mem.date}
                    </span>
                    {mem.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-purple-400" /> {mem.location}
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-lg font-bold text-white mb-2 leading-snug">{mem.title}</h3>

                  {mem.description && (
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-4 mb-3">
                      {mem.description}
                    </p>
                  )}

                  {mem.tags && mem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {mem.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="px-5 pb-4 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Added by {mem.creatorName || 'Partner'}</span>
                <button
                  onClick={() => handleDelete(mem.id)}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-all"
                  title="Delete memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Memory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-serif text-xl font-bold text-white mb-1">Save a Special Memory</h2>
            <p className="text-xs text-slate-400 mb-5">Record a memory to cherish forever in your couple album</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Watching the sunrise from Mt. Tamalpais"
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Kyoto, Japan"
                    className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Photo URL or Presets</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="Paste an image URL..."
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs mb-2"
                />
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {SAMPLE_PHOTO_PRESETS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: url })}
                      className={`w-12 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-transform ${
                        form.imageUrl === url ? 'border-rose-400 scale-105' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Story / Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What made this moment special?"
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="vacation, romantic, cafe"
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
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
                  Save Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
