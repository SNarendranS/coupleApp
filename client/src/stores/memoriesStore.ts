import { create } from 'zustand';
import { MemoryDTO } from '@couple/shared';

interface MemoriesState {
  memories: MemoryDTO[];
  isLoading: boolean;
  setMemories: (memories: MemoryDTO[]) => void;
  addMemory: (memory: MemoryDTO) => void;
  updateMemory: (memory: MemoryDTO) => void;
  deleteMemory: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useMemoriesStore = create<MemoriesState>((set) => ({
  memories: [],
  isLoading: false,

  setMemories: (memories) => set({ memories }),
  addMemory: (memory) =>
    set((state) => ({
      memories: [memory, ...state.memories.filter((m) => m.id !== memory.id)],
    })),
  updateMemory: (memory) =>
    set((state) => ({
      memories: state.memories.map((m) => (m.id === memory.id ? memory : m)),
    })),
  deleteMemory: (id) =>
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));
