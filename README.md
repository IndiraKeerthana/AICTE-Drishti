# AICTE-Drishti — AICTE Application Intelligence & Regulatory Verification Platform
**Smart India Hackathon 2026 | Problem Statement 26261**

AICTE-Drishti automates preliminary institutional scrutiny, document authentication, cross-document reconciliation, and regulatory compliance verification for AICTE approvals.

---

## 1. Core Architectural Principle
> **"The system flags and explains. The AICTE officer decides."**  
> AICTE-Drishti automates cognitive extraction and surfaces evidence-linked anomalies; it never makes automated adverse regulatory decisions.

---

## 2. Implemented Features (Phase 1 Working Vertical Slice)

- **Application Management & Intake**:
  - Full institutional application intake with permanent AICTE IDs, declared programmes, courses, and intake capacity.
  - Generates unique application numbers (`APP-2026-XXXXXX`).
- **Secure Isolated Document Vault**:
  - Validates file constraints (PDF, PNG, JPEG; 25 MB ceiling).
  - Calculates cryptographic SHA-256 digests immediately upon ingestion.
  - Stores uploaded files strictly outside the public web root (`vault/documents/{app_id}/`).
  - Authenticated file streaming (`GET /api/documents/{id}/stream`).
- **Intelligent Document Processing (IDP)**:
  - Vector PDF text layer parsing and page coordinate extraction using PyMuPDF (`pymupdf`).
  - OCR fallback capability for scanned documents using OpenCV and Tesseract.
  - In-memory PDF QR code rendering and multi-pass OpenCV decoding for statutory certificates and approvals.
  - Image QR code extraction with resolution boundaries.
  - Regex structured entity extractors (intake capacity, certificate numbers, land area, expiry dates).
- **Issuing-Authority Cross-Verification Adapter**:
  - Cross-references Fire NOC, Building Plan, Layout Approval, Affiliation, and Land Title clearances against simulated state authority registries.
  - Transparently handles active verification, expiration, revoked/rejected status, institution/location mismatches, and gateway timeouts.
  - All responses explicitly isolated with `[SIMULATED]` disclosures; never makes unsolicited live external requests.
- **Document Authenticity & Anomaly Detectors**:
  - Exact binary duplicate file detection across slots using SHA-256.
  - Cross-slot campus/lab photo reuse detection using perceptual hashing (`imagehash.phash`).
  - PDF structural incremental revision inspection via `%%EOF` trailer marker counting.
  - Clarified scope: detects file revision structures; does not claim cryptographic digital signature verification.
- **Synthetic Ground-Truth Reconciler**:
  - Embedded baseline records for *Sample Institute of Technology* (`1-9988776655`) with approved intake of **60 seats**.
  - Automatically compares declared intake (e.g. 120 seats) against ground truth.
  - Flags high-priority `RECORD_MISMATCH` findings citing applicable regulatory clauses (`APH-2026-INTAKE-04`).
- **Cryptographic Duplicate Detection**:
  - Instant SHA-256 hash comparison across all uploaded documents.
  - Immediately flags `INTEGRITY_ANOMALY` (`CRITICAL`) if an identical file is uploaded under multiple statutory categories.
- **Evidence-Linked Scrutiny Workspace**:
  - Displays Expected Value vs. Observed Value side-by-side.
  - Displays plain-language regulatory explanations and recommended officer actions.
- **Official Reviewer Actions**:
  - Reviewers can record actions: `REQUEST_DEFICIENCY`, `ACKNOWLEDGE`, `RESOLVE`, or `OVERRIDE`.
  - Enforces mandatory justification remarks.
- **Tamper-Evident Hash-Chained Audit Trail**:
  - Every application creation, document upload, finding generation, and reviewer action is cryptographically linked with SHA-256 hash-chaining: $\text{Hash}_i = \text{SHA256}(\text{Hash}_{i-1} + \text{Payload}_i)$.
  - Provides a `/api/audit/verify-chain` endpoint to cryptographically verify audit log integrity.

---

## 3. Project Directory Structure

```
D:\VerifyAI\
├── backend\
│   ├── app\
│   │   ├── api\                  # REST API routes (health, applications, documents, findings, audit)
│   │   ├── models\               # SQLAlchemy 2.0 ORM data models
│   │   ├── schemas\              # Pydantic v2 validation models
│   │   ├── services\             # Storage vault, PyMuPDF parser, baseline service, verification engine
│   │   ├── config.py             # App settings and environment variables
│   │   ├── database.py           # SQLite connection with WAL mode & foreign keys
│   │   └── main.py               # FastAPI application with CORS & lifecycle
│   ├── tests\                    # Complete test suite (6 tests passing)
│   ├── requirements.txt          # Python dependencies
│   ├── pytest.ini                # Pytest configuration
│   └── .venv\                    # Local virtual environment
├── frontend\
│   ├── src\
│   │   ├── components\           # React components (Sidebar, Header, Dashboard, Details, Upload, Findings, Actions, Audit)
│   │   ├── services\             # Typed API client
│   │   ├── types\                # TypeScript interface definitions
│   │   ├── App.tsx               # Main UI router and state controller
│   │   ├── index.css             # Tailwind design system
│   │   └── main.tsx              # DOM mount
│   ├── package.json              # Node dependencies
│   ├── tailwind.config.js        # AICTE Navy design tokens
│   ├── vite.config.ts            # Vite build configuration with API proxy
│   └── tsconfig.json             # TypeScript configuration
├── vault\                        # Non-public document storage vault
├── PROJECT_OVERVIEW.md           # Project scope, personas, and modules
├── SYSTEM_ARCHITECTURE.md        # Technical architecture & sequence diagrams
├── IMPLEMENTATION_PLAN.md        # 3-day roadmap, test data, and priorities
├── .env.example                  # Environment configuration template
└── README.md                     # Setup and execution guide
```

---

## 4. Setup & Running Instructions

### Prerequisites
- Python 3.11+ (Python 3.13 tested)
- Node.js 18+ and npm (Node v24 tested)

### 4.1 Running the Backend
From the root directory:
```bash
cd backend

# 1. Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Windows CMD:
.\.venv\Scripts\activate.bat
# Linux/macOS:
source .venv/bin/activate

# 2. Run backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will be available at:
- **API Base**: `http://127.0.0.1:8000`
- **Interactive OpenAPI Docs**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/api/health`

### 4.2 Running the Frontend
In a separate terminal window:
```bash
cd frontend

# Run frontend development server
npm run dev
```
The frontend UI will be available at:
- **Web Application**: `http://localhost:5173`

---

## 5. Running Automated Backend Tests

AICTE-Drishti includes a pytest test suite covering the entire vertical slice:
```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```
**Test Results (All 55 Passed across 13 test suites)**:
- `test_actions_audit.py`: Reviewer action audit trail & hash-chain verification ✅
- `test_applications.py`: Application creation & management lifecycle ✅
- `test_authority_verification_scenarios.py`: Multi-scenario mock issuing authority cross-checks ✅
- `test_decision_gating.py`: P0 statutory approval eligibility and decision gating ✅
- `test_detectors_demo.py`: Image pHash and document anomaly detectors ✅
- `test_documents.py`: Document upload constraints and SHA-256 duplicate detection ✅
- `test_health.py`: Application health and service readiness endpoints ✅
- `test_integration_and_pipeline.py`: End-to-end scrutiny pipeline & officer action flow ✅
- `test_ocr_document_parser.py`: PyMuPDF and Tesseract scanned-PDF OCR fallbacks ✅
- `test_officer_alerts_workflow.py`: Deficiency and alert lifecycle management ✅
- `test_qr_and_authenticity.py`: In-memory PDF QR decoding, URL parameter parsing & authenticity checks ✅
- `test_verification.py`: Ground-truth intake reconciliation ✅
- `test_workflow_and_rbac.py`: RBAC permissions & final decision state-locking ✅

---

## 6. Regulatory Grounding Notice
- No official AICTE Approval Process Handbook (APH) PDF is currently present in the repository.
- Compliance rules are grounded in published AICTE guidelines (2024–2027 norms) and designated as `[PLACEHOLDER PENDING OFFICIAL HANDBOOK MAPPING]`.
- All institutional baseline records are explicitly tagged as `[SIMULATED GROUND TRUTH]` for hackathon evaluation.
