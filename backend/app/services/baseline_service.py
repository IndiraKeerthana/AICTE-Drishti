from sqlalchemy.orm import Session
from app.models import Institution, BaselineRecord

def ensure_baseline_records(db: Session, aicte_id: str, inst_name: str) -> Institution:
    """
    Ensures an institution and its synthetic ground-truth baseline record exist.
    Default synthetic case: Sample Institute of Technology has approved intake = 60.
    """
    institution = db.query(Institution).filter(Institution.aicte_permanent_id == aicte_id).first()
    if not institution:
        institution = Institution(
            aicte_permanent_id=aicte_id,
            name=inst_name,
            institution_type="TECHNICAL_INSTITUTE",
            address="Sample Campus, Sector 4, Katraj",
            state="Maharashtra",
            district="Pune",
        )
        db.add(institution)
        db.flush()

    # Check if baseline record exists
    baseline = db.query(BaselineRecord).filter(
        BaselineRecord.institution_id == institution.id,
        BaselineRecord.record_type == "APPROVED_INTAKE"
    ).first()

    if not baseline:
        baseline = BaselineRecord(
            institution_id=institution.id,
            record_type="APPROVED_INTAKE",
            academic_year="2025-2026",
            programme="ENGINEERING_AND_TECHNOLOGY",
            course="Computer Science & Engineering",
            approved_intake=60,  # Baseline approved intake is 60
            source_system="AICTE_CENTRAL_DB (SYNTHETIC)",
            is_simulated=True
        )
        db.add(baseline)
        db.flush()

    db.commit()
    return institution

def get_institution_baseline(db: Session, institution_id: int) -> BaselineRecord | None:
    return db.query(BaselineRecord).filter(
        BaselineRecord.institution_id == institution_id,
        BaselineRecord.record_type == "APPROVED_INTAKE"
    ).first()


def ensure_default_users(db: Session):
    from app.models import User
    default_users = [
        {
            "username": "officer1",
            "full_name": "Dr. V. Sharma",
            "role": "OFFICER",
            "designation": "AICTE Scrutiny Officer",
            "email": "v.sharma@aicte-india.org",
            "institution_id": None
        },
        {
            "username": "approver1",
            "full_name": "Prof. R. K. Verma",
            "role": "APPROVER",
            "designation": "Competent Authority / Regional Officer",
            "email": "rk.verma@aicte-india.org",
            "institution_id": None
        },
        {
            "username": "admin1",
            "full_name": "AICTE System Administrator",
            "role": "ADMIN",
            "designation": "Portal & Regulatory Administrator",
            "email": "admin@aicte-india.org",
            "institution_id": None
        },
        {
            "username": "inst_9988",
            "full_name": "Sample Institute Registrar",
            "role": "APPLICANT",
            "designation": "Authorized Institutional Representative",
            "email": "registrar@sample-tech.edu",
            "institution_id": "1-9988776655"
        }
    ]

    for u in default_users:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if not existing:
            user = User(
                username=u["username"],
                full_name=u["full_name"],
                role=u["role"],
                designation=u["designation"],
                email=u["email"],
                institution_id=u["institution_id"],
                is_active=True
            )
            db.add(user)
    db.commit()

