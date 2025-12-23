PHP Chat App - Full package
===========================
Files included: frontend (private.php, chat.php), script.js, style.css
API endpoints (in /api): create_room.php, join_room.php, get_room_info.php,
add_channel.php, fetch_channels.php, send_message.php, fetch_messages.php,
join_member.php, fetch_members.php, leave_member.php, end_room.php, room_exists.php, channel_exists.php

Data files are located in /data and must be writable by PHP:
  - data/rooms.json
  - data/members.json

Message retention: up to 250 messages per channel (trimmed automatically).

Dockerfile is included. To run locally:
  docker build -t php-chat .
  docker run -p 8080:80 php-chat

Deploy to Render with render.yaml included.
