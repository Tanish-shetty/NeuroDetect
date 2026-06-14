"""
main.py — NeuroDetect FastAPI Backend
──────────────────────────────────────
Start server:  uvicorn main:app --reload --port 8000
API docs:      http://localhost:8000/docs

Endpoints
─────────
POST /patients/                    Create patient record (runs scoring)
GET  /patients/{id}                Fetch patient profile
POST /games/mmse                   Submit MMSE game results
POST /games/memory                 Submit Memory Recall game results
POST /games/naming                 Submit Boston Naming Test results
POST /games/nback                  Submit N-Back Recall results
POST /games/trail                  Submit Trail Making Test results
POST /assess/{patient_id}          Run DL model → generate final assessment
GET  /assess/{patient_id}          Fetch assessment report
GET  /health                       Server health check
GET  /model/status                 Is DL model trained & ready?
POST /model/train                  (Admin) Trigger model re-training
"""

import json
import os
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import scoring
import ml_model
from database import engine, get_db

# ── Init ─────────────────────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NeuroDetect API",
    description="Early Alzheimer's & Pseudo-Dementia Detection Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ════════════════════════════════════════════════════════════════════════════
#  HEALTH
# ════════════════════════════════════════════════════════════════════════════

@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/model/status", tags=["System"])
def model_status():
    ready = ml_model.is_model_ready()
    return {
        "model_ready": ready,
        "model_path":  ml_model.MODEL_PATH,
        "scaler_path": ml_model.SCALER_PATH,
    }


@app.post("/model/train", tags=["System"])
def trigger_training(background_tasks: BackgroundTasks):
    """Kick off model training in the background."""
    background_tasks.add_task(_run_training)
    return {"message": "Model training started in background."}


def _run_training():
    from dataset_generator import save_datasets
    save_datasets()
    ml_model.train()


# ════════════════════════════════════════════════════════════════════════════
#  PATIENT
# ════════════════════════════════════════════════════════════════════════════

@app.post("/patients/", response_model=schemas.PatientOut, tags=["Patient"])
def create_patient(payload: schemas.PatientCreate, db: Session = Depends(get_db)):
    """
    Creates a patient record, computes sleep/depression/anxiety sub-scores,
    and derives the patient-level risk score (0-100).
    """
    # Compute derived scores
    sleep_data = payload.sleep.dict()
    dep_data   = {f"q{i}": getattr(payload.depression, f"q{i}") for i in range(16, 25)}
    anx_data   = {f"q{i}": getattr(payload.anxiety,    f"q{i}") for i in range(25, 32)}

    sleep_raw  = scoring.compute_sleep_score(sleep_data)
    dep_score  = scoring.compute_depression_score(dep_data)
    anx_score  = scoring.compute_anxiety_score(anx_data)

    patient_dict = payload.dict()
    patient_dict.update({
        "sleep_score_raw":   sleep_raw,
        "depression_score":  dep_score,
        "anxiety_score":     anx_score,
    })

    patient_risk = scoring.score_patient({
        "age":                      payload.age,
        "education":                payload.education,
        "family_history_alzheimers":payload.family_history_alzheimers,
        "bp_systolic":              payload.bp_systolic,
        "glucose_level":            payload.glucose_level,
        "cholesterol":              payload.cholesterol,
        "height_cm":                payload.height_cm,
        "weight_kg":                payload.weight_kg,
        "sleep_score_raw":          sleep_raw,
        "depression_score":         dep_score,
        "anxiety_score":            anx_score,
    })

    db_patient = models.Patient(
        name=payload.name,
        age=payload.age,
        phone=payload.phone,
        sex=payload.sex,
        education=payload.education,
        height_cm=payload.height_cm,
        weight_kg=payload.weight_kg,
        family_history_alzheimers=payload.family_history_alzheimers,
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic,
        glucose_level=payload.glucose_level,
        cholesterol=payload.cholesterol,
        # Sleep
        sleep_q11_latency=payload.sleep.q11_latency,
        sleep_q12_duration=payload.sleep.q12_duration,
        sleep_q13_wakeups=payload.sleep.q13_wakeups,
        sleep_q14_return=payload.sleep.q14_return,
        sleep_q15_refreshed=payload.sleep.q15_refreshed,
        sleep_score_raw=sleep_raw,
        # Depression
        phq_q16=payload.depression.q16,
        phq_q17=payload.depression.q17,
        phq_q18=payload.depression.q18,
        phq_q19=payload.depression.q19,
        phq_q20=payload.depression.q20,
        phq_q21=payload.depression.q21,
        phq_q22=payload.depression.q22,
        phq_q23=payload.depression.q23,
        phq_q24=payload.depression.q24,
        depression_score=dep_score,
        # Anxiety
        gad_q25=payload.anxiety.q25,
        gad_q26=payload.anxiety.q26,
        gad_q27=payload.anxiety.q27,
        gad_q28=payload.anxiety.q28,
        gad_q29=payload.anxiety.q29,
        gad_q30=payload.anxiety.q30,
        gad_q31=payload.anxiety.q31,
        anxiety_score=anx_score,
        # Risk score
        patient_risk_score=patient_risk,
    )

    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@app.get("/patients/{patient_id}", response_model=schemas.PatientOut, tags=["Patient"])
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


# ════════════════════════════════════════════════════════════════════════════
#  GAMES
# ════════════════════════════════════════════════════════════════════════════

def _get_patient_or_404(patient_id: int, db: Session) -> models.Patient:
    p = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return p


@app.post("/games/mmse", response_model=schemas.GameScoreOut, tags=["Games"])
def submit_mmse(payload: schemas.GameMMSECreate, db: Session = Depends(get_db)):
    _get_patient_or_404(payload.patient_id, db)
    risk = scoring.score_game_mmse(payload.dict())

    existing = db.query(models.GameMMSE).filter(
        models.GameMMSE.patient_id == payload.patient_id).first()
    if existing:
        for k, v in payload.dict().items():
            setattr(existing, k, v)
        existing.game_risk_score = risk
    else:
        db.add(models.GameMMSE(**payload.dict(), game_risk_score=risk))

    db.commit()
    return {"game_risk_score": risk, "message": "MMSE game data recorded."}


@app.post("/games/memory", response_model=schemas.GameScoreOut, tags=["Games"])
def submit_memory(payload: schemas.GameMemoryCreate, db: Session = Depends(get_db)):
    _get_patient_or_404(payload.patient_id, db)
    risk = scoring.score_game_memory(payload.dict())

    existing = db.query(models.GameMemory).filter(
        models.GameMemory.patient_id == payload.patient_id).first()
    if existing:
        for k, v in payload.dict().items():
            setattr(existing, k, v)
        existing.game_risk_score = risk
    else:
        db.add(models.GameMemory(**payload.dict(), game_risk_score=risk))

    db.commit()
    return {"game_risk_score": risk, "message": "Memory game data recorded."}


@app.post("/games/naming", response_model=schemas.GameScoreOut, tags=["Games"])
def submit_naming(payload: schemas.GameNamingCreate, db: Session = Depends(get_db)):
    _get_patient_or_404(payload.patient_id, db)
    risk = scoring.score_game_naming(payload.dict())

    existing = db.query(models.GameNaming).filter(
        models.GameNaming.patient_id == payload.patient_id).first()
    if existing:
        for k, v in payload.dict().items():
            setattr(existing, k, v)
        existing.game_risk_score = risk
    else:
        db.add(models.GameNaming(**payload.dict(), game_risk_score=risk))

    db.commit()
    return {"game_risk_score": risk, "message": "Boston Naming Test data recorded."}


@app.post("/games/nback", response_model=schemas.GameScoreOut, tags=["Games"])
def submit_nback(payload: schemas.GameNBackCreate, db: Session = Depends(get_db)):
    _get_patient_or_404(payload.patient_id, db)
    risk = scoring.score_game_nback(payload.dict())

    existing = db.query(models.GameNBack).filter(
        models.GameNBack.patient_id == payload.patient_id).first()
    if existing:
        for k, v in payload.dict().items():
            setattr(existing, k, v)
        existing.game_risk_score = risk
    else:
        db.add(models.GameNBack(**payload.dict(), game_risk_score=risk))

    db.commit()
    return {"game_risk_score": risk, "message": "N-Back game data recorded."}


@app.post("/games/trail", response_model=schemas.GameScoreOut, tags=["Games"])
def submit_trail(payload: schemas.GameTrailCreate, db: Session = Depends(get_db)):
    _get_patient_or_404(payload.patient_id, db)
    risk = scoring.score_game_trail(payload.dict())

    existing = db.query(models.GameTrail).filter(
        models.GameTrail.patient_id == payload.patient_id).first()
    if existing:
        for k, v in payload.dict().items():
            setattr(existing, k, v)
        existing.game_risk_score = risk
    else:
        db.add(models.GameTrail(**payload.dict(), game_risk_score=risk))

    db.commit()
    return {"game_risk_score": risk, "message": "Trail Making Test data recorded."}


# ════════════════════════════════════════════════════════════════════════════
#  ASSESSMENT  (run DL model)
# ════════════════════════════════════════════════════════════════════════════

RECOMMENDATIONS = {
    0: ("Normal",
        "No significant cognitive risk indicators detected. Maintain an active lifestyle, "
        "engage in mental exercises, eat a Mediterranean diet, and schedule annual check-ups."),
    1: ("Subjective Cognitive Decline",
        "Mild self-reported cognitive concerns detected, but within the normal clinical range. "
        "Consider lifestyle optimisation (sleep, exercise, diet). Follow-up assessment in 6 months recommended."),
    2: ("Mild Cognitive Impairment",
        "Objective evidence of cognitive decline beyond normal ageing. Formal neuropsychological "
        "evaluation and neurologist consultation strongly advised. Early intervention can slow progression."),
    3: ("Moderate Alzheimer's Risk",
        "Significant cognitive deficits identified across multiple domains. Urgent referral to a "
        "memory clinic is recommended. Caregiver support and safety planning should be discussed."),
    4: ("Severe / High Alzheimer's Risk",
        "Extensive multi-domain cognitive impairment detected. Immediate clinical evaluation, "
        "brain imaging (MRI/PET), and specialist care are required. Begin care coordination now."),
}


@app.post("/assess/{patient_id}", response_model=schemas.AssessmentOut, tags=["Assessment"])
def run_assessment(patient_id: int, db: Session = Depends(get_db)):
    """
    Pulls all 5 game risk scores + patient risk score → feeds into DL model →
    saves and returns the complete risk assessment.
    Requires all 5 games to be completed first.
    """
    p = _get_patient_or_404(patient_id, db)

    # Validate all games are completed
    missing = []
    if not p.game_mmse:    missing.append("MMSE")
    if not p.game_memory:  missing.append("Memory Recall")
    if not p.game_naming:  missing.append("Boston Naming Test")
    if not p.game_nback:   missing.append("N-Back Recall")
    if not p.game_trail:   missing.append("Trail Making Test")

    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Assessment incomplete. Missing games: {', '.join(missing)}"
        )

    # Collect risk scores
    patient_risk = p.patient_risk_score
    mmse_risk    = p.game_mmse.game_risk_score
    memory_risk  = p.game_memory.game_risk_score
    naming_risk  = p.game_naming.game_risk_score
    nback_risk   = p.game_nback.game_risk_score
    trail_risk   = p.game_trail.game_risk_score

    # Run model
    if ml_model.is_model_ready():
        result = ml_model.predict(
            patient_risk, mmse_risk, memory_risk,
            naming_risk, nback_risk, trail_risk
        )
        predicted_class = result["predicted_class"]
        confidence      = result["confidence"]
        probabilities   = result["probabilities"]
        composite       = result["composite_score"]
        risk_level      = result["risk_level"]
    else:
        # Fallback to rule-based classification
        composite = scoring.compute_composite(
            patient_risk, mmse_risk, memory_risk,
            naming_risk, nback_risk, trail_risk
        )
        predicted_class, risk_level, _ = scoring.rule_based_classify(composite)
        confidence  = 1.0
        probabilities = [0.0] * 5
        probabilities[predicted_class] = 1.0

    _, recommendation = RECOMMENDATIONS.get(
        predicted_class, (risk_level, "Consult a specialist."))

    # Upsert assessment
    existing = db.query(models.Assessment).filter(
        models.Assessment.patient_id == patient_id).first()

    if existing:
        existing.patient_risk_score    = patient_risk
        existing.mmse_risk_score       = mmse_risk
        existing.memory_risk_score     = memory_risk
        existing.naming_risk_score     = naming_risk
        existing.nback_risk_score      = nback_risk
        existing.trail_risk_score      = trail_risk
        existing.composite_score       = composite
        existing.predicted_class       = predicted_class
        existing.risk_level            = risk_level
        existing.confidence            = confidence
        existing.class_probabilities   = json.dumps(probabilities)
        existing.recommendation        = recommendation
        db.commit()
        db.refresh(existing)
        return existing
    else:
        assessment = models.Assessment(
            patient_id           = patient_id,
            patient_risk_score   = patient_risk,
            mmse_risk_score      = mmse_risk,
            memory_risk_score    = memory_risk,
            naming_risk_score    = naming_risk,
            nback_risk_score     = nback_risk,
            trail_risk_score     = trail_risk,
            composite_score      = composite,
            predicted_class      = predicted_class,
            risk_level           = risk_level,
            confidence           = confidence,
            class_probabilities  = json.dumps(probabilities),
            recommendation       = recommendation,
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
        return assessment


@app.get("/assess/{patient_id}", response_model=schemas.AssessmentOut, tags=["Assessment"])
def get_assessment(patient_id: int, db: Session = Depends(get_db)):
    a = db.query(models.Assessment).filter(
        models.Assessment.patient_id == patient_id).first()
    if not a:
        raise HTTPException(status_code=404,
                            detail="No assessment found for this patient. Run POST /assess/{id} first.")
    return a
