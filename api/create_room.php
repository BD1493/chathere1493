<?php
header('Content-Type: application/json');
$in = $_SERVER['REQUEST_METHOD'] === 'POST' ? $_POST : $_GET;
$subject = trim($in['subject'] ?? 'Private Room');
$host = trim($in['user'] ?? $in['host'] ?? '');
$code = strtoupper(substr(md5(uniqid((string)mt_rand(), true)), 0, 6));
$file = __DIR__ . '/../data/rooms.json';
$fp = fopen($file, 'c+');
if (!$fp) { echo json_encode(['success'=>false,'error'=>'open']); exit; }
flock($fp, LOCK_EX);
$contents = stream_get_contents($fp);
$data = $contents ? json_decode($contents, true) : [];
if(!is_array($data)) $data = [];
$data[$code] = [
  'subject'=>$subject,
  'host'=>$host,
  'created_at'=>time(),
  'channels'=>['general'=>[]]
];
ftruncate($fp,0); rewind($fp); fwrite($fp, json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
fflush($fp); flock($fp, LOCK_UN); fclose($fp);
echo json_encode(['success'=>true,'code'=>$code]);
