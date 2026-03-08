import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export const useSocket = () => {
    const socket = useRef<Socket | null>(null)

    useEffect(() => {
        socket.current = io(import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000'))


        socket.current.on('connect', () => {
            console.log('Connected to WebSocket server')
        })

        socket.current.on('disconnect', () => {
            console.log('Disconnected from WebSocket server')
        })

        return () => {
            if (socket.current) {
                socket.current.disconnect()
            }
        }
    }, [])

    return socket.current
}
