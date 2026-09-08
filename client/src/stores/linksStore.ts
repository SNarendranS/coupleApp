import { create } from 'zustand';
import { SharedLinkDTO, LinkCategory } from '@couple/shared';

interface LinksState {
  links: SharedLinkDTO[];
  selectedCategory: string;
  searchQuery: string;
  isLoading: boolean;
  setLinks: (links: SharedLinkDTO[]) => void;
  addLink: (link: SharedLinkDTO) => void;
  updateLink: (link: SharedLinkDTO) => void;
  deleteLink: (id: string) => void;
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useLinksStore = create<LinksState>((set) => ({
  links: [],
  selectedCategory: 'all',
  searchQuery: '',
  isLoading: false,

  setLinks: (links) => set({ links }),
  addLink: (link) =>
    set((state) => ({
      links: [link, ...state.links.filter((l) => l.id !== link.id)],
    })),
  updateLink: (link) =>
    set((state) => ({
      links: state.links.map((l) => (l.id === link.id ? link : l)),
    })),
  deleteLink: (id) =>
    set((state) => ({
      links: state.links.filter((l) => l.id !== id),
    })),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (isLoading) => set({ isLoading }),
}));
