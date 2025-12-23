<?php
session_start();
$files = json_decode(file_get_contents("storage/files.json"), true);
$id = $_GET['id'];
$f = $files[$id];
?>
<h2><?=htmlspecialchars($f['name'])?></h2>

<form action="api/save_file.php" method="post">
<input type="hidden" name="id" value="<?=$id?>">
<textarea name="content" style="width:100%;height:300px;"><?=$f['content']?></textarea>
<button>Save</button>
</form>
