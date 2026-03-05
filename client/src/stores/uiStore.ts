/**
 * UI Store (Zustand) — non-persisted global UI state
 * ────────────────────────────────────────────────────
 * Sidebar collapse, theme, active company (for super_admin switching), etc.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
    sidebarCollapsed: boolean;

    // Actions
    toggleSidebar: () => void;
    setSidebar: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            sidebarCollapsed: false,

            toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
            setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
        }),
        {
            name: 'maruti-ui',
        }
    )
);


