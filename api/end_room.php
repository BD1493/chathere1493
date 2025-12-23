<?php
header('Content-Type: application/json');
$room = trim($_POST['room'] ?? $_GET['room'] ?? '');
$user = trim($_POST['user'] ?? $_GET['user'] ?? '');
if ($room===''||$user==='') { echo json_encode(['success'=>false,'error'=>'missing']); exit; }
$file = __DIR__ . '/../data/rooms.json';
$fp = fopen($file,'c+');
if (!$fp) { echo json_encode(['success'=>false,'error'=>'open']); exit; }
flock($fp, LOCK_EX);
$data = json_decode(stream_get_contents($fp), true) ?: [];
if(!isset($data[$room])) { flock($fp, LOCK_UN); fclose($fp); echo json_encode(['success'=>false,'error'=>'not_found']); exit; }
$host = $data[$room]['host'] ?? '';
if ($host !== $user) { flock($fp, LOCK_UN); fclose($fp); echo json_encode(['success'=>false,'error'=>'not_host']); exit; }
unset($data[$room]);
ftruncate($fp,0); rewind($fp); fwrite($fp, json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
fflush($fp); flock($fp, LOCK_UN); fclose($fp);
// remove members
$mfile = __DIR__ . '/../data/members.json';
if (file_exists($mfile)) {
  $mfp = fopen($mfile,'c+'); if ($mfp) {
    flock($mfp, LOCK_EX);
    $mdata = json_decode(stream_get_contents($mfp), true) ?: [];
    if(isset($mdata[$room])) unset($mdata[$room]);
    ftruncate($mfp,0); rewind($mfp); fwrite($mfp, json_encode($mdata, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
    fflush($mfp); flock($mfp, LOCK_UN); fclose($mfp);
  }
}
echo json_encode(['success'=>true]);
