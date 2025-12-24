<?php
// Check if the user has already accepted the policy
if (!isset($_COOKIE['policy_accepted'])) {
    $showModal = true;
} else {
    $showModal = false;
}
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Welcome to Chat</title>
<link rel="stylesheet" href="style.css">

<style>
/* Modal Styling */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  width: 420px;
  max-width: 90%;
  padding: 25px;
  text-align: center;
  font-family: sans-serif;
  box-shadow: 0 0 20px rgba(0,0,0,0.3);
  animation: fadeIn 0.4s ease;
}

.modal-content h2 {
  margin-top: 0;
}

.modal-content button {
  width: 140px;
  padding: 10px;
  margin: 10px;
  border: none;
  cursor: pointer;
  font-size: 15px;
  border-radius: 6px;
}

#agreeBtn {
  background: #28a745;
  color: white;
}

#declineBtn {
  background: #dc3545;
  color: white;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* Simple index UI */
.container {
  text-align: center;
  margin-top: 120px;
  font-family: sans-serif;
}
.container button {
  padding: 14px 20px;
  font-size: 18px;
  cursor: pointer;
  border-radius: 6px;
  border: none;
  background: #007bff;
  color: white;
}
</style>
</head>
<body>

<?php if ($showModal): ?>
<div id="policyModal" class="modal">
  <div class="modal-content">
    <h2>Privacy Warning</h2>
    <p>
      We collect and store your IP address for moderation and security.
      All chat messages are publicly visible to other participants.
      Only continue if you agree to these terms.
    </p>

    <button id="agreeBtn">I Agree ✅</button>
    <button id="declineBtn">I Do Not Agree ❌</button>
  </div>
</div>
<?php endif; ?>

<div class="container">
  <h1>Welcome to the Chat App</h1>
  <p>Select a chat mode below:</p>

  <a href="chat.php?room=PUBLIC&subject=General">
    <button>Enter Public Chat</button>
  </a>

  <br><br>

  <a href="private.php">
    <button>Create/Join Private Chat</button>
  </a>

   <a href="https://file-explorer1493.ilja.org">
    <button>Enter File Explorer</button>
  </a>
</div>

<script>
document.getElementById("agreeBtn")?.addEventListener("click", () => {
    document.cookie = "policy_accepted=true; path=/; max-age=" + (60*60*24*365);
    document.getElementById("policyModal").style.display = "none";
});

document.getElementById("declineBtn")?.addEventListener("click", () => {
    window.location.href = "https://google.com";
});
</script>

</body>
</html>

