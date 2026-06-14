"""
SQLAlchemy ORM models for NeuroDetect backend.
Tables:
  - patients          : demographic & clinical survey data
  - game_mmse         : MMSE Series-of-7s results
  - game_memory       : Grocery-list memory recall results
  - game_naming       : Boston Naming Test results
  - game_nback        : N-Back Recall results
  - game_trail        : Trail Making Test results
  - assessments       : Combined risk scores + DL model prediction
"""

from sqlalchemy import (
    Column, Integer, Float, String, Boolean,
    DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class RiskLevel(str, enum.Enum):
    NORMAL = "Normal"
    SCD = "Subjective Cognitive Decline"
    MCI = "Mild Cognitive Impairment"
    MODERATE = "Moderate Alzheimer's Risk"
    SEVERE = "Severe / High Alzheimer's Risk"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ── Basic Demographics ──────────────────────────────────────────────────
    name = Column(String(120), nullable=False)
    age = Column(Integer, nullable=False)
    phone = Column(String(20), nullable=True)
    sex = Column(String(20), nullable=False)        # Male / Female / Others / PNTS
    education = Column(String(40), nullable=False)  # no_education / primary / secondary / graduate / postgraduate
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    family_history_alzheimers = Column(Boolean, default=False)

    # ── Vitals ─────────────────────────────────────────────────────────────
    bp_systolic = Column(Integer, nullable=True)
    bp_diastolic = Column(Integer, nullable=True)
    glucose_level = Column(Float, nullable=True)    # mg/dL
    cholesterol = Column(Float, nullable=True)       # mg/dL

    # ── Sleep Cycle Score (Q11-Q15, max 20 points, higher = worse sleep) ──
    sleep_q11_latency = Column(Integer, default=0)   # 0-3
    sleep_q12_duration = Column(Integer, default=0)  # 0-4  (inverted: <5h=4)
    sleep_q13_wakeups = Column(Integer, default=0)   # 0-3
    sleep_q14_return = Column(Integer, default=0)    # 0-4  (inverted: very hard=4)
    sleep_q15_refreshed = Column(Integer, default=0) # 0-4  (inverted: never=4)
    sleep_score_raw = Column(Integer, default=0)     # 0-18, computed

    # ── PHQ-9 Depression (Q16-Q24, 0-27) ──────────────────────────────────
    phq_q16 = Column(Integer, default=0)
    phq_q17 = Column(Integer, default=0)
    phq_q18 = Column(Integer, default=0)
    phq_q19 = Column(Integer, default=0)
    phq_q20 = Column(Integer, default=0)
    phq_q21 = Column(Integer, default=0)
    phq_q22 = Column(Integer, default=0)
    phq_q23 = Column(Integer, default=0)
    phq_q24 = Column(Integer, default=0)
    depression_score = Column(Integer, default=0)    # 0-27, computed

    # ── GAD-7 Anxiety (Q25-Q31, 0-21) ─────────────────────────────────────
    gad_q25 = Column(Integer, default=0)
    gad_q26 = Column(Integer, default=0)
    gad_q27 = Column(Integer, default=0)
    gad_q28 = Column(Integer, default=0)
    gad_q29 = Column(Integer, default=0)
    gad_q30 = Column(Integer, default=0)
    gad_q31 = Column(Integer, default=0)
    anxiety_score = Column(Integer, default=0)       # 0-21, computed

    # ── Derived Patient Risk Score (0-100) ─────────────────────────────────
    patient_risk_score = Column(Float, default=0.0)

    # ── Relationships ──────────────────────────────────────────────────────
    game_mmse = relationship("GameMMSE", back_populates="patient", uselist=False)
    game_memory = relationship("GameMemory", back_populates="patient", uselist=False)
    game_naming = relationship("GameNaming", back_populates="patient", uselist=False)
    game_nback = relationship("GameNBack", back_populates="patient", uselist=False)
    game_trail = relationship("GameTrail", back_populates="patient", uselist=False)
    assessment = relationship("Assessment", back_populates="patient", uselist=False)


# ── Game 1: MMSE Series of 7s ───────────────────────────────────────────────
class GameMMSE(Base):
    __tablename__ = "game_mmse"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True)
    played_at = Column(DateTime(timezone=True), server_default=func.now())

    overall_mmse_score = Column(Float, nullable=False)    # 0-30  (higher=better)
    orientation_score = Column(Float, default=0)          # 0-10
    attention_score = Column(Float, default=0)            # 0-5
    recall_score = Column(Float, default=0)               # 0-3
    language_score = Column(Float, default=0)             # 0-8
    question_accuracy = Column(Float, default=0)          # 0-100 %
    mean_reaction_time = Column(Float, default=0)         # seconds
    reaction_time_variance = Column(Float, default=0)     # seconds²
    hesitation_duration = Column(Float, default=0)        # seconds
    correction_frequency = Column(Float, default=0)       # 0-1 ratio
    skip_frequency = Column(Float, default=0)             # 0-1 ratio
    confidence_variability = Column(Float, default=0)     # 0-1
    completion_time = Column(Float, default=0)            # seconds
    error_recovery_time = Column(Float, default=0)        # seconds

    # Derived risk score (0-100, higher = higher risk)
    game_risk_score = Column(Float, default=0.0)

    patient = relationship("Patient", back_populates="game_mmse")


# ── Game 2: Grocery List Memory Recall ─────────────────────────────────────
class GameMemory(Base):
    __tablename__ = "game_memory"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True)
    played_at = Column(DateTime(timezone=True), server_default=func.now())

    immediate_recall_accuracy = Column(Float, default=0)  # 0-100 %
    delayed_recall_accuracy = Column(Float, default=0)    # 0-100 %
    recognition_accuracy = Column(Float, default=0)       # 0-100 %
    recall_decay_rate = Column(Float, default=0)          # 0-1 ratio
    recall_latency = Column(Float, default=0)             # seconds
    omission_errors = Column(Integer, default=0)          # count
    intrusion_errors = Column(Integer, default=0)         # count
    sequence_recall_accuracy = Column(Float, default=0)   # 0-100 %
    hesitation_duration = Column(Float, default=0)        # seconds
    retry_frequency = Column(Float, default=0)            # 0-1 ratio
    confidence_variability = Column(Float, default=0)     # 0-1
    completion_time = Column(Float, default=0)            # seconds
    memory_consistency_trend = Column(Float, default=0)   # -1 to +1

    game_risk_score = Column(Float, default=0.0)

    patient = relationship("Patient", back_populates="game_memory")


# ── Game 3: Boston Naming Test ──────────────────────────────────────────────
class GameNaming(Base):
    __tablename__ = "game_naming"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True)
    played_at = Column(DateTime(timezone=True), server_default=func.now())

    naming_accuracy = Column(Float, default=0)            # 0-100 %
    response_latency = Column(Float, default=0)           # seconds
    semantic_error_frequency = Column(Float, default=0)   # 0-1 ratio
    phonemic_error_frequency = Column(Float, default=0)   # 0-1 ratio
    cue_dependency_rate = Column(Float, default=0)        # 0-1 ratio
    no_response_frequency = Column(Float, default=0)      # 0-1 ratio
    typing_speed = Column(Float, default=0)               # chars/sec
    hesitation_duration = Column(Float, default=0)        # seconds
    correction_frequency = Column(Float, default=0)       # 0-1 ratio
    confidence_variability = Column(Float, default=0)     # 0-1
    time_per_image = Column(Float, default=0)             # seconds

    game_risk_score = Column(Float, default=0.0)

    patient = relationship("Patient", back_populates="game_naming")


# ── Game 4: N-Back Recall ────────────────────────────────────────────────────
class GameNBack(Base):
    __tablename__ = "game_nback"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True)
    played_at = Column(DateTime(timezone=True), server_default=func.now())

    nback_accuracy = Column(Float, default=0)             # 0-100 %
    false_positive_rate = Column(Float, default=0)        # 0-1 ratio
    missed_target_rate = Column(Float, default=0)         # 0-1 ratio
    mean_reaction_time = Column(Float, default=0)         # seconds
    reaction_time_variance = Column(Float, default=0)     # seconds²
    sustained_attention_score = Column(Float, default=0)  # 0-100
    attention_drift = Column(Float, default=0)            # 0-1 ratio
    hesitation_duration = Column(Float, default=0)        # seconds
    idle_time = Column(Float, default=0)                  # seconds
    fatigue_progression = Column(Float, default=0)        # 0-1 (error rate increase)
    confidence_variability = Column(Float, default=0)     # 0-1
    completion_time = Column(Float, default=0)            # seconds

    game_risk_score = Column(Float, default=0.0)

    patient = relationship("Patient", back_populates="game_nback")


# ── Game 5: Trail Making Test ────────────────────────────────────────────────
class GameTrail(Base):
    __tablename__ = "game_trail"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True)
    played_at = Column(DateTime(timezone=True), server_default=func.now())

    completion_time = Column(Float, default=0)            # seconds
    path_efficiency = Column(Float, default=0)            # 0-1 ratio
    sequence_accuracy = Column(Float, default=0)          # 0-100 %
    switching_delay = Column(Float, default=0)            # seconds
    backtracking_frequency = Column(Float, default=0)     # 0-1 ratio
    rule_violation_count = Column(Integer, default=0)     # count
    hesitation_duration = Column(Float, default=0)        # seconds
    error_recovery_time = Column(Float, default=0)        # seconds
    cursor_movement_entropy = Column(Float, default=0)    # bits
    trajectory_deviation = Column(Float, default=0)       # 0-1
    tremor_jitter_frequency = Column(Float, default=0)    # Hz
    confidence_variability = Column(Float, default=0)     # 0-1

    game_risk_score = Column(Float, default=0.0)

    patient = relationship("Patient", back_populates="game_trail")


# ── Final Assessment ─────────────────────────────────────────────────────────
class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True)
    assessed_at = Column(DateTime(timezone=True), server_default=func.now())

    # The 6-feature vector fed into the DL model
    patient_risk_score = Column(Float)      # 0-100
    mmse_risk_score = Column(Float)         # 0-100
    memory_risk_score = Column(Float)       # 0-100
    naming_risk_score = Column(Float)       # 0-100
    nback_risk_score = Column(Float)        # 0-100
    trail_risk_score = Column(Float)        # 0-100

    # Composite score (weighted average)
    composite_score = Column(Float)         # 0-100

    # DL model output
    predicted_class = Column(Integer)       # 0-4
    risk_level = Column(String(60))         # RiskLevel enum value
    confidence = Column(Float)              # 0-1
    class_probabilities = Column(Text)      # JSON string [p0, p1, p2, p3, p4]

    # Per-contributor weights (for report)
    recommendation = Column(Text)

    patient = relationship("Patient", back_populates="assessment")
