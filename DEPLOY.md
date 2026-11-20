# 🚀 MediBridge Production Deployment Guide

This document provides a production deployment guide for **MediBridge** across MongoDB Atlas, Render (Backend API), and Vercel (Frontend Client).

---

## 1. Architecture & Live Endpoints

| Component | Platform | Region | Live URL |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Vercel | Global CDN | [https://medi-bridge-taupe.vercel.app](https://medi-bridge-taupe.vercel.app) |
| **Backend API** | Render | Singapore (ap-southeast-1) | [https://medibridge-5n0o.onrender.com](https://medibridge-5n0o.onrender.com) |
| **Database & GridFS** | MongoDB Atlas | AWS / Mumbai (`ap-south-1`) | Cloud Replica Set (`Cluster0`) |
| **Health / Ready Probe** | Render | Singapore | `GET /api/health/ready` |

---

## 2. Pre-Deployment Setup: MongoDB Atlas

1. **Create Cluster**:
   - Create a free (M0) or production (M20+) cluster in AWS `ap-south-1` (Mumbai) or nearest region for lowest latency to India/Singapore.
2. **Network Access / IP Whitelist**:
   - Add Render outbound IP addresses or allow `0.0.0.0/0` (secured with strong password and database-level user authentication).
3. **Database User**:
   - Create a dedicated database user with `readWriteAnyDatabase` or scoped read/write permissions on `medibridge` database.
4. **Connection String**:
   - Obtain connection URI:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/medibridge?retryWrites=true&w=majority&appName=Cluster0
     ```
5. **Geospatial & Search Indexes**:
   - MediBridge automatically ensures 2dsphere indexes on boot via Mongoose:
     - `donations.location.coordinates: "2dsphere"`
     - `organizations.address.coordinates: "2dsphere"`
     - `requirements.location.coordinates: "2dsphere"`

---

## 3. Backend Deployment: Render

### Option A: Using Blueprint (`render.yaml`)
1. In the Render Dashboard, click **New +** -> **Blueprint**.
2. Connect the GitHub repository: `kasimshah19/MediBridge`.
3. Render automatically reads `render.yaml` and provisions the web service with health checks and environment settings.

### Option B: Manual Web Service Setup
1. Click **New +** -> **Web Service**.
2. Connect `kasimshah19/MediBridge`.
3. Set the following configuration:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Region**: `Singapore`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health/ready`
4. Add the following **Environment Variables**:

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables strict security & error filtering |
| `PORT` | `5000` | Render dynamically binds or defaults to 5000 |
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas production connection URI |
| `CLIENT_URL` | `https://medi-bridge-taupe.vercel.app` | Production Frontend origin for CORS & Cookies |
| `JWT_SECRET` | *(64-char random hex string)* | Signs authentication tokens (min 32 chars) |
| `CRON_SECRET` | *(32-char random hex string)* | Authenticates scheduled expiry jobs (min 24 chars) |
| `QR_SIGNING_SECRET` | *(64-char random hex string)* | Cryptographic HMAC secret for medicine QR passports |
| `STORAGE_DRIVER` | `gridfs` | Stateless cloud storage via MongoDB GridFS |
| `TRUST_PROXY_HOPS` | `2` | Reverse proxy trust level for Render / Cloudflare |
| `ANALYTICS_CACHE_SECONDS` | `60` | In-memory TTL cache for admin analytics aggregations |
| `REPORT_MAX_ROWS_CSV` | `5000` | Streamed export row cap for audit & transaction reports |
| `REPORT_MAX_ROWS_PDF` | `500` | Table row limit for generated PDF summaries |
| `NOTIFICATION_RETENTION_DAYS`| `90` | Automatic retention purge for read notifications |
| `LOG_LEVEL` | `info` | Structured logging verbosity (Pino) |

---

## 4. Frontend Deployment: Vercel

1. In the Vercel Dashboard, import Git Repository `kasimshah19/MediBridge`.
2. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. Set Environment Variable:
   - `VITE_API_URL`: `https://medibridge-5n0o.onrender.com/api` (Type: `Config`)
4. Click **Deploy**. Vercel will bundle the React application and deploy to edge locations.

---

## 5. Post-Deployment Verification & First-Time Boot

1. **Seed Administrator**:
   In Render's **Shell** tab (or via authenticated CLI):
   ```bash
   node src/scripts/seedAdmin.js
   ```
2. **Verify Health Probes**:
   - `curl -i https://medibridge-5n0o.onrender.com/api/health` -> Expect HTTP 200 with uptime and status.
   - `curl -i https://medibridge-5n0o.onrender.com/api/health/ready` -> Expect HTTP 200 with MongoDB connected and storage driver active.
3. **Storage Migration (Optional)**:
   If migrating existing disk uploads from previous local runs to GridFS:
   ```bash
   npm run storage:migrate
   ```
4. **Cryptographic Chain of Custody Audit**:
   Verify integrity of all historical custody ledgers in the database:
   ```bash
   npm run custody:verify
   ```

---

## 6. Automated Expiry Job (Cron Scheduling)

Render free/starter web services sleep if inactive. To maintain the automated expiry lifecycle and notification retention:
- **Render Cron Job** or **GitHub Actions Cron**:
  Configure a periodic POST request to:
  ```http
  POST https://medibridge-5n0o.onrender.com/api/cron/expiry
  x-cron-secret: <YOUR_CRON_SECRET>
  ```
  Schedule: `0 0 * * *` (Daily at Midnight IST).

---

## 7. Cold Start Mitigation

Render free/starter tier spins down after 15 minutes of inactivity:
1. **Health Keep-Alive**:
   Add a free monitor (e.g., [UptimeRobot](https://uptimerobot.com) or [BetterStack](https://betterstack.com)) pinging `https://medibridge-5n0o.onrender.com/api/health` every 10 minutes.
2. **Graceful User Experience**:
   The MediBridge frontend includes built-in Axios interceptors and a `ServerWakingBanner` component that automatically detects 502/503/504 cold starts, shows an animated waking banner, and auto-retries requests every 5 seconds until the server responds.
