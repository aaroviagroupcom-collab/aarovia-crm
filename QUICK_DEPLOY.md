# 🚀 QUICK DEPLOYMENT CHECKLIST

## Your Production URLs (After Deployment)
- 🌐 **Frontend**: https://aarovia-crm.vercel.app
- 🔧 **Backend API**: https://aarovia-crm-backend.onrender.com
- 🗄️ **Database**: Render PostgreSQL (included)

## Login Credentials
```
superadmin@aaroviagroup.com / Admin@123
admin@aaroviagroup.com / Admin@123
manager@aaroviagroup.com / Admin@123
exec1@aaroviagroup.com / Admin@123
exec2@aaroviagroup.com / Admin@123
```

---

## ✅ DEPLOYMENT STEPS (Copy & Follow)

### Step 1: GitHub (2 minutes)
```powershell
# 1. Create repo at github.com/new (name: aarovia-crm)
# 2. Run these commands:
cd "c:\Users\Aditya\Downloads\aarovia-crm"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aarovia-crm.git
git push -u origin main
```

### Step 2: Vercel Frontend (5 minutes)
1. Go to vercel.com → Sign up with GitHub
2. Click "New Project"
3. Select `aarovia-crm` repository
4. Set Root Directory: `frontend`
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://aarovia-crm-backend.onrender.com/api
   NEXT_PUBLIC_APP_NAME=Aarovia CRM
   NEXT_PUBLIC_COMPANY_NAME=Aarovia Properties
   ```
6. Deploy! ✅

### Step 3: Render Backend + Database (10 minutes)

**3A. Create PostgreSQL Database:**
1. Go to render.com → Sign up with GitHub
2. Click "New +" → "PostgreSQL"
3. Name: `aarovia-db`
4. Plan: Free
5. Create Database
6. **Copy the internal database URL** (you'll need it)

**3B. Deploy Backend Service:**
1. Click "New +" → "Web Service"
2. Select `aarovia-crm` repository
3. Name: `aarovia-crm-backend`
4. Build Command:
   ```
   npm install --legacy-peer-deps && npm run build && npx prisma generate && npx prisma db push --skip-generate
   ```
5. Start Command:
   ```
   node dist/index.js
   ```
6. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=[paste PostgreSQL URL here]
   JWT_SECRET=aarovia-crm-production-secret-2024
   FRONTEND_URL=https://aarovia-crm.vercel.app
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=dummy
   TWILIO_PHONE_NUMBER=+911234567890
   ```
7. Deploy! ✅

---

## ✅ Testing

### Test Backend API
Open in browser:
```
https://aarovia-crm-backend.onrender.com/health
```
You should see JSON response.

### Test Frontend
Open:
```
https://aarovia-crm.vercel.app
```
Should show login page.

### Test Login
Use credentials above to login.

---

## 📋 Features Included

✅ User Authentication & JWT
✅ Role-Based Access Control (RBAC)
✅ Lead Management
✅ Project Management
✅ Inventory Management
✅ Quotation System
✅ Booking Management
✅ Invoice & Payment System
✅ Email Templates
✅ Activity Logging
✅ Dashboard with Charts
✅ Responsive UI (Mobile-Friendly)

---

## 💰 Cost Breakdown

| Service | Free Tier | Cost |
|---------|-----------|------|
| Vercel Frontend | ✅ Included | **$0** |
| Render Backend | ✅ Included | **$0** |
| Render PostgreSQL | ✅ Included | **$0** |
| **TOTAL MONTHLY COST** | | **$0** |

Note: Free tiers may have brief inactivity sleep (wake up on first request).

---

## 🆘 Troubleshooting

**Frontend loads but can't login**
→ Check NEXT_PUBLIC_API_URL environment variable in Vercel

**Backend returns 502 error**
→ Check Render logs, verify DATABASE_URL is correct

**Database connection fails**
→ Verify PostgreSQL URL, check database is running on Render

**Login page shows but has styling issues**
→ Wait 30 seconds, refresh browser (Tailwind CSS compilation)

---

## 📞 Need Help?

1. Check DEPLOYMENT.md for detailed guide
2. Check Vercel build logs: vercel.com dashboard
3. Check Render build logs: render.com dashboard
4. Check browser console (F12) for errors

---

**Total Setup Time: ~15-20 minutes**
**Total Cost: $0**
**Result: Production CRM system live and working!** 🎉
