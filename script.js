const room = window.room;
let user = window.user;
const messagesDiv = document.getElementById('messages');
const memberList = document.getElementById('memberList');
const channelList = document.getElementById('channelList');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const addChannelBtn = document.getElementById('addChannelBtn');
const endRoomBtn = document.getElementById('endRoomBtn');

let currentChannel = 'general';
let channels = [];

async function init(){
  // register heartbeat
  await fetch('api/join_member.php?room='+encodeURIComponent(room)+'&user='+encodeURIComponent(user));
  // load room info
  await loadRoomInfo();
  // start polling
  setInterval(loadMessages, 1000);
  setInterval(loadMembers, 3000);
  setInterval(()=>fetch('api/join_member.php?room='+encodeURIComponent(room)+'&user='+encodeURIComponent(user)),7000);
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', e=>{if(e.key==='Enter') sendMessage()});
  addChannelBtn.addEventListener('click', addChannelPrompt);
  endRoomBtn.addEventListener('click', endRoom);
}

async function loadRoomInfo(){
  const res = await fetch('api/get_room_info.php?room='+encodeURIComponent(room));
  const data = await res.json();
  if(!data.exists){ alert('Room not found'); window.location='private.php'; return;}
  channels = data.channels || ['general'];
  renderChannels();
}

function renderChannels(){
  channelList.innerHTML = '';
  channels.forEach(ch=>{
    const b = document.createElement('button');
    b.className = 'channel-btn' + (ch===currentChannel?' active':'');
    b.textContent = '# ' + ch;
    b.onclick = ()=>{ currentChannel = ch; document.querySelectorAll('.channel-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); loadMessages(); };
    channelList.appendChild(b);
  });
}

async function addChannelPrompt(){
  const name = prompt('Channel name (no spaces):');
  if(!name) return;
  const res = await fetch('api/add_channel.php', {method:'POST', body: new URLSearchParams({room,channel:name})});
  const js = await res.json();
  if(js.success){ channels.push(name); renderChannels(); }
}

async function loadMessages(){
  const res = await fetch('api/fetch_messages.php?room='+encodeURIComponent(room)+'&channel='+encodeURIComponent(currentChannel));
  const data = await res.json();
  messagesDiv.innerHTML = '';
  data.forEach(m=>{
    const div = document.createElement('div'); div.className='msg';
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = m.user + ' • ' + new Date(m.time*1000).toLocaleTimeString();
    const text = document.createElement('div'); text.className='text';
    // link detection
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    const parts = m.text.split(linkRegex);
    parts.forEach(p=>{
      if(linkRegex.test(p)){
        const a = document.createElement('a'); a.href=p; a.textContent=p; a.target='_blank';
        text.appendChild(a);
        const cp = document.createElement('button'); cp.className='send-btn'; cp.style.marginLeft='8px'; cp.textContent='Copy'; cp.onclick=()=>navigator.clipboard.writeText(p);
        text.appendChild(cp);
      } else {
        text.appendChild(document.createTextNode(p));
      }
    });
    div.appendChild(meta); div.appendChild(text);
    messagesDiv.appendChild(div);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function loadMembers(){
  const res = await fetch('api/fetch_members.php?room='+encodeURIComponent(room));
  const list = await res.json();
  memberList.innerHTML = '';
  list.forEach(u=>{
    const d = document.createElement('div'); d.className='member'; d.textContent=u;
    memberList.appendChild(d);
  });
}

async function sendMessage(){
  const txt = input.value.trim();
  if(!txt) return;
  await fetch('api/send_message.php',{method:'POST',body:new URLSearchParams({room,channel:currentChannel,user,txt:txt})});
  input.value='';
  loadMessages();
}

async function endRoom(){
  if(!confirm('End this meeting? This will delete the room.')) return;
  const res = await fetch('api/end_room.php',{method:'POST',body:new URLSearchParams({room,user})});
  const js = await res.json();
  if(js.success){ alert('Room ended'); window.location='private.php'; }
  else alert('Unable to end room: '+(js.error||'unknown'));
}

init();
