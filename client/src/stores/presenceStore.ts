import { create } from 'zustand';

interface PresenceState {
  isPartnerOnline: boolean;
  partnerLastSeen: string | null;
  partnerActivity: string | null;
  setPartnerOnline: (isOnline: boolean, lastSeenAt?: string) => void;
  setPartnerActivity: (activity: string | null) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  isPartnerOnline: false,
  partnerLastSeen: null,
  partnerActivity: null,

  setPartnerOnline: (isOnline, lastSeenAt) =>
    set({
      isPartnerOnline: isOnline,
      partnerLastSeen: lastSeenAt || new Date().toISOString(),
      partnerActivity: isOnline ? undefined : null,
    }),

  setPartnerActivity: (activity) => set({ partnerActivity: activity }),
}));
