# 🏥 MediBridge

**Medicine Donation, Verification & Redistribution Management Platform**

MediBridge connects donors, pharmacists, and NGOs on a trusted platform to ensure unused, sealed medicines reach those who need them most. Every donated medicine goes through pharmacist verification, geo-based matching, and QR-coded chain of custody tracking.

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

## 📄 License

This project is for educational and demonstration purposes.
