import React, { useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usePresenceStore } from '../stores/presenceStore';
import { useNotificationStore } from '../stores/notificationStore';
import { socketService } from '../services/socket';
import { Heart } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { MobileNav } from '../components/layout/MobileNav';
import { HeartParticlesCanvas } from '../components/3d/HeartParticlesCanvas';
import { SOCKET_EVENTS } from '@couple/shared';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { user, couple, isInitialized, checkAuth } = useAuthStore();
  const { setPartnerOnline, setPartnerActivity } = usePresenceStore();
  const { addNotification, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();

    // Setup global socket event listeners
    const handlePresenceUpdate = (payload: { userId: string; isOnline: boolean; lastSeenAt: string }) => {
      if (user && payload.userId !== user.id) {
        setPartnerOnline(payload.isOnline, payload.lastSeenAt);
      }
    };

    const handlePresenceActivity = (payload: { userId: string; activity: string }) => {
      if (user && payload.userId !== user.id) {
        setPartnerActivity(payload.activity);
      }
    };

    const handleNewNotification = (notif: any) => {
      addNotification(notif);
    };

    const handlePartnerConnected = () => {
      checkAuth();
    };

    socketService.on(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresenceUpdate);
    socketService.on(SOCKET_EVENTS.PRESENCE_ACTIVITY, handlePresenceActivity);
    socketService.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);
    socketService.on(SOCKET_EVENTS.PARTNER_CONNECTED, handlePartnerConnected);

    return () => {
      socketService.off(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresenceUpdate);
      socketService.off(SOCKET_EVENTS.PRESENCE_ACTIVITY, handlePresenceActivity);
      socketService.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);
      socketService.off(SOCKET_EVENTS.PARTNER_CONNECTED, handlePartnerConnected);
    };
  }, [user]);

  // Broadcast current activity based on route
  useEffect(() => {
    let activity = 'Viewing dashboard';
    const path = location.pathname;

    if (path.startsWith('/drawing')) activity = 'Drawing on canvas';
    else if (path.startsWith('/games')) activity = 'Playing games';
    else if (path.startsWith('/calendar')) activity = 'Checking calendar';
    else if (path.startsWith('/memories')) activity = 'Browsing memories';
    else if (path.startsWith('/links')) activity = 'Exploring links';
    else if (path.startsWith('/settings')) activity = 'In settings';

    socketService.emit(SOCKET_EVENTS.PRESENCE_ACTIVITY, { activity });
  }, [location.pathname]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-space-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-purple-500 flex items-center justify-center animate-pulse">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <p className="text-sm font-medium text-slate-400">Loading your private room...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user has no couple, redirect to partner setup screen
  if (!couple && location.pathname !== '/partner') {
    return <Navigate to="/partner" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-space-950 pb-24 sm:pb-28 lg:pb-0">
      <HeartParticlesCanvas className="fixed inset-0 pointer-events-none z-0 opacity-40" />
      <Navbar />
      <main className="flex-1 relative">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};
