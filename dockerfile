# 1. Base Image: Start from the official Node.js Long-Term Support (LTS) image
FROM node:lts-alpine

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json (or yarn.lock) to the working directory.
# This step is done separately to leverage Docker's build cache.
COPY package*.json ./

# 4. Install application dependencies
RUN npm install

# 5. Copy the rest of the application source code into the container
# This includes server.js, data.js, index.html, and the data/uploads folders
COPY . .

# 6. Expose the port the app runs on (Port 3000, as defined in server.js)
EXPOSE 3000

# 7. Define the command to run the application when the container starts
CMD [ "node", "server.js" ]