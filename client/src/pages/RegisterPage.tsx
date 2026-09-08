import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { User, Mail, Lock, Smile, AlertCircle } from 'lucide-react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
];

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();

  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    avatarUrl: AVATAR_PRESETS[0],
    bio: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await register(form);
    if (success) {
      navigate('/partner');
    }
  };

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white text-center mb-1">
        Create Your Account
      </h2>
      <p className="text-xs text-slate-400 text-center mb-5">
        Start your private journey with your loved one
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Display Name
          </label>
          <div className="relative">
            <Smile className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="e.g. Alex"
              className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Username (Unique handle)
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. alex_rivers"
              className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="alex@example.com"
              className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Password (at least 6 chars)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Avatar Preset Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Choose Avatar
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {AVATAR_PRESETS.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setForm({ ...form, avatarUrl: url })}
                className={`relative w-10 h-10 rounded-full overflow-hidden border-2 transition-transform shrink-0 ${
                  form.avatarUrl === url
                    ? 'border-romantic-500 scale-110 shadow-glow'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-romantic w-full py-2.5 text-xs font-semibold mt-3"
        >
          {isLoading ? 'Creating Space...' : 'Register & Connect'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-romantic-400 hover:text-romantic-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
