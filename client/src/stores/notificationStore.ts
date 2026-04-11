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
    jobCardId?: string;
    projectId?: string;
    quotationId?: string;
}

interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    isSheetOpen: boolean;
    isLoading: boolean;

    // Actions
    fetchNotifications: (showToasts?: boolean) => Promise<void>;
    addNotification: (n: AppNotification) => void;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    setSheetOpen: (open: boolean) => void;
    setNotifications: (ns: AppNotification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isSheetOpen: false,
    isLoading: false,

    fetchNotifications: async (showToasts = false) => {
        set({ isLoading: true });
        try {
            const res: any = await apiGet('/notifications');
            if (res.success && Array.isArray(res.data)) {
                // Map backend isRead to frontend read if necessary
                const mapped = res.data.map((n: any) => ({
                    ...n,
                    read: n.isRead || n.read || false
                }));
                const unread = mapped.filter((n: any) => !n.read);
                set({ 
                    notifications: mapped, 
                    unreadCount: unread.length 
                });

                if (showToasts && unread.length > 0) {
                    const toShow = unread.slice(0, 3); // Max 3 so we don't spam the screen heavily
                    import('sonner').then(({ toast }) => {
                        toShow.forEach((n: any) => {
                            toast(n.title || "Missed Notification", {
                                description: n.message || "",
                                action: n.jobCardId ? {
                                    label: 'View Job Card',
                                    onClick: async () => {
                                        if (n._id) {
                                            try {
                                                await get().markRead(n._id);
                                            } catch (e) {}
                                        }
                                        setTimeout(() => {
                                            window.location.href = `/jobcards/${n.jobCardId}`;
                                        }, 150);
                                    }
                                } : undefined,
                                duration: 5000,
                            });
                        });
                        if (unread.length > 3) {
                            toast("More Missed Notifications", { description: `You have ${unread.length - 3} more missed alerts.` });
                        }
                    });
                    try {
                        const audio = new Audio('/sounds/apple_pay.mp3');
                        audio.play().catch(e => console.error("Audio playback error:", e));
                    } catch (e) {}
                }
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
