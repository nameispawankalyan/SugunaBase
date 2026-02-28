#!/bin/bash

echo "🔧 Starting Zero-Downtime SugunaBase Deployment..."

# 0. Force Update from GitHub
echo "⏬ Pulling latest code from GitHub..."
git fetch --all
git reset --hard origin/main
# CRITICAL: Protect user uploads
# git clean -fd  <-- REMOVED

# 1. Clean logs but DON'T stop everything
echo "🧹 Flushing logs..."
pm2 flush || true

# 2. Deployment Helper for Zero Downtime
deploy_service() {
    local name=$1
    local dir=$2
    local port=$3
    local entry=$4
    
    echo "🚀 Updating $name (Port $port)..."
    cd ~/SugunaBase/$dir
    npm install
    
    # Reload if running, start if new. 
    # reload doesn't drop connections.
    PORT=$port pm2 reload "$name" --update-env || PORT=$port pm2 start "$entry" --name "$name"
}

# Core Systems
deploy_service "suguna-auth" "suguna-auth" 3300 "index.js"
deploy_service "suguna-messaging" "suguna-messaging" 3200 "index.js"
deploy_service "suguna-firestore" "suguna-firestore" 3400 "index.js"
deploy_service "suguna-storage" "suguna-storage" 3500 "index.js"
deploy_service "suguna-hosting" "suguna-hosting" 3600 "index.js"
deploy_service "suguna-logs" "suguna-logs" 3700 "index.js"
deploy_service "suguna-functions" "cloud-functions" 3005 "server.js"
deploy_service "suguna-payments" "suguna-payments" 3800 "index.js"

# Suguna Cast (Needs Build)
echo "🚀 Updating Suguna Cast..."
cd ~/SugunaBase/suguna-cast/server
npm install
npm run build
PUBLIC_IP=$(curl -s https://ifconfig.me)
ANNOUNCED_IP=$PUBLIC_IP PORT=3100 pm2 reload "suguna-cast" --update-env || ANNOUNCED_IP=$PUBLIC_IP PORT=3100 pm2 start dist/index.js --name "suguna-cast"

# Gateway (Main Backend)
deploy_service "suguna-gateway" "backend" 5000 "index.js"

# Platform Console (Needs Build)
echo "🚀 Updating Suguna Console..."
cd ~/SugunaBase/platform
npm install
npm run build
PORT=3000 pm2 reload "suguna-console" --update-env || PORT=3000 pm2 start "npm run start" --name "suguna-console"

# 3. Final PM2 Save
pm2 save

# 4. Nginx Configuration
echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/suguna > /dev/null <<EOT
server {
    listen 80;
    server_name api.suguna.co;
    client_max_body_size 100M;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name cast.suguna.co;
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3100/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }
}

server {
    listen 80;
    server_name suguna.co www.suguna.co console.suguna.co;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOT

sudo ln -sf /etc/nginx/sites-available/suguna /etc/nginx/sites-enabled/suguna
sudo nginx -t && sudo systemctl reload nginx

# 5. SSL
echo "🔒 Checking SSL..."
sudo certbot --nginx -d suguna.co -d www.suguna.co -d api.suguna.co -d cast.suguna.co -d console.suguna.co --expand --non-interactive --agree-tos -m admin@suguna.co --redirect

echo "✅ Zero-Downtime SugunaBase Update Complete!"
