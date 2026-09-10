import { create } from 'zustand';
import { CalendarEventDTO, CountdownItemDTO } from '@couple/shared';

interface CalendarState {
  events: CalendarEventDTO[];
  countdowns: CountdownItemDTO[];
  selectedDate: string; // YYYY-MM-DD
  activeTab: 'month' | 'story' | 'countdowns';
  isLoading: boolean;
  setEvents: (events: CalendarEventDTO[]) => void;
  setCountdowns: (countdowns: CountdownItemDTO[]) => void;
  setActiveTab: (tab: 'month' | 'story' | 'countdowns') => void;
  addEvent: (event: CalendarEventDTO) => void;
  updateEvent: (event: CalendarEventDTO) => void;
  deleteEvent: (id: string) => void;
  setSelectedDate: (date: string) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  countdowns: [],
  selectedDate: new Date().toISOString().split('T')[0],
  activeTab: 'month',
  isLoading: false,

  setEvents: (events) => set({ events }),
  setCountdowns: (countdowns) => set({ countdowns }),
  setActiveTab: (activeTab) => set({ activeTab }),
  addEvent: (event) =>
    set((state) => ({
      events: [...state.events.filter((e) => e.id !== event.id), event],
    })),
  updateEvent: (event) =>
    set((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e)),
    })),
  deleteEvent: (id) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== id && (e as any).originalEventId !== id),
    })),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setLoading: (isLoading) => set({ isLoading }),
}));
