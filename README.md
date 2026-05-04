# Printify Hub — Billing System

A full-stack billing and invoice management system built for printing and design businesses.

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS 4
- **Backend**: Node.js + Express 5
- **Database**: PostgreSQL
- **Auth**: JWT with bcrypt password hashing

---

## Features

- **Customer Management** — Add/edit/delete customers (Instant or Monthly billing type)
- **Order/Job Tracking** — Create and manage print/design jobs with status tracking
- **Instant Billing** — Generate invoices with line items instantly
- **Monthly Billing** — Consolidated monthly bills for monthly customers
- **Invoice Numbers** — Auto-generated `INV-YYYY-XXXX` format, resets each year
- **Payment Tracking** — Cash, UPI, bank transfer, cheque, card payments
- **Reports & Analytics** — Sales reports, customer statements, payment reports
- **Print / PDF** — A4 invoice printing and PDF download
- **Authentication** — JWT-based login (admin/staff roles)
- **Responsive** — Mobile-friendly with collapsible sidebar

---

## Local Development

### Prerequisites

- Node.js v18+
- PostgreSQL v14+ running on `localhost:5432`

### 1. Setup Database

```bash
cd backend
node create_db.js          # Creates the billing_system database
node setup_users.js        # Creates default admin user
```

Then load the schema:

```bash
psql -U postgres -d billing_system -f database/schema.sql
```

### 2. Backend `.env`

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=billing_system
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```

### 3. Start Backend

```bash
cd backend
npm install
npm run dev
```

Server runs at **http://localhost:5000**

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173**

### Default Login

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

---

## VPS Deployment

> ⚠️ **Note:** If the **Optimax Opticle** system is already on this VPS, this guide avoids all conflicts by using a different port, directory, and PM2 process name.

| | Optimax Opticle | **Lanka Print Studio** |
|---|---|---|
| Directory | `/var/www/optimax` | `/var/www/lanka-print` |
| Backend Port | `5000` | **`5001`** |
| PM2 Name | `optimax-backend` | **`lanka-print-backend`** |
| Database | `optimax_opticle` | **`billing_system`** |

### Step 1 — Install Prerequisites (if not already done)

```bash
apt update && apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL, Nginx, PM2
apt install -y postgresql postgresql-contrib nginx
npm install -g pm2
```

### Step 2 — Create Database

```bash
sudo -u postgres psql
```

```sql
CREATE USER billing_user WITH PASSWORD 'YourStrongPassword123!';
CREATE DATABASE billing_system OWNER billing_user;
GRANT ALL PRIVILEGES ON DATABASE billing_system TO billing_user;
\q
```

### Step 3 — Clone & Configure

```bash
git clone https://github.com/KaviduRavishanHasaranga/lanka-print-billing.git /var/www/lanka-print
cd /var/www/lanka-print/backend
npm install
nano .env
```

Production `.env`:

```env
PORT=5001
NODE_ENV=production

DB_HOST=localhost
DB_PORT=5432
DB_NAME=billing_system
DB_USER=billing_user
DB_PASSWORD=YourStrongPassword123!

JWT_SECRET=replace_with_long_random_secret_64chars_minimum
JWT_EXPIRES_IN=7d
```

### Step 4 — Setup Database & Admin User

```bash
psql -U billing_user -d billing_system -f database/schema.sql
node setup_users.js
```

### Step 5 — Build Frontend

```bash
cd /var/www/lanka-print/frontend
npm install
npm run build
```

### Step 6 — Start with PM2

```bash
cd /var/www/lanka-print/backend
pm2 start server.js --name "lanka-print-backend"
pm2 save
pm2 startup   # Run the printed command to enable auto-restart on reboot
```

### Step 7 — Nginx Config

```bash
nano /etc/nginx/sites-available/lanka-print
```

**Option A: Subdomain** (`print.yourdomain.com`)

```nginx
server {
    listen 80;
    server_name print.yourdomain.com;

    root /var/www/lanka-print/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Option B: Different port** (no domain, access via `http://YOUR_VPS_IP:8080`)

```nginx
server {
    listen 8080;
    server_name YOUR_VPS_IP;

    root /var/www/lanka-print/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and reload:

```bash
ln -s /etc/nginx/sites-available/lanka-print /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# If using Option B, open port 8080:
ufw allow 8080
```

### Step 8 — (Optional) HTTPS with Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d print.yourdomain.com
```

---

## Reset / Clear All Data

To wipe all data and start fresh:

```bash
psql -U billing_user -d billing_system -f database/reset_data.sql
node setup_users.js   # Recreate admin account
```

---

## Update After Code Changes

```bash
cd /var/www/lanka-print
git pull origin main

cd backend && npm install
pm2 restart lanka-print-backend

cd ../frontend && npm install && npm run build
```

---

## Useful Commands

| Command | Description |
|---|---|
| `pm2 status` | View running processes |
| `pm2 logs lanka-print-backend` | View backend logs |
| `pm2 restart lanka-print-backend` | Restart backend |
| `nginx -t` | Test Nginx config |
| `systemctl reload nginx` | Apply Nginx changes |

---

## Currency

All amounts are displayed in **LKR** (Sri Lankan Rupees).

## Author

**Kavidu Ravishan Hasaranga**  
GitHub: [@KaviduRavishanHasaranga](https://github.com/KaviduRavishanHasaranga)
