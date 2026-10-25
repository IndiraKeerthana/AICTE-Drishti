from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Alert, AuditEvent

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("")
def list_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "application_id": a.application_id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "status": a.status,
            "created_at": a.created_at
        } for a in alerts
    ]

@router.post("/{id}/acknowledge")
def acknowledge_alert(id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    alert.status = "ACKNOWLEDGED"

    AuditEvent.create_chained(
        db=db,
        application_id=alert.application_id,
        event_type="ALERT_ACKNOWLEDGED",
        details={"alert_id": alert.id, "title": alert.title},
        actor="SCRUTINY_OFFICER"
    )

    db.commit()
    return {"message": "Alert acknowledged.", "id": alert.id, "status": alert.status}
