# Use the latest LTS version of Node.js (lightweight Alpine Linux)
FROM node:lts-alpine

# Set working directory
WORKDIR /

# Copy package.json and package-lock.json first (for caching dependencies)
COPY package*.json ./

# Copy the rest of the app
COPY . .

# Install production dependencies only
RUN npm install --omit=dev

# Expose the port your app runs on
EXPOSE 4014

# Start the server
CMD ["node", "./server.js"]
