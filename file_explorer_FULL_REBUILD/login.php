<?php
require "api/auth.php";
if ($_POST && login($_POST['user'], $_POST['pass'])) {
    $_SESSION['user'] = $_POST['user'];
    header("Location: dashboard.php");
    exit;
}
?>
<form method="post">
<input name="user" required>
<input name="pass" type="password" required>
<button>Login</button>
</form>
