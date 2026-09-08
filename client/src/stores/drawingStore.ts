import { create } from 'zustand';
import { DrawingStrokeDTO, DrawingBoardDTO, DrawingTool } from '@couple/shared';

interface DrawingState {
  board: DrawingBoardDTO | null;
  strokes: DrawingStrokeDTO[];
  tool: DrawingTool;
  color: string;
  width: number;
  backgroundColor: '#ffffff' | '#121214';
  setBoard: (board: DrawingBoardDTO, strokes: DrawingStrokeDTO[]) => void;
  addStroke: (stroke: DrawingStrokeDTO) => void;
  removeStroke: (strokeId: string) => void;
  clearStrokes: () => void;
  setTool: (tool: DrawingTool) => void;
  setColor: (color: string) => void;
  setWidth: (width: number) => void;
  setBackgroundColor: (color: '#ffffff' | '#121214') => void;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  board: null,
  strokes: [],
  tool: 'pen',
  color: '#f43f5e',
  width: 12,
  backgroundColor: '#ffffff',

  setBoard: (board, strokes) =>
    set({
      board,
      strokes,
      backgroundColor: board.backgroundColor || '#ffffff',
    }),

  addStroke: (stroke) => {
    const existing = get().strokes.some((s) => s.strokeId === stroke.strokeId);
    if (!existing) {
      set((state) => ({ strokes: [...state.strokes, stroke] }));
    }
  },

  removeStroke: (strokeId) =>
    set((state) => ({
      strokes: state.strokes.filter((s) => s.strokeId !== strokeId),
    })),

  clearStrokes: () => set({ strokes: [] }),

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setWidth: (width) => set({ width }),
  setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
}));
