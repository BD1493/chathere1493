<?php
header('Content-Type: application/json');
$room = trim($_GET['room'] ?? '');
$file = __DIR__ . '/../data/members.json';
$data = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
$list = [];
if (isset($data[$room]) && is_array($data[$room])) $list = array_keys($data[$room]);
echo json_encode($list);
