"""
Pydantic schemas for request validation and API responses.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


# ── Patient ──────────────────────────────────────────────────────────────────

class SleepData(BaseModel):
    """Q11-Q15 mapped to 0-based risk points (higher = worse)."""
    q11_latency: int = Field(0, ge=0, le=3,
        description="0=<10min, 1=10-20min, 2=20-30min, 3=>30min")
    q12_duration: int = Field(0, ge=0, le=4,
        description="0=>8h, 1=7-8h, 2=6-7h, 3=5-6h, 4=<5h")
    q13_wakeups: int = Field(0, ge=0, le=3,
        description="0=Never, 1=1-2x, 2=3-4x, 3=>4x")
    q14_return: int = Field(0, ge=0, le=4,
        description="0=VeryEasy, 1=Easy, 2=Moderate, 3=Difficult, 4=VeryDifficult")
    q15_refreshed: int = Field(0, ge=0, le=4,
        description="0=Always, 1=Often, 2=Sometimes, 3=Rarely, 4=Never")


class DepressionData(BaseModel):
    """PHQ-9 responses (Q16-Q24), each 0-3."""
    q16: int = Field(0, ge=0, le=3)
    q17: int = Field(0, ge=0, le=3)
    q18: int = Field(0, ge=0, le=3)
    q19: int = Field(0, ge=0, le=3)
    q20: int = Field(0, ge=0, le=3)
    q21: int = Field(0, ge=0, le=3)
    q22: int = Field(0, ge=0, le=3)
    q23: int = Field(0, ge=0, le=3)
    q24: int = Field(0, ge=0, le=3)


class AnxietyData(BaseModel):
    """GAD-7 responses (Q25-Q31), each 0-3."""
    q25: int = Field(0, ge=0, le=3)
    q26: int = Field(0, ge=0, le=3)
    q27: int = Field(0, ge=0, le=3)
    q28: int = Field(0, ge=0, le=3)
    q29: int = Field(0, ge=0, le=3)
    q30: int = Field(0, ge=0, le=3)
    q31: int = Field(0, ge=0, le=3)


class PatientCreate(BaseModel):
    name: str
    age: int = Field(..., ge=18, le=110)
    phone: Optional[str] = None
    sex: str = Field(..., description="Male / Female / Others / Prefer not to say")
    education: str = Field(..., description="no_education / primary / secondary / graduate / postgraduate")
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    family_history_alzheimers: bool = False
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    glucose_level: Optional[float] = None
    cholesterol: Optional[float] = None
    sleep: SleepData = SleepData()
    depression: DepressionData = DepressionData()
    anxiety: AnxietyData = AnxietyData()


class PatientOut(BaseModel):
    id: int
    name: str
    age: int
    sex: str
    education: str
    family_history_alzheimers: bool
    depression_score: int
    anxiety_score: int
    sleep_score_raw: int
    patient_risk_score: float
    created_at: datetime

    class Config:
        from_attributes = True


# ── Games ─────────────────────────────────────────────────────────────────────

class GameMMSECreate(BaseModel):
    patient_id: int
    overall_mmse_score: float = Field(..., ge=0, le=30)
    orientation_score: float = Field(0, ge=0, le=10)
    attention_score: float = Field(0, ge=0, le=5)
    recall_score: float = Field(0, ge=0, le=3)
    language_score: float = Field(0, ge=0, le=8)
    question_accuracy: float = Field(0, ge=0, le=100)
    mean_reaction_time: float = Field(0, ge=0)
    reaction_time_variance: float = Field(0, ge=0)
    hesitation_duration: float = Field(0, ge=0)
    correction_frequency: float = Field(0, ge=0, le=1)
    skip_frequency: float = Field(0, ge=0, le=1)
    confidence_variability: float = Field(0, ge=0, le=1)
    completion_time: float = Field(0, ge=0)
    error_recovery_time: float = Field(0, ge=0)


class GameMemoryCreate(BaseModel):
    patient_id: int
    immediate_recall_accuracy: float = Field(0, ge=0, le=100)
    delayed_recall_accuracy: float = Field(0, ge=0, le=100)
    recognition_accuracy: float = Field(0, ge=0, le=100)
    recall_decay_rate: float = Field(0, ge=0, le=1)
    recall_latency: float = Field(0, ge=0)
    omission_errors: int = Field(0, ge=0)
    intrusion_errors: int = Field(0, ge=0)
    sequence_recall_accuracy: float = Field(0, ge=0, le=100)
    hesitation_duration: float = Field(0, ge=0)
    retry_frequency: float = Field(0, ge=0, le=1)
    confidence_variability: float = Field(0, ge=0, le=1)
    completion_time: float = Field(0, ge=0)
    memory_consistency_trend: float = Field(0, ge=-1, le=1)


class GameNamingCreate(BaseModel):
    patient_id: int
    naming_accuracy: float = Field(0, ge=0, le=100)
    response_latency: float = Field(0, ge=0)
    semantic_error_frequency: float = Field(0, ge=0, le=1)
    phonemic_error_frequency: float = Field(0, ge=0, le=1)
    cue_dependency_rate: float = Field(0, ge=0, le=1)
    no_response_frequency: float = Field(0, ge=0, le=1)
    typing_speed: float = Field(0, ge=0)
    hesitation_duration: float = Field(0, ge=0)
    correction_frequency: float = Field(0, ge=0, le=1)
    confidence_variability: float = Field(0, ge=0, le=1)
    time_per_image: float = Field(0, ge=0)


class GameNBackCreate(BaseModel):
    patient_id: int
    nback_accuracy: float = Field(0, ge=0, le=100)
    false_positive_rate: float = Field(0, ge=0, le=1)
    missed_target_rate: float = Field(0, ge=0, le=1)
    mean_reaction_time: float = Field(0, ge=0)
    reaction_time_variance: float = Field(0, ge=0)
    sustained_attention_score: float = Field(0, ge=0, le=100)
    attention_drift: float = Field(0, ge=0, le=1)
    hesitation_duration: float = Field(0, ge=0)
    idle_time: float = Field(0, ge=0)
    fatigue_progression: float = Field(0, ge=0, le=1)
    confidence_variability: float = Field(0, ge=0, le=1)
    completion_time: float = Field(0, ge=0)


class GameTrailCreate(BaseModel):
    patient_id: int
    completion_time: float = Field(0, ge=0)
    path_efficiency: float = Field(0, ge=0, le=1)
    sequence_accuracy: float = Field(0, ge=0, le=100)
    switching_delay: float = Field(0, ge=0)
    backtracking_frequency: float = Field(0, ge=0, le=1)
    rule_violation_count: int = Field(0, ge=0)
    hesitation_duration: float = Field(0, ge=0)
    error_recovery_time: float = Field(0, ge=0)
    cursor_movement_entropy: float = Field(0, ge=0)
    trajectory_deviation: float = Field(0, ge=0, le=1)
    tremor_jitter_frequency: float = Field(0, ge=0)
    confidence_variability: float = Field(0, ge=0, le=1)


class GameScoreOut(BaseModel):
    game_risk_score: float
    message: str


# ── Assessment ────────────────────────────────────────────────────────────────

class AssessmentOut(BaseModel):
    id: int
    patient_id: int
    patient_risk_score: float
    mmse_risk_score: float
    memory_risk_score: float
    naming_risk_score: float
    nback_risk_score: float
    trail_risk_score: float
    composite_score: float
    predicted_class: int
    risk_level: str
    confidence: float
    class_probabilities: str   # JSON array string
    recommendation: str
    assessed_at: datetime

    class Config:
        from_attributes = True
