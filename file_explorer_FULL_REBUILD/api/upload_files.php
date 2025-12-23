<?php
session_start();
$filesFile = __DIR__ . "/../storage/files.json";
$files = json_decode(file_get_contents($filesFile), true) ?? [];

$name = $_FILES['file']['name'];
$content = file_get_contents($_FILES['file']['tmp_name']);

$id = uniqid();
$files[$id] = [
    "owner" => $_SESSION['user'],
    "name" => $name,
    "content" => $content,
    "visibility" => "private",
    "permission" => "edit",
    "shared_with" => []
];

file_put_contents($filesFile, json_encode($files));
header("Location: ../dashboard.php");
