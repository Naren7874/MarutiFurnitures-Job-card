/**
 * Notification Store (Zustand)
 * ─────────────────────────────
 * Manages in-app notifications received via Socket.io.
 * Not persisted — cleared on refresh.
 */

import { create } from 'zustand';

export interface AppNotification {
    _id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    isSheetOpen: boolean;

    // Actions
    addNotification: (n: AppNotification) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    setSheetOpen: (open: boolean) => void;
    setNotifications: (ns: AppNotification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    isSheetOpen: false,

    addNotification: (n) =>
        set((state) => ({
            notifications: [n, ...state.notifications].slice(0, 50), // Max 50 in memory
            unreadCount: state.unreadCount + 1,
        })),

    markRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((n) => n._id === id ? { ...n, read: true } : n),
            unreadCount: Math.max(0, state.unreadCount - 1),
        })),

    markAllRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
        })),

    setSheetOpen: (open) => set({ isSheetOpen: open }),

    setNotifications: (ns) =>
        set({
            notifications: ns,
            unreadCount: ns.filter((n) => !n.read).length,
        }),
}));
