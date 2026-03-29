import { create } from 'zustand';
import { apiGet, apiPatch } from '../lib/axios';

export interface AppNotification {
    _id: string;
    type: string;
    title: string;
    message: string;
    read?: boolean;
    isRead?: boolean; // Support both backend (isRead) and frontend (read) naming
    createdAt: string;
}

interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    isSheetOpen: boolean;
    isLoading: boolean;

    // Actions
    fetchNotifications: () => Promise<void>;
    addNotification: (n: AppNotification) => void;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    setSheetOpen: (open: boolean) => void;
    setNotifications: (ns: AppNotification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    isSheetOpen: false,
    isLoading: false,

    fetchNotifications: async () => {
        set({ isLoading: true });
        try {
            const res: any = await apiGet('/notifications');
            if (res.success && Array.isArray(res.data)) {
                // Map backend isRead to frontend read if necessary
                const mapped = res.data.map((n: any) => ({
                    ...n,
                    read: n.isRead || n.read || false
                }));
                set({ 
                    notifications: mapped, 
                    unreadCount: mapped.filter((n: any) => !n.read).length 
                });
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    addNotification: (n) => {
        const mapped = { ...n, read: n.isRead || n.read || false };
        set((state) => ({
            notifications: [mapped, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + (mapped.read ? 0 : 1),
        }));
    },

    markRead: async (id) => {
        try {
            await apiPatch(`/notifications/${id}/read`);
            set((state) => ({
                notifications: state.notifications.map((n) => n._id === id ? { ...n, read: true, isRead: true } : n),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    },

    markAllRead: async () => {
        try {
            await apiPatch('/notifications/read-all');
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, read: true, isRead: true })),
                unreadCount: 0,
            }));
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
        }
    },

    setSheetOpen: (open) => set({ isSheetOpen: open }),

    setNotifications: (ns) => {
        const mapped = ns.map(n => ({ ...n, read: n.isRead || n.read || false }));
        set({
            notifications: mapped,
            unreadCount: mapped.filter((n) => !n.read).length,
        });
    },
}));
