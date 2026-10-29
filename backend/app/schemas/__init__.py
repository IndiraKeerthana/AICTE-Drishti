from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, List, Any
import datetime
import json

# --- Institution Schemas ---
class InstitutionBase(BaseModel):
    aicte_permanent_id: str = Field(..., json_schema_extra={"example": "1-9988776655"})
    name: str = Field(..., json_schema_extra={"example": "Sample Institute of Technology"})
    institution_type: Optional[str] = "TECHNICAL_INSTITUTE"
    address: Optional[str] = "Sample Campus, Katraj"
    state: Optional[str] = "Maharashtra"
    district: Optional[str] = "Pune"

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionResponse(InstitutionBase):
    id: int
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# --- Baseline Record Schemas ---
class BaselineRecordResponse(BaseModel):
    id: int
    institution_id: int
    record_type: str
    academic_year: str
    programme: str
    course: str
    approved_intake: int
    source_system: str
    is_simulated: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: int
    application_id: int
    document_category: str
    original_filename: str
    file_size_bytes: int
    mime_type: str
    sha256_hash: str
    phash_value: Optional[str] = None
    status: str
    page_count: int
    extracted_text_preview: Optional[str] = None
    uploaded_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# --- Extracted Field Schemas ---
class ExtractedFieldResponse(BaseModel):
    id: int
    document_id: int
    field_key: str
    field_value: str
    normalized_value: Optional[str] = None
    confidence_score: float
    page_number: int
    source_snippet: Optional[str] = None
    bounding_box: Optional[str] = None
    extraction_method: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentDetailResponse(DocumentResponse):
    extracted_text: Optional[str] = None
    stream_url: Optional[str] = None
    extracted_fields: List[ExtractedFieldResponse] = []


# --- Check Result Schemas ---
class CheckResultResponse(BaseModel):
    id: int
    check_code: str
    category: str
    status: str
    expected_value: Optional[str] = None
    observed_value: Optional[str] = None
    explanation: str
    severity: str
    requires_human_review: bool

    model_config = ConfigDict(from_attributes=True)


# --- Scrutiny Run Schemas ---
class ScrutinyRunResponse(BaseModel):
    id: int
    run_number: int
    status: str
    ruleset_version: str
    total_checks: int
    passed_checks: int
    failed_checks: int
    warnings_count: int
    execution_duration_ms: int
    summary_notes: Optional[str] = None
    created_at: datetime.datetime
    completed_at: datetime.datetime
    check_results: List[CheckResultResponse] = []

    model_config = ConfigDict(from_attributes=True)


# --- Alert Schemas ---
class AlertResponse(BaseModel):
    id: int
    application_id: int
    finding_id: Optional[int] = None
    scrutiny_run_id: Optional[int] = None
    institution_name: Optional[str] = None
    application_reference: Optional[str] = None
    application_status: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    message: str
    status: str
    created_at: datetime.datetime
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- Finding Schemas ---
class FindingResponse(BaseModel):
    id: int
    finding_code: str
    application_id: int
    scrutiny_run_id: Optional[int] = None
    category: str
    severity: str
    evidence_classification: str = "VERIFIED_FACT"
    title: str
    description: str
    expected_value: Optional[str] = None
    observed_value: Optional[str] = None
    supporting_document_id: Optional[int] = None
    supporting_page_number: Optional[int] = None
    source_snippet: Optional[str] = None
    bounding_box: Optional[str] = None
    rule_code: str
    rule_description: str
    recommended_action: str
    review_status: str
    resolution_notes: Optional[str] = None
    secondary_document_id: Optional[int] = None
    secondary_page_number: Optional[int] = None
    secondary_document_name: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    @model_validator(mode="before")
    @classmethod
    def populate_secondary_metadata(cls, data: Any) -> Any:
        if isinstance(data, dict):
            d = dict(data)
        else:
            d = {
                c.name: getattr(data, c.name, None)
                for c in getattr(data, "__table__", []).columns
            } if hasattr(data, "__table__") else dict(data.__dict__)

        snippet = d.get("source_snippet")
        if snippet and isinstance(snippet, str) and "doc2" in snippet:
            try:
                meta = json.loads(snippet)
                if isinstance(meta, dict):
                    if meta.get("doc2_id"):
                        d.setdefault("secondary_document_id", meta["doc2_id"])
                    if meta.get("doc2_page"):
                        d.setdefault("secondary_page_number", meta["doc2_page"])
                    if meta.get("doc2_name"):
                        d.setdefault("secondary_document_name", meta["doc2_name"])
            except Exception:
                pass
        return d

    model_config = ConfigDict(from_attributes=True)


# --- Reviewer Action Schemas ---
class ReviewerActionCreate(BaseModel):
    finding_id: Optional[int] = None
    action_type: str = Field(..., json_schema_extra={"example": "ACKNOWLEDGE"})
    justification_remarks: str = Field(..., min_length=3, json_schema_extra={"example": "Reviewed supporting evidence and confirmed discrepancy."})
    reviewer_name: Optional[str] = "Scrutiny Officer"

class ReviewerActionResponse(BaseModel):
    id: int
    application_id: int
    finding_id: Optional[int] = None
    action_type: str
    justification_remarks: str
    reviewer_name: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# --- Audit Event Schemas ---
class AuditEventResponse(BaseModel):
    id: int
    application_id: Optional[int] = None
    event_type: str
    details: dict
    actor: str
    previous_hash: str
    event_hash: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# --- Application Schemas ---
class ApplicationCreate(BaseModel):
    aicte_permanent_id: str = Field(..., json_schema_extra={"example": "1-9988776655"})
    institution_name: str = Field(..., json_schema_extra={"example": "Sample Institute of Technology"})
    category: str = Field("INCREASE_INTAKE", json_schema_extra={"example": "INCREASE_INTAKE"})
    academic_year: str = Field("2026-2027", json_schema_extra={"example": "2026-2027"})
    declared_programme: str = Field("ENGINEERING_AND_TECHNOLOGY", json_schema_extra={"example": "ENGINEERING_AND_TECHNOLOGY"})
    declared_course: str = Field("Computer Science & Engineering", json_schema_extra={"example": "Computer Science & Engineering"})
    declared_intake: int = Field(120, json_schema_extra={"example": 120})
    declared_land_acres: Optional[float] = 8.25

class ApplicationResponse(BaseModel):
    id: int
    application_number: str
    tracking_id: Optional[str] = None
    institution_id: int
    category: str
    academic_year: str
    status: str
    declared_programme: str
    declared_course: str
    declared_intake: int
    declared_land_acres: float
    institution: InstitutionResponse
    documents_count: int = 0
    findings_count: int = 0
    final_decision: Optional[str] = None
    decided_by: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# --- Document Checklist & Scrutiny Report Schemas ---
class DocumentChecklistItem(BaseModel):
    category_code: str
    document_name: str
    is_mandatory: bool
    is_submitted: bool
    document_id: Optional[int] = None
    original_filename: Optional[str] = None
    status: str  # VERIFIED, EXPIRED, UNREADABLE, INCONSISTENT, MISSING, NOT_SUBMITTED, VERIFICATION_UNAVAILABLE
    extracted_summary: Optional[str] = None
    validity_info: Optional[str] = None
    verification_result: Optional[str] = None
    verification_source: Optional[str] = None
    verification_evidence: Optional[str] = None
    stream_url: Optional[str] = None


class ScrutinyReportGrouped(BaseModel):
    passed_checks: List[CheckResultResponse] = []
    issues_requiring_correction: List[CheckResultResponse] = []
    items_requiring_officer_review: List[CheckResultResponse] = []
    checks_could_not_be_completed: List[CheckResultResponse] = []


class DeficiencyNoticePayload(BaseModel):
    finding_ids: Optional[List[int]] = []
    document_categories: Optional[List[str]] = []
    instructions: str
    officer_name: Optional[str] = "Officer"


class ActiveDeficiencyNoticeResponse(BaseModel):
    is_active: bool = True
    instructions: str
    issued_by: str
    issued_at: datetime.datetime
    requested_categories: List[str] = []
    finding_ids: List[int] = []


class ApplicationDetailResponse(ApplicationResponse):
    documents: List[DocumentResponse] = []
    findings: List[FindingResponse] = []
    reviewer_actions: List[ReviewerActionResponse] = []
    audit_events: List[AuditEventResponse] = []
    scrutiny_runs: List[ScrutinyRunResponse] = []
    alerts: List[AlertResponse] = []
    baseline_record: Optional[BaselineRecordResponse] = None
    document_checklist: List[DocumentChecklistItem] = []
    grouped_scrutiny_report: Optional[ScrutinyReportGrouped] = None
    active_deficiency_notice: Optional[ActiveDeficiencyNoticeResponse] = None
