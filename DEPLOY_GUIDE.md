# 🚀 HR System - Online Deployment Guide

## ⚡ Step 0: GitHub Password Update (දැනම කරන්න!)

ඔබ GitHub password වෙනස් කළ නිසා, **`UPDATE_GIT_PASSWORD.bat`** ගොනුව **පළමුව** ධාවනය කරන්න.

```
UPDATE_GIT_PASSWORD.bat  ← Double-click කරන්න
```

ඊට පසු **`PUSH_TO_GITHUB.bat`** ධාවනය කර code push කරන්න.

---

## ✅ Step 1: Backend Deploy (Back4App Containers)

**URL:** https://www.back4app.com/containers

1. **Sign Up** — Google or Email (FREE, No Credit Card)
2. **"Create New App"** → **"Web Service"** 
3. GitHub account connect කර **`hrsystem`** repo තෝරන්න
4. **Settings:**
   - Root Directory: `backend`
   - Branch: `main`
5. **Environment Variables** (Add environment variable):

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://postgres.miikoefhdzkaoaukaftm:Jayabima%402026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres` |
| `JWT_SECRET` | `HRMS_SECURE_TOKEN_2026_JB_INVESTMENTS_99881122` |
| `PORT` | `5000` |

6. **"Deploy"** click කරන්න
7. Deploy ලෙස ලැබෙන URL copy කරගන්න  
   _(Example: `https://hrsystem-xxxxx.b4a.run`)_

---

## ✅ Step 2: Frontend Deploy (Vercel)

**URL:** https://vercel.com

1. **Sign Up** with GitHub (FREE)
2. **"Add New" → "Project"**
3. **`hrsystem`** repo import කරන්න
4. **Settings:**
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
5. **Environment Variables:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | Back4App URL (Step 1 දී ලැබෙන URL) |

6. **"Deploy"** click කරන්න
7. Vercel URL Copy කරගන්න  
   _(Example: `https://hrsystem.vercel.app`)_

---

## ✅ Step 3: Final Verification

Vercel URL ධාවනය කර:
- [ ] Login screen පෙනෙනවාද?
- [ ] Username/Password ඇතුල් කළ හැකිද?
- [ ] Dashboard load වෙනවාද?
- [ ] Employee data visible ද?

---

> **ℹ️ Note:** Back4App Free Tier limits — 0.25 CPU, 256MB RAM.  
> HR system සඳහා මෙය ප්‍රමාණවත්. 🎉
