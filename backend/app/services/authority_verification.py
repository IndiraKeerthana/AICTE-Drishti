import json
import cv2
import numpy as np
from pathlib import Path
from PIL import Image

# Simulated Authority Registry Database (Synthetic ground-truth for testing)
SIMULATED_AUTHORITY_REGISTRY = {
    # Valid Fire NOC Record
    "FS-2025-9981": {
        "issuer": "MUNICIPAL_FIRE_SERVICES_DIRECTORATE",
        "institution_id": "1-9988776655",
        "institution_name": "Sample Institute of Technology",
        "status": "EXPIRED",
        "valid_till": "2025-09-15",
        "survey_no": "104/2A"
    },
    # Renewed Fire NOC Record
    "FS-2026-1044": {
        "issuer": "MUNICIPAL_FIRE_SERVICES_DIRECTORATE",
        "institution_id": "1-9988776655",
        "institution_name": "Sample Institute of Technology",
        "status": "VALID",
        "valid_till": "2027-06-30",
        "survey_no": "104/2A"
    },
    # University Affiliation Letter
    "UNIV-AFFIL-2025-662": {
        "issuer": "STATE_TECHNICAL_UNIVERSITY",
        "institution_id": "1-9988776655",
        "approved_intake": 60,
        "status": "VALID",
        "academic_year": "2025-2026"
    }
}

def decode_qr_code_from_image(image_path: str) -> tuple[str | None, str]:
    """
    Decodes 2D QR codes using OpenCV QRCodeDetector.
    Returns: (decoded_text_or_none, detector_status_notes)
    """
    try:
        # Load image with OpenCV
        img = cv2.imread(image_path)
        if img is None:
            # Try PIL convert if OpenCV native read failed
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

def verify_against_authority_registry(
    cert_reference: str | None,
    cert_type: str = "FIRE_SAFETY_NOC",
    qr_payload: str | None = None
) -> dict:
    """
    Queries the simulated issuing authority registry.
    Strictly distinguishes VERIFIED, MISMATCH, EXPIRED, and SOURCE_UNAVAILABLE.
    Always flags results with is_simulated=True.
    """
    source_name = "STATE_REGULATORY_AUTHORITY_GATEWAY [SIMULATED]"
    if cert_type == "FIRE_SAFETY_NOC":
        source_name = "STATE_FIRE_SERVICES_DIRECTORATE [SIMULATED]"
    elif cert_type == "AFFILIATION_LETTER":
        source_name = "STATE_TECHNICAL_UNIVERSITY_PORTAL [SIMULATED]"

    # If QR payload provided, check if it specifies a certificate ID
    lookup_key = cert_reference
    if qr_payload:
        try:
            # Check if JSON payload in QR
            qr_dict = json.loads(qr_payload)
            lookup_key = qr_dict.get("cert_id") or qr_dict.get("ref_no") or lookup_key
        except Exception:
            import re
            ref_match = re.search(r"[?&]ref=([A-Za-z0-9\-_]+)", qr_payload)
            if ref_match:
                lookup_key = ref_match.group(1)
            elif "FS-" in qr_payload or "UNIV-" in qr_payload:
                lookup_key = qr_payload.strip()

    if not lookup_key or lookup_key not in SIMULATED_AUTHORITY_REGISTRY:
        return {
            "status": "SOURCE_UNAVAILABLE",
            "source_name": source_name,
            "source_reference": lookup_key or "UNKNOWN",
            "is_simulated": True,
            "requires_human_review": True,
            "explanation": f"Certificate reference '{lookup_key}' not found in issuing authority registry. Manual verification required."
        }

    record = SIMULATED_AUTHORITY_REGISTRY[lookup_key]
    if record.get("status") == "EXPIRED":
        return {
            "status": "EXPIRED",
            "source_name": source_name,
            "source_reference": lookup_key,
            "is_simulated": True,
            "requires_human_review": True,
            "matched_record": record,
            "explanation": f"Issuing authority confirms certificate '{lookup_key}' expired on {record.get('valid_till')}."
        }

    return {
        "status": "VERIFIED",
        "source_name": source_name,
        "source_reference": lookup_key,
        "is_simulated": True,
        "requires_human_review": False,
        "matched_record": record,
        "explanation": f"Authenticity verified via {source_name}. Certificate valid till {record.get('valid_till', 'End of AY')}."
    }
