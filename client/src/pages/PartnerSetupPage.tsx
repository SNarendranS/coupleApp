import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { PartnerProfile, SOCKET_EVENTS } from '@couple/shared';
import {
  Heart,
  Search,
  UserCheck,
  UserPlus,
  Check,
  X,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const PartnerSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, couple, checkAuth } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PartnerProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // If already partnered, redirect to dashboard
  useEffect(() => {
    if (couple) {
      navigate('/dashboard');
    }
  }, [couple, navigate]);

  const loadRequests = async () => {
    const res = await api.get('/partner/requests');
    if (res.success && res.data) {
      setIncomingRequests(res.data.incoming || []);
      setOutgoingRequests(res.data.outgoing || []);
    }
  };

  useEffect(() => {
    loadRequests();

    // Listen for real-time partner connection & requests
    const handlePartnerConnected = async () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      await checkAuth();
      navigate('/dashboard');
    };

    const handleNewNotification = (notif: any) => {
      if (notif.type === 'partner_request' || notif.type === 'partner_accepted') {
        loadRequests();
      }
    };

    socketService.on(SOCKET_EVENTS.PARTNER_CONNECTED, handlePartnerConnected);
    socketService.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);

    return () => {
      socketService.off(SOCKET_EVENTS.PARTNER_CONNECTED, handlePartnerConnected);
      socketService.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

    setIsSearching(true);
    setError(null);
    const res = await api.get(`/partner/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setIsSearching(false);

    if (res.success && res.data) {
      setSearchResults(res.data);
    } else {
      setError(res.error?.message || 'Search failed');
    }
  };

  const handleSendRequest = async (receiverId: string) => {
    setError(null);
    setStatusMessage(null);
    const res = await api.post('/partner/requests', { receiverId });

    if (res.success) {
      setStatusMessage('Partner request sent successfully! Waiting for their response.');
      loadRequests();
    } else {
      setError(res.error?.message || 'Could not send request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setError(null);
    const res = await api.post(`/partner/requests/${requestId}/accept`);

    if (res.success) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
      await checkAuth();
      navigate('/dashboard');
    } else {
      setError(res.error?.message || 'Could not accept request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const res = await api.post(`/partner/requests/${requestId}/reject`);
    if (res.success) {
      loadRequests();
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    const res = await api.delete(`/partner/requests/${requestId}`);
    if (res.success) {
      loadRequests();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-space-950">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-romantic-600 to-lavender-500 flex items-center justify-center shadow-glow mx-auto mb-3">
            <Heart className="w-7 h-7 text-white fill-white/90" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white mb-2">Connect with Your Partner</h1>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Search for your partner by username or display name to establish your private, 2-person digital space.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {statusMessage && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Incoming Requests Section (if any) */}
        {incomingRequests.length > 0 && (
          <div className="mb-8 glass-panel rounded-2xl p-5 border border-romantic-500/30 bg-romantic-500/5">
            <h2 className="text-xs font-semibold text-rose-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Incoming Partner Requests ({incomingRequests.length})
            </h2>

            <div className="space-y-3">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={req.sender.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={req.sender.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-rose-400"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{req.sender.displayName}</p>
                      <p className="text-xs text-slate-400">@{req.sender.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="btn-romantic px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="btn-secondary px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="glass-panel rounded-3xl p-6 shadow-2xl border border-white/10 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or display name..."
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="btn-romantic px-5 py-2.5 text-xs font-semibold shrink-0"
            >
              {isSearching ? 'Searching...' : 'Find'}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-5 divide-y divide-white/5">
              <p className="text-xs font-medium text-slate-400 mb-2">Results:</p>
              {searchResults.map((person) => {
                const hasSent = outgoingRequests.some((r) => r.receiver?.id === person.id);

                return (
                  <div key={person.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={person.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                        alt={person.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">{person.displayName}</p>
                        <p className="text-[11px] text-slate-400">@{person.username}</p>
                      </div>
                    </div>

                    {person.isPartnered ? (
                      <span className="text-[11px] text-slate-500 font-medium px-2.5 py-1 rounded-lg bg-white/5">
                        Already in a couple
                      </span>
                    ) : hasSent ? (
                      <span className="text-[11px] text-amber-400 font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Request Pending
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(person.id)}
                        className="btn-romantic px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Send Request
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Outgoing Pending Requests */}
        {outgoingRequests.length > 0 && (
          <div className="glass-panel rounded-2xl p-4 border border-white/10">
            <h3 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Outgoing Pending Requests ({outgoingRequests.length})
            </h3>
            <div className="space-y-2">
              {outgoingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">
                      Request sent to <strong className="text-white">{req.receiver?.displayName}</strong> (@{req.receiver?.username})
                    </span>
                  </div>
                  <button
                    onClick={() => handleCancelRequest(req.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
