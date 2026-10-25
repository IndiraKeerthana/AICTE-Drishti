import datetime
import hashlib
import json
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    aicte_permanent_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), index=True, nullable=False)
    institution_type = Column(String(100), default="TECHNICAL_INSTITUTE")
    address = Column(String(255), default="Sample Campus")
    state = Column(String(100), default="Maharashtra")
    district = Column(String(100), default="Pune")
    created_at = Column(DateTime, default=get_utc_now)

    applications = relationship("Application", back_populates="institution", cascade="all, delete-orphan")
    baseline_records = relationship("BaselineRecord", back_populates="institution", cascade="all, delete-orphan")


class BaselineRecord(Base):
    __tablename__ = "baseline_records"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    record_type = Column(String(50), default="APPROVED_INTAKE")
    academic_year = Column(String(20), default="2025-2026")
    programme = Column(String(100), default="ENGINEERING_AND_TECHNOLOGY")
    course = Column(String(100), default="Computer Science & Engineering")
    approved_intake = Column(Integer, default=60)
    source_system = Column(String(100), default="AICTE_CENTRAL_DB")
    is_simulated = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)

    institution = relationship("Institution", back_populates="baseline_records")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_number = Column(String(50), unique=True, index=True, nullable=False)
    tracking_id = Column(String(64), unique=True, index=True, nullable=True) # Portal integration tracking key
    correlation_id = Column(String(64), index=True, nullable=True)
    idempotency_key = Column(String(64), index=True, nullable=True)
    
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(100), default="INCREASE_INTAKE")
    academic_year = Column(String(20), default="2026-2027")
    status = Column(String(50), default="SUBMITTED")  # SUBMITTED, UNDER_SCRUTINY, DEFICIENCY_FLAGGED, APPROVED, REJECTED
    declared_programme = Column(String(100), default="ENGINEERING_AND_TECHNOLOGY")
    declared_course = Column(String(100), default="Computer Science & Engineering")
    declared_intake = Column(Integer, default=120)
    declared_land_acres = Column(Float, default=8.25)
    
    # Final human authority decision boundary
    final_decision = Column(String(50), nullable=True) # RECOMMEND_APPROVAL, RECOMMEND_REJECTION, DEFICIENCY_NOTICE
    decision_remarks = Column(Text, nullable=True)
    decided_by = Column(String(100), nullable=True)
    decided_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    institution = relationship("Institution", back_populates="applications")
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="application", cascade="all, delete-orphan")
    reviewer_actions = relationship("ReviewerAction", back_populates="application", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="application", cascade="all, delete-orphan")
    scrutiny_runs = relationship("ScrutinyRun", back_populates="application", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="application", cascade="all, delete-orphan")


class ScrutinyRun(Base):
    __tablename__ = "scrutiny_runs"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    run_number = Column(Integer, default=1)
    status = Column(String(50), default="COMPLETED")  # QUEUED, RUNNING, COMPLETED, COMPLETED_WITH_WARNINGS, FAILED
    ruleset_version = Column(String(50), default="2025-2026.v1")
    total_checks = Column(Integer, default=0)
    passed_checks = Column(Integer, default=0)
    failed_checks = Column(Integer, default=0)
    warnings_count = Column(Integer, default=0)
    execution_duration_ms = Column(Integer, default=0)
    summary_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    completed_at = Column(DateTime, default=get_utc_now)

    application = relationship("Application", back_populates="scrutiny_runs")
    check_results = relationship("CheckResult", back_populates="scrutiny_run", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="scrutiny_run")


class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(Integer, primary_key=True, index=True)
    scrutiny_run_id = Column(Integer, ForeignKey("scrutiny_runs.id", ondelete="CASCADE"), nullable=False)
    check_code = Column(String(100), index=True, nullable=False)
    category = Column(String(50), nullable=False) # COMPLIANCE, IDP, ANOMALY, AUTHORITY
    status = Column(String(50), nullable=False) # PASSED, FAILED, MANUAL_REVIEW, EXPIRED, SOURCE_UNAVAILABLE, INCOMPLETE
    expected_value = Column(String(255), nullable=True)
    observed_value = Column(String(255), nullable=True)
    explanation = Column(Text, nullable=False)
    severity = Column(String(20), default="MEDIUM")
    requires_human_review = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)

    scrutiny_run = relationship("ScrutinyRun", back_populates="check_results")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    document_category = Column(String(100), nullable=False)  # LAND_TITLE_DEED, FIRE_SAFETY_NOC, AFFILIATION_LETTER, etc.
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    sha256_hash = Column(String(64), index=True, nullable=False)
    phash_value = Column(String(32), index=True, nullable=True) # Perceptual hash for photo/image duplicate detection
    status = Column(String(50), default="PROCESSED")  # PENDING, PROCESSED, EXTRACTION_FAILED, REPLACED_ARCHIVED
    page_count = Column(Integer, default=1)
    extracted_text = Column(Text, nullable=True)
    pdf_metadata_json = Column(Text, nullable=True)
    incremental_updates_count = Column(Integer, default=0) # Suspicious post-issuance edits
    ocr_needed = Column(Boolean, default=False)
    ocr_performed = Column(Boolean, default=False)
    ocr_engine_available = Column(Boolean, default=True)
    uploaded_at = Column(DateTime, default=get_utc_now)

    application = relationship("Application", back_populates="documents")
    extracted_fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")
    authority_verifications = relationship("AuthorityVerification", back_populates="document", cascade="all, delete-orphan")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    field_key = Column(String(100), index=True, nullable=False)
    field_value = Column(String(500), nullable=False)
    normalized_value = Column(String(500), nullable=True)
    confidence_score = Column(Float, default=1.0)
    page_number = Column(Integer, default=1)
    source_snippet = Column(Text, nullable=True)
    bounding_box = Column(Text, nullable=True) # JSON coordinates
    extraction_method = Column(String(50), default="PYMUPDF")  # PYMUPDF, OCR, REGEX, LLM
    created_at = Column(DateTime, default=get_utc_now)

    document = relationship("Document", back_populates="extracted_fields")


class AuthorityVerification(Base):
    __tablename__ = "authority_verifications"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    verification_type = Column(String(50), nullable=False) # QR_CODE, DIGITAL_SIGNATURE, REGISTRY_LOOKUP
    source_name = Column(String(100), nullable=False)
    source_reference = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False) # VERIFIED, MISMATCH_DETECTED, EXPIRED, SOURCE_UNAVAILABLE, MANUAL_REVIEW_REQUIRED
    evidence_payload = Column(Text, nullable=True)
    is_simulated = Column(Boolean, default=True)
    attempt_timestamp = Column(DateTime, default=get_utc_now)

    document = relationship("Document", back_populates="authority_verifications")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    finding_code = Column(String(50), unique=True, index=True, nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    scrutiny_run_id = Column(Integer, ForeignKey("scrutiny_runs.id", ondelete="SET NULL"), nullable=True)
    
    category = Column(String(50), nullable=False)  # RECORD_MISMATCH, EXPIRED_DOCUMENT, MISSING_DOCUMENT, INTEGRITY_ANOMALY
    severity = Column(String(20), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    evidence_classification = Column(String(50), default="VERIFIED_FACT") # VERIFIED_FACT, AUTOMATED_INFERENCE, POTENTIAL_ANOMALY, CHECK_NOT_COMPLETED
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    expected_value = Column(String(255), nullable=True)
    observed_value = Column(String(255), nullable=True)
    
    supporting_document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    supporting_page_number = Column(Integer, nullable=True)
    source_snippet = Column(Text, nullable=True)
    bounding_box = Column(Text, nullable=True)
    
    rule_code = Column(String(100), nullable=False)
    rule_description = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    review_status = Column(String(50), default="OPEN")  # OPEN, ACKNOWLEDGED, RECTIFICATION_REQUESTED, RESOLVED, OVERRIDDEN
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    application = relationship("Application", back_populates="findings")
    supporting_document = relationship("Document")
    scrutiny_run = relationship("ScrutinyRun", back_populates="findings")
    reviewer_actions = relationship("ReviewerAction", back_populates="finding")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), default="HIGH")
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="ACTIVE") # ACTIVE, ACKNOWLEDGED, RESOLVED
    created_at = Column(DateTime, default=get_utc_now)

    application = relationship("Application", back_populates="alerts")


class ReviewerAction(Base):
    __tablename__ = "reviewer_actions"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    finding_id = Column(Integer, ForeignKey("findings.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(50), nullable=False)  # ACKNOWLEDGE, REQUEST_DEFICIENCY, OVERRIDE, RESOLVE, RECOMMEND_APPROVAL, RECOMMEND_REJECTION
    justification_remarks = Column(Text, nullable=False)
    reviewer_name = Column(String(100), default="Scrutiny Officer")
    created_at = Column(DateTime, default=get_utc_now)

    application = relationship("Application", back_populates="reviewer_actions")
    finding = relationship("Finding", back_populates="reviewer_actions")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=True)
    event_type = Column(String(100), index=True, nullable=False)
    details_json = Column(Text, nullable=False)
    actor = Column(String(100), default="SYSTEM")
    previous_hash = Column(String(64), nullable=False)
    event_hash = Column(String(64), index=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    application = relationship("Application", back_populates="audit_events")

    @classmethod
    def create_chained(cls, db, application_id: int | None, event_type: str, details: dict, actor: str = "SYSTEM"):
        # Fetch the most recent event to establish hash chain
        last_event = db.query(cls).order_by(cls.id.desc()).first()
        prev_hash = last_event.event_hash if last_event else "0" * 64

        details_str = json.dumps(details, sort_keys=True, default=str)
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Calculate SHA-256 hash of previous hash + event_type + payload + actor + timestamp
        hasher = hashlib.sha256()
        hasher.update(prev_hash.encode("utf-8"))
        hasher.update(event_type.encode("utf-8"))
        hasher.update(details_str.encode("utf-8"))
        hasher.update(actor.encode("utf-8"))
        hasher.update(now_iso.encode("utf-8"))
        event_hash = hasher.hexdigest()

        event = cls(
            application_id=application_id,
            event_type=event_type,
            details_json=details_str,
            actor=actor,
            previous_hash=prev_hash,
            event_hash=event_hash,
            created_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(event)
        db.flush()
        return event


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(50), default="OFFICER")  # OFFICER, APPROVER, ADMIN, APPLICANT
    designation = Column(String(100), default="AICTE Scrutiny Officer")
    institution_id = Column(String(50), nullable=True)  # AICTE Permanent ID for APPLICANT users
    email = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)

