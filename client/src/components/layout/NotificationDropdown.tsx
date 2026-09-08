import React from 'react';
import { createPortal } from 'react-dom';
import { useNotificationStore } from '../../stores/notificationStore';
import { Bell, CheckCheck, Heart, Calendar, Gamepad2, Link2, Sparkles, X } from 'lucide-react';
import { NotificationDTO } from '@couple/shared';

export const NotificationDropdown: React.FC = () => {
  const { notifications, isOpen, setOpen, markAsRead, markAllAsRead } =
    useNotificationStore();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'partner_request':
      case 'partner_accepted':
        return <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />;
      case 'calendar_new':
      case 'calendar_reminder':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'game_invite':
      case 'game_finished':
        return <Gamepad2 className="w-4 h-4 text-purple-400" />;
      case 'link_new':
        return <Link2 className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-rose-400" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const dropdownContent = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center sm:justify-end p-4 sm:p-6 pt-16 sm:pt-20 pointer-events-none animate-in fade-in duration-200">
      {/* Dark backdrop overlay to dismiss */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm pointer-events-auto"
        onClick={() => setOpen(false)}
      />

      {/* High-contrast Notification Card */}
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-[#131520] border-2 border-white/20 rounded-3xl shadow-2xl p-4 sm:p-5 pointer-events-auto z-10 space-y-3"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px -5px rgba(244, 63, 94, 0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-romantic-500/25 flex items-center justify-center text-rose-400 border border-rose-500/30">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-white">Notifications</h3>
              <span className="text-[11px] font-medium text-rose-300">
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-rose-300 hover:text-white font-medium flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-rose-400" />
                <span>Mark read</span>
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
              title="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto space-y-2 pr-1">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <p className="font-semibold text-white text-sm">No notifications yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Partner updates, games, and drawing alerts will appear right here.
              </p>
            </div>
          ) : (
            notifications.map((notif: NotificationDTO) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`p-3 rounded-2xl transition-all cursor-pointer flex gap-3 items-start border ${
                  notif.read
                    ? 'bg-white/[0.03] border-white/10 opacity-75 hover:opacity-100 hover:bg-white/[0.06]'
                    : 'bg-gradient-to-r from-rose-950/40 to-purple-950/40 border-rose-500/40 hover:border-rose-400 shadow-md'
                }`}
              >
                <div className="p-2 rounded-xl bg-white/10 border border-white/10 shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-white truncate">{notif.title}</p>
                    {!notif.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 ring-2 ring-rose-950 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed break-words font-normal">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1.5 block font-medium">
                    {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dropdownContent, document.body) : null;
};

