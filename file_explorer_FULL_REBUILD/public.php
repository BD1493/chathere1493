<?php
$files = json_decode(file_get_contents("storage/files.json"), true);
foreach ($files as $id => $f) {
    if ($f['visibility'] === "public") {
        echo "<a href='editor.php?id=$id'>{$f['name']}</a><br>";
    }
}
