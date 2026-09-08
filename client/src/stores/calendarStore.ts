import { create } from 'zustand';
import { CalendarEventDTO } from '@couple/shared';

interface CalendarState {
  events: CalendarEventDTO[];
  selectedDate: string; // YYYY-MM-DD
  isLoading: boolean;
  setEvents: (events: CalendarEventDTO[]) => void;
  addEvent: (event: CalendarEventDTO) => void;
  updateEvent: (event: CalendarEventDTO) => void;
  deleteEvent: (id: string) => void;
  setSelectedDate: (date: string) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,

  setEvents: (events) => set({ events }),
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
      events: state.events.filter((e) => e.id !== id),
    })),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setLoading: (isLoading) => set({ isLoading }),
}));
