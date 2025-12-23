<?php
header('Content-Type: application/json');
$room = trim($_POST['room'] ?? $_GET['room'] ?? '');
$user = trim($_POST['user'] ?? $_GET['user'] ?? '');
$file = __DIR__ . '/../data/members.json';
if (!file_exists($file)) { echo json_encode(['success'=>true]); exit; }
$fp = fopen($file,'c+');
if (!$fp) { echo json_encode(['success'=>false]); exit; }
flock($fp, LOCK_EX);
$data = json_decode(stream_get_contents($fp), true) ?: [];
if(isset($data[$room][$user])) unset($data[$room][$user]);
ftruncate($fp,0); rewind($fp); fwrite($fp, json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
fflush($fp); flock($fp, LOCK_UN); fclose($fp);
echo json_encode(['success'=>true]);
