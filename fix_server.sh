#!/bin/bash

echo "🔧 Starting Server Fix..."

# 0. Force Update from GitHub
echo "⏬ Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

# 1. Stop all existing processes to clear ports
echo "🛑 Stopping existing processes..."
pm2 delete all || true

# Kill any existing processes hanging on ports 3000 and 5000
sudo fuser -k 5000/tcp || true
sudo fuser -k 3000/tcp || true

# 2. Start Backend (Port 5000)
echo "🚀 Starting Backend on Port 5000..."
cd ~/SugunaBase/backend
npm install
# Force Port 5000
PORT=5000 pm2 start index.js --name "suguna-backend"

# 3. Start Frontend (Port 3000)
echo "🚀 Starting Frontend on Port 3000..."
cd ~/SugunaBase/platform
npm install
npm run build
# Force Port 3000
PORT=3000 pm2 start "npm run start" --name "suguna-console"

# 3.5 Start Cloud Functions Hub (Port 3005)
echo "🚀 Starting Cloud Functions Hub on Port 3005..."
cd ~/SugunaBase/cloud-functions
npm install
pm2 start server.js --name "suguna-functions-hub"

# 3.6 Start Suguna Cast Media Server (Port 3100)
echo "🚀 Starting Suguna Cast Media Server on Port 3100..."
cd ~/SugunaBase/suguna-cast/server
# Force clean install for mediasoup binaries
rm -rf node_modules package-lock.json
npm install
npm run build
# Detect Public IP for MediaSoup
PUBLIC_IP=$(curl -s https://ifconfig.me)
echo "🌐 Detected Public IP: $PUBLIC_IP"
# Open Firewall for MediaSoup UDP ports
sudo ufw allow 40000:49999/udp || true
NODE_ENV=production ANNOUNCED_IP=$PUBLIC_IP PORT=3100 pm2 start dist/index.js --name "suguna-cast"

# 4. Save PM2 list so they restart on reboot
pm2 save

# 5. Reset Nginx Configuration
echo "⚙️ Configuring Nginx (Unified Robust Config)..."
sudo tee /etc/nginx/sites-available/suguna > /dev/null <<EOT
# 1. API Subdomain
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

# 2. Cast Subdomain (Media Server)
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
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}

# 3. Main Site and Console
server {
    listen 80;
    server_name suguna.co www.suguna.co console.suguna.co;

    location ^~ /functions/ {
        proxy_pass http://127.0.0.1:3005/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

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

sudo rm -f /etc/nginx/sites-available/*-le-ssl.conf
sudo rm -f /etc/nginx/sites-enabled/*
sudo ln -sf /etc/nginx/sites-available/suguna /etc/nginx/sites-enabled/suguna

# 6. Check Nginx and Restart
sudo nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx Configuration Valid"
    sudo systemctl restart nginx
    
    # 7. Re-apply SSL Certificates (Auto-Refreshes HTTPS settings)
    echo "🔒 Applying SSL..."
    sudo certbot --nginx -d suguna.co -d www.suguna.co -d api.suguna.co -d cast.suguna.co --expand --non-interactive --agree-tos -m admin@suguna.co --redirect
else
    echo "❌ Nginx Configuration Failed"
    exit 1
fi

echo "✅ All Done! Suguna Cast is live on https://cast.suguna.co"
exit 0
