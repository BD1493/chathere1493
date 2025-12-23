<?php
require "api/auth.php";
if ($_POST) {
    if (register($_POST['user'], $_POST['pass'])) {
        header("Location: login.php");
        exit;
    }
}
?>
<form method="post">
<input name="user" placeholder="Username" required>
<input name="pass" type="password" placeholder="Password" required>
<button>Register</button>
</form>
