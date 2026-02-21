FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy all files (including developer's package.json, index.js, and our wrapper.js)
COPY . .

# Install dependencies if present
RUN npm install || true

# Specify the command to run when the container starts
CMD ["node", "wrapper.js"]
