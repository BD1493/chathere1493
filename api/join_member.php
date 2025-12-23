<?php
header('Content-Type: application/json');
$room = trim($_GET['room'] ?? $_POST['room'] ?? '');
$user = trim($_GET['user'] ?? $_POST['user'] ?? '');
if ($room===''||$user==='') { echo json_encode(['success'=>false]); exit; }
$file = __DIR__ . '/../data/members.json';
$fp = fopen($file,'c+');
if (!$fp) { echo json_encode(['success'=>false]); exit; }
flock($fp, LOCK_EX);
$data = json_decode(stream_get_contents($fp), true) ?: [];
if(!is_array($data)) $data = [];
if(!isset($data[$room])) $data[$room] = [];
$data[$room][$user] = time();
// cleanup
foreach ($data[$room] as $u=>$t) if(time()-$t>30) unset($data[$room][$u]);
ftruncate($fp,0); rewind($fp); fwrite($fp, json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
fflush($fp); flock($fp, LOCK_UN); fclose($fp);
echo json_encode(['success'=>true]);
