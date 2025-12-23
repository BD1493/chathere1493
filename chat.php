<?php
$room = $_GET['room'] ?? 'public';
$subject = $_GET['subject'] ?? '';
?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Room: <?=htmlspecialchars($room)?></title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="room-header">
      <h2 id="roomTitle">Room: <?=htmlspecialchars($room)?></h2>
      <div id="roomSubject" class="small"><?=htmlspecialchars($subject)?></div>
    </div>

    <div class="channels">
      <h4>Channels</h4>
      <div id="channelList"></div>
      <button id="addChannelBtn" class="add-channel">+ Add Channel</button>
    </div>

    <div class="tools">
      <h4>Host Tools</h4>
      <button id="endRoomBtn" class="end-btn">End Meeting</button>
    </div>

    <div class="members">
      <h4>Members</h4>
      <div id="memberList"></div>
    </div>
  </aside>

  <section class="chat-panel">
    <div id="messages" class="messages" aria-live="polite"></div>
    <div class="input-area">
      <input id="input" placeholder="Write a message..." autocomplete="off">
      <button id="send" class="send-btn">Send</button>
    </div>
  </section>
</div>

<script>
window.room = "<?=htmlspecialchars($room)?>";
window.subject = "<?=htmlspecialchars($subject)?>";
window.user = localStorage.getItem('chatUser') || prompt('Enter your name:');
if(!localStorage.getItem('chatUser')) localStorage.setItem('chatUser', window.user);
</script>
<script src="script.js"></script>
</body>
</html>
