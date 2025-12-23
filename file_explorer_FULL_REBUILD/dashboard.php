<?php
session_start();
if (!isset($_SESSION['user'])) die("Login required");
$files = json_decode(file_get_contents("storage/files.json"), true) ?? [];
?>
<h2>Dashboard</h2>

<form action="api/create_file.php" method="post">
<input name="name" placeholder="New file name">
<button>Create File</button>
</form>

<form action="api/upload_file.php" method="post" enctype="multipart/form-data">
<input type="file" name="file">
<button>Upload</button>
</form>

<h3>Your Files</h3>
<?php
foreach ($files as $id => $f) {
    if ($f['owner'] === $_SESSION['user']) {
        echo "<a href='editor.php?id=$id'>{$f['name']}</a> |
        <a href='api/share_file.php?id=$id'>Share</a><br>";
    }
}
?>
