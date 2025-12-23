<?php
session_start();
$filesFile = __DIR__ . "/../storage/files.json";
$files = json_decode(file_get_contents($filesFile), true) ?? [];

$id = uniqid();
$files[$id] = [
    "owner" => $_SESSION['user'],
    "name" => $_POST['name'],
    "content" => "",
    "visibility" => "private",
    "permission" => "edit",
    "shared_with" => []
];

file_put_contents($filesFile, json_encode($files));
header("Location: ../dashboard.php");
