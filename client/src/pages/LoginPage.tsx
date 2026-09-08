import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();

  const [form, setForm] = useState({
    login: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(form);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white text-center mb-1">
        Welcome Back
      </h2>
      <p className="text-xs text-slate-400 text-center mb-6">
        Sign in to enter your private couple space
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Username or Email
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              placeholder="e.g. alex or alex@example.com"
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-romantic w-full py-2.5 text-xs font-semibold mt-2"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400">
          Do not have a space yet?{' '}
          <Link to="/register" className="text-romantic-400 hover:text-romantic-300 font-medium">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};
