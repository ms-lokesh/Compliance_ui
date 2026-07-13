from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.database.session import engine, Base, get_db
import app.database.models as models
from app.schemas.schemas import StartAssessmentRequest, StartAssessmentResponse, DashboardResponse
from app.agents.extractor import ExtractionAgent
from app.engines.normalization_engine import NormalizationEngine
from app.engines.compliance_engine import ValidationEngine, GapEngine, RiskEngine, ScoringEngine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Compliance Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

extractor = ExtractionAgent()
normalizer = NormalizationEngine()
validator = ValidationEngine()
gapper = GapEngine()
risker = RiskEngine()
scorer = ScoringEngine()

@app.post("/api/assessment/start")
def start_assessment(req: StartAssessmentRequest, db: Session = Depends(get_db)):
    # 1. Create Assessment DB Record
    tenant = db.query(models.Tenant).filter(models.Tenant.id == req.tenant_id).first()
    if not tenant:
        tenant = models.Tenant(id=req.tenant_id, name="Default Tenant")
        db.add(tenant)
        db.commit()

    assessment = models.Assessment(
        tenant_id=req.tenant_id,
        framework=req.framework,
        criteria=req.criteria,
        connector=req.connector
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    # 2. Extraction
    raw_data = extractor.extract_all_for_connector(req.connector)

    # 3. Normalization
    evidence_list = normalizer.normalize(assessment.id, raw_data)
    for ev in evidence_list:
        db_ev = models.Evidence(**ev)
        db.add(db_ev)
    db.commit()

    # 4. Validation
    control_results = validator.validate(evidence_list)
    for cid, status in control_results.items():
        db_cr = models.ControlResult(assessment_id=assessment.id, control_id=cid, status=status)
        db.add(db_cr)
    db.commit()

    # 5. Gap Analysis
    gaps = gapper.analyze(control_results, evidence_list)
    
    # 6. Risk Scoring
    risks = risker.calculate(gaps)
    
    # DB persist gaps and risks (Simplified for MVP)
    risk_count = len(risks)
    
    # 7. Compliance Score
    score_data = scorer.calculate_score(control_results)

    # 8. Store Dashboard Summary
    summary = models.DashboardSummary(
        assessment_id=assessment.id,
        overall_score=score_data["overall_score"],
        passed_controls=score_data["passed"],
        partial_controls=score_data["partial"],
        failed_controls=score_data["failed"],
        evidence_count=len(evidence_list),
        risk_count=risk_count
    )
    db.add(summary)
    
    assessment.status = "Completed"
    db.commit()

    return {
        "assessment_id": assessment.id, 
        "status": "Completed",
        "_responseData": {
            "score": score_data["overall_score"],
            "passed": score_data["passed"],
            "failed": score_data["failed"],
            "partial": score_data["partial"],
            "findings": []
        }
    }

@app.get("/api/dashboard/{assessment_id}", response_model=DashboardResponse)
def get_dashboard(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    summary = assessment.dashboard_summary
    if not summary:
        raise HTTPException(status_code=404, detail="Dashboard data not ready")

    # Fetch Controls
    controls_db = db.query(models.ControlResult).filter(models.ControlResult.assessment_id == assessment_id).all()
    controls_list = [{"control_id": c.control_id, "status": c.status} for c in controls_db]

    return {
        "assessment_id": assessment.id,
        "framework": assessment.framework,
        "criteria": assessment.criteria,
        "overall_score": summary.overall_score,
        "passed_controls": summary.passed_controls,
        "partial_controls": summary.partial_controls,
        "failed_controls": summary.failed_controls,
        "evidence_count": summary.evidence_count,
        "risk_count": summary.risk_count,
        "top_risks": [], # Simplified MVP return
        "recent_activities": [],
        "controls": controls_list
    }
