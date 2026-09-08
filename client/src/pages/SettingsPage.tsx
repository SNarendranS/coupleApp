import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { Settings as SettingsIcon, Heart, User, Sparkles, Check, LogOut } from 'lucide-react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
];

export const SettingsPage: React.FC = () => {
  const { user, partner, couple, logout, updateUser, setCoupleData } = useAuthStore();

  const [coupleForm, setCoupleForm] = useState({
    name: '',
    relationshipStartDate: '',
  });

  const [personalForm, setPersonalForm] = useState({
    displayName: '',
    avatarUrl: '',
    bio: '',
  });

  const [coupleSaved, setCoupleSaved] = useState(false);
  const [personalSaved, setPersonalSaved] = useState(false);

  useEffect(() => {
    if (couple) {
      setCoupleForm({
        name: couple.name || '',
        relationshipStartDate: couple.relationshipStartDate
          ? new Date(couple.relationshipStartDate).toISOString().split('T')[0]
          : '',
      });
    }

    if (user) {
      setPersonalForm({
        displayName: user.displayName || '',
        avatarUrl: user.avatarUrl || AVATAR_PRESETS[0],
        bio: user.bio || '',
      });
    }
  }, [couple, user]);

  const handleCoupleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.patch('/couple/settings', coupleForm);
    if (res.success && res.data) {
      setCoupleData(res.data, partner);
      setCoupleSaved(true);
      setTimeout(() => setCoupleSaved(false), 3000);
    }
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.patch('/auth/profile', personalForm);
    if (res.success && res.data) {
      updateUser(res.data.user);
      setPersonalSaved(true);
      setTimeout(() => setPersonalSaved(false), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
          <SettingsIcon className="w-4 h-4 text-rose-400" /> Preferences
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Space & Profile Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Couple Space Settings */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-romantic-500/20 text-romantic-400 flex items-center justify-center">
                <Heart className="w-5 h-5 text-rose-400" />
              </div>
              <h2 className="font-serif text-lg font-bold text-white">Couple Space Settings</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Shared between you and {partner?.displayName || 'your partner'}.
            </p>

            <form onSubmit={handleCoupleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Couple Name</label>
                <input
                  type="text"
                  value={coupleForm.name}
                  onChange={(e) => setCoupleForm({ ...coupleForm, name: e.target.value })}
                  placeholder="e.g. Alex & Sam"
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Relationship Start Date (Anniversary)
                </label>
                <input
                  type="date"
                  value={coupleForm.relationshipStartDate}
                  onChange={(e) =>
                    setCoupleForm({ ...coupleForm, relationshipStartDate: e.target.value })
                  }
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="btn-romantic w-full py-2.5 text-xs font-semibold mt-4 flex items-center justify-center gap-1.5"
              >
                {coupleSaved ? (
                  <>
                    <Check className="w-4 h-4" /> Saved!
                  </>
                ) : (
                  'Save Couple Settings'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Personal Profile Settings */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="font-serif text-lg font-bold text-white">Personal Profile</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">Your personal identity shown to your partner.</p>

            <form onSubmit={handlePersonalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={personalForm.displayName}
                  onChange={(e) =>
                    setPersonalForm({ ...personalForm, displayName: e.target.value })
                  }
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Avatar</label>
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={personalForm.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-rose-400"
                  />
                  <input
                    type="url"
                    value={personalForm.avatarUrl}
                    onChange={(e) => setPersonalForm({ ...personalForm, avatarUrl: e.target.value })}
                    placeholder="Or paste avatar URL..."
                    className="glass-input flex-1 px-3.5 py-1.5 rounded-xl text-xs"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPersonalForm({ ...personalForm, avatarUrl: url })}
                      className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 transition-transform ${
                        personalForm.avatarUrl === url ? 'border-rose-400 scale-110' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bio / Sweet Note</label>
                <textarea
                  rows={2}
                  value={personalForm.bio}
                  onChange={(e) => setPersonalForm({ ...personalForm, bio: e.target.value })}
                  placeholder="A note to your partner..."
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="btn-romantic w-full py-2.5 text-xs font-semibold mt-4 flex items-center justify-center gap-1.5"
              >
                {personalSaved ? (
                  <>
                    <Check className="w-4 h-4" /> Saved!
                  </>
                ) : (
                  'Update Profile'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Sign Out Card */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Sign Out of UsTwo</h3>
          <p className="text-xs text-slate-400 mt-0.5">End your current session safely on this device.</p>
        </div>
        <button
          onClick={() => logout()}
          className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
};
