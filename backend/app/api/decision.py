import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Application, ReviewerAction, AuditEvent
from app.api.auth import get_current_user, require_role, UserInfo

router = APIRouter(tags=["Officer Final Regulatory Decision"])

class DecisionPayload(BaseModel):
    decision: str = Field(..., json_schema_extra={"example": "RECOMMEND_APPROVAL"}) # RECOMMEND_APPROVAL, RECOMMEND_REJECTION, DEFICIENCY_NOTICE
    justification_remarks: str = Field(..., min_length=10, json_schema_extra={"example": "All statutory checks verified. Recommended for Approval by Scrutiny Committee."})
    officer_name: str | None = Field(None, json_schema_extra={"example": "Prof. R. K. Verma (Competent Authority)"})

@router.post("/applications/{id}/decision")
def record_final_decision(
    id: int,
    payload: DecisionPayload,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_role("OFFICER", "APPROVER", "ADMIN"))
):
    """
    Final Human Authority Decision Boundary:
    Records statutory approval/rejection or deficiency decision.
    Strictly enforced in backend: Applicants are forbidden (403) from recording decisions.
    """

    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    valid_decisions = {"RECOMMEND_APPROVAL", "RECOMMEND_REJECTION", "DEFICIENCY_NOTICE"}
    if payload.decision not in valid_decisions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision '{payload.decision}'. Allowed statutory decisions: {list(valid_decisions)}"
        )

    now_utc = datetime.datetime.now(datetime.timezone.utc)
    deciding_officer = payload.officer_name or current_user.full_name or "Competent Authority"

    app.final_decision = payload.decision
    app.decision_remarks = payload.justification_remarks
    app.decided_by = deciding_officer
    app.decided_at = now_utc

    if payload.decision == "RECOMMEND_APPROVAL":
        app.status = "APPROVED"
    elif payload.decision == "RECOMMEND_REJECTION":
        app.status = "REJECTED"
    elif payload.decision == "DEFICIENCY_NOTICE":
        app.status = "DEFICIENCY_FLAGGED"

    # Record ReviewerAction entry
    action = ReviewerAction(
        application_id=app.id,
        action_type=payload.decision,
        justification_remarks=payload.justification_remarks,
        reviewer_name=deciding_officer,
        created_at=now_utc
    )
    db.add(action)

    # Record Hash-Chained Audit Event
    AuditEvent.create_chained(
        db=db,
        application_id=app.id,
        event_type="OFFICER_FINAL_DECISION_RECORDED",
        details={
            "decision": payload.decision,
            "justification": payload.justification_remarks,
            "officer": deciding_officer,
            "role": current_user.role,
            "resulting_status": app.status
        },
        actor=deciding_officer
    )

    db.commit()
    db.refresh(app)

    return {
        "message": "Regulatory statutory decision recorded successfully.",
        "application_number": app.application_number,
        "status": app.status,
        "final_decision": app.final_decision,
        "decided_by": app.decided_by,
        "decided_at": app.decided_at
    }
