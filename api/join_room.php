<?php
header('Content-Type: application/json');
$in = $_SERVER['REQUEST_METHOD'] === 'POST' ? $_POST : $_GET;
$room = trim($in['room'] ?? $in['code'] ?? '');
$user = trim($in['user'] ?? $in['name'] ?? '');
if ($room === '') { echo json_encode(['success'=>false,'error'=>'missing_room']); exit; }
$roomsFile = __DIR__ . '/../data/rooms.json';
if (!file_exists($roomsFile)) { echo json_encode(['success'=>false,'error'=>'no_rooms']); exit; }
$rfp = fopen($roomsFile,'r');
flock($rfp, LOCK_SH);
$rooms = json_decode(stream_get_contents($rfp), true);
flock($rfp, LOCK_UN); fclose($rfp);
if (!isset($rooms[$room])) { echo json_encode(['success'=>false,'error'=>'not_found']); exit; }
// register user heartbeat
if ($user !== '') {
  $mfile = __DIR__ . '/../data/members.json';
  $mfp = fopen($mfile,'c+');
  if ($mfp) {
    flock($mfp, LOCK_EX);
    $mcont = stream_get_contents($mfp);
    $mdata = $mcont ? json_decode($mcont, true) : [];
    if(!is_array($mdata)) $mdata = [];
    if(!isset($mdata[$room])) $mdata[$room] = [];
    $mdata[$room][$user] = time();
    ftruncate($mfp,0); rewind($mfp); fwrite($mfp, json_encode($mdata, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
    fflush($mfp); flock($mfp, LOCK_UN); fclose($mfp);
  }
}
echo json_encode(['success'=>true,'subject'=>$rooms[$room]['subject'] ?? '']);
