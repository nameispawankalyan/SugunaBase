#!/bin/bash

echo "🔧 Starting Server Fix..."

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

# 4. Save PM2 list so they restart on reboot
pm2 save

# 5. Reset Nginx Configuration
echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/suguna > /dev/null <<EOT
server {
    server_name suguna.co www.suguna.co;

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
    server_name api.suguna.co;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOT

# Ensure semlink exists and default is removed to prevent port 3000 redirect bugs
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/suguna /etc/nginx/sites-enabled/

# 6. Check Nginx and Restart
sudo nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx Configuration Valid"
    sudo systemctl restart nginx
    
    # 7. Re-apply SSL Certificates (Auto-Refreshes HTTPS settings)
    echo "🔒 Applying SSL..."
    sudo certbot --nginx -d suguna.co -d www.suguna.co -d api.suguna.co --non-interactive --agree-tos -m admin@suguna.co --redirect
else
    echo "❌ Nginx Configuration Failed"
    exit 1
fi

echo "✅ All Done! Website should be working perfectly now."
echo "👉 Visit: https://suguna.co/project/15/auth"
exit 0
