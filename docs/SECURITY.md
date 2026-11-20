# 🔒 MediBridge Security Architecture & Threat Model

This document outlines the security architecture, threat model, cryptographic mechanisms, data privacy policies, and defensive controls implemented across **MediBridge**.

---

## 1. Threat Model & Attack Surface

| Threat Vector | Potential Impact | Defensive Controls in MediBridge |
| :--- | :--- | :--- |
| **Tampering with Medicine Journey** | Malicious actor modifies verification status, batch details, or timestamps. | **Cryptographic Chain of Custody**: Append-only MongoDB collection with Mongoose runtime mutation block (`pre('save')`, `pre('updateOne')` reject edits). Every event is cryptographically bound to its predecessor via SHA-256 hash chaining. |
| **Forged Medicine QR Codes** | Counterfeiter prints arbitrary QR stickers claiming platform approval. | **HMAC-SHA256 Signature**: Medicine passports encode a tamper-proof signature generated using `QR_SIGNING_SECRET`. Verification endpoint verifies cryptographic authenticity before returning details. |
| **Session Hijacking & Zombie Tokens** | Blocked or suspended user continues making requests with active JWT. | **Token Versioning (`tokenVersion`)**: Every user document stores an integer `tokenVersion` included in JWT claims. When an admin suspends, blocks, or resets password, `tokenVersion` increments, immediately revoking existing tokens on the next request. |
| **Donor PII Exposure & Doxxing** | Malicious scraper or rogue pharmacist collects donor phone numbers or home addresses. | **Strict Redaction Middleware & Projections**: Pharmacist queues, custody traces, and public APIs strip phone numbers, email addresses, and line-1 street addresses at query and serialization levels. |
| **Location Tracking & Surveillance** | Metadata embedded in uploaded medicine photos leaks donor home coordinates. | **Sharp Image Pipeline**: All incoming JPEG/PNG/WebP photos are processed with Sharp to auto-rotate, strip EXIF metadata (removing GPS latitude/longitude), downsample to max 1600px, and re-compress. |
| **CSRF / Cross-Origin Attacks** | Third-party website executes unauthorized state mutations on behalf of authenticated users. | **Origin Verification**: State-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`) require `Origin` or `Referer` matching `CLIENT_URL` in production; non-matching origins are blocked with 403 and logged to `AuditLog` as `ORIGIN_CHECK_FAILED`. |
| **Spreadsheet Formula Injection (CSV Injection)**| Attacker submits medicine name like `=cmd\|' /C calc'!A0` to compromise admin workstations during export. | **CSV Sanitization**: All cells starting with `=`, `+`, `-`, `@`, or `\t` are prefixed with a single quote (`'`), preventing spreadsheet calculation engines from executing formulas upon opening. |
| **Brute Force & DoS** | Automated bot brute forces login passwords, OTPs, or hammers heavy aggregation endpoints. | **Centralized Rate Limiting**: Scoped rate limiters (Auth: 20 req/hr, Analytics: 120 req/min, Reports: 20 req/hr, Global: 300 req/15min) via `express-rate-limit`. |

---

## 2. Cryptographic Specifications

### 2.1 QR Passport Verification (HMAC-SHA256)
When a medicine passes pharmacist verification, a digital passport is signed using the server's private `QR_SIGNING_SECRET`:

$$\text{Signature} = \text{HMAC-SHA-256}(\text{medicineId}, \text{QR\_SIGNING\_SECRET})[:32]$$

The public verification endpoint (`GET /api/public/verify/:medicineId?token=...`) validates the signature in constant time using `crypto.timingSafeEqual` to prevent timing attacks.

### 2.2 Immutable Custody Hash Chain (SHA-256)
The history of each medicine is tracked via sequential, tamper-evident events:

$$H_0 = \text{"GENESIS"}$$

$$H_n = \text{SHA-256}\Big(H_{n-1} \mathbin{\Vert} \text{"|"} \mathbin{\Vert} \text{canonicalJSON}(\text{payload})\Big)$$

- `canonicalJSON` recursively sorts all object keys lexicographically and formats timestamps as UTC ISO-8601 strings, guaranteeing identical hash calculation across all platforms.
- Database integrity can be audited at any time via `npm run custody:verify` or `GET /api/admin/custody/verify-all`.

### 2.3 Instant Token Revocation via `tokenVersion`
MediBridge implements stateless JWTs with stateful instant revocation:
1. `User` schema contains `tokenVersion: { type: Number, default: 0 }`.
2. `generateToken` embeds `{ id, tokenVersion }` in JWT payload.
3. `protect` middleware compares `decoded.tokenVersion === user.tokenVersion`.
4. On `suspend`, `block`, or password change, `user.tokenVersion++` is saved, causing any active token held by an attacker or suspended user to fail authentication instantly.

---

## 3. Privacy & PII Redaction Policy

MediBridge enforces strict privacy boundaries:
1. **Donor Privacy**:
   - Donors' contact numbers and email addresses are never returned to pharmacists or in public trace endpoints.
   - Exact coordinates (`[longitude, latitude]`) are rounded to 2 decimal places in public maps and admin geo aggregations (~1.1 km precision) to prevent home identification.
2. **IP Masking**:
   - All audit logs and administrative exports mask the last octet of client IP addresses (e.g., `103.21.54.xxx`).
3. **Photo Metadata Sanitation**:
   - Camera model, serial number, focal length, and GPS coordinates are irreversibly stripped before images are saved to disk or GridFS.

---

## 4. Security Headers & Defense in Depth

Configured via `helmet` and custom Express middleware in `src/app.js`:
- **Content-Security-Policy (CSP)**: Restricts scripts to self, inline styles for Tailwind, and OpenStreetMap tile origins.
- **Strict-Transport-Security (HSTS)**: 1 year max-age with preload enabled.
- **X-Content-Type-Options**: `nosniff`.
- **X-Frame-Options**: `DENY` to prevent clickjacking.
- **Parameter Pollution (`hpp`)**: Prevents array parameter pollution attacks.
- **NoSQL Injection (`express-mongo-sanitize`)**: Strips `$` and `.` from request bodies and query parameters.
- **Centralized Structured Logging (`pino`)**: Automatically masks sensitive headers (`Authorization`, `Cookie`) and request bodies containing `password`, `token`, or `secret`.
