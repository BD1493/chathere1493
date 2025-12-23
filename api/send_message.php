<?php
header('Content-Type: application/json');
$room = trim($_POST['room'] ?? $_GET['room'] ?? '');
$channel = trim($_POST['channel'] ?? $_GET['channel'] ?? 'general');
$user = trim($_POST['user'] ?? $_GET['user'] ?? 'unknown');
$text = trim($_POST['txt'] ?? $_POST['text'] ?? $_GET['txt'] ?? $_GET['text'] ?? '');
if ($room===''||$text==='') { echo json_encode(['success'=>false,'error'=>'missing']); exit; }
$file = __DIR__ . '/../data/rooms.json';
$fp = fopen($file,'c+');
if (!$fp) { echo json_encode(['success'=>false,'error'=>'open']); exit; }
flock($fp, LOCK_EX);
$data = json_decode(stream_get_contents($fp), true) ?: [];
if(!is_array($data)) $data = [];
if(!isset($data[$room])) {
  $data[$room] = ['subject'=>'','host'=>'','created_at'=>time(),'channels'=>['general'=>[]]];
}
if(!isset($data[$room]['channels'][$channel])) $data[$room]['channels'][$channel]=[];
$data[$room]['channels'][$channel][] = ['user'=>$user,'text'=>$text,'time'=>time()];
// trim channel messages to latest 250
while(count($data[$room]['channels'][$channel])>250) array_shift($data[$room]['channels'][$channel]);
ftruncate($fp,0); rewind($fp); fwrite($fp, json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
fflush($fp); flock($fp, LOCK_UN); fclose($fp);
echo json_encode(['success'=>true]);
