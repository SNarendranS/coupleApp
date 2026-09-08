import { create } from 'zustand';
import { api } from '../services/api';
import { NotificationDTO } from '@couple/shared';

interface NotificationState {
  notifications: NotificationDTO[];
  unreadCount: number;
  isOpen: boolean;
  fetchNotifications: () => Promise<void>;
  addNotification: (notif: NotificationDTO) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  fetchNotifications: async () => {
    const res = await api.get('/notifications');
    if (res.success && res.data) {
      const notifications = res.data;
      const unreadCount = notifications.filter((n: NotificationDTO) => !n.read).length;
      set({ notifications, unreadCount });
    }
  },

  addNotification: (notif) => {
    set((state) => ({
      notifications: [notif, ...state.notifications],
      unreadCount: state.unreadCount + (notif.read ? 0 : 1),
    }));
  },

  markAsRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAllAsRead: async () => {
    await api.patch('/notifications/read-all');
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (isOpen) => set({ isOpen }),
}));
