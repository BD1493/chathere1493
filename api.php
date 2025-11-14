<?php

// ==================================================================================
// --- Configuration & Security ---
// ==================================================================================

// Set headers for CORS and JSON response
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Security Configuration
const API_SECRET_KEY = 'your_super_secret_api_key_12345';
const ADMIN_SECRET_KEY = 'admin_master_access_key';

// File Paths (CRITICAL: Ensure these folders are NOT publicly accessible via your web server configuration)
const DATA_DIR = __DIR__ . '/data';
const USER_FILE = DATA_DIR . '/users.json';
const CHAT_FILE = DATA_DIR . '/chats.json';
const VIDEO_FEED_FILE = DATA_DIR . '/video_feed.json';
const PROFILE_UPLOADS_DIR = __DIR__ . '/uploads/profile_pics';
const VIDEO_UPLOADS_DIR = __DIR__ . '/uploads/videos';


// ==================================================================================
// --- Utility Functions ---
// ==================================================================================

/**
 * Sends a JSON response and terminates the script.
 */
function json_response($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

/**
 * Validates the API key from the Authorization header.
 */
function authenticate_api() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (!preg_match('/Bearer (.*)/', $authHeader, $matches)) {
        json_response(['success' => false, 'error' => 'Authentication required'], 401);
    }
    
    $token = $matches[1];
    if ($token !== API_SECRET_KEY) {
        json_response(['success' => false, 'error' => 'Invalid API Key'], 403);
    }
}

/**
 * Generates a simple UUID.
 */
function generate_uuid() {
    return uniqid('', true) . bin2hex(random_bytes(8));
}

/**
 * Ensures data folders and files exist.
 */
function init_data() {
    if (!is_dir(DATA_DIR)) mkdir(DATA_DIR);
    if (!is_dir(__DIR__ . '/uploads')) mkdir(__DIR__ . '/uploads');
    if (!is_dir(PROFILE_UPLOADS_DIR)) mkdir(PROFILE_UPLOADS_DIR);
    if (!is_dir(VIDEO_UPLOADS_DIR)) mkdir(VIDEO_UPLOADS_DIR);

    if (!file_exists(USER_FILE)) {
        file_put_contents(USER_FILE, json_encode(['users' => []], JSON_PRETTY_PRINT));
    }
    if (!file_exists(CHAT_FILE)) {
        file_put_contents(CHAT_FILE, json_encode(['chats' => [], 'groups' => [], 'messages' => []], JSON_PRETTY_PRINT));
    }
    if (!file_exists(VIDEO_FEED_FILE)) {
        file_put_contents(VIDEO_FEED_FILE, json_encode([], JSON_PRETTY_PRINT));
    }
}

/**
 * Reads and decodes a JSON data file.
 */
function read_data(string $filePath) {
    if (!file_exists($filePath)) return [];
    $content = file_get_contents($filePath);
    return json_decode($content, true) ?? [];
}

/**
 * Encodes and writes data to a JSON file.
 */
function write_data(string $filePath, $data) {
    file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT));
}

// ==================================================================================
// --- Data Persistence (PHP implementation of data.js logic) ---
// ==================================================================================

function find_user_by_email(string $email) {
    $usersData = read_data(USER_FILE);
    return array_values(array_filter($usersData['users'], fn($u) => $u['email'] === $email))[0] ?? null;
}

function find_user_by_id(string $id) {
    $usersData = read_data(USER_FILE);
    return array_values(array_filter($usersData['users'], fn($u) => $u['id'] === $id))[0] ?? null;
}

function create_user(array $userData) {
    $usersData = read_data(USER_FILE);
    $email = strtolower($userData['email']);

    if (find_user_by_email($email)) {
        return ['error' => 'Email already exists.'];
    }
    if (!($userData['tosAccepted'] ?? false)) {
        return ['error' => 'You must accept the Terms of Service.'];
    }
    
    // 🚩 Verification logic completely removed. All accounts are ready for login.
    $newUser = [
        'id' => generate_uuid(),
        'email' => $email,
        'name' => $userData['name'],
        'age' => (int)($userData['age'] ?? 0),
        'passwordHash' => $userData['password'], 
        'isAdmin' => false,
        'profilePic' => null,
        'pending_requests_in' => [],
        'pending_requests_out' => [],
    ];

    $usersData['users'][] = $newUser;
    write_data(USER_FILE, $usersData);
    
    return ['success' => true];
}

function find_user_by_credentials(string $email, string $password) {
    $usersData = read_data(USER_FILE);
    $user = array_values(array_filter($usersData['users'], fn($u) => $u['email'] === $email && $u['passwordHash'] === $password))[0] ?? null;
    return $user;
}

function update_user_profile_pic(string $userId, string $filePath) {
    $usersData = read_data(USER_FILE);
    $userKey = array_search($userId, array_column($usersData['users'], 'id'));
    if ($userKey !== false) {
        $usersData['users'][$userKey]['profilePic'] = $filePath;
        write_data(USER_FILE, $usersData);
    }
}

// NOTE: Only including helper functions relevant to the new logic. 
// You would need to re-implement all other functions (dashboard, chat history, etc.) from data.js here.

// ==================================================================================
// --- Router ---
// ==================================================================================

// Initialize data files
init_data();

// Get the requested route from the query string
$route = $_GET['route'] ?? 'status';
$method = $_SERVER['REQUEST_METHOD'];
$requestBody = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($route) {
    
    // --- AUTH ROUTES (No API Key required) ---
    case 'auth/signup':
        if ($method !== 'POST') json_response(['success' => false, 'error' => 'Method not allowed'], 405);
        $result = create_user($requestBody);
        if (isset($result['error'])) json_response(['success' => false, 'error' => $result['error']], 400);
        
        // 🚩 Verification message removed.
        json_response(['success' => true, 'message' => 'Account created successfully! Please log in.']);
        break;

    case 'auth/login':
        if ($method !== 'POST') json_response(['success' => false, 'error' => 'Method not allowed'], 405);
        $user = find_user_by_credentials($requestBody['email'], $requestBody['password']);
        
        if (!$user) json_response(['success' => false, 'error' => 'Invalid email or password.'], 401);
        
        // Strip sensitive data
        $userClean = ['id' => $user['id'], 'email' => $user['email'], 'name' => $user['name'], 'isAdmin' => $user['isAdmin'], 'profilePic' => $user['profilePic']];
        json_response(['success' => true, 'user' => $userClean]);
        break;

    // --- PROTECTED ROUTES (API Key required) ---
    default:
        // All other routes require authentication
        authenticate_api();

        // -----------------------------------------------------
        // PROFILE PICTURE UPLOAD (Allows images and GIFs)
        // -----------------------------------------------------
        if ($route === 'profile/upload_pic' && $method === 'POST') {
            if (empty($_FILES['profile_pic'])) json_response(['success' => false, 'error' => 'No file uploaded.'], 400);

            $userId = $_POST['userId'] ?? null;
            $file = $_FILES['profile_pic'];

            // 🚩 Allow common image/GIF MIME types
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!in_array($file['type'], $allowedTypes)) {
                json_response(['success' => false, 'error' => 'Invalid file type. Only JPG, PNG, and GIF are allowed.'], 400);
            }
            
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = $userId . '-' . time() . '.' . $ext;
            $filePath = PROFILE_UPLOADS_DIR . '/' . $filename;
            
            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                update_user_profile_pic($userId, "/uploads/profile_pics/{$filename}");
                json_response(['success' => true, 'message' => 'Profile picture updated.', 'filePath' => "/uploads/profile_pics/{$filename}"]);
            } else {
                json_response(['success' => false, 'error' => 'Failed to move uploaded file.'], 500);
            }
        }
        
        // -----------------------------------------------------
        // VIDEO UPLOAD (New Endpoint)
        // -----------------------------------------------------
        elseif ($route === 'videos/upload' && $method === 'POST') {
             if (empty($_FILES['video_file'])) json_response(['success' => false, 'error' => 'No video file uploaded.'], 400);

            $userId = $_POST['userId'] ?? null;
            $file = $_FILES['video_file'];

            // Validate video MIME type (e.g., MP4, WebM)
            if (!in_array($file['type'], ['video/mp4', 'video/webm', 'video/quicktime'])) {
                 json_response(['success' => false, 'error' => 'Invalid video type.'], 400);
            }
            
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = $userId . '-video-' . time() . '.' . $ext;
            $filePath = VIDEO_UPLOADS_DIR . '/' . $filename;

            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                // TODO: Save video metadata (URL: /uploads/videos/{$filename}) to the video_feed.json
                json_response(['success' => true, 'message' => 'Video uploaded.', 'videoPath' => "/uploads/videos/{$filename}"]);
            } else {
                json_response(['success' => false, 'error' => 'Failed to upload video.'], 500);
            }
        }
        
        // -----------------------------------------------------
        // Other existing routes would go here (dashboard, chat, search, etc.)
        // -----------------------------------------------------
        
        else {
            json_response(['success' => false, 'error' => 'Route not found or method not allowed.'], 404);
        }
        break;
}

?>
