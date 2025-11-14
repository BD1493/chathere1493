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
        return JSON.parse(data);
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
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
    // Initialize data files
    ensureFileExists(USER_FILE, { users: [] });
    ensureFileExists(CHAT_FILE, { chats: [], groups: [], messages: {} });
    ensureFileExists(VIDEO_FEED_FILE, []);
}

// --- User Management ---

async function createUser({ email, name, age, password, tosAccepted, isVerified = false }) {
    const usersData = readData(USER_FILE);

    if (usersData.users.some(u => u.email === email)) {
        return { error: 'Email already exists.' };
    }

    if (!tosAccepted) {
        return { error: 'You must accept the Terms of Service.' };
    }
    
    // NOTE: In a real app, you would hash the password (e.g., using bcrypt)
    
    const newUser = {
        id: crypto.randomUUID(),
        email: email,
        name: name,
        age: age,
        passwordHash: password, // For simplicity, storing as plain text (BAD PRACTICE, use bcrypt!)
        isAdmin: false,
        profilePic: null,
        pending_requests_in: [],
        pending_requests_out: [],
        isVerified: isVerified // NEW FIELD: Default to false, but set to true if domain is exempted
    };

    usersData.users.push(newUser);
    writeData(USER_FILE, usersData);
    
    return { success: true };
}

async function findUserByCredentials(email, password) {
    const usersData = readData(USER_FILE);
    // In a real app, compare password with bcrypt hash
    const user = usersData.users.find(u => u.email === email && u.passwordHash === password);
    // if (!user || user.isVerified === false) return null; // Add verification check if needed
    return user;
}

async function findUserByEmail(email) {
    const usersData = readData(USER_FILE);
    return usersData.users.find(u => u.email === email);
}

async function findUserById(id) {
    const usersData = readData(USER_FILE);
    return usersData.users.find(u => u.id === id);
}

async function searchUsers(query) {
    const usersData = readData(USER_FILE);
    const q = query.toLowerCase();
    return usersData.users.filter(u => 
        u.email.toLowerCase().includes(q) || 
        u.name.toLowerCase().includes(q)
    );
}

async function getAllUsers(includeSensitiveData = false) {
    const usersData = readData(USER_FILE);
    if (includeSensitiveData) {
        return usersData.users;
    }
    // Filter sensitive data for general admin list
    return usersData.users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        isAdmin: u.isAdmin,
    }));
}

async function deleteUser(userId) {
    const usersData = readData(USER_FILE);
    usersData.users = usersData.users.filter(u => u.id !== userId);
    writeData(USER_FILE, usersData);
    // TODO: Also delete related chats, messages, and video posts
}

async function updateUserProfilePic(userId, filePath) {
    const usersData = readData(USER_FILE);
    const user = usersData.users.find(u => u.id === userId);
    if (user) {
        user.profilePic = filePath;
        writeData(USER_FILE, usersData);
    }
}

// --- Dashboard Data Retrieval ---
async function getUserDashboardData(userId) {
    const usersData = readData(USER_FILE);
    const chatsData = readData(CHAT_FILE);
    
    const user = usersData.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');

    const allUsers = usersData.users.map(u => ({ id: u.id, name: u.name, profilePic: u.profilePic }));
    
    // Accepted Chats (1-on-1)
    const acceptedChats = chatsData.chats
        .filter(c => c.participants.includes(userId))
        .map(chat => {
            const partnerId = chat.participants.find(id => id !== userId);
            const lastMessage = chatsData.messages[chat.chatId] 
                ? chatsData.messages[chat.chatId].slice(-1)[0]?.text || 'Start chatting!'
                : 'Start chatting!';
            return {
                chatId: chat.chatId,
                participants: chat.participants,
                name: allUsers.find(u => u.id === partnerId)?.name || 'Unknown User',
                lastMessage: lastMessage,
                type: 'individual'
            };
        });
        
    // Groups (Simplified)
    const groups = chatsData.groups
        .filter(g => g.members.includes(userId))
        .map(group => {
            return {
                groupId: group.groupId,
                name: group.name,
                type: 'group'
                // Add last message logic here if groups had messages
            };
        });

    return {
        user,
        users: allUsers, // List of all users (for displaying chat partner names)
        chats: {
            accepted: acceptedChats,
        },
        groups: groups,
        pending_requests_in: user.pending_requests_in
    };
}

// --- Chat Request Management ---

async function sendChatRequest(senderId, senderName, targetId) {
    const usersData = readData(USER_FILE);
    const targetUser = usersData.users.find(u => u.id === targetId);
    const senderUser = usersData.users.find(u => u.id === senderId);

    if (!targetUser || !senderUser) throw new Error('User not found.');
    
    // Check if request already exists (inbound or outbound)
    if (targetUser.pending_requests_in.some(r => r.senderId === senderId)) {
        throw new Error('Request already sent.');
    }
    if (senderUser.pending_requests_out.some(r => r.targetId === targetId)) {
        throw new Error('Request already sent.');
    }

    const newRequest = { senderId, senderName, timestamp: Date.now() };
    
    // Add to target's inbound list
    targetUser.pending_requests_in.push(newRequest);
    
    // Add to sender's outbound list (for tracking)
    senderUser.pending_requests_out.push({ targetId, timestamp: Date.now() });

    writeData(USER_FILE, usersData);
}

async function handleChatRequest(targetId, senderId, action) {
    const usersData = readData(USER_FILE);
    const targetUser = usersData.users.find(u => u.id === targetId);
    const senderUser = usersData.users.find(u => u.id === senderId);

    if (!targetUser || !senderUser) return { error: 'User not found.' };

    // Remove from target's inbound list
    targetUser.pending_requests_in = targetUser.pending_requests_in.filter(r => r.senderId !== senderId);
    
    // Remove from sender's outbound list
    senderUser.pending_requests_out = senderUser.pending_requests_out.filter(r => r.targetId !== targetId);

    let newChat = null;
    
    if (action === 'accept') {
        const chatsData = readData(CHAT_FILE);
        const chatId = crypto.randomUUID();
        
        newChat = {
            chatId: chatId,
            participants: [targetId, senderId],
            type: 'individual'
        };
        
        chatsData.chats.push(newChat);
        chatsData.messages[chatId] = []; // Initialize message history
        writeData(CHAT_FILE, chatsData);
    }
    
    writeData(USER_FILE, usersData);
    return { success: true, chat: newChat };
}

// --- Message Management ---

async function getChatHistory(chatId) {
    const chatsData = readData(CHAT_FILE);
    return chatsData.messages[chatId] || [];
}

async function addMessage(chatId, message) {
    const chatsData = readData(CHAT_FILE);
    
    if (!chatsData.messages[chatId]) {
        chatsData.messages[chatId] = [];
    }

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
    getAllUsers,
    deleteUser,
    updateUserProfilePic,
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
