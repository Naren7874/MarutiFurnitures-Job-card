/**
 * Socket Context
 * ─────────────────────────────────
 * Provides a single socket.io connection to the entire app.
 * Emits companyId room join on connect.
 * Routes incoming events to Zustand stores.
 * 
 * Usage:
 *   const socket = useSocket();
 */

import { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { QK } from '../hooks/useApi';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');


const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoggedIn } = useAuthStore();
    const { addNotification } = useNotificationStore();
    const qc = useQueryClient();
    const navigate = useNavigate();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!isLoggedIn || !user) return;

        // Connect
        const socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            // Join company room
            socket.emit('join', { companyId: user.companyId, userId: user.id });
            
            // Re-fetch notifications and show top-center toasts for any missed events while offline
            useNotificationStore.getState().fetchNotifications(true);
        });

        // Real-time job card status → refetch the affected job card and the list
        socket.on('jobcard:status', ({ jobCardId }: { jobCardId: string; status: string }) => {
            if (user?.companyId) {
                qc.invalidateQueries({ queryKey: QK.jobCard(user.companyId, jobCardId) });
            }
            qc.invalidateQueries({ queryKey: ['jobcards'] });
        });

        // New in-app notification
        socket.on('notification:new', (notification) => {
            console.log('notification:new received', notification);
            // Only show if intended for this user (company room broadcasts to all)
            if (String(notification.recipientId) === String(user.id) || !notification.recipientId) {
                addNotification(notification);
                
                // Play notification sound
                try {
                    const audio = new Audio('/sounds/apple_pay.mp3');
                    audio.play().catch(e => console.error("Audio playback error:", e));
                } catch (e) {
                    console.error("Audio initialization error:", e);
                }

                // Show Toast Notification
                import('sonner').then(({ toast }) => {
                    toast(notification.title || "New Notification", {
                        description: notification.message || "",
                        action: notification.jobCardId ? {
                            label: 'View Job Card',
                            onClick: async () => {
                                if (notification._id) {
                                    try {
                                        await useNotificationStore.getState().markRead(notification._id);
                                    } catch (e) {}
                                }
                                navigate(`/jobcards/${notification.jobCardId}`);
                            }
                        } : undefined,
                        duration: 5000,
                    });
                });
            }
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isLoggedIn, user?.id]);

    return (
        <SocketContext.Provider value={socketRef.current}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
