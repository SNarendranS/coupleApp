import { create } from 'zustand';
import { GameDTO } from '@couple/shared';

interface GameState {
  activeGame: GameDTO | null;
  history: GameDTO[];
  gameType: 'xo' | 'bingo';
  isLoading: boolean;
  setActiveGame: (game: GameDTO | null) => void;
  setHistory: (history: GameDTO[]) => void;
  setGameType: (type: 'xo' | 'bingo') => void;
  setLoading: (isLoading: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  activeGame: null,
  history: [],
  gameType: 'xo',
  isLoading: false,

  setActiveGame: (activeGame) => set({ activeGame }),
  setHistory: (history) => set({ history }),
  setGameType: (gameType) => set({ gameType }),
  setLoading: (isLoading) => set({ isLoading }),
}));
