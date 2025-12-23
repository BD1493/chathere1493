<?php
session_start();
$filesFile = __DIR__ . "/../storage/files.json";
$files = json_decode(file_get_contents($filesFile), true);
$id = $_GET['id'];

if ($_POST) {
    $user = $_POST['user'];
    $pass = $_POST['pass'] ?: substr(str_shuffle("ABCDE12345"),0,4);
    $files[$id]['visibility'] = "shared";
    $files[$id]['shared_with'][$user] = ["password"=>$pass];
    file_put_contents($filesFile, json_encode($files));
    echo "Shared. Password: $pass";
    exit;
}
?>
<form method="post">
<input name="user" placeholder="Username">
<input name="pass" placeholder="Password (optional)">
<button>Share</button>
</form>
