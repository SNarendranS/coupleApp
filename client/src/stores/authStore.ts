import { create } from 'zustand';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { UserDTO, CoupleDTO, PartnerProfile, LoginInput, RegisterInput } from '@couple/shared';

interface AuthState {
  user: UserDTO | null;
  partner: PartnerProfile | null;
  couple: CoupleDTO | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (credentials: LoginInput) => Promise<boolean>;
  register: (data: RegisterInput) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updates: Partial<UserDTO>) => void;
  setCoupleData: (couple: CoupleDTO, partner: PartnerProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  partner: null,
  couple: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    const res = await api.post('/auth/login', credentials);

    if (res.success && res.data) {
      const { user, token } = res.data;
      api.setToken(token);
      set({ user, token, isLoading: false });

      // Connect socket
      socketService.connect();

      // Fetch partner/couple details
      await get().checkAuth();
      return true;
    } else {
      set({ error: res.error?.message || 'Login failed', isLoading: false });
      return false;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    const res = await api.post('/auth/register', data);

    if (res.success && res.data) {
      const { user, token } = res.data;
      api.setToken(token);
      set({ user, token, isLoading: false });

      socketService.connect();
      await get().checkAuth();
      return true;
    } else {
      set({ error: res.error?.message || 'Registration failed', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    api.setToken(null);
    socketService.disconnect();
    set({ user: null, partner: null, couple: null, token: null, error: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isInitialized: true, isLoading: false, user: null });
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data) {
        set({
          user: res.data.user,
          partner: res.data.partner,
          couple: res.data.couple,
          isInitialized: true,
          isLoading: false,
        });

        // Ensure socket is connected
        socketService.connect();
      } else {
        api.setToken(null);
        set({ user: null, partner: null, couple: null, isInitialized: true, isLoading: false });
      }
    } catch {
      set({ isInitialized: true, isLoading: false });
    }
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },

  setCoupleData: (couple, partner) => {
    set({ couple, partner });
  },
}));
