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
import { QK } from '../hooks/useApi';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');


const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoggedIn } = useAuthStore();
    const { addNotification } = useNotificationStore();
    const qc = useQueryClient();
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
            // Only show if intended for this user (company room broadcasts to all)
            if (notification.recipientId === user.id || notification.recipientId === undefined) {
                addNotification(notification);
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
