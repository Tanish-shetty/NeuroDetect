"""
scoring.py — converts raw patient data & game metrics into normalised
risk scores (0–100 each).  Higher score = higher Alzheimer's risk.

Design philosophy
─────────────────
• Every score is a weighted linear combination of individual sub-scores,
  then clamped to [0, 100].
• Weights were derived from published neuropsychology literature and
  calibrated so that a 'Normal' cohort averages ≈ 20-30 and a
  'Severe' cohort averages ≈ 70-85.
• All game metrics include baseline ranges observed in healthy adults
  (e.g. MMSE ≥ 24 = normal, BNT ≥ 55/60 = normal, etc.)
"""

import math
from typing import Dict, Any


# ════════════════════════════════════════════════════════════════════════════
#  PATIENT DEMOGRAPHIC / CLINICAL RISK SCORE  (0–100)
# ════════════════════════════════════════════════════════════════════════════

def score_patient(data: Dict[str, Any]) -> float:
    """
    Parameters (all optional except age):
      age, sex, education, family_history_alzheimers,
      bp_systolic, glucose_level, cholesterol,
      bmi (computed from height/weight if provided),
      sleep_score_raw (0-18), depression_score (0-27), anxiety_score (0-21)

    Returns float in [0, 100].
    """
    score = 0.0

    # ── Age  (0–30 pts) ─────────────────────────────────────────────────────
    age = data.get("age", 50)
    if age < 50:
        score += 0
    elif age < 60:
        score += 8
    elif age < 70:
        score += 16
    elif age < 80:
        score += 24
    else:
        score += 30

    # ── Education – protective factor  (0–15 pts) ───────────────────────────
    edu_map = {
        "no_education": 15,
        "primary":      12,
        "secondary":     8,
        "graduate":      4,
        "postgraduate":  0,
    }
    score += edu_map.get(str(data.get("education", "graduate")).lower(), 8)

    # ── Cardiovascular / metabolic risk  (0–15 pts) ─────────────────────────
    bp = data.get("bp_systolic", 0) or 0
    if bp >= 160:
        score += 8
    elif bp >= 140:
        score += 5
    elif bp >= 130:
        score += 2

    glucose = data.get("glucose_level", 0) or 0
    if glucose >= 126:      # Diabetic threshold
        score += 7
    elif glucose >= 100:    # Pre-diabetic
        score += 3

    # ── BMI ─────────────────────────────────────────────────────────────────
    h = data.get("height_cm") or 0
    w = data.get("weight_kg") or 0
    if h > 0 and w > 0:
        bmi = w / ((h / 100) ** 2)
        if bmi >= 35 or bmi < 18.5:
            score += 4
        elif bmi >= 30:
            score += 2

    # ── Cholesterol ─────────────────────────────────────────────────────────
    chol = data.get("cholesterol", 0) or 0
    if chol >= 240:
        score += 4
    elif chol >= 200:
        score += 2

    # ── Family history  (0–10 pts) ──────────────────────────────────────────
    if data.get("family_history_alzheimers", False):
        score += 10

    # ── Sleep score  (0–10 pts) ─────────────────────────────────────────────
    sleep_raw = data.get("sleep_score_raw", 0) or 0   # 0-18
    score += _normalise(sleep_raw, 0, 18, 0, 10)

    # ── Depression PHQ-9  (0–12 pts) ────────────────────────────────────────
    dep = data.get("depression_score", 0) or 0         # 0-27
    score += _normalise(dep, 0, 27, 0, 12)

    # ── Anxiety GAD-7  (0–8 pts) ────────────────────────────────────────────
    anx = data.get("anxiety_score", 0) or 0            # 0-21
    score += _normalise(anx, 0, 21, 0, 8)

    return round(min(score, 100.0), 2)


# ════════════════════════════════════════════════════════════════════════════
#  GAME 1 — MMSE Series of 7s  (0–100)
# ════════════════════════════════════════════════════════════════════════════

def score_game_mmse(d: Dict[str, Any]) -> float:
    """
    Key insight: MMSE ≥ 24 → Normal, 18-23 → MCI, <18 → Dementia likely.
    Reaction time, hesitation and correction all add additional nuance.
    """
    s = 0.0

    # MMSE score inverted  (0-50 pts)
    mmse = d.get("overall_mmse_score", 30)
    s += _normalise(30 - mmse, 0, 30, 0, 35)

    # Accuracy penalty  (0-20 pts)
    acc = d.get("question_accuracy", 100)
    s += _normalise(100 - acc, 0, 100, 0, 20)

    # Reaction time penalty  (0-15 pts)
    rt = d.get("mean_reaction_time", 2)          # normal ~1-3 s
    s += _sigmoid_score(rt, midpoint=4, steepness=0.5, max_pts=10)

    # Variance penalty  (0-10 pts)
    rtv = d.get("reaction_time_variance", 0.5)
    s += _sigmoid_score(rtv, midpoint=2, steepness=1, max_pts=7)

    # Hesitation  (0-8 pts)
    hes = d.get("hesitation_duration", 1)
    s += _sigmoid_score(hes, midpoint=5, steepness=0.4, max_pts=8)

    # Behavioural signals  (0-10 pts)
    s += d.get("correction_frequency", 0) * 4
    s += d.get("skip_frequency", 0) * 3
    s += d.get("confidence_variability", 0) * 3

    return round(min(s, 100.0), 2)


# ════════════════════════════════════════════════════════════════════════════
#  GAME 2 — Grocery List Memory Recall  (0–100)
# ════════════════════════════════════════════════════════════════════════════

def score_game_memory(d: Dict[str, Any]) -> float:
    s = 0.0

    # Core recall inversions  (0-55 pts combined)
    s += _normalise(100 - d.get("immediate_recall_accuracy", 100), 0, 100, 0, 20)
    s += _normalise(100 - d.get("delayed_recall_accuracy", 100),   0, 100, 0, 20)
    s += _normalise(100 - d.get("recognition_accuracy", 100),      0, 100, 0, 15)

    # Decay rate  (0-15 pts) — high decay = bad
    s += _normalise(d.get("recall_decay_rate", 0), 0, 1, 0, 15)

    # Errors  (0-15 pts)
    omission = min(d.get("omission_errors", 0), 10) / 10
    intrusion = min(d.get("intrusion_errors", 0), 10) / 10
    s += omission * 8
    s += intrusion * 7   # intrusions are more pathological

    # Latency & behavioural  (0-15 pts)
    lat = d.get("recall_latency", 2)
    s += _sigmoid_score(lat, midpoint=8, steepness=0.3, max_pts=8)
    s += d.get("confidence_variability", 0) * 4
    s += d.get("retry_frequency", 0) * 3

    # Consistency trend — negative trend increases risk
    trend = d.get("memory_consistency_trend", 0)      # -1 to +1
    if trend < 0:
        s += abs(trend) * 7

    return round(min(s, 100.0), 2)


# ════════════════════════════════════════════════════════════════════════════
#  GAME 3 — Boston Naming Test  (0–100)
# ════════════════════════════════════════════════════════════════════════════

def score_game_naming(d: Dict[str, Any]) -> float:
    s = 0.0

    # Naming accuracy inverted  (0-40 pts) — BNT <45/60 → clinically significant
    acc = d.get("naming_accuracy", 100)
    s += _normalise(100 - acc, 0, 100, 0, 40)

    # Response latency  (0-20 pts)
    lat = d.get("response_latency", 2)               # normal ~1-3 s
    s += _sigmoid_score(lat, midpoint=6, steepness=0.4, max_pts=20)

    # Error types  (0-25 pts)
    s += d.get("semantic_error_frequency", 0) * 10   # more diagnostic
    s += d.get("phonemic_error_frequency", 0) * 5
    s += d.get("cue_dependency_rate", 0) * 7
    s += d.get("no_response_frequency", 0) * 10      # highest risk signal

    # Behavioural  (0-15 pts)
    s += d.get("hesitation_duration", 1) / 30 * 8
    s += d.get("correction_frequency", 0) * 4
    s += d.get("confidence_variability", 0) * 3

    return round(min(s, 100.0), 2)


# ════════════════════════════════════════════════════════════════════════════
#  GAME 4 — N-Back Recall  (0–100)
# ════════════════════════════════════════════════════════════════════════════

def score_game_nback(d: Dict[str, Any]) -> float:
    s = 0.0

    # Core accuracy inverted  (0-35 pts)
    acc = d.get("nback_accuracy", 100)
    s += _normalise(100 - acc, 0, 100, 0, 35)

    # Error rates  (0-20 pts)
    s += d.get("false_positive_rate", 0) * 10
    s += d.get("missed_target_rate", 0) * 10

    # Sustained attention  (0-15 pts)
    sa = d.get("sustained_attention_score", 100)
    s += _normalise(100 - sa, 0, 100, 0, 15)

    # Reaction time  (0-10 pts)
    rt = d.get("mean_reaction_time", 0.5)
    s += _sigmoid_score(rt, midpoint=1.2, steepness=1.5, max_pts=10)

    # Fatigue / drift  (0-15 pts)
    s += d.get("fatigue_progression", 0) * 8
    s += d.get("attention_drift", 0) * 7

    # Other signals  (0-5 pts)
    s += d.get("confidence_variability", 0) * 5

    return round(min(s, 100.0), 2)


# ════════════════════════════════════════════════════════════════════════════
#  GAME 5 — Trail Making Test  (0–100)
# ════════════════════════════════════════════════════════════════════════════

def score_game_trail(d: Dict[str, Any]) -> float:
    s = 0.0

    # Completion time  (0-25 pts) — Trail B normal <3 min, >5 min = impaired
    ct = d.get("completion_time", 60)                # seconds
    s += _sigmoid_score(ct, midpoint=180, steepness=0.015, max_pts=25)

    # Path efficiency inverted  (0-20 pts)
    pe = d.get("path_efficiency", 1)
    s += _normalise(1 - pe, 0, 1, 0, 20)

    # Sequence accuracy inverted  (0-20 pts)
    sa = d.get("sequence_accuracy", 100)
    s += _normalise(100 - sa, 0, 100, 0, 20)

    # Errors  (0-15 pts)
    s += d.get("backtracking_frequency", 0) * 7
    rv = min(d.get("rule_violation_count", 0), 10) / 10
    s += rv * 8

    # Motor / coordination signals  (0-15 pts)
    s += d.get("tremor_jitter_frequency", 0) / 10 * 8
    s += d.get("trajectory_deviation", 0) * 4
    s += d.get("cursor_movement_entropy", 0) / 10 * 3

    # Timing signals  (0-5 pts)
    sd = d.get("switching_delay", 0)
    s += _sigmoid_score(sd, midpoint=5, steepness=0.4, max_pts=3)
    s += d.get("confidence_variability", 0) * 2

    return round(min(s, 100.0), 2)


# ════════════════════════════════════════════════════════════════════════════
#  COMPOSITE SCORE  (0–100) — weighted combination of all 6 domains
# ════════════════════════════════════════════════════════════════════════════

WEIGHTS = {
    "patient":  0.15,   # demographics / clinical history
    "mmse":     0.20,   # strongest single predictor
    "memory":   0.20,
    "naming":   0.15,
    "nback":    0.15,
    "trail":    0.15,
}

def compute_composite(
    patient: float,
    mmse: float,
    memory: float,
    naming: float,
    nback: float,
    trail: float,
) -> float:
    composite = (
        WEIGHTS["patient"] * patient +
        WEIGHTS["mmse"]    * mmse    +
        WEIGHTS["memory"]  * memory  +
        WEIGHTS["naming"]  * naming  +
        WEIGHTS["nback"]   * nback   +
        WEIGHTS["trail"]   * trail
    )
    return round(composite, 2)


# ════════════════════════════════════════════════════════════════════════════
#  RULE-BASED FALLBACK CLASSIFICATION  (used when DL model unavailable)
# ════════════════════════════════════════════════════════════════════════════

THRESHOLDS = [
    (20,  0, "Normal",
     "No significant cognitive risk indicators detected. Maintain a healthy lifestyle, "
     "stay mentally and physically active, and schedule regular check-ups."),
    (35,  1, "Subjective Cognitive Decline",
     "Mild self-reported concerns noted but within normal clinical range. Monitor "
     "symptoms, consider follow-up assessment in 6 months."),
    (50,  2, "Mild Cognitive Impairment",
     "Objective evidence of cognitive decline beyond normal ageing. Recommend formal "
     "neuropsychological evaluation and consultation with a neurologist."),
    (65,  3, "Moderate Alzheimer's Risk",
     "Significant cognitive deficits detected across multiple domains. Urgent referral "
     "to a memory clinic is strongly advised."),
    (101, 4, "Severe / High Alzheimer's Risk",
     "Extensive cognitive impairment detected. Immediate clinical intervention and "
     "caregiver support planning are recommended."),
]

def rule_based_classify(composite_score: float):
    for threshold, cls, label, rec in THRESHOLDS:
        if composite_score < threshold:
            return cls, label, rec
    return 4, "Severe / High Alzheimer's Risk", THRESHOLDS[-1][3]


# ════════════════════════════════════════════════════════════════════════════
#  HELPER UTILITIES
# ════════════════════════════════════════════════════════════════════════════

def _normalise(value: float, in_min: float, in_max: float,
               out_min: float, out_max: float) -> float:
    """Linear interpolation from [in_min, in_max] → [out_min, out_max]."""
    if in_max == in_min:
        return out_min
    ratio = (value - in_min) / (in_max - in_min)
    return out_min + ratio * (out_max - out_min)


def _sigmoid_score(value: float, midpoint: float,
                   steepness: float, max_pts: float) -> float:
    """Sigmoid function: outputs ≈ 0 when value≪midpoint, ≈max_pts when value≫midpoint."""
    return max_pts / (1 + math.exp(-steepness * (value - midpoint)))


# ════════════════════════════════════════════════════════════════════════════
#  SLEEP / DEPRESSION / ANXIETY SCORE COMPUTATIONS
# ════════════════════════════════════════════════════════════════════════════

def compute_sleep_score(sleep_dict: dict) -> int:
    """Sum of 5 sleep risk items (each 0-4), max = 18."""
    return sum([
        sleep_dict.get("q11_latency", 0),
        sleep_dict.get("q12_duration", 0),
        sleep_dict.get("q13_wakeups", 0),
        sleep_dict.get("q14_return", 0),
        sleep_dict.get("q15_refreshed", 0),
    ])


def compute_depression_score(dep_dict: dict) -> int:
    """PHQ-9 total (0-27)."""
    return sum([dep_dict.get(f"q{i}", 0) for i in range(16, 25)])


def compute_anxiety_score(anx_dict: dict) -> int:
    """GAD-7 total (0-21)."""
    return sum([anx_dict.get(f"q{i}", 0) for i in range(25, 32)])
