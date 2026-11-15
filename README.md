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
| 3     | Donation Submission               | Planned       |
| 4     | Expiry Tracker                    | Planned       |
| 5     | Pharmacist Verification           | Planned       |
| 6     | Geo Matching & Requests           | Planned       |
| 7     | QR & Chain of Custody             | Planned       |
| 8     | Admin Analytics, Security & Deploy | Planned      |

---

## 📡 API Endpoints (Phases 1 & 2)

### Auth (`/api/auth`)
- `POST /register` — Register donor, pharmacist, or NGO account
- `POST /login` — Authenticate and receive JWT cookie & bearer token
- `POST /logout` — Invalidate session and clear cookie
- `GET /me` — Current authenticated user profile
- `PATCH /me` — Update user profile details
- `POST /forgot-password` — Initiate password reset token
- `POST /reset-password/:token` — Reset password with token

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

---

## 💾 Storage Architecture Note

Local disk storage (`uploads/org-docs/<orgId>/`) is used in Phase 2 wrapped strictly via `src/services/storage.service.js`. Uploaded documents are never served statically via `express.static` and require authenticated role-based access checks. Because ephemeral serverless/container hosts wipe local storage upon sleep or redeployment, Phase 8 will transition to free cloud object storage (e.g. Cloudinary) directly inside `storage.service.js` with zero modifications to business controllers.

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
