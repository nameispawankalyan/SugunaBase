#!/bin/bash

# Define colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="suguna.co"
API_DOMAIN="api.suguna.co"
APPWRITE_DIR="$HOME/appwrite"

echo -e "${GREEN}Starting Domain & Proxy Setup used for ${DOMAIN}...${NC}"

# 1. Update Appwrite Port to 8080 to free up Port 80
if [ -d "$APPWRITE_DIR" ]; then
    echo -e "${GREEN}Found Appwrite installation. Reconfiguring ports...${NC}"
    cd "$APPWRITE_DIR"
    
    # Backup .env
    cp .env .env.backup
    
    # Change HTTP port to 8080
    sed -i 's/_APP_HTTP_PORT=80/_APP_HTTP_PORT=8080/g' .env
    
    echo -e "${GREEN}Restarting Appwrite on Port 8080...${NC}"
    docker compose up -d
else
    echo -e "${RED}Appwrite directory not found at $APPWRITE_DIR. Skipping Appwrite Reconfiguration.${NC}"
    echo "Make sure Appwrite is not using Port 80."
fi

# 2. Install Nginx
echo -e "${GREEN}Installing Nginx...${NC}"
sudo apt-get update
sudo apt-get install -y nginx

# 3. Create Nginx Configuration
echo -e "${GREEN}Configuring Nginx...${NC}"

cat <<EOF | sudo tee /etc/nginx/sites-available/suguna
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name ${API_DOMAIN} default_server;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# 4. Enable Configuration
sudo ln -sfn /etc/nginx/sites-available/suguna /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 5. Restart Nginx
echo -e "${GREEN}Restarting Nginx...${NC}"
sudo systemctl restart nginx

# 6. Firewall Update
echo -e "${GREEN}Allowing HTTP/HTTPS traffic...${NC}"
sudo ufw allow 'Nginx Full'

echo -e "${GREEN}Setup Complete!${NC}"
echo -e "1. ${DOMAIN} -> Next.js App (Port 3000)"
echo -e "2. ${API_DOMAIN} (or IP) -> Appwrite (Port 8080)"
echo -e "IMPORTANT: Update your DNS A records to point ${DOMAIN} and ${API_DOMAIN} to this server IP."
