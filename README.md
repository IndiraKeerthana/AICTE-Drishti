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
  - Regex structured entity extractors (intake capacity, certificate numbers, land area, expiry dates).
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
**Test Results (All 6 Passed)**:
- `test_health.py::test_health_endpoint` ✅
- `test_applications.py::test_create_and_list_application` ✅
- `test_documents.py::test_invalid_file_upload` ✅
- `test_documents.py::test_valid_pdf_upload_and_duplicate_detection` ✅
- `test_verification.py::test_synthetic_intake_mismatch_verification` ✅
- `test_actions_audit.py::test_reviewer_action_and_hash_chained_audit` ✅

---

## 6. Regulatory Grounding Notice
- No official AICTE Approval Process Handbook (APH) PDF is currently present in the repository.
- Compliance rules are grounded in published AICTE guidelines (2024–2027 norms) and designated as `[PLACEHOLDER PENDING OFFICIAL HANDBOOK MAPPING]`.
- All institutional baseline records are explicitly tagged as `[SIMULATED GROUND TRUTH]` for hackathon evaluation.
