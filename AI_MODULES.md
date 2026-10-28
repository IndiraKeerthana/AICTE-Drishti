# AICTE-Drishti — AI & Intelligence Modules Technical Specification

AICTE-Drishti integrates six specialized intelligence and verification modules into a unified, automatic scrutiny pipeline. This document specifies the implementation details, libraries, deterministic heuristics, and operational boundaries of each module.

---

## Module 1: Document Intelligence Service
- **Source Code**: [`backend/app/services/document_parser.py`](file:///d:/VerifyAI/backend/app/services/document_parser.py)
- **Primary Library**: PyMuPDF (`fitz` v1.25+)
- **Fallback Engine**: Tesseract OCR (`pytesseract`)

### Capabilities
1. **High-Speed Digital Parsing**: PyMuPDF extracts text streams, page counts, and bounding box coordinates for each paragraph and table.
2. **Scanned Page Detection**: Calculates text density per page. Pages with `< 30 characters` are flagged as `ocr_needed=True`.
3. **Graceful OCR Fallback**: If Tesseract is unavailable on the host system, the service sets `ocr_engine_available=False` and flags the document for manual review rather than silently dropping or failing.
4. **Structured Field Extraction**: Extracts standard statutory attributes using compiled regex heuristics:
   - Land Area (Acres / Hectares / Sq. Meters)
   - Expiry & Issue Dates (`DD/MM/YYYY`, `YYYY-MM-DD`, `DD-Mon-YYYY`)
   - Certificate & Reference Numbers
   - Registered Institution Names

### Limitations
- Handwritten notes or unformatted stamps require manual inspection.
- OCR execution adds ~400–900ms per page depending on host CPU architecture.

---

## Module 2: Intelligent Validation Engine
- **Source Code**: [`backend/app/services/orchestrator.py`](file:///d:/VerifyAI/backend/app/services/orchestrator.py), [`backend/app/services/baseline_service.py`](file:///d:/VerifyAI/backend/app/services/baseline_service.py)
- **Libraries**: Python Standard Library + `rapidfuzz`

### Capabilities
1. **Cross-Record Reconciliation**: Reconciles declared application fields with central statutory baseline records:
   - *Intake Check*: Declared intake capacity is compared against the preceding Academic Year's Extension of Approval (EoA). (e.g., Declared `120` vs Baseline `60` -> Flagged).
   - *Fuzzy Institution Name Alignment*: Uses `rapidfuzz.fuzz.token_sort_ratio` to compare extracted document titles with the AICTE registry title. Scores between `40%–85%` trigger `MANUAL_REVIEW` notices.
2. **Document Expiry & Validity**: Compares extracted validity dates against current UTC timestamps. Expired certificates immediately produce high-severity findings.
3. **Mandatory Category Completeness**: Compares submitted document categories against the applicable category requirements defined in the active ruleset.

---

## Module 3: Anomaly & Potential Tampering Detection
- **Source Code**: [`backend/app/services/anomaly_service.py`](file:///d:/VerifyAI/backend/app/services/anomaly_service.py)
- **Libraries**: `hashlib`, `imagehash`, `fitz`

### Required Detectors Implemented
1. **Exact Duplicate Detection (SHA-256)**: Identifies identical binary files submitted across different slots or multiple institutions.
2. **Perceptual Image Hash Reuse (`imagehash.phash`)**: Computes 64-bit discrete cosine transform (DCT) hashes of uploaded photos. A Hamming distance `<= 5` flags visually identical photographs reused across distinct laboratory categories.
3. **PDF Metadata & Incremental Updates**: Scans binary PDF streams for multiple `%%EOF` markers and conflicting `CreationDate` vs `ModDate` timestamps. Detects post-issuance modifications that warrant officer inspection.

### Non-Negotiable Operational Policy
- The system never uses generic "fraud risk percentages".
- A flag is always categorized as: `"Potential document anomaly detected — further verification required."`

---

## Module 4: Issuing-Authority Verification Adapter
- **Source Code**: [`backend/app/services/authority_verification.py`](file:///d:/VerifyAI/backend/app/services/authority_verification.py)
- **Libraries**: `opencv-python-headless` (`cv2.QRCodeDetector`), `json`, `re`

### Capabilities
1. **2D QR Code Extraction & Decoding**: Reads 2D QR codes directly from document pages and image uploads using OpenCV.
2. **Query & Reference Extraction**: Parses structured JSON payloads and URL query parameters (e.g. `?ref=FS-2025-9981`) embedded in QR codes.
3. **Pluggable Authority Gateway**:
   - `VERIFIED`: Authentic certificate confirmed in issuing authority registry.
   - `EXPIRED`: Registry confirms certificate was issued but has passed validity.
   - `MISMATCH_DETECTED`: Authority record attributes contradict submitted document.
   - `SOURCE_UNAVAILABLE`: External registry endpoint unreachable or certificate not indexed.
4. **Synthetic Ground-Truth Isolation**: All prototype registry responses are explicitly tagged with `is_simulated=True` and clear explanatory notes.

---

## Module 5: Regulatory Compliance Engine
- **Source Code**: [`backend/app/services/compliance_rules.py`](file:///d:/VerifyAI/backend/app/services/compliance_rules.py)
- **Rules Configuration**: [`backend/app/rules/rules_aph_2025_2026.yaml`](file:///d:/VerifyAI/backend/app/rules/rules_aph_2025_2026.yaml)
- **Library**: `pyyaml`

### Capabilities
1. **Decoupled, Versioned Rulesets**: Scrutiny rules are stored in human-readable YAML configurations, decoupled from backend code.
2. **Application Category Filtering**: Filters rules by application type:
   - `INCREASE_INTAKE`: Validates expansion capacity, EoA baseline, land norms, and fire NOC.
   - `NEW_INSTITUTE`: Enforces full statutory checklist (land deed, master plan, trust deed).
   - `EOA_REGULAR`: Standard renewal verification.
3. **Compliance Transparency**: Every executed check records rule ID, ruleset version (`2025-2026.v1`), expected criterion, observed parameter, and severity.
4. **Mandatory Disclaimer Policy**: In accordance with project instructions, all unverified handbook rules are tagged with `[PLACEHOLDER PENDING HANDBOOK MAPPING]`.

---

## Module 6: Infrastructure Evidence Review Service
- **Source Code**: [`backend/app/services/infrastructure_review.py`](file:///d:/VerifyAI/backend/app/services/infrastructure_review.py)
- **Libraries**: `Pillow`, `imagehash`

### Capabilities
1. **Image Readability & Resolution Verification**: Verifies image dimensions against minimum clarity standards (>= 600x400 px). Low-resolution or corrupted images are flagged for manual review.
2. **Slot Cross-Reuse Detection**: Compares perceptual hashes across all uploaded campus photographs to prevent applicant reuse of a single computer lab photo across chemistry, physics, and mechanical workshops.
3. **Extensible Vision Model Slot**: Provides a clean abstraction interface for optional multimodal vision models (e.g., Gemini Vision) to analyze scene characteristics, while ensuring deterministic fallback when API keys are unconfigured.
