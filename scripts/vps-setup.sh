#!/bin/bash
# ============================================================
# Lanka Print Billing System — One-Time VPS Setup Script
# Run this ONCE as root on your Ubuntu 22.04 VPS
# Usage: bash scripts/vps-setup.sh
# ============================================================

set -e  # Exit on any error

APP_DIR="/var/www/billing-system"
REPO_URL="https://github.com/KaviduRavishanHasaranga/lanka-print-billing.git"
PM2_LOG_DIR="/var/log/pm2"

echo "================================================================"
echo "  🚀 Lanka Print Billing System — VPS Setup"
echo "================================================================"
echo ""

# --- 1. Create PM2 log directory ---
echo "📁 Creating PM2 log directory..."
mkdir -p "$PM2_LOG_DIR"

# --- 2. Clone or update the repository ---
echo "📂 Setting up application directory..."
mkdir -p "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
    echo "ℹ️  Repository already cloned. Pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo "✅ Repository ready."

# --- 3. Create backend .env if it doesn't exist ---
echo ""
echo "⚙️  Checking backend environment file..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
    cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
    echo ""
    echo "⚠️  ==========================================================="
    echo "   backend/.env was created from .env.example."
    echo "   You MUST edit it with your real values:"
    echo "     nano $APP_DIR/backend/.env"
    echo ""
    echo "   Required variables:"
    echo "     PORT=5000"
    echo "     NODE_ENV=production"
    echo "     DB_HOST=localhost"
    echo "     DB_PORT=5432"
    echo "     DB_NAME=billing_system"
    echo "     DB_USER=postgres"
    echo "     DB_PASSWORD=YOUR_REAL_PASSWORD"
    echo "     JWT_SECRET=YOUR_STRONG_RANDOM_SECRET"
    echo "==========================================================="
    echo ""
    read -p "Press ENTER after editing backend/.env to continue..."
else
    echo "✅ backend/.env already exists."
fi

# --- 4. Install backend dependencies (production only) ---
echo ""
echo "📦 Installing backend dependencies..."
cd "$APP_DIR/backend"
npm ci --omit=dev
echo "✅ Backend dependencies installed."

# --- 5. Build frontend ---
echo ""
echo "🏗️  Building frontend..."
cd "$APP_DIR/frontend"
npm ci
npm run build
echo "✅ Frontend built successfully."

# --- 6. Start app with PM2 ---
echo ""
echo "🔄 Starting app with PM2..."
cd "$APP_DIR"

if pm2 list | grep -q "billing-backend"; then
    pm2 restart billing-backend --update-env
    echo "✅ billing-backend restarted."
else
    pm2 start ecosystem.config.js
    echo "✅ billing-backend started."
fi

# Save PM2 process list so it survives reboots
pm2 save

# Register PM2 to start on system boot
pm2 startup systemd -u root --hp /root
echo "✅ PM2 configured to start on boot."

# --- 7. Summary ---
echo ""
echo "================================================================"
echo "  ✅ Setup Complete!"
echo "================================================================"
echo "  📍 App directory   : $APP_DIR"
echo "  📡 API running at  : http://localhost:5000"
echo "  📋 PM2 logs        : $PM2_LOG_DIR"
echo ""
echo "  Next steps:"
echo "  1. Configure Nginx (see scripts/nginx.conf)"
echo "  2. Install Certbot for SSL:"
echo "       apt install certbot python3-certbot-nginx -y"
echo "       certbot --nginx -d your-domain.com"
echo "  3. Add GitHub Secrets to your repo:"
echo "       VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_PORT"
echo "  4. Push to main — auto-deploy will kick in!"
echo "================================================================"
