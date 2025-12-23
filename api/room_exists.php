<?php
header('Content-Type: application/json');
$room = trim($_GET['room'] ?? '');
$file = __DIR__ . '/../data/rooms.json';
$data = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
echo json_encode(['exists'=>isset($data[$room])]);
