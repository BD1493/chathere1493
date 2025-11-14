const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Directory for data files
const DATA_DIR = path.join(__dirname, 'data');

// File paths
const USER_FILE = path.join(DATA_DIR, 'users.json');
const CHAT_FILE = path.join(DATA_DIR, 'chats.json');
const VIDEO_FEED_FILE = path.join(DATA_DIR, 'video_feed.json');

// --- Utility Functions ---

function ensureFileExists(filePath, defaultContent) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
    }
}

function readData(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        
        // --- CORRECTED CHECK: Handle empty file data before JSON.parse ---
        if (data.trim() === '') {
            // Return an empty array or object based on the file's expected structure
            // Users and Video Feed are arrays ([]), Chats is an object ({})
            if (filePath === USER_FILE || filePath === VIDEO_FEED_FILE) {
                return [];
            } else if (filePath === CHAT_FILE) {
                return { chats: [], groups: [], chatRequests: [], messages: {} };
            }
        }
        // --- END CORRECTED CHECK ---
        
        return JSON.parse(data);
    } catch (e) {
        console.error(`Error reading or parsing ${filePath}:`, e);
        // Fallback: Safely return the empty structure if parsing fails
        if (filePath === USER_FILE || filePath === VIDEO_FEED_FILE) {
            return [];
        } else if (filePath === CHAT_FILE) {
            return { chats: [], groups: [], chatRequests: [], messages: {} };
        }
        return [];
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Error writing ${filePath}:`, e);
    }
}

// --- Initialization ---

/**
 * Ensures data directory and JSON files exist.
 */
function init() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
    }
    // Ensure 'uploads' directory for profile pictures exists
    const UPLOADS_DIR = path.join(__dirname, 'uploads');
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR);
    }
    
    // Initialize JSON files
    ensureFileExists(USER_FILE, []);
    ensureFileExists(CHAT_FILE, { chats: [], groups: [], chatRequests: [], messages: {} });
    ensureFileExists(VIDEO_FEED_FILE, []);
    
    // Check if a default admin exists, create one if not
    const users = readData(USER_FILE);
    if (!users.find(u => u.isAdmin)) {
        const adminId = crypto.randomUUID();
        const adminUser = {
            id: adminId,
            email: 'admin@chat.com',
            password: hashPassword('admin123'), // Default password
            name: 'System Admin',
            age: 99,
            isAdmin: true,
            profilePic: '/uploads/default.png',
            accepted_chats: [],
            groups: [],
            pending_requests_in: [],
            pending_requests_out: []
        };
        users.push(adminUser);
        writeData(USER_FILE, users);
    }
}

// --- User Management ---

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function createUser({ email, name, age, password }) {
    const users = readData(USER_FILE);
    if (users.find(u => u.email === email)) {
        return { error: 'Email already registered.' };
    }

    const userId = crypto.randomUUID();
    const newUser = {
        id: userId,
        email,
        password: hashPassword(password),
        name,
        age: parseInt(age),
        isAdmin: false,
        profilePic: '/uploads/default.png',
        accepted_chats: [],
        groups: [],
        pending_requests_in: [],
        pending_requests_out: []
    };

    users.push(newUser);
    writeData(USER_FILE, users);
    return { user: newUser };
}

async function findUserByCredentials(email, password) {
    const users = readData(USER_FILE);
    const hashedPassword = hashPassword(password);
    return users.find(u => u.email === email && u.password === hashedPassword);
}

async function findUserByEmail(email) {
    const users = readData(USER_FILE);
    return users.find(u => u.email === email);
}

async function findUserById(id) {
    const users = readData(USER_FILE);
    return users.find(u => u.id === id);
}

async function searchUsers(query) {
    const users = readData(USER_FILE);
    const lowerQuery = query.toLowerCase();
    
    // Exclude the admin user from general search results
    return users.filter(user => 
        !user.isAdmin && 
        (user.email.toLowerCase().includes(lowerQuery) || user.name.toLowerCase().includes(lowerQuery))
    );
}

async function updateUserProfilePic(userId, filePath) {
    const users = readData(USER_FILE);
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users[userIndex].profilePic = filePath;
        writeData(USER_FILE, users);
    }
}

async function getAllUsers(includeSensitive) {
    const users = readData(USER_FILE);
    return users.map(user => {
        const cleanUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            isVerified: true // Placeholder
        };
        if (includeSensitive) {
            cleanUser.sensitiveData = {
                passwordHash: user.password,
                accepted_chats: user.accepted_chats,
                pending_requests_in: user.pending_requests_in
            };
        }
        return cleanUser;
    });
}

async function deleteUser(userId) {
    let users = readData(USER_FILE);
    users = users.filter(u => u.id !== userId);
    writeData(USER_FILE, users);
    // Note: In a real app, you would also clean up chat data, groups, etc.
}

// --- Chat Management ---

async function getUserDashboardData(userId) {
    const users = readData(USER_FILE);
    const chatsData = readData(CHAT_FILE);
    const user = users.find(u => u.id === userId);

    if (!user) throw new Error('User not found.');

    // 1. Accepted Chats (1-on-1)
    const acceptedChats = user.accepted_chats.map(chat => {
        const partnerId = chat.participants.find(id => id !== userId);
        const partner = users.find(u => u.id === partnerId);
        
        return {
            chatId: chat.chatId,
            partnerId: partnerId,
            partnerName: partner ? partner.name : 'Deleted User',
            lastMessage: chatsData.messages[chat.chatId] ? chatsData.messages[chat.chatId].slice(-1)[0].text : 'Chat started.',
            lastMessageTime: chatsData.messages[chat.chatId] ? chatsData.messages[chat.chatId].slice(-1)[0].timestamp : 0
        };
    });

    // 2. Groups (Simplified, assuming group data is directly in user object)
    const groups = user.groups.map(groupId => {
        const group = chatsData.groups.find(g => g.groupId === groupId);
        return {
            groupId: group.groupId,
            groupName: group.groupName,
            members: group.members,
            lastMessage: chatsData.messages[groupId] ? chatsData.messages[groupId].slice(-1)[0].text : 'Group created.',
            lastMessageTime: chatsData.messages[groupId] ? chatsData.messages[groupId].slice(-1)[0].timestamp : 0
        };
    });

    return {
        chats: {
            accepted: acceptedChats,
            groups: groups
        },
        pending_requests_in: user.pending_requests_in
    };
}

async function sendChatRequest(senderId, senderName, targetId) {
    const users = readData(USER_FILE);
    const targetUserIndex = users.findIndex(u => u.id === targetId);
    const senderUser = users.find(u => u.id === senderId);

    if (targetUserIndex === -1) throw new Error('Target user not found.');
    if (senderId === targetId) throw new Error('Cannot send request to yourself.');
    
    // Check if request already exists or chat already accepted
    const isPending = users[targetUserIndex].pending_requests_in.some(req => req.senderId === senderId);
    const isAccepted = users[targetUserIndex].accepted_chats.some(chat => chat.participants.includes(senderId));

    if (isPending || isAccepted) throw new Error('Request already pending or chat already exists.');

    // Add to target's incoming requests
    users[targetUserIndex].pending_requests_in.push({ senderId, senderName, timestamp: Date.now() });
    
    // Add to sender's outgoing requests (for future tracking)
    senderUser.pending_requests_out.push({ targetId, targetName: users[targetUserIndex].name, timestamp: Date.now() });

    writeData(USER_FILE, users);
}

async function handleChatRequest(targetId, senderId, action) {
    const users = readData(USER_FILE);
    const chatsData = readData(CHAT_FILE);
    const targetUserIndex = users.findIndex(u => u.id === targetId);
    const senderUserIndex = users.findIndex(u => u.id === senderId);

    if (targetUserIndex === -1 || senderUserIndex === -1) return { error: 'User not found.' };

    const requestIndex = users[targetUserIndex].pending_requests_in.findIndex(req => req.senderId === senderId);
    if (requestIndex === -1) return { error: 'Request not found.' };

    // Remove from incoming requests
    const [request] = users[targetUserIndex].pending_requests_in.splice(requestIndex, 1);

    // Remove from outgoing requests (sender's list)
    users[senderUserIndex].pending_requests_out = users[senderUserIndex].pending_requests_out.filter(req => req.targetId !== targetId);
    
    let newChat = null;
    
    if (action === 'accept') {
        const chatId = crypto.randomUUID();
        const participants = [targetId, senderId];
        
        newChat = { chatId, participants, type: 'one-on-one' };
        
        // Add chat to user lists
        users[targetUserIndex].accepted_chats.push(newChat);
        users[senderUserIndex].accepted_chats.push(newChat);
        
        // Initialize chat history
        chatsData.chats.push(newChat);
        chatsData.messages[chatId] = [];
    }

    writeData(USER_FILE, users);
    writeData(CHAT_FILE, chatsData);

    return { chat: newChat };
}

async function getChatHistory(chatId) {
    const chatsData = readData(CHAT_FILE);
    return chatsData.messages[chatId] || [];
}

async function addMessage(chatId, message) {
    const chatsData = readData(CHAT_FILE);
    
    if (!chatsData.messages[chatId]) {
        chatsData.messages[chatId] = [];
    }
    
    // Create a clean message object to save
    const savedMessage = {
        id: crypto.randomUUID(),
        chatId: chatId,
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text,
        timestamp: Date.now()
    };
    
    chatsData.messages[chatId].push(savedMessage);
    writeData(CHAT_FILE, chatsData);
    
    return savedMessage;
}

async function getChat(chatId) {
    const chatsData = readData(CHAT_FILE);
    return chatsData.chats.find(c => c.chatId === chatId);
}

async function getGroup(groupId) {
    const chatsData = readData(CHAT_FILE);
    return chatsData.groups.find(g => g.groupId === groupId);
}

// --- Video Feed Management ---

async function addVideoPost({ url, caption, posterId, posterName }) {
    const feed = readData(VIDEO_FEED_FILE);
    const newPost = {
        id: crypto.randomUUID(),
        url,
        caption,
        posterId,
        posterName,
        timestamp: Date.now()
    };
    feed.push(newPost);
    writeData(VIDEO_FEED_FILE, feed);
}

async function getVideoFeed() {
    return readData(VIDEO_FEED_FILE);
}


module.exports = {
    init,
    createUser,
    findUserByCredentials,
    findUserByEmail,
    findUserById,
    searchUsers,
    updateUserProfilePic,
    getAllUsers,
    deleteUser,
    getUserDashboardData,
    sendChatRequest,
    handleChatRequest,
    getChatHistory,
    addMessage,
    getChat,
    getGroup,
    addVideoPost,
    getVideoFeed
};
