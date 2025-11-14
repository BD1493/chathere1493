# 1. Base Image: Use the official Node.js Long-Term Support (LTS) image
FROM node:lts-alpine

# 2. Set the working directory
WORKDIR /usr/src/app

# 3. Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the socket server script
COPY socket_server.js .

# 5. Expose the port the Socket.IO server runs on
EXPOSE 3001

# 6. Define the command to run the application
CMD [ "node", "socket_server.js" ]
