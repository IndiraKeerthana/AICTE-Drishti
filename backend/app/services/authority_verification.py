import json
import datetime
import re
import cv2
import numpy as np
from pathlib import Path
from PIL import Image

# Simulated Issuing Authority Registry Database (Synthetic ground-truth for SIH testing)
# Clearly identified as synthetic mock records. Not connected to live authority databases.
SIMULATED_AUTHORITY_REGISTRY = {
    # --- SCENARIO A: Valid Matching Records (VERIFIED) ---
    "FS-2026-1044": {
        "approval_ref": "FS-2026-1044",
        "issuing_authority": "Municipal Directorate of Fire & Emergency Services",
        "approval_type": "FIRE_SAFETY_NOC",
        "institution_name": "Sample Institute of Technology",
        "approved_location": "Survey 104/2A, Kothrud, Pune, Maharashtra",
        "issue_date": "2024-06-01",
        "valid_till": "2027-06-30",
        "status": "ACTIVE",
        "status_reason": "Regular periodic inspection completed satisfactorily.",
        "supporting_metadata": "Sanctioned building height: 14.8m; Adequate hydrants and two 20,000L static water tanks certified."
    },
    "BP-2025-MUN-881": {
        "approval_ref": "BP-2025-MUN-881",
        "issuing_authority": "Municipal Corporation Town Planning Department",
        "approval_type": "BUILDING_PLAN",
        "institution_name": "Sample Institute of Technology",
        "approved_location": "Survey 104/2A, Kothrud, Pune, Maharashtra",
        "issue_date": "2023-11-20",
        "valid_till": "2028-11-19",
        "status": "ACTIVE",
        "status_reason": "Commencement and occupancy sanctioned for educational institutional use.",
        "supporting_metadata": "Sanctioned instructional built-up area: 4,850 sq.m; administrative area: 1,200 sq.m."
    },
    "UNIV-AFFIL-2025-662": {
        "approval_ref": "UNIV-AFFIL-2025-662",
        "issuing_authority": "State Technical University Examination & Affiliation Board",
        "approval_type": "AFFILIATION_LETTER",
        "institution_name": "Sample Institute of Technology",
        "approved_location": "Survey 104/2A, Kothrud, Pune, Maharashtra",
        "issue_date": "2025-05-15",
        "valid_till": "2026-06-30",
        "status": "ACTIVE",
        "status_reason": "Permanent affiliation renewed for undergraduate engineering programmes.",
        "supporting_metadata": "Sanctioned B.Tech CSE intake: 60 seats; ECE: 60 seats."
    },
    "ENV-2025-CLEAR": {
        "approval_ref": "ENV-2025-CLEAR",
        "issuing_authority": "State Environment Impact Assessment Authority (SEIAA)",
        "approval_type": "ENVIRONMENTAL_CLEARANCE",
        "institution_name": "Sample Institute of Technology",
        "approved_location": "Survey 104/2A, Kothrud, Pune, Maharashtra",
        "issue_date": "2024-02-10",
        "valid_till": "2029-02-09",
        "status": "ACTIVE",
        "status_reason": "Environmental clearance granted under Category B2 (Educational Institution).",
        "supporting_metadata": "Zero-discharge sewage treatment plant (STP) capacity: 45 KLD mandated."
    },

    # --- SCENARIO C: Entity / Institution Mismatch (ENTITY_MISMATCH) ---
    "BP-2023-OTHER-INST": {
        "approval_ref": "BP-2023-OTHER-INST",
        "issuing_authority": "Municipal Corporation Town Planning Department",
        "approval_type": "BUILDING_PLAN",
        "institution_name": "Maharashtra Academy of Engineering & Technology",
        "approved_location": "Survey 104/2A, Kothrud, Pune, Maharashtra",
        "issue_date": "2023-04-12",
        "valid_till": "2028-04-11",
        "status": "ACTIVE",
        "status_reason": "Approval issued to Maharashtra Academy of Engineering Trust.",
        "supporting_metadata": "Registered entity differs from applicant institution."
    },

    # --- SCENARIO D: Approved Location Mismatch (LOCATION_MISMATCH) ---
    "BP-2024-DIFF-LOC": {
        "approval_ref": "BP-2024-DIFF-LOC",
        "issuing_authority": "Municipal Corporation Town Planning Department",
        "approval_type": "BUILDING_PLAN",
        "institution_name": "Sample Institute of Technology",
        "approved_location": "Plot 45, Sector 9, Hadapsar Industrial Area, Pune, Maharashtra",
        "issue_date": "2024-01-18",
        "valid_till": "2029-01-17",
        "status": "ACTIVE",
        "status_reason": "Sanctioned for auxiliary property at Hadapsar campus.",
        "supporting_metadata": "Survey number differs from declared primary campus."
    },

    # --- SCENARIO F: Expired Approval Record (EXPIRED) ---
    "FS-2025-9981": {
        "approval_ref": "FS-2025-9981",
        "issuing_authority": "Municipal Directorate of Fire & Emergency Services",
        "approval_type": "FIRE_SAFETY_NOC",
        "institution_name": "Sample Institute of Technology",
        "approved_location": "Survey 104/2A, Kothrud, Pune, Maharashtra",
        "issue_date": "2024-09-16",
        "valid_till": "2025-09-15",
        "status": "EXPIRED",
        "status_reason": "Annual fire safety certification expired without renewal filing.",
        "supporting_metadata": "Requires annual inspection renewal certificate."
    },

    # --- SCENARIO F: Revoked Approval Record (STATUS_INVALID) ---
    "BP-2022-REVOKED": {
        "approval_ref": "BP-2022-REVOKED",
        "issuing_authority": "Municipal Corporation Town Planning Department",
        "approval_type": "BUILDING_PLAN",
        "institution_name": "Sample Institute of Technology",
        "approved_location": "Survey 104/2A, Kothrud, Pune, Maharashtra",
        "issue_date": "2022-08-10",
        "valid_till": "2027-08-09",
        "status": "REVOKED",
        "status_reason": "Revoked by Municipal Commissioner on 2024-03-12 due to unauthorized structural alteration in refuge area.",
        "supporting_metadata": "Revocation Order No. MC/TP/REV-2024-19."
    },

    # --- SCENARIO F: Rejected Approval Record (STATUS_INVALID) ---
    "BP-2024-REJECTED": {
        "approval_ref": "BP-2024-REJECTED",
        "issuing_authority": "Municipal Corporation Town Planning Department",
        "approval_type": "BUILDING_PLAN",
        "institution_name": "Sample Institute of Technology",
        "approved_location": "Survey 104/2A, Kothrud, Pune, Maharashtra",
        "issue_date": "2024-05-18",
        "valid_till": "2024-05-18",
        "status": "REJECTED",
        "status_reason": "Rejected on 2024-05-18 due to inadequate instructional carpet area and non-conformance with road setback norms.",
        "supporting_metadata": "Town Planning Committee Resolution 44/2024."
    },

    # --- SCENARIO G: Authority Gateway Timeout / Offline (AUTHORITY_UNAVAILABLE) ---
    "ENV-GATEWAY-TIMEOUT": {
        "approval_ref": "ENV-GATEWAY-TIMEOUT",
        "issuing_authority": "State Environment Impact Assessment Authority (SEIAA)",
        "approval_type": "ENVIRONMENTAL_CLEARANCE",
        "institution_name": "Sample Institute of Technology",
        "approved_location": "Survey 104/2A, Kothrud, Pune, Maharashtra",
        "issue_date": "2024-01-01",
        "valid_till": "2029-01-01",
        "status": "GATEWAY_TIMEOUT",
        "status_reason": "External issuing authority portal connection timed out.",
        "supporting_metadata": "Gateway unavailable."
    }
}

AUTHORITY_NAMES_BY_TYPE = {
    "FIRE_SAFETY_NOC": "Municipal Directorate of Fire & Emergency Services",
    "BUILDING_PLAN": "Municipal Corporation Town Planning Department",
    "LAYOUT_APPROVAL": "Municipal Corporation Town Planning Department",
    "AFFILIATION_LETTER": "State Technical University Examination & Affiliation Board",
    "ENVIRONMENTAL_CLEARANCE": "State Environment Impact Assessment Authority (SEIAA)",
    "LAND_TITLE_DEED": "State Revenue Department (Sub-Registrar of Land Records)"
}


def decode_qr_code_from_image(image_path: str) -> tuple[str | None, str]:
    """
    Decodes 2D QR codes using OpenCV QRCodeDetector.
    Returns: (decoded_text_or_none, detector_status_notes)
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            pil_img = Image.open(image_path).convert("RGB")
            img = np.array(pil_img)
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

        detector = cv2.QRCodeDetector()
        data, points, _ = detector.detectAndDecode(img)
        if data and data.strip():
            return data.strip(), "QR code successfully detected and decoded."
        return None, "No readable QR code found in document."
    except Exception as e:
        return None, f"QR decoding attempt returned error: {str(e)}"

def _norm_location_tokens(loc_str: str) -> set[str]:
    """Extract normalized alphanumeric tokens from location string, excluding common administrative stop words."""
    if not loc_str:
        return set()
    return set(re.findall(r"[A-Za-z0-9]+", loc_str.lower())) - {"campus", "plot", "survey", "no", "road", "pune", "maharashtra"}


def verify_against_authority_registry(
    cert_reference: str | None,
    cert_type: str = "FIRE_SAFETY_NOC",
    institution_name: str | None = None,
    declared_location: str | None = None,
    qr_payload: str | None = None
) -> dict:
    """
    Simulated External Authority Cross-Verification Engine.
    Cross-checks extracted document certificate references against the synthetic issuing authority registry.
    
    Strictly distinguishes failure reasons per Section 10:
    - VERIFIED: Matching authority record, matching institution, matching location, active status.
    - RECORD_NOT_FOUND: Reference does not exist in mock registry. Explains without accusing of fraud.
    - REFERENCE_MISMATCH: Extracted certificate reference differs from declared reference.
    - ENTITY_MISMATCH: Reference belongs to another institution in registry.
    - LOCATION_MISMATCH: Approved location in registry differs from declared campus.
    - STATUS_INVALID: Registry records approval as revoked, rejected or invalid.
    - EXPIRED: Applicable validity period ended.
    - EXTRACTION_INCOMPLETE: Required reference could not be reliably extracted.
    - AUTHORITY_UNAVAILABLE: Verification gateway offline or unreachable.
    
    Always includes simulated disclosure: 'SIMULATED EXTERNAL CHECK — SYNTHETIC DATA'.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    issuing_authority = AUTHORITY_NAMES_BY_TYPE.get(cert_type, "Issuing Authority Gateway")
    source_name = f"{issuing_authority} [SIMULATED]"

    # Resolve lookup key from QR payload if present
    lookup_key = cert_reference
    if qr_payload:
        try:
            qr_dict = json.loads(qr_payload)
            lookup_key = qr_dict.get("cert_id") or qr_dict.get("ref_no") or qr_dict.get("approval_ref") or lookup_key
        except Exception:
            ref_match = re.search(r"[?&]ref=([A-Za-z0-9\-_]+)", qr_payload)
            if ref_match:
                lookup_key = ref_match.group(1)
            elif any(prefix in qr_payload for prefix in ("FS-", "BP-", "UNIV-", "ENV-", "AFFIL-")):
                lookup_key = qr_payload.strip()

    # Case 1: Incomplete Extraction (no reference found in document)
    if not lookup_key or lookup_key.strip() in ("", "UNKNOWN", "NOT_FOUND"):
        return {
            "outcome": "EXTRACTION_INCOMPLETE",
            "status": "SOURCE_UNAVAILABLE",
            "source_name": source_name,
            "source_reference": "UNRESOLVED",
            "is_simulated": True,
            "requires_human_review": True,
            "specific_reason": "Approval reference number could not be reliably extracted from the uploaded document.",
            "expected_value": "Valid approval reference number (e.g. FS-YYYY-XXXX, BP-YYYY-XXXX)",
            "observed_value": "No legible certificate reference detected in document",
            "what_remains_uncertain": "Whether the document contains a valid reference in an unread section or seal.",
            "recommended_action": "Inspect document using in-app viewer to manually locate certificate reference.",
            "matched_record": None,
            "attempt_timestamp": now_iso,
            "explanation": f"Approval reference could not be extracted for {cert_type}. Manual inspection is required."
        }

    lookup_clean = lookup_key.strip()

    # Case 2: Authority Service Unavailable / Gateway Timeout (Scenario G)
    if lookup_clean == "ENV-GATEWAY-TIMEOUT" or "TIMEOUT" in lookup_clean or "OFFLINE" in lookup_clean:
        return {
            "outcome": "AUTHORITY_UNAVAILABLE",
            "status": "SOURCE_UNAVAILABLE",
            "source_name": source_name,
            "source_reference": lookup_clean,
            "is_simulated": True,
            "requires_human_review": True,
            "specific_reason": f"Connection to {issuing_authority} registry portal timed out after 3 retry attempts.",
            "expected_value": f"Response from {issuing_authority} Registry Gateway",
            "observed_value": "HTTP 504 Gateway Timeout (Service temporarily unreachable)",
            "what_remains_uncertain": "Current registration status of this certificate on the state authority portal.",
            "recommended_action": "Re-run cross-verification once the authority gateway returns online, or confirm via direct departmental channel.",
            "matched_record": None,
            "attempt_timestamp": now_iso,
            "explanation": f"Mock authority gateway for {issuing_authority} is temporarily unreachable. Check could not be completed."
        }

    # Case 3: Record Not Found in Registry (Scenario B)
    if lookup_clean not in SIMULATED_AUTHORITY_REGISTRY:
        return {
            "outcome": "RECORD_NOT_FOUND",
            "status": "MISMATCH_DETECTED",
            "source_name": source_name,
            "source_reference": lookup_clean,
            "is_simulated": True,
            "requires_human_review": True,
            "specific_reason": f"Approval reference '{lookup_clean}' was not found in the synthetic registry of {issuing_authority}.",
            "expected_value": f"Authentic registration record in {issuing_authority} database",
            "observed_value": f"Reference '{lookup_clean}' not indexed in registry",
            "what_remains_uncertain": "Whether the discrepancy is caused by a clerical typing variance, an unindexed regional authority division, or an unverified submission.",
            "recommended_action": "Review the uploaded document in the in-app viewer and request clarification or certified original from the institution.",
            "matched_record": None,
            "attempt_timestamp": now_iso,
            "explanation": (
                f"No matching record found in {issuing_authority} registry for reference '{lookup_clean}'. "
                "This does not automatically establish an improper submission; manual confirmation with the issuing authority is recommended."
            )
        }

    record = SIMULATED_AUTHORITY_REGISTRY[lookup_clean]

    # Case 4: Invalid Status — Revoked or Rejected (Scenario F)
    rec_status = record.get("status", "ACTIVE")
    if rec_status in ("REVOKED", "REJECTED"):
        return {
            "outcome": "STATUS_INVALID",
            "status": "MISMATCH_DETECTED",
            "source_name": source_name,
            "source_reference": lookup_clean,
            "is_simulated": True,
            "requires_human_review": True,
            "specific_reason": f"Authority registry records approval '{lookup_clean}' as {rec_status}. {record.get('status_reason', '')}",
            "expected_value": "Active / Valid statutory approval status",
            "observed_value": f"Recorded as {rec_status} in {issuing_authority} registry",
            "what_remains_uncertain": "Whether a subsequent stay order, rectification order, or appeal has been granted.",
            "recommended_action": "Flag for scrutiny committee review. Issue deficiency notice regarding invalid approval status.",
            "matched_record": record,
            "attempt_timestamp": now_iso,
            "explanation": f"The synthetic authority registry records this approval as {rec_status}: {record.get('status_reason', '')}"
        }

    # Case 5: Expired Validity (Scenario F)
    if rec_status == "EXPIRED":
        return {
            "outcome": "EXPIRED",
            "status": "EXPIRED",
            "source_name": source_name,
            "source_reference": lookup_clean,
            "is_simulated": True,
            "requires_human_review": True,
            "specific_reason": f"Certificate validity ended on {record.get('valid_till')}. {record.get('status_reason', '')}",
            "expected_value": "Valid unexpired statutory certificate (valid through current academic year)",
            "observed_value": f"Expired on {record.get('valid_till')}",
            "what_remains_uncertain": "Whether an in-process renewal application has been acknowledged by the authority.",
            "recommended_action": "Issue deficiency notice requesting renewed certificate or formal renewal acknowledgement.",
            "matched_record": record,
            "attempt_timestamp": now_iso,
            "explanation": f"Issuing authority confirms certificate '{lookup_clean}' expired on {record.get('valid_till')}."
        }

    # Case 6: Institution / Entity Mismatch (Scenario C)
    if institution_name and record.get("institution_name"):
        from app.services.anomaly_service import evaluate_institution_name_similarity
        score, acceptable = evaluate_institution_name_similarity(record["institution_name"], institution_name)
        if not acceptable:
            return {
                "outcome": "ENTITY_MISMATCH",
                "status": "MISMATCH_DETECTED",
                "source_name": source_name,
                "source_reference": lookup_clean,
                "is_simulated": True,
                "requires_human_review": True,
                "specific_reason": (
                    f"Approval reference '{lookup_clean}' in registry is issued to '{record['institution_name']}', "
                    f"which differs from applicant institution '{institution_name}' (similarity: {score:.1f}%)."
                ),
                "expected_value": f"Registered Institution: {institution_name}",
                "observed_value": f"Authority Record Holder: {record['institution_name']}",
                "what_remains_uncertain": "Whether the applicant institution operates under a parent educational trust with a differing legal title.",
                "recommended_action": "Examine trust deed or request institutional corrigendum explaining legal entity relationship.",
                "matched_record": record,
                "attempt_timestamp": now_iso,
                "explanation": (
                    f"Approval reference belongs to a different institution ('{record['institution_name']}') in the authority registry. "
                    "Manual verification of institutional ownership is required."
                )
            }

    # Case 7: Approved Location Mismatch (Scenario D)
    if declared_location and record.get("approved_location"):
        dec_tokens = _norm_location_tokens(declared_location)
        rec_tokens = _norm_location_tokens(record["approved_location"])
        common = dec_tokens.intersection(rec_tokens)

        # If location tokens show stark disagreement (e.g. Hadapsar vs Kothrud)
        if ("hadapsar" in rec_tokens and "kothrud" in dec_tokens) or (len(common) == 0 and len(rec_tokens) > 0 and len(dec_tokens) > 0):
            return {
                "outcome": "LOCATION_MISMATCH",
                "status": "MISMATCH_DETECTED",
                "source_name": source_name,
                "source_reference": lookup_clean,
                "is_simulated": True,
                "requires_human_review": True,
                "specific_reason": (
                    f"The property location recorded in the authority registry ('{record['approved_location']}') "
                    f"differs from the declared campus location ('{declared_location}')."
                ),
                "expected_value": f"Campus Location: {declared_location}",
                "observed_value": f"Authority Registered Location: {record['approved_location']}",
                "what_remains_uncertain": "Whether the institution operates multi-campus premises or relocated with municipal approval.",
                "recommended_action": "Request land conversion and municipal campus relocation order or clarification.",
                "matched_record": record,
                "attempt_timestamp": now_iso,
                "explanation": (
                    f"Approved location in {issuing_authority} registry ('{record['approved_location']}') "
                    f"differs from application campus ('{declared_location}')."
                )
            }

    # Case 8: Successful Verification (Scenario A)
    return {
        "outcome": "VERIFIED",
        "status": "VERIFIED",
        "source_name": source_name,
        "source_reference": lookup_clean,
        "is_simulated": True,
        "requires_human_review": False,
        "specific_reason": f"Approval record confirmed in {issuing_authority} registry. Institution name, location, and validity verified.",
        "expected_value": f"Valid approval registered to {record.get('institution_name', institution_name)}",
        "observed_value": f"Confirmed Active (Valid till {record.get('valid_till', 'End of AY')})",
        "what_remains_uncertain": "None. Regulatory fields reconcile satisfactorily.",
        "recommended_action": "Statutory verification complete. Proceed with scrutiny review.",
        "matched_record": record,
        "attempt_timestamp": now_iso,
        "explanation": f"Authenticity verified via {source_name}. Certificate valid till {record.get('valid_till', 'End of AY')}."
    }
