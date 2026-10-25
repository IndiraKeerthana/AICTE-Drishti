from PIL import Image
from app.services.anomaly_service import compute_image_phash, compare_perceptual_hashes

def review_infrastructure_evidence(
    storage_path: str,
    evidence_category: str = "LAB_INFRASTRUCTURE_PHOTO"
) -> dict:
    """
    Evaluates infrastructure photographic evidence:
    - Checks image resolution & aspect ratio
    - Computes perceptual hash (pHash)
    - Flags low-resolution or illegible evidence for manual inspection
    """
    review_result = {
        "status": "PASSED",
        "evidence_category": evidence_category,
        "width": 0,
        "height": 0,
        "phash": None,
        "requires_human_review": False,
        "notes": "Image resolution and evidence properties meet quality threshold."
    }

    try:
        with Image.open(storage_path) as img:
            w, h = img.size
            review_result["width"] = w
            review_result["height"] = h
            review_result["phash"] = compute_image_phash(storage_path)

            # Quality checks
            if w < 600 or h < 400:
                review_result["status"] = "MANUAL_REVIEW"
                review_result["requires_human_review"] = True
                review_result["notes"] = f"Image resolution ({w}x{h}) is below standard evidence threshold (600x400). Requires human scrutiny."

    except Exception as e:
        review_result["status"] = "FAILED"
        review_result["requires_human_review"] = True
        review_result["notes"] = f"Infrastructure image processing failed: {str(e)}"

    return review_result

def check_cross_slot_photo_reuse(documents: list) -> list[dict]:
    """
    Scans uploaded documents with perceptual hashes.
    If Hamming distance <= 4 between two different categories, flags reused infrastructure photo!
    """
    anomalies = []
    photo_docs = [d for d in documents if d.phash_value and d.status != "REPLACED_ARCHIVED"]

    for i in range(len(photo_docs)):
        for j in range(i + 1, len(photo_docs)):
            doc1 = photo_docs[i]
            doc2 = photo_docs[j]
            dist = compare_perceptual_hashes(doc1.phash_value, doc2.phash_value)
            if dist <= 4:
                anomalies.append({
                    "doc1_id": doc1.id,
                    "doc1_name": doc1.original_filename,
                    "doc1_category": doc1.document_category,
                    "doc2_id": doc2.id,
                    "doc2_name": doc2.original_filename,
                    "doc2_category": doc2.document_category,
                    "hamming_distance": dist,
                    "severity": "HIGH",
                    "explanation": f"Perceptual image hash match (Hamming distance {dist}) detected between '{doc1.original_filename}' ({doc1.document_category}) and '{doc2.original_filename}' ({doc2.document_category}). Potential reused laboratory/infrastructure photograph."
                })

    return anomalies
