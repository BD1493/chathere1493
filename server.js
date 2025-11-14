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
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve profile pictures

// Ensure required directories exist
dataStore.init();

// --- Profile Picture Upload Setup ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.body.userId + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- API Routes ---

// AUTH: Login/Signup
app.post('/api/auth/signup', authenticateAPI, async (req, res) => {
    try {
        const { email, name, age, password } = req.body;
        const result = await dataStore.createUser({ email, name, age, password });
        if (result.error) return res.status(400).json({ success: false, error: result.error });
        res.json({ success: true, message: 'User created successfully! Please log in.' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Server error during signup.' });
    }
});

app.post('/api/auth/login', authenticateAPI, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await dataStore.findUserByCredentials(email, password);
        if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        // Return sensitive data like password hash is bad practice, so clean the object
        const userClean = { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin, profilePic: user.profilePic };
        res.json({ success: true, user: userClean });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Server error during login.' });
    }
});

// ADMIN: Admin Login (Simplified for this example)
app.post('/api/auth/admin_login', authenticateAPI, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email === 'admin@chat.com' && password === 'admin123') { // Simple admin check
            const user = await dataStore.findUserByEmail(email);
            if (user && user.isAdmin) {
                const userClean = { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin };
                return res.json({ success: true, user: userClean });
            }
        }
        return res.status(401).json({ success: false, error: 'Invalid Admin credentials.' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Server error during admin login.' });
    }
});


// PROFILE: Get User Data & Upload Picture
app.get('/api/users/:id', authenticateAPI, async (req, res) => {
    const user = await dataStore.findUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    // Strip sensitive fields again
    const userClean = { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin, profilePic: user.profilePic };
    res.json({ success: true, user: userClean });
});

app.post('/api/profile/upload_pic', authenticateAPI, upload.single('profile_pic'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });
        
        const filePath = `/uploads/${req.file.filename}`;
        await dataStore.updateUserProfilePic(req.body.userId, filePath);
        
        res.json({ success: true, message: 'Profile picture updated.', filePath });
    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).json({ success: false, error: 'Error processing file upload.' });
    }
});

// DASHBOARD: Get User Chats and Requests
app.get('/api/users/:id/dashboard', authenticateAPI, async (req, res) => {
    const userId = req.params.id;
    const user = await dataStore.findUserById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    
    const dashboardData = await dataStore.getUserDashboardData(userId);
    
    // Attach current user's (cleaned) data to the response for front-end update
    const userClean = { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        isAdmin: user.isAdmin,
        profilePic: user.profilePic,
        pending_requests_in: dashboardData.pending_requests_in
    };

    res.json({ 
        success: true, 
        user: userClean,
        chats: dashboardData.chats, 
        groups: dashboardData.groups 
    });
});

// CHAT: Search, Request, Handle Request, History
app.get('/api/users/search', authenticateAPI, async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, error: 'Query parameter is required.' });
    
    const users = await dataStore.searchUsers(query);
    const usersClean = users.map(u => ({ id: u.id, name: u.name, email: u.email }));
    
    res.json({ success: true, users: usersClean });
});

app.post('/api/chat/request', authenticateAPI, async (req, res) => {
    const { senderId, senderName, targetId } = req.body;
    try {
        await dataStore.sendChatRequest(senderId, senderName, targetId);
        res.json({ success: true, message: 'Chat request sent.' });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

app.post('/api/chat/handle_request', authenticateAPI, async (req, res) => {
    const { targetId, senderId, action } = req.body;
    try {
        const result = await dataStore.handleChatRequest(targetId, senderId, action);
        if (result.error) return res.status(400).json({ success: false, error: result.error });
        res.json({ success: true, message: `Request ${action}ed.`, chat: result.chat });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/chat/history/:chatId', authenticateAPI, async (req, res) => {
    const chatId = req.params.chatId;
    const messages = await dataStore.getChatHistory(chatId);
    res.json({ success: true, messages });
});

// VIDEO FEED: Post and Retrieve
app.post('/api/videos/post', authenticateAPI, async (req, res) => {
    const { url, caption, posterId, posterName } = req.body;
    try {
        await dataStore.addVideoPost({ url, caption, posterId, posterName });
        res.json({ success: true, message: 'Video post added.' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to post video.' });
    }
});

app.get('/api/videos/feed', authenticateAPI, async (req, res) => {
    const feed = await dataStore.getVideoFeed();
    // Sort newest first
    feed.sort((a, b) => b.timestamp - a.timestamp); 
    res.json({ success: true, feed });
});


// ADMIN: View and Delete Users
app.post('/api/admin/users', authenticateAPI, async (req, res) => {
    const { adminKey } = req.body;
    
    if (!adminKey || adminKey !== ADMIN_SECRET_KEY) {
        // Return list of users without sensitive data if key is missing or wrong
        const users = await dataStore.getAllUsers(false);
        return res.json({ success: true, users });
    }

    // Return all data if key is correct
    const users = await dataStore.getAllUsers(true);
    res.json({ success: true, users });
});

app.post('/api/admin/delete', authenticateAPI, async (req, res) => {
    const { userId } = req.body;
    try {
        await dataStore.deleteUser(userId);
        res.json({ success: true, message: `User ${userId} deleted successfully.` });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to delete user.' });
    }
});


// --- Socket.IO Real-Time Handlers ---
const activeUsers = new Map(); // Map<userId, socketId>

io.on('connection', (socket) => {
    const userId = socket.handshake.auth.token; 
    if (!userId) {
        socket.disconnect();
        return;
    }
    
    // Store active user
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} connected. Total active: ${activeUsers.size}`);
    
    // Notify others that this user is online (if needed by frontend)
    socket.broadcast.emit('user_status_update', { userId, isOnline: true });

    // Handle sending new messages
    socket.on('send_message', async (message, callback) => {
        try {
            const chatId = message.chatId;
            const savedMessage = await dataStore.addMessage(chatId, message);

            if (message.isGroup) {
                // Get all members of the group (simplified, needs group data)
                const group = await dataStore.getGroup(chatId);
                const recipients = group ? group.members : [];
                
                recipients.forEach(memberId => {
                    if (memberId !== userId) { // Don't send back to sender
                        const targetSocketId = activeUsers.get(memberId);
                        if (targetSocketId) {
                            io.to(targetSocketId).emit('new_message', savedMessage);
                        }
                    }
                });
            } else {
                // Determine the partner ID in a 1-on-1 chat
                const chat = await dataStore.getChat(chatId);
                const partnerId = chat.participants.find(id => id !== userId);
                
                if (partnerId) {
                    const targetSocketId = activeUsers.get(partnerId);
                    if (targetSocketId) {
                        io.to(targetSocketId).emit('new_message', savedMessage);
                    }
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
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('API Key:', API_SECRET_KEY);
});