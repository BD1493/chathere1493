<?php
session_start();
$filesFile = __DIR__ . "/../storage/files.json";
$files = json_decode(file_get_contents($filesFile), true);

$id = $_POST['id'];
$files[$id]['content'] = $_POST['content'];

file_put_contents($filesFile, json_encode($files));
header("Location: ../editor.php?id=$id");
