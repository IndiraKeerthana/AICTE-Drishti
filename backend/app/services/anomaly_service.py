from pathlib import Path
from PIL import Image
import imagehash
from rapidfuzz import fuzz
import fitz

def compute_image_phash(image_path: str) -> str | None:
    """Computes a 64-bit DCT perceptual hash for an image file."""
    try:
        with Image.open(image_path) as img:
            h = imagehash.phash(img)
            return str(h)
    except Exception:
        return None

def inspect_pdf_metadata_and_updates(storage_path: str) -> dict:
    """
    Inspects PDF metadata and counts incremental update markers (%%EOF).
    Multiple %%EOF markers can indicate post-issuance modification.
    """
    result = {
        "creation_date": None,
        "mod_date": None,
        "producer": None,
        "incremental_updates_count": 0,
        "is_suspicious_modification": False,
        "explanation": "Standard single-pass PDF structure."
    }

    try:
        # Check raw bytes for %%EOF trailer count
        with open(storage_path, "rb") as f:
            content = f.read()
            eof_count = content.count(b"%%EOF")
            result["incremental_updates_count"] = max(0, eof_count - 1)
            if eof_count > 2:
                result["is_suspicious_modification"] = True
                result["explanation"] = f"Detected {eof_count} %%EOF trailer blocks, indicating post-issuance file modifications or appended incremental updates."

        # PyMuPDF metadata inspection
        doc = fitz.open(storage_path)
        meta = doc.metadata or {}
        result["creation_date"] = meta.get("creationDate")
        result["mod_date"] = meta.get("modDate")
        result["producer"] = meta.get("producer")
        doc.close()

    except Exception as e:
        result["explanation"] = f"Metadata extraction failed: {str(e)}"

    return result

def evaluate_institution_name_similarity(declared_name: str, candidate_text: str) -> tuple[float, bool]:
    """
    Compares declared institution name against candidate text using token-sort ratio.
    Returns (similarity_score_pct, is_acceptable_match).
    Threshold: >= 75.0% is acceptable; < 75.0% flags discrepancy.
    """
    if not candidate_text or not declared_name:
        return 100.0, True

    score = fuzz.token_sort_ratio(declared_name.lower(), candidate_text.lower())
    is_acceptable = score >= 75.0
    return float(score), is_acceptable

def compare_perceptual_hashes(hash1: str, hash2: str) -> int:
    """Returns Hamming distance between two hex perceptual hashes."""
    try:
        h1 = imagehash.hex_to_hash(hash1)
        h2 = imagehash.hex_to_hash(hash2)
        return h1 - h2
    except Exception:
        return 999
