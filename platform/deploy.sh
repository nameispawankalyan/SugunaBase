#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Deployment for SugunaBase Platform...${NC}"

# 1. Update system and install Node.js 20
echo -e "${GREEN}Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2 globally
echo -e "${GREEN}Installing PM2...${NC}"
sudo npm install -g pm2

# 3. Clone or Pull the repository
if [ -d "SugunaBase" ]; then
    echo -e "${GREEN}Updating existing repository...${NC}"
    cd SugunaBase
    git pull origin main
else
    echo -e "${GREEN}Cloning repository...${NC}"
    git clone https://github.com/nameispawankalyan/SugunaBase.git
    cd SugunaBase
fi

# 4. Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# 5. Build the application
echo -e "${GREEN}Building the application...${NC}"
npm run build

# 6. Start/Restart the application with PM2
echo -e "${GREEN}Starting application with PM2...${NC}"
# Check if process exists
if pm2 list | grep -q "suguna-platform"; then
    pm2 restart suguna-platform
else
    pm2 start npm --name "suguna-platform" -- start
fi

# 7. Save PM2 configuration
pm2 save

# 8. Firewall configuration (Open port 3000)
echo -e "${GREEN}Configuring firewall...${NC}"
sudo ufw allow 3000/tcp

echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}Your app should be live at: http://$(curl -s ifconfig.me):3000${NC}"
echo -e "${GREEN}Make sure you have created the Appwrite Project with ID 'suguna-console' in your Appwrite Console.${NC}"
