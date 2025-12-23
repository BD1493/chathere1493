<?php
header('Content-Type: application/json');
$room = trim($_GET['room'] ?? '');
$file = __DIR__ . '/../data/rooms.json';
if (!file_exists($file)) { echo json_encode(['exists'=>false]); exit; }
$fp = fopen($file,'r');
if (!$fp) { echo json_encode(['exists'=>false]); exit; }
flock($fp, LOCK_SH);
$data = json_decode(stream_get_contents($fp), true);
flock($fp, LOCK_UN); fclose($fp);
if (!isset($data[$room])) { echo json_encode(['exists'=>false]); exit; }
$roomData = $data[$room];
$channels = isset($roomData['channels']) ? array_keys($roomData['channels']) : ['general'];
echo json_encode(['exists'=>true,'subject'=>$roomData['subject'] ?? '','host'=>$roomData['host'] ?? '','channels'=>$channels]);
