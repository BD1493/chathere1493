<?php
header('Content-Type: application/json');
$room = trim($_GET['room'] ?? '');
$file = __DIR__ . '/../data/rooms.json';
$data = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
$channels = isset($data[$room]['channels']) ? array_keys($data[$room]['channels']) : ['general'];
echo json_encode($channels);
