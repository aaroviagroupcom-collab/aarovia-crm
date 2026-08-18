# Aarovia CRM - Live Production Deployment Guide

## Prerequisites
- GitHub account (free at github.com)
- Vercel account (free at vercel.com)
- Render account (free at render.com)

---

## STEP 1: Push Code to GitHub ✅

### 1.1 Create GitHub Repository
1. Go to https://github.com/new
2. Create new repository:
   - **Name**: `aarovia-crm`
   - **Description**: Aarovia Properties Enterprise CRM
   - **Visibility**: Public
   - **Don't** initialize with README (we already have one)
3. Click "Create repository"

### 1.2 Push Your Code
Run these commands in PowerShell:
```powershell
cd "c:\Users\Aditya\Downloads\aarovia-crm"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aarovia-crm.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## STEP 2: Deploy Frontend to Vercel 🚀

### 2.1 Connect Vercel to GitHub
1. Go to https://vercel.com
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize Vercel to access your GitHub repositories

### 2.2 Deploy Frontend
1. In Vercel dashboard, click "Add New" → "Project"
2. Find and select `aarovia-crm` repository
3. **Configure:**
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install --legacy-peer-deps`
   - **Output Directory**: `.next`

4. **Environment Variables** (add before deploying):
   ```
   NEXT_PUBLIC_API_URL=https://aarovia-crm-backend.onrender.com/api
   NEXT_PUBLIC_APP_NAME=Aarovia CRM
   NEXT_PUBLIC_COMPANY_NAME=Aarovia Properties
   ```

5. Click "Deploy" → Wait 2-3 minutes ✅

**Frontend URL**: `https://aarovia-crm.vercel.app`

---

## STEP 3: Deploy Backend to Render 🔧

### 3.1 Create PostgreSQL Database First
1. Go to https://render.com
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize Render
4. In Dashboard, click "New +" → "PostgreSQL"
5. **Configure:**
   - **Name**: `aarovia-db`
   - **Database**: `aarovia_crm`
   - **User**: `aarovia`
   - **Region**: Choose closest to you
   - **Plan**: Free
6. Click "Create Database"
7. **Copy the Internal Database URL** (you'll need this)
   - Format: `postgres://username:password@host:5432/aarovia_crm`

### 3.2 Deploy Backend Service
1. In Render Dashboard, click "New +" → "Web Service"
2. Connect your GitHub account if needed
3. Select `aarovia-crm` repository
4. **Configure:**
   - **Name**: `aarovia-crm-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install --legacy-peer-deps && npm run build && npx prisma generate && npx prisma db push --skip-generate`
   - **Start Command**: `node dist/index.js`
   - **Plan**: Free

5. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=<paste your PostgreSQL internal URL here>
   JWT_SECRET=aarovia-crm-super-secret-key-production-use-strong-key-2024
   FRONTEND_URL=https://aarovia-crm.vercel.app
   GMAIL_USER=noreply@aaroviagroup.com
   GMAIL_APP_PASSWORD=dummy-for-production
   CLOUDINARY_CLOUD_NAME=demo
   CLOUDINARY_API_KEY=demo-key
   CLOUDINARY_API_SECRET=demo-secret
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=demo-token
   TWILIO_PHONE_NUMBER=+911234567890
   WHATSAPP_API_TOKEN=demo-whatsapp-token
   WHATSAPP_PHONE_NUMBER_ID=demo-phone-id
   ```

6. Click "Create Web Service" → Wait for deployment ✅

**Backend URL**: `https://aarovia-crm-backend.onrender.com`

---

## STEP 4: Test Live Deployment 🧪

### 4.1 Test API Health
1. Open: `https://aarovia-crm-backend.onrender.com/health`
2. You should see:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-08-18T...",
     "service": "Aarovia CRM API v1.0"
   }
   ```

### 4.2 Test Frontend
1. Open: `https://aarovia-crm.vercel.app`
2. You should see the login page

### 4.3 Test Login
Use any of these credentials:
```
Email: superadmin@aaroviagroup.com
Password: Admin@123

OR

Email: admin@aaroviagroup.com
Password: Admin@123
```

---

## STEP 5: Seed Production Database 📊

After backend deploys, seed the database with test data:

1. Go to Render Dashboard
2. Find your `aarovia-crm-backend` service
3. Click "Shell" tab
4. Run:
   ```bash
   npm run prisma:seed
   ```

You should see output showing users created.

---

## ✅ Production Deployment Complete!

| Component | URL | Status |
|-----------|-----|--------|
| Frontend | https://aarovia-crm.vercel.app | ✅ Live |
| Backend API | https://aarovia-crm-backend.onrender.com | ✅ Live |
| Database | Render PostgreSQL | ✅ Live |

**Login Credentials** (in production):
- Email: `superadmin@aaroviagroup.com`
- Password: `Admin@123`

---

## Troubleshooting

### Frontend won't load
- Check Vercel build logs
- Verify `NEXT_PUBLIC_API_URL` environment variable

### Backend not responding
- Check Render build logs
- Verify database connection string
- Check environment variables

### Login fails
- Check browser console for API errors
- Verify backend is running (`/health` endpoint)
- Check database connection

### Database connection error
- Verify database URL is correct
- Check if database is running on Render
- Ensure Prisma migrations completed

---

## Next Steps
1. Complete the deployment steps above
2. Test the login with provided credentials
3. Explore the CRM features
4. Update JWT_SECRET with a stronger production key
5. Configure email, SMS, and payment integrations as needed

**Total Cost: $0 (Completely Free!)**
