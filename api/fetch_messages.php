<?php
header('Content-Type: application/json');
$room = trim($_GET['room'] ?? '');
$channel = trim($_GET['channel'] ?? 'general');
$file = __DIR__ . '/../data/rooms.json';
$data = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
$msgs = $data[$room]['channels'][$channel] ?? [];
if(!is_array($msgs)) $msgs = [];
echo json_encode($msgs);
