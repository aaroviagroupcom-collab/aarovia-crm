# Aarovia Properties CRM — Production Deployment Guide

## Architecture
- **Frontend**: Next.js 15 → Vercel
- **Backend**: Node/Express → DigitalOcean Droplet (Docker)
- **Database**: PostgreSQL (Docker or managed)
- **Storage**: Cloudinary
- **Communications**: Gmail SMTP + WhatsApp Cloud API + Twilio

---

## Prerequisites
- DigitalOcean Droplet: Ubuntu 22.04, 4GB RAM minimum
- Domain name (e.g. aarovia.com)
- DNS: `api.aarovia.com` → Droplet IP
- Cloudinary account
- Gmail with App Password enabled
- Meta WhatsApp Business API access
- Twilio account

---

## Step 1: Server Setup (DigitalOcean Droplet)

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Install Docker Compose
apt install docker-compose-plugin -y

# Install certbot for SSL
apt install certbot -y

# Generate SSL certs
certbot certonly --standalone -d api.aarovia.com
# Certs at: /etc/letsencrypt/live/api.aarovia.com/

# Copy certs to nginx/ssl/
mkdir -p /opt/aarovia-crm/nginx/ssl
cp /etc/letsencrypt/live/api.aarovia.com/fullchain.pem /opt/aarovia-crm/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/api.aarovia.com/privkey.pem /opt/aarovia-crm/nginx/ssl/key.pem
```

---

## Step 2: Deploy Backend

```bash
# Clone or upload project
cd /opt
git clone https://github.com/yourorg/aarovia-crm.git
cd aarovia-crm

# Create environment file
cp backend/.env.example backend/.env
nano backend/.env   # Fill in all values

# Create docker-compose .env
cat > .env << 'EOF'
DB_USER=aarovia
DB_PASSWORD=YourStrongPassword123!
DB_NAME=aarovia_crm
JWT_SECRET=YourSuperSecretJWTKey256BitMinimum
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://crm.aarovia.com
GMAIL_USER=noreply@aarovia.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
WHATSAPP_API_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
EOF

# Build and start
docker compose up -d --build

# Check logs
docker compose logs -f backend

# Run migrations + seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx ts-node prisma/seed.ts
```

---

## Step 3: Deploy Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
cp .env.example .env.local
# Edit .env.local:
# NEXT_PUBLIC_API_URL=https://api.aarovia.com

# Deploy
vercel --prod

# Or connect GitHub repo in Vercel dashboard for auto-deploy
# Set env vars in Vercel dashboard → Settings → Environment Variables
```

---

## Step 4: Backend Environment Variables

Fill in `/backend/.env`:

```env
DATABASE_URL="postgresql://aarovia:password@localhost:5432/aarovia_crm"
JWT_SECRET="minimum-32-char-secret-key-here"
JWT_EXPIRES_IN="7d"
PORT=5000
FRONTEND_URL="https://crm.aarovia.com"
NODE_ENV=production

# Gmail SMTP
GMAIL_USER="noreply@aarovia.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="your_api_secret"

# WhatsApp Cloud API
WHATSAPP_API_TOKEN="EAA..."
WHATSAPP_PHONE_NUMBER_ID="12345678901234"
WHATSAPP_BUSINESS_ACCOUNT_ID="12345678901234"

# Twilio
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"
TWILIO_TWIML_APP_SID="APxxxxxxxx"

# Company
COMPANY_NAME="Aarovia Properties"
COMPANY_EMAIL="info@aarovia.com"
COMPANY_PHONE="+91 98765 43210"
```

---

## Step 5: Gmail App Password Setup

1. Go to Google Account → Security → 2-Step Verification → ON
2. Search "App passwords" → Create one for "Mail"
3. Use the 16-char password in `GMAIL_APP_PASSWORD`

---

## Step 6: WhatsApp Cloud API Setup

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create app → Business → WhatsApp
3. Set up a phone number
4. Get `Access Token` → `WHATSAPP_API_TOKEN`
5. Get `Phone Number ID` → `WHATSAPP_PHONE_NUMBER_ID`
6. Register message templates in WhatsApp Manager

---

## Step 7: Twilio Setup (Click-to-Call)

1. Sign up at [twilio.com](https://twilio.com)
2. Get Account SID and Auth Token
3. Buy/verify a phone number
4. Set webhook URL: `https://api.aarovia.com/api/calls/twiml`
5. For call recording: enable in Twilio console

---

## Default Login Credentials

| Email | Password | Role |
|-------|----------|------|
| superadmin@aarovia.com | Admin@123 | Super Admin |
| admin@aarovia.com | Admin@123 | Admin |
| manager@aarovia.com | Admin@123 | Sales Manager |
| tl@aarovia.com | Admin@123 | Team Leader |
| exec1@aarovia.com | Admin@123 | Sales Executive |
| exec2@aarovia.com | Admin@123 | Sales Executive |
| postsales@aarovia.com | Admin@123 | Post Sales |
| accounts@aarovia.com | Admin@123 | Accounts |

**⚠️ Change all passwords immediately after first login!**

---

## SSL Certificate Renewal (Auto)

```bash
# Add to crontab
crontab -e
# Add: 0 3 * * * certbot renew --quiet && docker restart aarovia_nginx
```

---

## Monitoring & Backups

```bash
# Daily database backup
cat > /etc/cron.daily/aarovia-backup << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
docker compose -f /opt/aarovia-crm/docker-compose.yml exec -T postgres \
  pg_dump -U aarovia aarovia_crm | gzip > /backups/aarovia_$DATE.sql.gz
find /backups -name "*.sql.gz" -mtime +30 -delete
EOF
chmod +x /etc/cron.daily/aarovia-backup
mkdir -p /backups

# View backend logs
docker compose logs --tail=100 -f backend

# Restart services
docker compose restart backend
```

---

## Folder Structure

```
aarovia-crm/
├── frontend/                  # Next.js 15 App
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/         # Login page
│   │   │   ├── dashboard/     # Dashboard
│   │   │   ├── leads/         # Lead management + detail
│   │   │   ├── projects/      # Project management
│   │   │   ├── inventory/     # Inventory grid + list
│   │   │   ├── quotations/    # Quotation builder + PDF
│   │   │   ├── bookings/      # Booking management
│   │   │   ├── collections/   # Payment collections
│   │   │   ├── demands/       # Demand notices
│   │   │   ├── invoices/      # Invoice management
│   │   │   ├── reports/       # Analytics & Reports
│   │   │   ├── users/         # User management
│   │   │   └── settings/      # Templates & Config
│   │   ├── components/layout/ # Sidebar, Header, DashboardLayout
│   │   ├── lib/api.ts         # All API calls (Axios)
│   │   └── store/             # Zustand auth store
│   ├── vercel.json
│   └── .env.example
│
├── backend/                   # Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma      # Full DB schema
│   │   └── seed.ts            # Sample data
│   ├── src/
│   │   ├── controllers/       # auth, lead, dashboard, quotation, booking
│   │   ├── middleware/        # JWT auth, RBAC, error handling
│   │   ├── routes/            # All API routes
│   │   ├── services/          # Email, WhatsApp, Call, Activity
│   │   └── config/            # DB, Cloudinary, Logger
│   ├── Dockerfile
│   └── .env.example
│
├── nginx/
│   └── nginx.conf             # Reverse proxy config
├── docker-compose.yml
└── README.md
```

---

## API Endpoints Summary

| Module | Base Path |
|--------|-----------|
| Auth | `/api/auth` |
| Dashboard | `/api/dashboard` |
| Leads | `/api/leads` |
| Users | `/api/users` |
| Projects | `/api/projects` |
| Inventory | `/api/inventory` |
| Quotations | `/api/quotations` |
| Bookings | `/api/bookings` |
| Collections | `/api/collections` |
| Demands | `/api/demands` |
| Invoices | `/api/invoices` |
| Reports | `/api/reports` |
| Communications | `/api/communications` |
| Notifications | `/api/notifications` |
| Calls | `/api/calls` |
| Templates | `/api/templates` |

---

## Health Check

```bash
curl https://api.aarovia.com/health
# Expected: {"status":"ok","timestamp":"...","database":"connected"}
```
