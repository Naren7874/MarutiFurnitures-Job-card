import { Server } from 'socket.io';

/**
 * Initialize Socket.io on the HTTP server.
 * 
 * Rooms: Each user joins their companyId room → only sees events for their company.
 * 
 * Events emitted from controllers:
 *   'jobcard:status'     → { jobCardId, status, jobCardNumber }
 *   'notification:new'   → { notification }
 *   'inventory:lowstock' → { itemId, itemName, currentStock }
 *
 * @param {http.Server} server - Node HTTP server
 * @returns {Server}           - Socket.io server instance (exported for use in controllers)
 */
let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Client sends { companyId, userId } on connect
    socket.on('join', ({ companyId, userId }) => {
      if (companyId) {
        socket.join(`company:${companyId}`);
        console.log(`Socket ${socket.id} joined company:${companyId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Emit a job card status change to all users in the company room.
 * Call this from any controller that changes jobCard.status.
 *
 * @param {string} companyId
 * @param {object} payload   - { jobCardId, status, jobCardNumber, title }
 */
export const emitJobCardStatus = (companyId, payload) => {
  if (!io) return;
  io.to(`company:${companyId}`).emit('jobcard:status', payload);
};

/**
 * Emit a new in-app notification to the recipient's company room.
 * (Frontend filters for matching userId)
 */
export const emitNotification = (companyId, notification) => {
  if (!io) return;
  io.to(`company:${companyId}`).emit('notification:new', notification);
};

export const getIO = () => io;
