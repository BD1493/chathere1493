const http = require('http');
const socketIo = require('socket.io');

// --- Configuration ---
const SOCKET_PORT = 3001; 
const ORIGIN_URL = '*'; // Allow all origins for development (CHANGE THIS IN PRODUCTION)

// Create a simple HTTP server (for a basic health check and Socket.IO attachment)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Socket.IO Server is running on port ' + SOCKET_PORT);
});

// Configure Socket.IO
const io = socketIo(server, {
    cors: {
        origin: ORIGIN_URL,
        methods: ["GET", "POST"]
    }
});

// Use a simple Map to track online users (userId -> socketId)
const activeUsers = new Map(); 

io.on('connection', (socket) => {
    // Authenticate using the token (which is the userId in your setup)
    const userId = socket.handshake.auth.token; 
    
    if (!userId) {
        console.log("Connection attempt without userId. Disconnecting.");
        socket.disconnect();
        return;
    }
    
    // Store active user and notify others
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} connected. Total active: ${activeUsers.size}`);
    socket.broadcast.emit('user_status_update', { userId, isOnline: true });

    // --- SOCKET HANDLERS ---
    
    /**
     * Handles outgoing messages. 
     * In this hybrid architecture, the PHP API is expected to save the message first.
     * The socket server only handles the real-time broadcast.
     */
    socket.on('send_message', (message, callback) => {
        // Broadcast the message to all participants (simplistic broadcast for 1-on-1 chats)
        // A more robust system would find all participants and target only their sockets.
        socket.broadcast.emit('new_message', message);
        
        // Acknowledge to sender that the real-time broadcast was initiated
        callback({ success: true }); 
    });

    /**
     * Notifies a target user that they have a new chat request or status update.
     */
    socket.on('notify_request', (data) => {
        const targetSocketId = activeUsers.get(data.userId);
        if (targetSocketId) {
            // Tell the target user's frontend to refresh their dashboard data via the PHP API
            io.to(targetSocketId).emit('request_update', { userId: data.userId });
        }
    });

    /**
     * Client requests the online status of a target user.
     */
    socket.on('check_status', (targetId) => {
        const isOnline = activeUsers.has(targetId);
        // Reply only to the requesting socket
        socket.emit('user_status_update', { userId: targetId, isOnline });
    });

    // --- Disconnection ---
    socket.on('disconnect', () => {
        // Clean up and notify others that the user is offline
        activeUsers.delete(userId);
        console.log(`User ${userId} disconnected. Total active: ${activeUsers.size}`);
        socket.broadcast.emit('user_status_update', { userId, isOnline: false });
    });
});

server.listen(SOCKET_PORT, () => {
    console.log(`Socket.IO Server running on port ${SOCKET_PORT}`);
});
