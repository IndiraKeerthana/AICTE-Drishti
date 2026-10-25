import os
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Application, Document, ExtractedField, AuditEvent
from app.schemas import DocumentResponse
from app.services.storage import validate_and_store_document
from app.services.document_parser import extract_document_content
from app.services.orchestrator import execute_automated_scrutiny
from app.api.auth import get_current_user, UserInfo

router = APIRouter(tags=["Documents"])

@router.post("/applications/{id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_application_document(
    id: int,
    document_category: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # Enforce applicant access restrictions
    if current_user.role == "APPLICANT" and current_user.institution_id:
        if app.institution.aicte_permanent_id != current_user.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to upload documents for this application."
            )

    # 1. Archive any previously active document in this category (replacement workflow)
    prev_doc = db.query(Document).filter(
        Document.application_id == app.id,
        Document.document_category == document_category,
        Document.status != "REPLACED_ARCHIVED"
    ).first()
    if prev_doc:
        prev_doc.status = "REPLACED_ARCHIVED"

    # 2. Validate file size, MIME type and store in secure isolated vault
    storage_path, sha256_hash, file_size, detected_mime = validate_and_store_document(
        application_id=app.id,
        file=file
    )

    # 3. Extract content & structured fields using PyMuPDF / OCR
    parsed = extract_document_content(
        storage_path=storage_path,
        mime_type=detected_mime
    )

    # 4. Save Document record
    doc = Document(
        application_id=app.id,
        document_category=document_category,
        original_filename=file.filename or "uploaded_file",
        storage_path=storage_path,
        file_size_bytes=file_size,
        mime_type=detected_mime,
        sha256_hash=sha256_hash,
        phash_value=parsed.get("phash"),
        pdf_metadata_json=parsed.get("metadata_json"),
        incremental_updates_count=parsed.get("incremental_updates_count", 0),
        ocr_needed=parsed.get("ocr_needed", False),
        ocr_performed=parsed.get("ocr_performed", False),
        ocr_engine_available=parsed.get("ocr_engine_available", True),
        status="PROCESSED",
        page_count=parsed.get("page_count", 1),
        extracted_text=parsed.get("extracted_text", ""),
    )
    db.add(doc)
    db.flush()

    # 5. Save ExtractedField records
    for field_info in parsed.get("extracted_fields", []):
        ef = ExtractedField(
            document_id=doc.id,
            field_key=field_info["field_key"],
            field_value=field_info["field_value"],
            normalized_value=field_info.get("normalized_value"),
            confidence_score=field_info.get("confidence_score", 1.0),
            page_number=field_info.get("page_number", 1),
            source_snippet=field_info.get("source_snippet"),
            extraction_method=field_info.get("extraction_method", parsed.get("extraction_method"))
        )
        db.add(ef)

    # 6. Record Hash-Chained Audit Event
    AuditEvent.create_chained(
        db=db,
        application_id=app.id,
        event_type="DOC_UPLOADED",
        details={
            "document_id": doc.id,
            "filename": doc.original_filename,
            "category": doc.document_category,
            "file_size": doc.file_size_bytes,
            "sha256": doc.sha256_hash,
            "page_count": doc.page_count,
            "previous_document_archived": prev_doc.id if prev_doc else None,
            "extraction_method": parsed.get("extraction_method")
        },
        actor=current_user.full_name or "APPLICANT_PORTAL"
    )

    # 7. Trigger central automatic scrutiny pipeline (checks intake, duplicates, expiry, etc.)
    execute_automated_scrutiny(
        db,
        app.id,
        trigger_source="RECTIFICATION_UPLOAD" if prev_doc else "DOCUMENT_UPLOAD"
    )

    db.commit()
    db.refresh(doc)

    preview = (doc.extracted_text[:200] + "...") if doc.extracted_text and len(doc.extracted_text) > 200 else doc.extracted_text
    return {
        "id": doc.id,
        "application_id": doc.application_id,
        "document_category": doc.document_category,
        "original_filename": doc.original_filename,
        "file_size_bytes": doc.file_size_bytes,
        "mime_type": doc.mime_type,
        "sha256_hash": doc.sha256_hash,
        "status": doc.status,
        "page_count": doc.page_count,
        "extracted_text_preview": preview,
        "uploaded_at": doc.uploaded_at
    }


@router.get("/documents/{id}/stream")
def stream_document(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Enforce applicant access restrictions
    if current_user.role == "APPLICANT" and current_user.institution_id:
        if doc.application.institution.aicte_permanent_id != current_user.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to access documents from another institution."
            )

    file_path = Path(doc.storage_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file missing from vault")

    return FileResponse(
        path=str(file_path),
        media_type=doc.mime_type,
        filename=doc.original_filename,
        headers={"Content-Disposition": f"inline; filename=\"{doc.original_filename}\""}
    )
