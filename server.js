const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const dataStore = require('./data'); 

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// --- Configuration and Security ---
const API_SECRET_KEY = 'your_super_secret_api_key_12345'; // MUST MATCH FRONTEND
const ADMIN_SECRET_KEY = 'admin_master_access_key';
const PORT = 3000;

// Middleware to check API key
const authenticateAPI = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    if (token !== API_SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid API Key' });
    }
    next();
};

// --- Setup ---
app.use(bodyParser.json());

// **CRITICAL FIX:** Serve the root directory (where index.html is) as static content
app.use(express.static(__dirname));

// Serve profile pictures from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

// Initialize data store and create admin if necessary
dataStore.init();

// --- Multer for File Uploads ---
const storage = multer.diskStorage({
    destination: path.join(__dirname, 'uploads'),
    filename: (req, file, cb) => {
        // Use a unique name for the file
        const extension = path.extname(file.originalname);
        cb(null, `${req.body.userId}-${Date.now()}${extension}`);
    }
});
const upload = multer({ storage: storage });


// =======================================================================
// --- API Routes (Authenticated) ---
// =======================================================================

// Middleware to protect all API routes
app.use('/api', authenticateAPI);

// --- AUTH & USER ROUTES ---

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, name, age, password } = req.body;
        if (!email || !name || !age || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (parseInt(age) < 14) {
             return res.status(400).json({ error: 'Must be 14 or older to sign up.' });
        }
        
        const result = await dataStore.createUser({ email, name, age, password });
        if (result.error) {
            return res.status(409).json({ error: result.error });
        }
        res.json({ success: true, message: 'User created. Please log in.' });
    } catch (e) {
        res.status(500).json({ error: 'Server error during signup.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await dataStore.findUserByCredentials(email, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        // Return a simplified user object for the frontend
        const { password: _, ...userToSend } = user;
        res.json({ success: true, user: userToSend });
    } catch (e) {
        res.status(500).json({ error: 'Server error during login.' });
    }
});

app.get('/api/users/:userId', async (req, res) => {
    try {
        const user = await dataStore.findUserById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        const { password: _, ...userToSend } = user;
        res.json({ success: true, user: userToSend });
    } catch (e) {
        res.status(500).json({ error: 'Server error.' });
    }
});

app.get('/api/users/:userId/dashboard', async (req, res) => {
    try {
        const data = await dataStore.getUserDashboardData(req.params.userId);
        const user = await dataStore.findUserById(req.params.userId); // Re-fetch user to get updated requests count
        res.json({ ...data, user });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Failed to fetch dashboard data.' });
    }
});

app.get('/api/users/search', async (req, res) => {
    try {
        const users = await dataStore.searchUsers(req.query.query);
        // Remove sensitive info before sending
        const safeUsers = users.map(({ id, name, email }) => ({ id, name, email }));
        res.json({ success: true, users: safeUsers });
    } catch (e) {
        res.status(500).json({ error: 'Server error during search.' });
    }
});

app.post('/api/profile/upload_pic', upload.single('profile_pic'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        const filePath = `/uploads/${req.file.filename}`;
        await dataStore.updateUserProfilePic(req.body.userId, filePath);
        res.json({ success: true, message: 'Profile picture updated.', filePath });
    } catch (e) {
        res.status(500).json({ error: 'Error processing upload.' });
    }
});


// --- CHAT & REQUESTS ROUTES ---

app.post('/api/chat/request', async (req, res) => {
    try {
        const { senderId, senderName, targetId } = req.body;
        await dataStore.sendChatRequest(senderId, senderName, targetId);
        res.json({ success: true, message: 'Chat request sent.' });
    } catch (e) {
        res.status(400).json({ error: e.message || 'Failed to send request.' });
    }
});

app.post('/api/chat/handle_request', async (req, res) => {
    try {
        const { targetId, senderId, action } = req.body; // action: 'accept' or 'deny'
        await dataStore.handleChatRequest(targetId, senderId, action);
        res.json({ success: true, message: `Request ${action}ed.` });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Failed to handle request.' });
    }
});

app.get('/api/chat/history/:chatId', async (req, res) => {
    try {
        const messages = await dataStore.getChatHistory(req.params.chatId);
        res.json({ success: true, messages });
    } catch (e) {
        res.status(500).json({ error: 'Failed to retrieve chat history.' });
    }
});

// --- VIDEO FEED ROUTES ---

app.post('/api/videos/post', async (req, res) => {
    try {
        const { url, caption, posterId, posterName } = req.body;
        if (!url || !posterId) {
            return res.status(400).json({ error: 'Missing video URL or poster ID.' });
        }
        await dataStore.addVideoPost({ url, caption, posterId, posterName });
        res.json({ success: true, message: 'Video post added.' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to add video post.' });
    }
});

app.get('/api/videos/feed', async (req, res) => {
    try {
        // Simple feed - return latest 10
        const feed = await dataStore.getVideoFeed();
        // Sort by timestamp descending
        const latestFeed = feed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
        res.json({ success: true, feed: latestFeed });
    } catch (e) {
        res.status(500).json({ error: 'Failed to retrieve video feed.' });
    }
});

// --- ADMIN ROUTES ---

app.post('/api/admin/users', async (req, res) => {
    try {
        const { adminKey } = req.body;
        if (adminKey !== ADMIN_SECRET_KEY) {
            return res.status(403).json({ error: 'Invalid admin key.' });
        }
        
        // Pass 'true' to include sensitive data in the response
        const users = await dataStore.getAllUsers(true); 
        res.json({ success: true, users });
    } catch (e) {
        res.status(500).json({ error: 'Failed to retrieve admin data.' });
    }
});

app.post('/api/admin/delete', async (req, res) => {
    try {
        const { userId } = req.body;
        // In a production app, we would verify the requester is an admin
        // For this local app, we assume API key + knowledge of this route is enough
        
        await dataStore.deleteUser(userId);
        res.json({ success: true, message: 'User deleted.' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});


// =======================================================================
// --- Socket.IO Real-Time Communication ---
// =======================================================================

// Map to track active user IDs to their socket IDs (for direct messaging)
const activeUsers = new Map(); 

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        socket.userId = token;
        return next();
    }
    next(new Error("Authentication error"));
});

io.on('connection', (socket) => {
    const userId = socket.userId;
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} connected. Total active: ${activeUsers.size}`);

    // Notify all other users that this user is online
    socket.broadcast.emit('user_status_update', { userId, isOnline: true });

    // Handle new messages
    socket.on('send_message', async (message, callback) => {
        try {
            const savedMessage = await dataStore.addMessage(message.chatId, message);
            
            // 1. Send the message back to the sender
            socket.emit('new_message', savedMessage);

            if (message.isGroup) {
                // 2. If group chat, broadcast to all other group members
                const group = await dataStore.getGroup(message.chatId);
                group.members.forEach(memberId => {
                    if (memberId !== userId) {
                        const targetSocketId = activeUsers.get(memberId);
                        if (targetSocketId) {
                             io.to(targetSocketId).emit('new_message', savedMessage);
                        }
                    }
                });
            } else {
                // 3. If 1-on-1, find partner and send
                const chat = await dataStore.getChat(message.chatId);
                const partnerId = chat.participants.find(id => id !== userId);
                const targetSocketId = activeUsers.get(partnerId);

                if (targetSocketId) {
                    io.to(targetSocketId).emit('new_message', savedMessage);
                }
            }
            // Send back success acknowledgement to the sender
            callback({ success: true });
        } catch (e) {
            console.error('Error sending message:', e);
            callback({ success: false, error: 'Failed to save or send message.' });
        }
    });

    // Handle chat request notification
    socket.on('notify_request', (data) => {
        const targetSocketId = activeUsers.get(data.userId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('request_update', { userId: data.userId });
        }
    });

    // Handle status change request from client
    socket.on('user_status_change', (data) => {
        socket.broadcast.emit('user_status_update', data);
    });

    // Handle check status request (for newly opened chat)
    socket.on('check_status', (targetId) => {
        const isOnline = activeUsers.has(targetId);
        socket.emit('user_status_update', { userId: targetId, isOnline });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        activeUsers.delete(userId);
        console.log(`User ${userId} disconnected. Total active: ${activeUsers.size}`);
        // Notify others that this user is offline
        socket.broadcast.emit('user_status_update', { userId, isOnline: false });
    });
});

// --- Server Start ---
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
