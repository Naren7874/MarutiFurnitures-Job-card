/**
 * Job Card Store (Zustand)
 * ─────────────────────────
 * Manages local UI state for job card list (filters, pagination).
 * Server data itself lives in TanStack Query — this is only for
 * non-server UI state (selected filters, active job card, sidebar open, etc.)
 */

import { create } from 'zustand';

interface JobCardFilters {
    status: string;
    priority: string;
    projectId: string;
    search: string;
    page: number;
}

interface JobCardState {
    filters: JobCardFilters;
    activeJobCardId: string | null;
    viewMode: 'list' | 'kanban';

    // Actions
    setFilter: (key: keyof JobCardFilters, value: string | number) => void;
    resetFilters: () => void;
    setActiveJobCard: (id: string | null) => void;
    setViewMode: (mode: 'list' | 'kanban') => void;
}

const DEFAULT_FILTERS: JobCardFilters = {
    status: '',
    priority: '',
    projectId: '',
    search: '',
    page: 1,
};

export const useJobCardStore = create<JobCardState>((set) => ({
    filters: { ...DEFAULT_FILTERS },
    activeJobCardId: null,
    viewMode: 'list',

    setFilter: (key, value) =>
        set((state) => ({
            filters: { ...state.filters, [key]: value, page: key === 'page' ? Number(value) : 1 },
        })),

    resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

    setActiveJobCard: (id) => set({ activeJobCardId: id }),

    setViewMode: (mode) => set({ viewMode: mode }),
}));
