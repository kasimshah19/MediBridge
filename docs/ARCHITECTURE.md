# 🏛️ MediBridge System Architecture

MediBridge is an enterprise-grade medicine donation, verification, and redistribution management platform designed with cryptographic chain of custody, role-based access control, automated expiry protection, and real-time administrative analytics.

---

## 1. High-Level System Context

```mermaid
flowchart TB
    subgraph Users["Platform Stakeholders"]
        Donor["👤 Donor\n(Individual / Clinic)"]
        Pharmacist["🩺 Licensed Pharmacist\n(Inspection Specialist)"]
        NGO["🏢 Verified NGO\n(Beneficiary Representative)"]
        Admin["🛡️ Platform Admin\n(Compliance & Operations)"]
    end

    subgraph ClientLayer["Edge & Presentation Layer (Vercel)"]
        SPA["React 18 + Vite SPA\nTailwind CSS v4 + Recharts\nLeaflet Geo Mapping + Html5Qrcode"]
        EdgeCDN["Vercel Global Edge Network\nSecurity Headers & HTTPS"]
    end

    subgraph APILayer["Application & Service Layer (Render Singapore)"]
        API["Express.js REST Engine (Node 20+)\nZod Validation & Pino Structured Logging"]
        SecurityMW["Security Middleware\nHelmet CSP + HPP + MongoSanitize\nCentralized Rate Limiters + Origin Check"]
        AuthMW["JWT & Session Verification\ntokenVersion Immediate Revocation"]
        AnalyticsEng["Admin Analytics Engine\nMongoDB Aggregation Pipelines\nIn-Memory TTL Caching (60s)"]
        ReportEng["Report Generation Engine\nPDFKit (Vector Charts) + Streamed CSV (BOM)"]
        StorageSvc["Dual-Driver Storage Service\nSharp Image Pipeline (EXIF GPS Strip, 1600px)\nLocal Filesystem <-> GridFS Bucket"]
        CustodySvc["Cryptographic Custody Engine\nSHA-256 Hash Chaining & HMAC-SHA256 Passports"]
        ExpiryJob["Automated Expiry & Retention Engine\nDaily TTL Cleanup & Notification Purge"]
    end

    subgraph DataLayer["Persistence Layer (MongoDB Atlas Cluster0)"]
        MongoCollections[("Mongoose Document Store\nUsers, Donations, Medicines,\nClaims, Transfers, CustodyEvents,\nAuditLogs, Notifications, JobRuns")]
        GridFSBucket[("GridFS Bucket: medibridge_files\nMedicine Photos, Rx Scripts,\nVerification Proofs, Org Licenses")]
    end

    subgraph ExternalServices["External Infrastructure"]
        Nominatim["OpenStreetMap Nominatim\n(Geocoding & Reverse Geocoding)"]
        SMTP["Nodemailer / SMTP Provider\n(Transactional Notifications)"]
    end

    Donor --> SPA
    Pharmacist --> SPA
    NGO --> SPA
    Admin --> SPA

    SPA --> EdgeCDN
    EdgeCDN --> SecurityMW
    SecurityMW --> AuthMW
    AuthMW --> API

    API --> AnalyticsEng
    API --> ReportEng
    API --> StorageSvc
    API --> CustodySvc
    API --> ExpiryJob

    StorageSvc --> GridFSBucket
    StorageSvc -.-> MongoCollections
    AnalyticsEng --> MongoCollections
    CustodySvc --> MongoCollections
    ExpiryJob --> MongoCollections

    API --> Nominatim
    API --> SMTP
```

---

## 2. Donation & Medicine Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: Donor creates listing
    Draft --> Submitted: Donor clicks Submit

    state Submitted {
        [*] --> AutoScreening
        AutoScreening --> AutoRejected: Expiry < 30d / Unsealed / High Risk
        AutoScreening --> PendingVerification: Passes safety filters
    }

    AutoRejected --> [*]: Terminal

    state PendingVerification {
        [*] --> Unclaimed: Listed in verification queue
        Unclaimed --> ClaimedByPharmacist: Pharmacist locks item (1 hr TTL)
        ClaimedByPharmacist --> Unclaimed: Claim expires or released
        ClaimedByPharmacist --> MoreInfoRequired: Clarification requested
        MoreInfoRequired --> ClaimedByPharmacist: Donor uploads clarification
        ClaimedByPharmacist --> PharmacistApproved: Passed 6-point checklist
        ClaimedByPharmacist --> PharmacistRejected: Rejection code assigned
    }

    PharmacistRejected --> [*]: Terminal

    state PharmacistApproved {
        [*] --> DigitalPassportIssued: QR HMAC-SHA256 signed
        DigitalPassportIssued --> AvailableForMatching: Searchable by verified NGOs
        AvailableForMatching --> ReservedByNGO: NGO claims match (48 hr hold)
        ReservedByNGO --> AvailableForMatching: Claim expires or released
    }

    ReservedByNGO --> HandoverScheduled: Transfer manifest generated

    state HandoverScheduled {
        [*] --> HandoverPassGenerated: Donor requests OTP / QR token
        HandoverPassGenerated --> PhysicalInspection: NGO inspects 4-point physical criteria
        PhysicalInspection --> AcceptedAtReceipt: Verified sealed, intact & matching
        PhysicalInspection --> RejectedAtReceipt: Damaged / seal compromised
    }

    AcceptedAtReceipt --> Transferred: Custody transferred
    RejectedAtReceipt --> [*]: Terminal
    Transferred --> Completed: Final delivery confirmed
    Completed --> [*]
```

---

## 3. Cryptographic Chain of Custody & Hash Linking

Every custody event is recorded in an immutable, append-only collection (`CustodyEvent`). Each record is cryptographically linked to its predecessor via SHA-256 hash chaining:

$$H_0 = \text{"GENESIS"}$$

$$H_n = \text{SHA-256}\Big(H_{n-1} \mathbin{\Vert} \text{"|"} \mathbin{\Vert} \text{canonicalJSON}(\text{payload})\Big)$$

```mermaid
sequenceDiagram
    autonumber
    participant D as Donor
    participant P as Pharmacist
    participant N as NGO
    participant C as Custody Service
    participant DB as Immutable Ledger

    Note over C,DB: Genesis Event Created on Submission
    D->>C: Submit Medicine M1
    C->>C: Calculate H1 = SHA-256("GENESIS" | canonicalJSON(SUBMISSION_EVENT))
    C->>DB: Write CustodyEvent(seq: 1, prevHash: "GENESIS", hash: H1)

    Note over C,DB: Pharmacist Verification
    P->>C: Approve 6-point Checklist
    C->>C: Read Last Event (H1)
    C->>C: Calculate H2 = SHA-256(H1 | canonicalJSON(VERIFICATION_EVENT))
    C->>DB: Write CustodyEvent(seq: 2, prevHash: H1, hash: H2)
    C-->>P: Issue QR Passport (HMAC-SHA256 signature)

    Note over C,DB: NGO Handover Reception
    N->>C: Submit 4-point Physical Checklist + Handover Pass
    C->>C: Read Last Event (H2)
    C->>C: Calculate H3 = SHA-256(H2 | canonicalJSON(HANDOVER_EVENT))
    C->>DB: Write CustodyEvent(seq: 3, prevHash: H2, hash: H3)
    C-->>N: Issue Handover Receipt PDF with H3 Hash Prefix
```

### Deterministic Payload Canonicalization
To guarantee identical hash evaluation across different machines, runtimes, and operating systems:
- All JSON object keys are recursively sorted in lexicographical order.
- Date instances are converted to ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- Primitive types are cast to uniform string representations.
- PII (donor phone numbers, street addresses, exact coordinates) is strictly omitted prior to payload hashing.

---

## 4. Dual-Driver Storage Architecture

MediBridge abstracts file persistence behind a unified `StorageService` interface, seamlessly supporting both zero-dependency local disk storage for local development and scalable MongoDB GridFS for production deployments on Render.

```mermaid
flowchart TD
    UploadReq["Incoming File Upload\n(multipart/form-data via Multer)"] --> MIMECheck{"Allowed MIME & Size?\n(image/jpeg, png, webp, pdf < 10MB)"}
    MIMECheck -- No --> Reject["400 Bad Request / ApiError"]
    MIMECheck -- Yes --> TypeBranch{"File Kind"}

    TypeBranch -- "PDF Document\n(Rx Script, NGO License)" --> PipelineBypass["Bypass Transformation"]
    TypeBranch -- "Medicine Photo\n(jpg, png, webp)" --> SharpPipeline["Sharp Image Processing Pipeline\n1. Auto-orient based on EXIF\n2. Strip EXIF Metadata (Removes GPS coordinates)\n3. Constrain max dimension to 1600px\n4. Re-compress as JPEG quality 80"]

    SharpPipeline --> DriverCheck{"STORAGE_DRIVER"}
    PipelineBypass --> DriverCheck

    DriverCheck -- "local" --> LocalDriver["Disk Storage Driver\nWrites to uploads/ directory\nServes via Express static"]
    DriverCheck -- "gridfs" --> GridFSDriver["GridFS Storage Driver\nStreams to medibridge_files bucket\nServes via stream from GridFSBucket"]
```

---

## 5. Role Hierarchy & Access Boundaries

| Role | Permitted Actions | Privacy Boundaries & PII Redaction |
| :--- | :--- | :--- |
| **Public / Anonymous** | View landing page, verify QR passport authenticity via signed token, check system readiness (`/api/health/ready`). | No access to user directories, donations, or contact info. |
| **Donor** | Create listings, edit drafts, upload medicine photos, respond to clarification requests, view donation status, generate rolling handover pass, download medicine labels PDF. | Receives pharmacist first name & pharmacy name; never pharmacist email or phone. |
| **Pharmacist** | Browse unclaimed verification queue, lock claims (1-hr TTL), review medicine photos, request clarification, approve/reject with reason codes, view issued QR passport. | Receives donor first name, city, state, and pincode only; **phone number, email, and exact street address are strictly stripped**. |
| **NGO** | Post medicine requirements, browse geo-matched medicine pool within radius, reserve matched medicines (48-hr hold), verify handover passes, submit 4-point physical reception checklist, download handover receipts. | Receives donor contact coordinates only upon confirmed handover pass validation. |
| **Admin** | Access Executive Analytics Dashboard, inspect aggregated timeseries and funnel metrics, generate PDF/CSV audit reports, manage user accounts (suspend, reactivate, block), view system audit logs with masked IPs. | Never exposed to unmasked IP addresses, plain text passwords, or private cryptographic secrets. |
