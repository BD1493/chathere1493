<?php
header('Content-Type: application/json');
$room = trim($_GET['room'] ?? '');
$channel = trim($_GET['channel'] ?? '');
$file = __DIR__ . '/../data/rooms.json';
$data = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
$exists = isset($data[$room]['channels'][$channel]);
echo json_encode(['exists'=>$exists]);
