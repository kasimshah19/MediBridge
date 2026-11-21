# 🏥 MediBridge

**Medicine Donation, Verification & Redistribution Management Platform**

[![CI](https://github.com/kasimshah19/MediBridge/actions/workflows/ci.yml/badge.svg)](https://github.com/kasimshah19/MediBridge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node: >=20](https://img.shields.io/badge/Node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://medi-bridge-taupe.vercel.app)
[![Render](https://img.shields.io/badge/Render-Online-46E3B7?logo=render)](https://medibridge-5n0o.onrender.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20Cluster-47A248?logo=mongodb)](https://www.mongodb.com/cloud/atlas)

MediBridge connects donors, pharmacists, and NGOs on a trusted platform to ensure unused, sealed medicines reach those who need them most. Every donated medicine goes through pharmacist verification, geo-based matching, and QR-coded chain of custody tracking.

---

## 🌐 Live Deployments

| Component | Platform | Live URL | Status |
| :--- | :--- | :--- | :--- |
| **Frontend App** | **Vercel** | [https://medi-bridge-taupe.vercel.app](https://medi-bridge-taupe.vercel.app) | ![Vercel](https://img.shields.io/badge/Vercel-Deployed-success?style=flat&logo=vercel) |
| **Backend API** | **Render** | [https://medibridge-5n0o.onrender.com](https://medibridge-5n0o.onrender.com) | ![Render](https://img.shields.io/badge/Render-Live-success?style=flat&logo=render) |
| **API Health Check** | **Render** | [https://medibridge-5n0o.onrender.com/api/health](https://medibridge-5n0o.onrender.com/api/health) | ![Health](https://img.shields.io/badge/Health-200%20OK-brightgreen?style=flat) |
| **Database** | **MongoDB Atlas** | `Cluster0 (Cloud)` | ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat&logo=mongodb) |

---

## 🚀 Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| **Frontend** | React 18 + Vite, Tailwind CSS v4, Framer Motion |
| **Backend**  | Node.js, Express.js, MongoDB (Mongoose)          |
| **Auth**     | JWT + bcrypt (cookie-based)                      |
| **Validation** | Zod (server & client)                         |
| **Maps**     | Leaflet + OpenStreetMap/Nominatim                |
| **QR**       | qrcode (generate) + html5-qrcode (scan)         |
| **Email**    | Nodemailer                                       |
| **Icons**    | Lucide React                                     |

---

## 📁 Project Structure

```
MediBridge/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── config/       # Database, env validation, constants
│   │   ├── models/       # Mongoose schemas
│   │   ├── controllers/  # Route handlers
│   │   ├── routes/       # Express routers
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── services/     # Business logic (geocoding, QR, email)
│   │   ├── jobs/         # Scheduled tasks (cron)
│   │   ├── validators/   # Zod validation schemas
│   │   ├── utils/        # Helpers (ApiError, ApiResponse, logger)
│   │   ├── app.js        # Express app configuration
│   │   └── server.js     # Server entry point
│   ├── uploads/          # File upload storage
│   └── tests/            # Jest + Supertest tests
│
├── frontend/             # React + Vite app
│   ├── src/
│   │   ├── api/          # Axios instance and API functions
│   │   ├── assets/       # Static images and icons
│   │   ├── components/   # UI, layout, and common components
│   │   ├── context/      # React contexts (Auth, etc.)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── layouts/      # Page layouts (Public, Dashboard)
│   │   ├── pages/        # Route pages by role
│   │   ├── routes/       # React Router configuration
│   │   └── utils/        # Helpers (cn, constants)
│   └── public/           # Static assets
│
├── .gitignore
└── README.md
```

---

## 🛠️ Setup

### Prerequisites

- **Node.js** v18+ (LTS recommended)
- **MongoDB Atlas** account with a cluster
- **npm** v9+

### 1. Clone the repository

```bash
git clone <repository-url>
cd MediBridge
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file (or copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and paste your MongoDB Atlas connection string:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/medibridge
JWT_SECRET=your_long_random_secret_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
CRON_SECRET=your_cron_secret
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Start the frontend:

```bash
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173).

---

## 📋 Environment Variables

### Backend (`backend/.env`)

| Variable       | Required | Description                             |
| -------------- | -------- | --------------------------------------- |
| `NODE_ENV`     | Yes      | `development`, `production`, or `test`  |
| `PORT`         | Yes      | API server port (default: 5000)         |
| `MONGODB_URI`  | Yes      | MongoDB Atlas connection string         |
| `JWT_SECRET`   | Yes      | Secret for signing JWT tokens           |
| `JWT_EXPIRES_IN` | No    | JWT expiry duration (default: 7d)       |
| `CLIENT_URL`   | No       | Frontend URL for CORS (default: http://localhost:5173) |
| `CRON_SECRET`  | No       | Secret for scheduled job endpoints      |
| `ADMIN_NAME`   | No       | Name for seed administrator account     |
| `ADMIN_EMAIL`  | No       | Email for seed administrator account    |
| `ADMIN_PASSWORD` | No     | Password for seed administrator account |
| `COOKIE_SECURE` | No      | Set to true in production for HTTPS     |
| `EMAIL_FROM`   | No       | Sender email address                    |
| `SMTP_HOST`    | No       | SMTP server host for emails             |
| `SMTP_PORT`    | No       | SMTP server port                        |
| `SMTP_USER`    | No       | SMTP username                           |
| `SMTP_PASS`    | No       | SMTP password                           |

### Frontend (`frontend/.env`)

| Variable        | Required | Description                        |
| --------------- | -------- | ---------------------------------- |
| `VITE_API_URL` | Yes      | Backend API URL (default: http://localhost:5000/api) |

---

## 📜 Available Scripts

### Backend

| Command         | Description                     |
| --------------- | ------------------------------- |
| `npm run dev`  | Start dev server with nodemon   |
| `npm start`    | Start production server         |
| `npm test`     | Run tests with Jest             |
| `npm run seed:admin` | Seed initial administrator account |
| `npm run list:collections` | List initialized MongoDB collections |

### Frontend

| Command         | Description                     |
| --------------- | ------------------------------- |
| `npm run dev`  | Start Vite dev server           |
| `npm run build` | Build for production           |
| `npm run preview` | Preview production build     |

---

## 🗺️ Development Roadmap

| Phase | Name                              | Status        |
| ----- | --------------------------------- | ------------- |
| 0     | ✅ Setup & Foundation             | **Complete**  |
| 1     | ✅ Auth & Roles                   | **Complete**  |
| 2     | ✅ Landing Page & Org Onboarding  | **Complete**  |
| 3     | ✅ Donation Submission & Screening | **Complete**  |
| 4     | ✅ Expiry Tracker & Scheduled Jobs | **Complete**  |
| 5     | Pharmacist Verification           | Planned       |
| 6     | Geo Matching & Requests           | Planned       |
| 7     | QR & Chain of Custody             | Planned       |
| 8     | Admin Analytics, Security & Deploy | Planned      |

---

## 📡 API Endpoints (Phases 1, 2, 3 & 4)

### Expiry Tracker (`/api/expiry` — Protected; Scope-Aware)
- `GET /summary` — Real computed counts for user scope (`normal`, `medium`, `high`, `critical`, `expiredTotal`, `expiringIn7Days`, `totalTracked`)
- `GET /items` — Paginated list of medicines with computed fields (`daysLeft`, `isExpired`, `priority`, `expiryLabel`, `donationCode`)
- `GET /timeline` — 12-month projected monthly expiry counts grouped by priority

### Internal & Admin Scheduled Jobs
- `POST /api/internal/jobs/expiry` — Protected webhook for GitHub Actions / external cron (requires `x-cron-secret` header, supports `dryRun` and dev `asOf`)
- `GET /api/admin/jobs/expiry` — Admin job run history (last 10 executions, next scheduled run, cron status)
- `POST /api/admin/jobs/expiry/run` — Admin manual trigger for dry run or real execution

### Auth (`/api/auth`)
- `POST /register` — Register donor, pharmacist, or NGO account
- `POST /login` — Authenticate and receive JWT cookie & bearer token
- `POST /logout` — Invalidate session and clear cookie
- `GET /me` — Current authenticated user profile
- `PATCH /me` — Update user profile details
- `POST /forgot-password` — Initiate password reset token
- `POST /reset-password/:token` — Reset password with token

### Donations (`/api/donations` — Role: `donor` unless specified)
- `POST /` — Create a draft donation with items (max 5 active drafts per donor)
- `GET /my` — Paginated list of my donations with status counts and search
- `GET /my/summary` — Real counts for donor dashboard (total, underVerification, approved, rejected, cancelled)
- `GET /:id` — Full details with items & photo metadata (Owner donor, Admin, or Approved Pharmacist)
- `PATCH /:id` — Edit draft details and items (draft only, 409 otherwise)
- `DELETE /:id` — Permanently delete draft and photo files from disk
- `POST /:id/items/:itemId/photos` — Multipart photo upload (max 4 per item, 5MB, JPG/PNG/WebP, magic bytes checked)
- `DELETE /:id/items/:itemId/photos/:photoId` — Delete photo file from storage
- `GET /:donationId/items/:itemId/photos/:photoId/file` — Authenticated stream (`nosniff`, Owner, Admin, or Approved Pharmacist)
- `POST /:id/submit` — Submit draft for automated screening, assign sequential `DON-YYYY-000001` & `MED-YYYY-000001` IDs
- `POST /:id/cancel` — Cancel donation before approval with mandatory reason

### Organizations (`/api/organizations` — Role: `ngo`)
- `POST /` — Create organization draft (single organization per NGO user)
- `GET /me` — Fetch own organization details with documents metadata and review history
- `PATCH /me` — Edit draft or rejected organization details
- `POST /me/documents` — Upload verification document (validated magic bytes, max 5MB, JPG/PNG/PDF)
- `DELETE /me/documents/:docId` — Delete uploaded document
- `GET /:orgId/documents/:docId/file` — Authenticated streaming for owner NGO or Admin (`nosniff`)
- `POST /me/submit` — Submit organization for administrative review

### Admin (`/api/admin` — Role: `admin`)
- `GET /overview` — Real dashboard metrics (pending/verified orgs, pending pharmacists, donors, users)
- `GET /organizations` — Paginated organization list with live status counts & search
- `GET /organizations/:id` — Full organization details with documents and review history
- `PATCH /organizations/:id/review` — Verify or reject organization (min 10 char note on reject)
- `GET /users` — Paginated user verification queue (pharmacists)
- `PATCH /users/:id/review` — Approve or reject pharmacist applicant

### Notifications (`/api/notifications` — All authenticated users)
- `GET /` — Fetch recent notifications and unread count
- `PATCH /:id/read` — Mark notification as read
- `PATCH /read-all` — Mark all notifications as read

### Geocoding Proxy (`/api/geocode` — All authenticated users)
- `GET /search?q=` — OSM Nominatim geocoding proxy with 1 req/sec throttle & 10m cache
- `GET /reverse?lat=&lng=` — OSM Nominatim reverse geocoding proxy

### Public (`/api/public` — Open access)
- `GET /stats` — Real platform statistics (verified orgs, registered donors, verified pharmacists, cities)
- `GET /organizations` — Directory of verified organizations with sanitized public fields
- `GET /config` — Platform policy configuration (`minShelfLifeDays`, `maxItems`, `maxPhotos`)

---

## ⏱️ Expiry Tracker & Scheduled Job Architecture

MediBridge implements a multi-path, fault-tolerant automated medicine shelf-life tracking system:

```
┌─────────────────────────────────────────────────────────────┐
│                 Three Trigger Mechanisms                    │
├──────────────────────────┬──────────────────────────────────┤
│ 1. Internal node-cron    │ Daily at 00:10 IST in server.js  │
│ 2. GitHub Actions Webhook│ Daily at 00:05 IST via curl retry│
│ 3. Startup Catch-Up      │ Automatically runs on boot if no │
│                          │ run succeeded in past 24 hours   │
└──────────────────────────┴──────────────────────────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │ 10-Minute Concurrency Lock│
              │  (JobRun active check)    │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │  MongoDB Cursor Batching  │
              │ (500 items, bulkWrite,    │
              │   100% idempotent updates)│
              └─────────────┬─────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
[Priority Recalculation] [Auto-Expiration]   [Grouped Alerts]
Normal: >180 days        Marked 'expired'    1 alert per donor
Medium: 91-180 days      Donation consequence:  per threshold
High:   31-90 days       auto-rejected if all (90d, 30d, 7d,
Critical: 0-30 days      items expired       expired)
```

### GitHub Actions Secrets Configuration

When deploying or configuring GitHub Actions, add these repository secrets (**Settings** > **Secrets and variables** > **Actions**):
- `BACKEND_URL`: The production API base URL without trailing slash and without `/api` (e.g. `https://api.medibridge.org`).
- `CRON_SECRET`: Secure string matching `CRON_SECRET` in backend `.env` (minimum 24 characters in production).

### Developer Expiry Override & Time Travel

Because submitted medicines must pass the minimum shelf-life screening threshold (default 90 days), developer utilities allow overriding dates for test verification:
```bash
# Override a medicine's expiration to test priority shifts:
npm run dev:set-expiry -- <medicineId> <daysLeft>
npm run dev:set-expiry -- MED-2026-000001 20   # Critical (20 days left)
npm run dev:set-expiry -- MED-2026-000001 -1   # Expired yesterday
```
In non-production environments with `ALLOW_DEV_TIME_TRAVEL=true`, endpoints accept `asOf` dates to simulate historical or future expiry runs without modifying system clocks.

---

## 🛡️ Automated Medicine Screening Rules

Every submitted medicine item undergoes strict automated screening before pharmacist inspection:

| Rule Code | Trigger Condition | Outcome |
| --------- | ----------------- | ------- |
| `EXPIRED` | Expiration date is in the past (using month-end Asia/Kolkata) | Item Rejected |
| `SHELF_LIFE_TOO_SHORT` | Remaining shelf life is below `MIN_REMAINING_SHELF_LIFE_DAYS` (default: 90 days) | Item Rejected |
| `PACKAGING_NOT_SEALED` | Reported packaging condition is `opened` or `damaged` | Item Rejected |
| `LOOSE_TABLETS` | Packaging is `loose_tablets` or cut strips | Item Rejected |
| `INJECTION_NOT_ACCEPTED` | Dosage form is `injection` or unit is `vial` | Item Rejected |
| `COLD_CHAIN_NOT_ACCEPTED` | Storage is `refrigerated` or matches cold-chain keywords (e.g. insulin, vaccines) | Item Rejected |
| `CONTROLLED_SUBSTANCE` | Matches Schedule X / narcotic keywords (e.g. tramadol, morphine, alprazolam) | Item Rejected |
| `BAD_STORAGE` | Storage reported as `exposed_heat_or_moisture` | Item Rejected |
| `UNREADABLE_BATCH` | Batch number missing or shorter than 3 characters | Item Rejected |
| `DUPLICATE_ITEM` | Same donor already submitted identical brand, batch number, and expiration date | Item Rejected |
| `MISSING_PHOTO` | Fewer than 1 photograph attached to the item at submit time | Item Rejected |

---

## 💾 Storage Architecture Note

Local disk storage is used in early phases wrapped strictly through `src/services/storage.service.js`:
- Organization verification documents: `uploads/org-docs/<orgId>/`
- Medicine packaging photos: `uploads/medicine-photos/<donationId>/<itemId>/`

Uploaded files are **never** served through static Express paths. All requests route through authenticated streaming endpoints with strict role-based access checks and `X-Content-Type-Options: nosniff`. In Phase 8, this wrapper will seamlessly swap to free cloud object storage (e.g. Cloudinary) without touching any controller code.

---

## ⚖️ Compliance & WHO Policy Note

- **WHO Guidelines Context**: The World Health Organization (WHO) Guidelines for Medicine Donations recommend that donated pharmaceuticals have a remaining shelf life of at least one year upon arrival. MediBridge enforces an institutional threshold via `MIN_REMAINING_SHELF_LIFE_DAYS` (default 90 days in local testing) to allow flexible configuration based on community emergency clinic requirements.
- **Verification Guarantee**: No medicine can be distributed without licensed pharmacist physical inspection and verification.
- **Educational Prototype**: MediBridge is an educational and academic software exchange platform; redistributed medicines are received exclusively by registered charitable clinics and licensed NGOs.

---

## 🔬 Pharmacist Verification Workflow (Phase 5)

Phase 5 introduces a comprehensive, multi-round verification engine ensuring that every medicine is inspected and verified by a licensed, admin-approved pharmacist before becoming eligible for NGO matching.

### 1. Verification Flow Architecture

```
[Donor Submits Donation]
         │
         ▼
[Automated Screening Engine]
    ├── All Items Fail ──► Status: screening_rejected
    └── ≥1 Item Passes ──► Status: under_verification
                                 │
                                 ▼
                     [Verification Queue]
              (Filtered by priority, wait time)
                                 │
                                 ▼
                    [Pharmacist Claims Donation]
                   (Atomic claim, 60-min TTL lock)
                                 │
                                 ▼
                [6-Point Physical Safety Checklist]
         1. Expiry date matches and exceeds threshold
         2. Batch number legible and matches
         3. Factory tamper-evident seal unbroken
         4. Blister / packaging free of tears or punctures
         5. Physical condition acceptable (no discoloration)
         6. Clear packaging & label photos provided
                                 │
         ┌───────────────────────┼────────────────────────┐
         ▼                       ▼                        ▼
    [APPROVE]               [REJECT]              [REQUEST MORE INFO]
All 6 checklist items    Requires structured     Requires question +
must be confirmed        reason code + note       type tags (round++)
         │                       │                        │
         ▼                       ▼                        ▼
Status derivation runs   Audit trail logged       Status: more_info_required
(approved / partial)                             (Donor notified to reply)
                                                          │
                                                          ▼
                                                 [Donor Clarification]
                                                 Message + photos uploaded
                                                          │
                                                          ▼
                                                 [Item Returns to Queue]
                                                  Round increments +1
```

### 2. Pure Donation Status Derivation Matrix

Donation status is deterministically derived from its constituent medicine item statuses:

| Medicine Items Condition | Derived Donation Status | Description |
| ------------------------ | ----------------------- | ----------- |
| ≥1 item `pending` | `under_verification` | Items still awaiting pharmacist decision |
| Else ≥1 item `more_info_required` | `more_info_required` | Waiting for donor clarification or additional photos |
| Else ≥1 item `approved` (unreserved) | `approved` | At least 1 approved item remains available for matching |
| Else ≥1 item `reserved` (0 approved) | `matched` | All eligible items reserved under accepted claim(s) |
| Else (all `rejected` / `expired` / `cancelled`) | `rejected` | All items failed verification or expired |

---

## 🗺️ Phase 6: Geospatial Matching & Claims System

### 1. Matching Workflow

```
[Donation Approved]
        │
        ├───────────────────────────────────────────┐
        ▼                                           ▼
[Donor Browses Nearby NGOs]                [NGO Finds Available Meds]
GET /api/donations/:id/nearby-orgs          GET /api/ngo/available
(Radius: 5 / 10 / 20 km)                    (Approximate location ~1.1km)
        │                                           │
        ▼                                           ▼
[Donor Offers Medicines]                   [NGO Claims Medicines]
POST /api/claims (initiator: donor)         POST /api/claims (initiator: ngo)
        │                                           │
        └─────────────────────┬─────────────────────┘
                              ▼
                       [Claim Pending]
                    (TTL: 72 hours window)
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
         [DECLINE]        [WITHDRAW]        [EXPIRE]
      Reason required   Initiator only    Auto-expired
      (24h cooldown)                      by expiry job
             │
             ▼
         [ACCEPT]
   (Counterparty only)
             │
             ├─ Atomic reservation of items: status -> "reserved"
             ├─ Competing pending claims automatically -> "superseded"
             ├─ Donation derived status updates -> "matched"
             ├─ Linked NGO requirement fulfilledQuantity updated
             └─ Handover contact details unlocked with audit trail
             │
             ▼
      [CLAIM ACCEPTED]
      (Mutual contact unlocked)
             │
             ├─ [Handover Details]: Revealed to Donor & NGO
             └─ [Cancel Match]: Reverts items & donation to "approved"
```

### 2. Match Scoring Algorithm (0–100 Score)

Match ranking uses a multi-factor scoring formula:

$$\text{Score} = \text{Name Match (50)} + \text{Urgency (20)} + \text{Proximity (15)} + \text{Shelf Life (15)}$$

- **Medicine Name Match (Max 50 pts)**:
  - Exact normalized name or genericName match: **50 pts**
  - Token overlap $\ge 50\%$: **30 pts**
  - No match / General browse: **0 pts**
- **Requirement Urgency (Max 20 pts)**:
  - Urgent requirement: **20 pts**
  - Soon requirement: **12 pts**
  - Routine requirement: **5 pts**
- **Geographic Proximity (Max 15 pts)**:
  - Linear decay: $\text{round}(15 \times (1 - \frac{\text{distance}}{\text{maxRadius}}))$
- **Remaining Shelf Life (Max 15 pts)**:
  - $> 180$ days left: **15 pts**
  - $91 - 180$ days left: **10 pts**
  - $31 - 90$ days left: **5 pts**

### 3. Privacy & Anti-Surveillance Matrix

| Stage | What Donor Sees | What NGO Sees | Public / Others |
| ----- | --------------- | ------------- | --------------- |
| **Search / Browse** | NGO Name, Type, City, Distance, Open Requirements Count | Approximate Location (~1.1 km grid), City, Medicine Details, Batch, Expiry, Distance, Match Score | Redacted (Institution city & verified pins only) |
| **Pending Claim** | NGO Name, Type, City, Services, Requested Items, Message | Donation Code, Approximate Area, Requested Items, Message | 403 Forbidden |
| **Accepted Match** | NGO Contact Person, Phone, Email, Full Street Address, Operating Hours | Donor Full Name, Phone, Full Pickup Address Line 1, Pincode, Preferred Timings | 403 Forbidden |
| **Audit Requirement** | Logged under `CLAIM_CONTACT_REVEALED` without raw phone numbers | Logged under `CLAIM_CONTACT_REVEALED` without raw phone numbers | Immutable audit trail |

### 4. Phase 6 Endpoints

#### Geospatial & Discovery
- `GET /api/geo/organizations/nearby?lat=&lng=&radiusKm=&type=&search=` — Find verified organizations within radius (Donor/Admin)
- `GET /api/donations/:id/nearby-organizations?radiusKm=&sort=` — Nearby organizations matching donation items (Donor Owner/Admin)

#### NGO Requirements
- `POST /api/requirements` — Post a new medicine requirement (Verified NGO)
- `GET /api/requirements/my?status=&search=&page=&limit=` — List organization's requirements (Verified NGO)
- `GET /api/requirements/:id` — Get single requirement details
- `PATCH /api/requirements/:id` — Update quantityNeeded, urgency, description, neededBy
- `POST /api/requirements/:id/close` — Close open requirement
- `GET /api/ngo/summary` — NGO dashboard statistics (Open reqs, offers, pending, matches)
- `GET /api/ngo/available?radiusKm=&search=&type=&priority=&matchOnly=&sort=&page=&limit=` — Find nearby available inventory

#### Claims Management
- `POST /api/claims` — Create claim request or donation offer
- `GET /api/claims/my?tab=incoming|outgoing|accepted|closed&page=&limit=` — Tabbed claims list
- `GET /api/claims/:id` — View claim summary and public party info
- `GET /api/claims/:id/handover-details` — View mutual contact details (Accepted claims only)
- `POST /api/claims/:id/accept` — Accept pending claim (Atomically reserves items)
- `POST /api/claims/:id/decline` — Decline pending claim (Enforces 24h cooldown)
- `POST /api/claims/:id/withdraw` — Withdraw pending claim (Initiator only)
- `POST /api/claims/:id/cancel` — Cancel accepted match (Reverts items to approved)

#### Admin Operations
- `GET /api/admin/matching/summary` — Overview of matching activities and queues
- `GET /api/admin/claims?status=&search=&from=&to=&page=` — Master claims registry
- `POST /api/admin/claims/:id/cancel` — Force-cancel claim with audit log
- `GET /api/admin/requirements?status=&urgency=&search=&page=` — Requirements directory
- `GET /api/admin/organizations/map` — Geo-coordinates of all verified organizations

### 5. CLI Verification & Dev Tools

```bash
# 1. Inspect 2dsphere indexes and confirm $geoNear execution plan
npm run geo:check

# 2. Run full 12-step end-to-end integration walkthrough
npm run verify:phase6

# 3. Development location simulator (Development environment only)
npm run dev:set-location -- org <email-or-id> <lat> <lng>
npm run dev:set-location -- donation <donationCode> <lat> <lng>

# 4. Run entire test suite (11 suites, 133 tests)
npm test
```

---

### 3. Verification Claim TTL & Concurrency Guard

To prevent two pharmacists from simultaneously reviewing the same donation or collisions:
- **Atomic Locking**: Pharmacist claims set `review.claimedBy`, `review.claimedAt`, and `review.claimExpiresAt` (`VERIFICATION_CLAIM_TTL_MINUTES=60`).
- **Lazy Expiry & Takeover**: If a claim expires without being released, another pharmacist can take over the claim cleanly.
- **Admin Override**: Admins can force-release stuck claims at any time with full audit logging.
- **Optimistic Concurrency**: Decisions require matching the item's `version` counter via `findOneAndUpdate`, preventing double-submits.

### 4. Privacy & Data Boundaries

- **Pharmacist View**: Verifying pharmacists receive only the donor's first name, city, state, and pincode. Contact phone numbers, email addresses, pickup address line 1, and GPS coordinates are **strictly stripped** from review payloads.
- **Donor View**: Donors see the verified status, round number, 6-point checklist count, pharmacist first name, and pharmacy name. Pharmacist email addresses and phone numbers are **never exposed**.
- **Immutable Audit Trail**: All verification decisions are recorded in an append-only `Verification` collection with round counters. Records cannot be updated or deleted.

---

## 🔐 Phase 7: QR & Cryptographic Chain of Custody

### 1. Chain of Custody Architecture & Hash Formula

Every state change across a medicine's lifecycle is written to an append-only, immutable `CustodyEvent` ledger. Each event is cryptographically linked to the previous event for that medicine:

$$\text{Event Hash} = \text{SHA-256}(\text{prevHash} \mathbin{\Vert} \text{"|"} \mathbin{\Vert} \text{canonicalJSON}(\text{payload}))$$

- **Deterministic Payload Serialization**: `canonicalJSON` recursively sorts all object keys alphabetically, serializes Date objects to ISO 8601 UTC strings, and trims strings to ensure identical hash calculation across runtimes and platforms.
- **Genesis Block**: The initial event for every medicine has `prevHash = "GENESIS"` and `seq = 1`.
- **Database Immutability**: `CustodyEventSchema` enforces strict Mongoose pre-hooks (`pre('save')`, `pre('updateOne')`, `pre('deleteOne')`, `pre('findOneAndUpdate')`, etc.) that throw a runtime error on any update, deletion, or replacement operation.
- **Privacy Enforcement**: Donor phone numbers, email addresses, pharmacist contact numbers, and precise street addresses are strictly stripped from all custody event payloads and public trace APIs.

### 2. Digital QR Passports & Verification URLs

When a medicine passes pharmacist verification, a cryptographically signed digital passport is issued:
- **HMAC-SHA256 Signature**: Medicine IDs are signed using `QR_SIGNING_SECRET`:
  $$\text{Signature} = \text{HMAC-SHA-256}(\text{medicineId}, \text{secret})[:32]$$
- **Public Verification Endpoint**: `GET /api/public/verify/:medicineId?token=:token` returns real-time authenticity, approval status, verifying pharmacist credentials, and sanitized custody event timeline.

### 3. Dynamic Handover Passes & Physical Receipt

For physical transfer between Donor and NGO:
- **Rolling Handover Token**: A 6-character alphanumeric pass code (`HND-XXXXXX`) generated via secure CSPRNG with 15-minute TTL and single-use consumption.
- **Attempt Lockout**: Maximum 5 failed attempts per transfer before temporary lockout, preventing brute-force code guessing.
- **4-Point Physical Inspection Checklist**:
  1. `sealedPackagingConfirmed`
  2. `labelAndBatchMatched`
  3. `visualConditionIntact`
  4. `temperatureCompliant`
- **Partial Item Decisions**: NGO inspectors can accept or reject individual items with standardized rejection codes (`packaging_damaged`, `seal_broken`, `batch_mismatch`, `expiry_imminent`, `temperature_compromised`, `other`).
- **Chain Finalization**: Upon completion, atomic ledger events are written (`HANDOVER_RECEIVED` / `HANDOVER_REJECTED_AT_RECEIPT`), transfer transitions to `completed`, and donation status updates to `handed_over` or `completed`.

### 4. Printable PDF Services

MediBridge includes two vector-rendered PDF generation services:
1. **Printable Medicine Labels (A4 2x4 Layout)**: `GET /api/donations/:id/labels.pdf` generates high-resolution printable sticker sheets with medicine name, batch number, expiry countdown, verification badge, and embedded QR code.
2. **Official Handover Receipt**: `GET /api/transfers/:id/receipt.pdf` generates an archival redistribution manifest detailing participating organizations, itemized decisions, checklist confirmations, and the ledger SHA-256 hash prefix for each item.

### 5. Phase 7 Endpoints

#### QR & Public Verification
- `GET /api/medicines/:medicineId/qr` — Get QR token, SVG/PNG data URI, and public verify URL
- `GET /api/donations/:id/labels.pdf` — Download printable 2x4 labels PDF
- `GET /api/public/verify/:medicineId?token=` — Public authenticity verification & custody trace

#### Handover & Transfers
- `GET /api/transfers/my?role=donor|ngo&status=&page=&limit=` — List user handovers
- `GET /api/transfers/:id` — Get transfer manifest & item checklist
- `POST /api/transfers/:id/handover-token` — Generate dynamic single-use handover pass (Donor)
- `POST /api/transfers/lookup-handover` — Look up transfer by handover token or transfer code (NGO)
- `POST /api/transfers/:id/receive` — Submit checklist & item reception decisions (NGO)
- `GET /api/transfers/:id/receipt.pdf` — Download official handover receipt PDF

#### Custody Ledger & Audit
- `GET /api/custody/medicines/:medicineId` — Get immutable event chain for a medicine
- `GET /api/custody/donations/:id` — Get aggregated custody ledger for all items in a donation
- `GET /api/admin/transfers` — Admin transfer registry & audit dashboard
- `GET /api/admin/transfers/summary` — Admin transfer aggregate statistics
- `GET /api/admin/custody/verify-all` — Verify integrity of all medicine hash chains in the database

### 6. CLI Tools & Verification

```bash
# 1. Backfill Phase 7 QR metadata and custody events for legacy records
npm run backfill:phase7

# 2. Cryptographically audit all medicine custody hash chains in the database
npm run custody:verify

# 3. Run full test suite across all 17 test suites (169 tests)
npm test
```

---

## 📊 Phase 8: Admin Analytics, Security Hardening, Reports & Deployment

### 1. Executive Real-Time Analytics Engine

MediBridge features a zero-mock, real-time analytics engine powered entirely by performant MongoDB aggregation pipelines:
- **11 Real-Time KPIs with Period-Over-Period Trends**: Track donations submitted, medicines screened, pharmacist approval rate, wastage prevented units, average verification hours, active donors, and verified NGOs with percentage changes against the preceding period.
- **IST & en-IN Formatting**: Date intervals are calculated in Indian Standard Time (`Asia/Kolkata`) using `$dateTrunc`, formatted with Indian numbering separators (Lakhs / Crores).
- **Zero-Filled Timeseries**: Aggregations automatically detect empty periods and return zero-filled buckets for clean, unbroken Recharts visualizations.
- **In-Memory TTL Cache**: High-concurrency protection with in-memory caching (`ANALYTICS_CACHE_SECONDS=60`).
- **Strict Privacy Guarantees**: Deep-scanned to ensure no PII (phone, email, donor address, exact coordinates) is ever returned in analytics responses.

### 2. Platform Compliance & Vector Reports

- **Vector PDF Summaries (PDFKit)**: Platform summaries rendered in A4 format with MediBridge branding, executive KPI tables, custom vector-drawn timeseries charts, funnel conversion tables, and statutory compliance disclaimers.
- **High-Speed Streamed CSV Exports**: Cursor-streamed CSV exports for donations, verifications, handovers, and audit trails. Includes UTF-8 BOM encoding for Excel compatibility and spreadsheet formula injection defense (prefixing cells starting with `=`, `+`, `-`, `@`, `\t` with a single quote).
- **Admin Rate Limiting**: Centralized rate limiters capping report generation at 20 requests per hour per administrator.

### 3. User Governance & Instant Session Revocation

- **Immediate Token Invalidation (`tokenVersion`)**: The `User` model stores an integer `tokenVersion` included in JWT claims. When an administrator suspends, blocks, or reactivates an account, `tokenVersion` increments, instantly invalidating all active sessions.
- **Safety Checks**: Administrators cannot suspend or block themselves or other administrators.
- **Audit Logging**: Every status transition is logged to `AuditLog` (`USER_SUSPENDED`, `USER_REACTIVATED`, `USER_BLOCKED`) with a mandatory reason.

### 4. Dual-Driver Storage Architecture (Local & GridFS)

- **Storage Driver Abstraction**: Unified interface supports both zero-dependency local disk (`local`) and cloud-native MongoDB GridFS (`gridfs` bucket: `medibridge_files`).
- **Sharp Image Pipeline**: Auto-orients medicine photos, strips EXIF metadata (removing camera GPS coordinates), bounds long dimensions to 1600px, and re-compresses to JPEG quality 80.
- **Migration & Cleanup CLI**:
  ```bash
  # Migrate disk uploads to MongoDB GridFS
  npm run storage:migrate

  # Audit and prune unreferenced orphan files
  npm run storage:orphans
  ```

### 5. Automated Retention & Cold Start Mitigation

- **Notification Retention Purge**: Scheduled cleanup automatically purges read notifications older than `NOTIFICATION_RETENTION_DAYS` (default 90 days), while strictly preserving unread notifications.
- **Cold-Start Auto-Retry**: Frontend Axios client automatically intercepts 502/503/504 gateway timeouts from Render free tier, displays an animated `ServerWakingBanner`, and automatically retries requests until the backend is warm.

### 6. Phase 8 Endpoints

#### Analytics API (`/api/admin/analytics/*`)
- `GET /overview` — Executive KPIs with previous-period comparison
- `GET /timeseries?metric=` — Time-bucketed trends (donations, medicines, handovers, etc.)
- `GET /funnel` — End-to-end medicine conversion funnel
- `GET /rejections` — Auto-screening and pharmacist rejection reason distributions
- `GET /expiry` — Priority distribution and 12-month expiry timeline
- `GET /top-medicines` — Top donated vs requested medicine names
- `GET /organizations` — Verified NGO performance benchmarks
- `GET /pharmacists` — Pharmacist turnaround and approval benchmarks
- `GET /geo` — Geo-density coordinates (rounded 2 decimals)
- `GET /system` — Platform infrastructure and health metrics

#### Reports & User Governance
- `GET /api/admin/reports/:type?format=pdf|csv` — Generate compliance PDF or streamed CSV
- `GET /api/admin/users/all` — Paginated user directory with role and status filters
- `PATCH /api/admin/users/:id/status` — Suspend, reactivate, or block user
- `GET /api/admin/audit` — Immutable audit log viewer with masked IPs
- `GET /api/admin/audit/export.csv` — CSV export of system audit trail
- `GET /api/health/ready` — Production readiness probe verifying MongoDB and storage health

---

## ✅ Implementation Checklist (Phases 0 to 8)

- [x] **Phase 0: Project Architecture & Setup** (Monorepo, ESLint, Tailwind v4, Express, Mongoose)
- [x] **Phase 1: Authentication, Authorization & Roles** (JWT, bcrypt, cookie sessions, RBAC)
- [x] **Phase 2: Organization Onboarding & Admin Review** (NGO/Pharmacy registration, license uploads)
- [x] **Phase 3: Notifications & Real-Time Alerts** (In-app notification center, unread counters, email service)
- [x] **Phase 4: Medicine Donations & Automated Safety Screening** (Multi-item donations, expiry rules, ban checks)
- [x] **Phase 5: Pharmacist Verification Workflow** (Claim locking, 6-point checklist, more-info loops)
- [x] **Phase 6: Geospatial Matching & NGO Claims** (2dsphere geo queries, 48-hr reservation holds)
- [x] **Phase 7: Digital QR Passports & Cryptographic Chain of Custody** (HMAC-SHA256 QR, SHA-256 hash chaining, handover passes)
- [x] **Phase 8: Admin Analytics, Security Hardening, Reports & Deployment** (MongoDB aggregations, PDFKit, GridFS, tokenVersion, rate limits, Playwright E2E)

---

## 👥 Roles

- **Donor** — Submit unused, sealed medicines for donation
- **Pharmacist** — Verify medicine quality, safety, and expiry
- **NGO** — Request and receive verified medicines
- **Admin** — Monitor platform activity and manage users

---

## ⚖️ Compliance Notes

- Expired medicines are automatically blocked
- Opened strips, loose tablets, injections, and cold-chain medicines are not accepted
- No medicine is approved without pharmacist verification
- All transfers are tracked with QR-coded chain of custody

---

## 👨‍💻 Project Development Team & Detailed Engineering Contributions

MediBridge was engineered and brought to production by a collaborative, cross-functional 4-member engineering team. Each member had complete technical ownership over specific pillars of the architecture:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MEDIBRIDGE ENGINEERING DIVISION                                  │
├───────────────────────┬───────────────────────┬───────────────────────┬──────────────────────────┤
│      KASIM SHAH       │      SOHEL SHAIKH     │      AMMAR SHAIKH     │      FAIZAN KHATIB       │
│ Lead Backend Architect│ Lead Frontend Engineer│ Lead UI / UX Designer │  Lead QA & Documentation │
│  & Database Engineer  │  & Client Architect   │   & Product Stylist   │     & Security Audit     │
├───────────────────────┼───────────────────────┼───────────────────────┼──────────────────────────┤
│ • Express API Engine  │ • React 18 SPA & Vite │ • Tailwind CSS v4     │ • 17 Jest Suites (169 T) │
│ • MongoDB Atlas & ODM │ • Recharts BI Dash    │ • Healthcare Palette  │ • Playwright E2E Suite   │
│ • SHA-256 Custody Led │ • Leaflet Geo Maps    │ • Glassmorphism UI    │ • CI/CD Actions Pipeline │
│ • HMAC-SHA256 QR Auth │ • html5-qrcode Scanner│ • Framer Motion Micro │ • Crypto Ledger Verifier │
│ • GridFS Cloud Storage│ • Cold-Start Retrier  │ • Responsive 360px-4K │ • Technical Whitepapers  │
│ • tokenVersion Kill   │ • AuthContext & State │ • Printable PDF Design│ • Threat Model Specs     │
└───────────────────────┴───────────────────────┴───────────────────────┴──────────────────────────┘
```

---

### 1. 🛠️ Kasim Shah — Lead Backend Architect & Database Engineer
**Core Responsibility:** Complete architecture, implementation, security hardening, and deployment of the backend RESTful microservices, database persistence layer, and cryptographic engines.

#### Key Architectural Systems Owned:
- **Full RESTful Application Programming Interface (API):**
  - Architected the scalable Node.js (v20+ LTS) and Express.js (v4.21) application server.
  - Implemented centralized asynchronous error handling (`asyncHandler`), uniform JSON response encapsulation (`ApiResponse`), and standardized HTTP error hierarchies (`ApiError`).
  - Configured graceful server shutdown on `SIGTERM`/`SIGINT`, ensuring in-flight database write completions and clean socket closures.
- **Database Modeling & Aggregation Pipelines (MongoDB Atlas):**
  - Designed all 11 Mongoose document schemas (`User`, `Organization`, `Donation`, `Medicine`, `Verification`, `Requirement`, `Claim`, `Transfer`, `CustodyEvent`, `AuditLog`, `JobRun`).
  - Configured high-performance geospatial spherical indexes (`2dsphere`), compound lookup indexes, and TTL expiration indexes.
  - Authored complex aggregation pipelines for hyper-local matching (`$geoNear`) and executive analytics with IST date truncations (`$dateTrunc` in `Asia/Kolkata`).
- **Cryptographic Chain of Custody & Hash Linking Engine:**
  - Designed the append-only mathematical hash-chaining formula:
    $$H_n = \text{SHA-256}\Big(H_{n-1} \mathbin{\Vert} \text{"|"} \mathbin{\Vert} \text{canonicalJSON}(\text{payload})\Big)$$
  - Built the recursive lexicographical key-sorting serializer (`canonicalJSON`) to guarantee deterministic hash parity across platforms.
  - Enforced database-level runtime immutability via Mongoose pre-hooks (`pre('save')`, `pre('updateOne')`, `pre('deleteOne')`) that throw fatal exceptions on historical tampering attempts.
- **Digital Passport & Cryptographic Authentication:**
  - Implemented HMAC-SHA256 digital passport signing for pharmacist-verified medicines.
  - Built the public verification endpoint using constant-time cryptographic buffer comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
- **Stateful Token Revocation (`tokenVersion`):**
  - Eliminated the classic zombie JWT vulnerability by introducing `tokenVersion` on the User document and JWT payload.
  - Configured atomic increments on account suspension, blocking, or password resets, instantly revoking active sessions across all devices.
- **Dual-Driver Storage Architecture (`storage.service.js`):**
  - Built the abstraction layer supporting seamless switching between local disk storage and cloud MongoDB GridFS (`medibridge_files`).
  - Integrated the non-bypassable Sharp image processing pipeline (auto-orientation, permanent EXIF GPS metadata stripping, 1600px dimension clamping, JPEG q80 re-compression).
  - Authored the zero-downtime storage migration CLI (`npm run storage:migrate -- --delete-local`) and orphan cleaner (`npm run storage:orphans`).
- **Security Hardening & Production Cloud Deployment:**
  - Implemented Helmet CSP/HSTS, HPP parameter pollution protection, NoSQL query injection filtering (`express-mongo-sanitize`), and centralized rate limiters.
  - Configured CSRF origin check middleware verifying incoming `Origin` and `Referer` headers against `CLIENT_URL`.
  - Authored the Render Blueprint (`render.yaml`) and deployed the live backend web service to Render's Singapore region.

---

### 2. 💻 Sohel Shaikh — Lead Frontend Software Engineer
**Core Responsibility:** Architecture, client-side state management, hardware integrations, business intelligence visualizations, and production edge deployment of the React Single Page Application (SPA).

#### Key Client Systems Owned:
- **React 18 Single Page Application Architecture (Vite 6):**
  - Scaffolded the frontend project with React 18.3, Vite 6.4, and modern ES module chunk splitting.
  - Configured declarative client routing using React Router v6 with strict route guards (`ProtectedRoute`, `RoleBasedRoute`).
  - Implemented code-splitting via `React.lazy()` and `Suspense` skeletons for performance-heavy pages (Analytics, Maps, Scanner).
- **Global State Management & Authentication Lifecycle:**
  - Engineered the centralized `AuthContext` managing user authentication, login persistence, active roles, and silent token validation.
  - Built the Axios client instance with request and response interceptors, handling automatic credential forwarding and standard error parsing.
- **Cold-Start Resilience & High-Availability Fallbacks:**
  - Engineered the cold-start detection interceptor catching 502/503/504 gateway timeouts and slow boot requests (> 8s) from Render's free tier.
  - Built the interactive `ServerWakingBanner` modal that informs users that serverless hosting is waking up, executing an automated polling retry loop every 4 seconds.
  - Implemented the real-time `OfflineBanner` detecting network disconnects via `navigator.onLine` event listeners.
- **Executive Business Intelligence Dashboards (`/admin/analytics`):**
  - Integrated Recharts 2.15 to construct interactive, responsive analytical charts:
    - *Activity Trends:* Dual-area curve showing donation and handover volume over time.
    - *Verification Breakdown:* Stacked bar chart comparing Approvals, Rejections, and Clarifications.
    - *Conversion Funnel:* Step-by-step drop-off visualizer from submission to physical transfer.
    - *Root-Cause Analysis:* Horizontal bar charts categorizing screening and pharmacist rejection codes.
    - *Expiry Risk Forecast:* Priority donut chart and 12-month forward-looking inventory expiry projections.
  - Implemented sticky date range filters (7d, 30d, 90d, YTD, Custom) with URL search parameter bi-directional synchronization.
- **Hardware Scanner & Geospatial Map Integration:**
  - Integrated `html5-qrcode` to enable real-time camera scanning on mobile smartphones and desktop webcams for QR passport verification.
  - Built interactive Leaflet mapping canvases with custom SVG pin markers, 2dsphere radius circles, and OpenStreetMap tile layers.
- **Dynamic Handover Pass Protocol UI:**
  - Implemented the dynamic 15-minute rolling handover OTP countdown timer with visual expiration warnings.
  - Built the NGO handover reception screen featuring the 4-point physical criteria checklist and instant receipt download handlers.
- **Production Edge Deployment (Vercel):**
  - Configured `frontend/vercel.json` with reverse proxy rewrites routing `/api/*` to Render, ensuring first-party cookie compliance.
  - Deployed the production application to Vercel's Global Edge CDN network.

---

### 3. 🎨 Ammar Shaikh — Lead UI / UX Designer & Product Stylist
**Core Responsibility:** Design token ecosystem, visual identity, accessibility compliance (WCAG 2.1 AA), motion design, responsive layout engineering, and vector document styling.

#### Key Design Systems Owned:
- **Tailwind CSS v4 Healthcare Token Ecosystem:**
  - Conceptualized and implemented the bespoke MediBridge design token palette:
    - *Clinical Teal (`#0D9488`):* Represents medical authority, trust, and cleanliness.
    - *Modern Sky (`#0EA5E9`):* Represents digital innovation and fluidity.
    - *Emerald (`#10B981`):* Used exclusively for verified badges, successful handovers, and positive trends.
    - *Amber (`#F59E0B`):* Used for urgent triage alerts and pending pharmacist claims.
    - *Rose (`#F43F5E`):* Used for critical expiry warnings, rejections, and blocked accounts.
- **Glassmorphism & Surface Design:**
  - Crafted light, airy, patient-friendly interfaces using frosted glass navigation bars (`backdrop-blur-md bg-white/70`), soft teal-tinted ambient box-shadows, and double-radius borders (`rounded-2xl` and `rounded-3xl`).
  - Completely eliminated stark dark sections in favor of high-contrast, accessible clinical surfaces.
- **Micro-Interactions & Framer Motion Transitions:**
  - Implemented fluid micro-interactions using Framer Motion 12:
    - Page transition slides and smooth fades between dashboard tabs.
    - Smooth slide-over inspection drawers for user details and audit event payloads.
    - Animated counter numbers (`useCountUp`) on executive KPI cards.
    - Gentle pulsing animations on active handover passes and verification badges.
- **Bento Grid Dashboard Architecture:**
  - Designed ergonomic bento-grid layouts across all 4 role portals (Donor, Pharmacist, NGO, Administrator), ensuring critical action buttons are visible above the fold.
  - Created standardized `StatCard`, `EmptyState`, and `ConfirmDialog` components ensuring uniform visual harmony across the entire app.
- **Mobile-First Responsive Engineering (360px to 4K):**
  - Rigorously tested and optimized every screen across viewport sizes from 360px Android smartphones up to 4K ultra-wide monitors.
  - Conformed strictly to WCAG 2.1 AA contrast requirements and touch target dimensions (minimum 44x44px for touchable icons).
  - Integrated `prefers-reduced-motion` CSS rules to respect users with vestibular sensitivities.
- **Vector Document Typography & Print Formatting:**
  - Designed the visual layout for high-density printable vector A4 2x4 medicine label sticker sheets.
  - Styled official redistribution handover receipts in PDFKit with clean tabular borders, corporate branding, and regulatory compliance disclosures.

---

### 4. 🧪 Faizan Khatib — Lead QA Engineer, Testing & Technical Documentation
**Core Responsibility:** Integration test suites, Playwright end-to-end automation, security hygiene audits, mathematical ledger verification scripts, CI/CD pipeline automation, and technical whitepapers.

#### Key Quality & Documentation Systems Owned:
- **Comprehensive Backend Integration Test Suite (Jest & Supertest):**
  - Authored and maintained **17 integration test suites covering 169 unit and integration tests** achieving a **100% pass rate**:
    - `auth.test.js` — Registration, login lockouts, password resets, and session tokens.
    - `organization.test.js` — NGO and pharmacy onboarding and admin approvals.
    - `donation.test.js` — Multi-item donation submissions and draft lifecycles.
    - `screening.test.js` — Automated 30-day expiry floors and banned drug blacklists.
    - `verification.test.js` & `verificationRules.test.js` — Atomic 60-min claim locks, 6-point checklist, and more-info loops.
    - `matching.test.js` & `geo.test.js` — Geospatial spherical `$geoNear` radius matching.
    - `claims.test.js` — 48-hour reservation holds and claim expiration.
    - `handover.test.js` — 15-minute rolling OTP pass codes and physical reception checklists.
    - `custody.test.js` — SHA-256 hash chaining mathematics and mutation rejection hooks.
    - `qr.test.js` — HMAC-SHA256 digital passport signing and constant-time validation.
    - `analytics.test.js` — Aggregation pipelines, zero-filled series, and variance math.
    - `reports.test.js` — Vector PDFKit platform summaries and formula-neutralized CSV exports.
    - `security.test.js` — Helmet headers, CSRF origin checks, rate limiters, and NoSQL sanitizers.
    - `health.test.js` — Uptime and database readiness probes (`/api/health/ready`).
- **Playwright End-to-End (E2E) Automation Framework:**
  - Engineered the automated Playwright test suite located in `e2e/specs/`:
    - `happy-path.spec.js` — Full lifecycle test from donor submission to pharmacist verification, NGO match, physical handover, and PDF receipt download.
    - `rbac.spec.js` — Role-based access control route protection and unauthorized redirects.
    - `validation.spec.js` — Client and server-side Zod form validation and 5-attempt login lockouts.
    - `security.spec.js` — Foreign Origin header blocking and instant token revocation upon suspension.
    - `responsive.spec.js` — Mobile viewport layout integrity at 360px width.
- **Repository Security & Secret Hygiene Audits:**
  - Developed the automated `npm run security:check` script (`backend/src/scripts/securityCheck.js`) verifying via `git ls-files` that zero `.env` files, uploads, or private keys are tracked in git.
  - Authored the cryptographic ledger audit tool (`npm run custody:verify`) that recalculates the SHA-256 hash chains of every medicine in the database to detect data corruption.
- **Technical Whitepapers & System Documentation:**
  - Authored the comprehensive **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** with detailed Mermaid architecture diagrams and state machine specifications.
  - Authored the exhaustive **[`docs/SECURITY.md`](docs/SECURITY.md)** covering threat modeling, cryptographic formulas, and PII protection policies.
  - Authored the step-by-step **[`DEPLOY.md`](DEPLOY.md)** deployment runbook for Atlas, Render, and Vercel.
  - Authored the **[`docs/DEMO.md`](docs/DEMO.md)** evaluator demonstration script guiding reviewers through all 4 user personas.
- **Continuous Integration (CI/CD) Pipeline:**
  - Authored and maintained the GitHub Actions workflow (`.github/workflows/ci.yml`) automating backend test runs, security checks, and frontend production builds on every push and pull request.

---

## 📄 License

This project is for educational and demonstration purposes. Distributed under the **MIT License**.
