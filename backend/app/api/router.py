from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.applications import router as applications_router
from app.api.documents import router as documents_router
from app.api.findings import router as findings_router
from app.api.audit import router as audit_router
from app.api.integration import router as integration_router
from app.api.alerts import router as alerts_router
from app.api.runs import router as runs_router
from app.api.decision import router as decision_router
from app.api.evaluation import router as evaluation_router
from app.api.auth import router as auth_router
from app.api.rules import router as rules_router
from app.api.admin import router as admin_router

api_router = APIRouter(prefix="/api")

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(rules_router)
api_router.include_router(admin_router)
api_router.include_router(applications_router)
api_router.include_router(documents_router)
api_router.include_router(findings_router)
api_router.include_router(audit_router)
api_router.include_router(integration_router)
api_router.include_router(alerts_router)
api_router.include_router(runs_router)
api_router.include_router(decision_router)
api_router.include_router(evaluation_router)

