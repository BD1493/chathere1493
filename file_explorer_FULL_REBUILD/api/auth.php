<?php
session_start();
$usersFile = __DIR__ . "/../storage/users.json";
$users = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : [];

function saveUsers($users) {
    file_put_contents(__DIR__ . "/../storage/users.json", json_encode($users));
}

function register($u, $p) {
    global $users;
    if (isset($users[$u])) return false;
    $users[$u] = password_hash($p, PASSWORD_DEFAULT);
    saveUsers($users);
    return true;
}

function login($u, $p) {
    global $users;
    if (!isset($users[$u])) return false;
    return password_verify($p, $users[$u]);
}
