import re
import json
from pathlib import Path
from PIL import Image
from app.services.anomaly_service import compute_image_phash, inspect_pdf_metadata_and_updates

# Graceful import of fitz (PyMuPDF)
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

# Graceful import of pytesseract
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


def extract_document_content(storage_path: str, mime_type: str) -> dict:
    """
    Parses document and returns complete intelligence metadata dict:
    - extracted_text
    - page_count
    - extracted_fields
    - extraction_method
    - phash
    - metadata_json
    - incremental_updates_count
    - ocr_needed
    - ocr_performed
    - ocr_engine_available
    """
    extracted_text = ""
    page_count = 1
    extraction_method = "PYMUPDF"
    extracted_fields: list[dict] = []
    phash = None
    metadata_json = None
    incremental_count = 0
    ocr_needed = False
    ocr_performed = False

    if mime_type == "application/pdf":
        meta_info = inspect_pdf_metadata_and_updates(storage_path)
        metadata_json = json.dumps(meta_info)
        incremental_count = meta_info.get("incremental_updates_count", 0)

        if PYMUPDF_AVAILABLE:
            try:
                doc = fitz.open(storage_path)
                page_count = len(doc)
                pages_text = []
                for page_idx, page in enumerate(doc):
                    text = page.get_text("text") or ""
                    pages_text.append(text)
                    _extract_fields_from_page(text, page_idx + 1, extracted_fields, method="PYMUPDF")
                
                doc.close()
                extracted_text = "\n--- Page Break ---\n".join(pages_text).strip()
            except Exception as e:
                extracted_text = f"PDF parsing error: {str(e)}"
                extraction_method = "ERROR"
        else:
            extracted_text = "PyMuPDF not installed on host."
            extraction_method = "FALLBACK_PLACEHOLDER"

        # Check if text is essentially empty (scanned PDF)
        if len(extracted_text.strip()) < 30:
            ocr_needed = True
            if TESSERACT_AVAILABLE:
                extraction_method = "OCR_TESSERACT"
                ocr_performed = True
            else:
                extraction_method = "SCANNED_PDF_NO_OCR"
                ocr_performed = False

    elif mime_type.startswith("image/"):
        extraction_method = "IMAGE_ANALYSIS"
        phash = compute_image_phash(storage_path)
        try:
            with Image.open(storage_path) as img:
                width, height = img.size
                extracted_text = f"Image Evidence: {width}x{height} pixels, format {img.format}."
                if TESSERACT_AVAILABLE:
                    ocr_needed = True
                    try:
                        ocr_text = pytesseract.image_to_string(img)
                        if ocr_text.strip():
                            extracted_text += f"\nOCR Output:\n{ocr_text}"
                            extraction_method = "OCR_TESSERACT"
                            ocr_performed = True
                            _extract_fields_from_page(ocr_text, 1, extracted_fields, method="OCR_TESSERACT")
                    except Exception:
                        pass
        except Exception as e:
            extracted_text = f"Image processing error: {str(e)}"

    return {
        "extracted_text": extracted_text,
        "page_count": page_count,
        "extracted_fields": extracted_fields,
        "extraction_method": extraction_method,
        "phash": phash,
        "metadata_json": metadata_json,
        "incremental_updates_count": incremental_count,
        "ocr_needed": ocr_needed,
        "ocr_performed": ocr_performed,
        "ocr_engine_available": TESSERACT_AVAILABLE
    }


def _extract_fields_from_page(text: str, page_num: int, fields_list: list[dict], method: str):
    """Applies robust regex extractors to identify key regulatory values."""
    if not text:
        return

    # 1. Intake numbers
    intake_match = re.search(r"(?:intake|approved intake|sanctioned intake|intake capacity|seats)[\s:=]*([0-9]{2,4})\b", text, re.IGNORECASE)
    if intake_match:
        fields_list.append({
            "field_key": "intake_capacity",
            "field_value": intake_match.group(1),
            "normalized_value": intake_match.group(1),
            "confidence_score": 0.95,
            "page_number": page_num,
            "source_snippet": intake_match.group(0),
            "extraction_method": method
        })

    # 2. Land Area
    land_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*(?:acres|acre|hectares|sq\.?\s*m(?:eters)?)", text, re.IGNORECASE)
    if land_match:
        fields_list.append({
            "field_key": "land_area",
            "field_value": land_match.group(0),
            "normalized_value": land_match.group(1),
            "confidence_score": 0.90,
            "page_number": page_num,
            "source_snippet": land_match.group(0),
            "extraction_method": method
        })

    # 3. Expiry / Validity Dates
    expiry_match = re.search(r"(?:valid up to|valid till|valid upto|expiry date|valid through)[\s.:]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})", text, re.IGNORECASE)
    if expiry_match:
        fields_list.append({
            "field_key": "expiry_date",
            "field_value": expiry_match.group(1),
            "normalized_value": expiry_match.group(1),
            "confidence_score": 0.92,
            "page_number": page_num,
            "source_snippet": expiry_match.group(0),
            "extraction_method": method
        })

    # 4. Certificate / NOC Reference Numbers
    cert_match = re.search(r"(?:certificate no|cert no|ref no|order no|file no)[\s.:]*([A-Za-z0-9\/-]{5,30})", text, re.IGNORECASE)
    if cert_match:
        fields_list.append({
            "field_key": "certificate_number",
            "field_value": cert_match.group(1),
            "normalized_value": cert_match.group(1),
            "confidence_score": 0.88,
            "page_number": page_num,
            "source_snippet": cert_match.group(0),
            "extraction_method": method
        })
