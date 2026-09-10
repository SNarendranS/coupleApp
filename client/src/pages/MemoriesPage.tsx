import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useMemoriesStore } from '../stores/memoriesStore';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { MemoryDTO, SOCKET_EVENTS } from '@couple/shared';
import { ImageUploader } from '../components/ui/ImageUploader';
import {
  Image as ImageIcon,
  Plus,
  Calendar,
  MapPin,
  Tag,
  Trash2,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';

export const MemoriesPage: React.FC = () => {
  const { user, partner } = useAuthStore();
  const { memories, setMemories, addMemory, deleteMemory } = useMemoriesStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    imageUrls: [] as string[],
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
      imageUrls: form.imageUrls,
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
        imageUrls: [],
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

  const handleAddPhoto = (url: string) => {
    if (url && !form.imageUrls.includes(url)) {
      setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, url] }));
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setForm((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== indexToRemove),
    }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
            <Sparkles className="w-3.5 h-3.5" /> Moments & Milestones
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Our Shared Memory Book
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Capture every trip, anniversary, date night, and everyday laugh together.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-romantic px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shrink-0 shadow-glow"
        >
          <Plus className="w-4 h-4" /> Add New Memory
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
          {memories.map((mem) => {
            const hasMultiple = mem.imageUrls && mem.imageUrls.length > 1;

            return (
              <div
                key={mem.id}
                className="glass-card rounded-3xl overflow-hidden border border-white/10 flex flex-col justify-between group shadow-lg transition-all hover:border-rose-400/30"
              >
                <div>
                  {/* Photo Section */}
                  {mem.imageUrls && mem.imageUrls.length > 0 && (
                    <div className="relative h-52 w-full overflow-hidden bg-space-950">
                      <img
                        src={mem.imageUrls[0]}
                        alt={mem.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        loading="lazy"
                        onClick={() => setLightboxImage(mem.imageUrls[0])}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-space-950 via-transparent to-transparent opacity-60 pointer-events-none" />

                      {/* Multi-Photo Badge */}
                      {hasMultiple && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-space-950/80 backdrop-blur-md text-white text-[10px] font-bold border border-white/10 flex items-center gap-1 shadow-md">
                          <ImageIcon className="w-3 h-3 text-rose-300" />
                          <span>+{mem.imageUrls.length - 1} more</span>
                        </div>
                      )}

                      {/* Zoom Trigger */}
                      <button
                        type="button"
                        onClick={() => setLightboxImage(mem.imageUrls[0])}
                        className="absolute bottom-3 right-3 p-1.5 rounded-xl bg-space-950/80 text-white/80 hover:text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View photo"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Multi-Photo Mini Thumbnail Row */}
                  {hasMultiple && (
                    <div className="flex gap-1.5 px-5 pt-3 overflow-x-auto scrollbar-none">
                      {mem.imageUrls.slice(1, 4).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          onClick={() => setLightboxImage(url)}
                          className="w-10 h-10 rounded-lg object-cover border border-white/10 hover:border-rose-400 cursor-pointer transition-transform hover:scale-105"
                          loading="lazy"
                        />
                      ))}
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
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-3">
                        {mem.description}
                      </p>
                    )}

                    {mem.tags && mem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {mem.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-400 font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer / Delete */}
                <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                  <span>Saved by {mem.creatorName || 'Us'}</span>
                  <button
                    onClick={() => handleDelete(mem.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
            <img src={lightboxImage} alt="" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-space-950/80 text-white border border-white/20 shadow-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Memory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-romantic-500/20 text-rose-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white font-serif">Add a Special Memory</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Picnic under the stars"
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

              {/* Photos Uploader & Thumbnail Strip */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Photos ({form.imageUrls.length} added)
                </label>

                {/* Thumbnails of added photos */}
                {form.imageUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                    {form.imageUrls.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20 shrink-0 group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(i)}
                          className="absolute top-0.5 right-0.5 p-1 rounded-full bg-rose-600 text-white shadow-md transition-transform active:scale-95"
                          title="Remove photo"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Real photo uploader */}
                <ImageUploader
                  onChange={(url) => handleAddPhoto(url)}
                  category="memory"
                  aspectRatio="wide"
                  placeholderText="Upload photo for this memory"
                  compact={true}
                />
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
