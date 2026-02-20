#!/bin/bash

# Define colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="suguna.co"
CONSOLE_DOMAIN="console.suguna.co"
API_DOMAIN="api.suguna.co"

echo -e "${GREEN}Starting Nginx Configuration for SugunaBase...${NC}"

# 1. Install Nginx
echo -e "${GREEN}Installing Nginx...${NC}"
sudo apt-get update
sudo apt-get install -y nginx

# 2. Configure Nginx
echo -e "${GREEN}Configuring Nginx...${NC}"

# Configuration for suguna.co (Landing Page / Main Site)
# If you have a separate landing page, point to it. Assuming same as console for now or a different port.
# Let's assume Port 3000 (Console) is what you want for suguna.co for now.

cat <<EOF | sudo tee /etc/nginx/sites-available/suguna
# SugunaBase Console (Frontend)
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} ${CONSOLE_DOMAIN};

    location / {
        proxy_pass http://localhost:3000; # Next.js App
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

# SugunaBase API (Backend)
server {
    listen 80;
    server_name ${API_DOMAIN};

    location / {
        proxy_pass http://localhost:80; # Node.js Backend (Port 80 internally, but Nginx takes 80 public)
        # Wait, if Nginx takes 80, backend can't run on 80.
        #Backend should run on another port e.g. 5000.
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Note: We need to change Backend Port from 80 to something else (e.g. 5000) because Nginx needs Port 80.

echo -e "${GREEN}Enabling sites...${NC}"
sudo ln -sfn /etc/nginx/sites-available/suguna /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 3. Test and Restart
echo -e "${GREEN}Testing Nginx Configuration...${NC}"
sudo nginx -t

echo -e "${GREEN}Restarting Nginx...${NC}"
sudo systemctl restart nginx

# 4. Certbot for SSL (HTTPS)
echo -e "${GREEN}Installing Certbot for SSL...${NC}"
sudo apt-get install -y certbot python3-certbot-nginx
# Uncomment to run automatically:
# sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${CONSOLE_DOMAIN} -d ${API_DOMAIN}

echo -e "${GREEN}Setup Complete!${NC}"
echo -e "IMPORTANT Steps:"
echo -e "1. Update your Backend (index.js) to run on Port 5000 instead of 80."
echo -e "2. Update DNS A Records for ${DOMAIN}, ${CONSOLE_DOMAIN}, ${API_DOMAIN} to point to this server."
echo -e "3. Run 'sudo certbot --nginx' to enable HTTPS."
