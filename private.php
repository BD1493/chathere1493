<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Private Chat</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div style="width:420px;margin:30px auto;background:#071018;padding:20px;border-radius:12px">
  <h2 style="margin-top:0;color:var(--text)">Private Chat</h2>

  <div style="margin-top:12px;">
    <button onclick="showCreate()" class="add-channel">Create Room</button>
    <button onclick="showJoin()" style="margin-left:8px" class="add-channel">Join Room</button>
  </div>

  <div id="createBox" style="display:none;margin-top:12px;">
    <input id="createName" placeholder="Your name" style="width:100%;padding:10px;border-radius:8px"><br><br>
    <input id="createSubject" placeholder="Subject (optional)" style="width:100%;padding:10px;border-radius:8px"><br><br>
    <button onclick="createRoom()" class="add-channel">Create & Open</button>
  </div>

  <div id="joinBox" style="display:none;margin-top:12px;">
    <input id="joinName" placeholder="Your name" style="width:100%;padding:10px;border-radius:8px"><br><br>
    <input id="joinCode" placeholder="Room code" style="width:100%;padding:10px;border-radius:8px"><br><br>
    <button onclick="joinRoom()" class="add-channel">Join Room</button>
  </div>
</div>

<script>
function showCreate(){document.getElementById('createBox').style.display='block';document.getElementById('joinBox').style.display='none'}
function showJoin(){document.getElementById('joinBox').style.display='block';document.getElementById('createBox').style.display='none'}

async function createRoom(){
  const name = document.getElementById('createName').value.trim();
  const subject = document.getElementById('createSubject').value.trim();
  if(!name){alert('Enter your name'); return;}
  const res = await fetch('api/create_room.php', {
    method: 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({user:name,subject})
  });
  const data = await res.json();
  if(data.success){
    localStorage.setItem('chatUser', name);
    window.location = 'chat.php?room=' + data.code + '&subject=' + encodeURIComponent(subject);
  } else { alert('Failed to create room'); }
}

async function joinRoom(){
  const name = document.getElementById('joinName').value.trim();
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  if(!name || !code){ alert('Enter name and code'); return;}
  // attempt to join (register member)
  const res = await fetch('api/join_room.php', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({user:name,room:code})
  });
  const js = await res.json();
  if(js.success){
    localStorage.setItem('chatUser', name);
    window.location = 'chat.php?room=' + code;
  } else {
    alert('Room not found');
  }
}
</script>
</body>
</html>
