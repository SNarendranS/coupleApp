import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useLinksStore } from '../stores/linksStore';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { SharedLinkDTO, LinkCategory, SOCKET_EVENTS } from '@couple/shared';
import {
  Bookmark,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  X,
  Sparkles,
  Utensils,
  Plane,
  Film,
  ShoppingBag,
  Music,
  Compass,
} from 'lucide-react';

const CATEGORIES: { id: string; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Compass },
  { id: 'food', label: 'Food & Dining', icon: Utensils },
  { id: 'travel', label: 'Travel & Trips', icon: Plane },
  { id: 'movies', label: 'Movies & Shows', icon: Film },
  { id: 'music', label: 'Music & Playlists', icon: Music },
  { id: 'shopping', label: 'Gifts & Shopping', icon: ShoppingBag },
  { id: 'other', label: 'Other Finds', icon: Bookmark },
];

export const LinksPage: React.FC = () => {
  const { user, partner, couple } = useAuthStore();
  const {
    links,
    selectedCategory,
    searchQuery,
    setLinks,
    addLink,
    deleteLink,
    setSelectedCategory,
    setSearchQuery,
  } = useLinksStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    url: '',
    title: '',
    description: '',
    category: 'food' as LinkCategory,
  });

  // 1. Fetch Links
  useEffect(() => {
    const fetchLinks = async () => {
      const res = await api.get('/links');
      if (res.success && res.data) {
        setLinks(res.data);
      }
    };
    fetchLinks();
  }, []);

  // 2. Realtime Synchronization
  useEffect(() => {
    const handleCreated = (link: SharedLinkDTO) => addLink(link);
    const handleDeleted = (payload: { id: string }) => deleteLink(payload.id);

    socketService.on(SOCKET_EVENTS.LINK_CREATED, handleCreated);
    socketService.on(SOCKET_EVENTS.LINK_DELETED, handleDeleted);

    return () => {
      socketService.off(SOCKET_EVENTS.LINK_CREATED, handleCreated);
      socketService.off(SOCKET_EVENTS.LINK_DELETED, handleDeleted);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/links', form);
    if (res.success && res.data) {
      addLink(res.data);
      setIsModalOpen(false);
      setForm({
        url: '',
        title: '',
        description: '',
        category: 'food',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this bookmark?')) {
      deleteLink(id);
      await api.delete(`/links/${id}`);
    }
  };

  // Filter and search
  const filteredLinks = links.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchQuery =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
            <Bookmark className="w-4 h-4 text-emerald-400" /> Shared Couple Bookmarks
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Links & Ideas to Share
          </h1>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-romantic px-4 py-2.5 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Save Link
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
                  isSelected
                    ? 'bg-white/15 text-white shadow-sm border border-white/20'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links..."
            className="glass-input w-full pl-9 pr-3 py-1.5 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Links Grid */}
      {filteredLinks.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-white/10">
          <Bookmark className="w-8 h-8 text-emerald-400/60 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-semibold text-white mb-1">No bookmarks found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Save articles, vacation rentals, recipes, or YouTube videos to look at together later.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-romantic px-5 py-2 text-xs font-semibold"
          >
            Save First Link
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLinks.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start gap-3 mb-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      <Bookmark className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      {item.category}
                    </span>
                    <h3 className="text-sm font-semibold text-white truncate group-hover:text-rose-200 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-3">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-romantic-400 hover:text-romantic-300 font-medium flex items-center gap-1"
                >
                  Visit Link <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-all"
                  title="Delete link"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Link Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-serif text-xl font-bold text-white mb-1">Save a Link</h2>
            <p className="text-xs text-slate-400 mb-5">Save something exciting to explore together</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">URL (Website link)</label>
                <input
                  type="url"
                  required
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Dream Kyoto Itinerary"
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as LinkCategory })}
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                >
                  <option value="food">Food & Dining</option>
                  <option value="travel">Travel & Trips</option>
                  <option value="movies">Movies & Shows</option>
                  <option value="music">Music & Playlists</option>
                  <option value="shopping">Gifts & Shopping</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Note / Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Why we should check this out..."
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
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
