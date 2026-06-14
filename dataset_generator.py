"""
dataset_generator.py
────────────────────
Generates a realistic synthetic dataset for training the NeuroDetect
deep-learning classifier.

Each sample contains 6 risk scores (0-100):
  [patient_score, mmse_score, memory_score, naming_score, nback_score, trail_score]

Labels (0-4):
  0 = Normal
  1 = Subjective Cognitive Decline (SCD)
  2 = Mild Cognitive Impairment (MCI)
  3 = Moderate Alzheimer's Risk
  4 = Severe / High Alzheimer's Risk

Run directly:  python dataset_generator.py
Outputs:       data/synthetic_dataset.csv
               data/synthetic_dataset_raw.csv   (full feature detail)
"""

import numpy as np
import pandas as pd
import os
import json

np.random.seed(42)

# ── Class definitions ─────────────────────────────────────────────────────────
# Each class: {label, n_samples, mean_scores[6], std_scores[6]}
# Order: [patient, mmse, memory, naming, nback, trail]

CLASS_PROFILES = [
    {
        "label":   0,
        "name":    "Normal",
        "n":       3000,
        "means":   [20.0, 15.0, 12.0, 14.0, 16.0, 15.0],
        "stds":    [ 6.0,  7.0,  6.0,  6.0,  7.0,  7.0],
    },
    {
        "label":   1,
        "name":    "Subjective Cognitive Decline",
        "n":       2500,
        "means":   [30.0, 27.0, 26.0, 25.0, 28.0, 27.0],
        "stds":    [ 7.0,  8.0,  8.0,  7.0,  8.0,  8.0],
    },
    {
        "label":   2,
        "name":    "Mild Cognitive Impairment",
        "n":       2000,
        "means":   [44.0, 48.0, 46.0, 44.0, 47.0, 46.0],
        "stds":    [ 8.0,  9.0,  9.0,  8.0,  9.0,  9.0],
    },
    {
        "label":   3,
        "name":    "Moderate Alzheimer's Risk",
        "n":       1500,
        "means":   [60.0, 65.0, 63.0, 62.0, 64.0, 63.0],
        "stds":    [ 8.0,  9.0,  9.0,  8.0,  9.0,  9.0],
    },
    {
        "label":   4,
        "name":    "Severe / High Alzheimer's Risk",
        "n":       1000,
        "means":   [76.0, 80.0, 79.0, 78.0, 80.0, 79.0],
        "stds":    [ 7.0,  8.0,  8.0,  7.0,  8.0,  8.0],
    },
]

FEATURE_NAMES = [
    "patient_risk_score",
    "mmse_risk_score",
    "memory_risk_score",
    "naming_risk_score",
    "nback_risk_score",
    "trail_risk_score",
]


def generate_dataset() -> pd.DataFrame:
    rows = []
    for profile in CLASS_PROFILES:
        label = profile["label"]
        n     = profile["n"]
        means = np.array(profile["means"])
        stds  = np.array(profile["stds"])

        # Multivariate normal with mild positive correlation between games
        corr_matrix = 0.45 * np.ones((6, 6))
        np.fill_diagonal(corr_matrix, 1.0)
        cov = np.diag(stds) @ corr_matrix @ np.diag(stds)

        samples = np.random.multivariate_normal(means, cov, size=n)
        samples = np.clip(samples, 0, 100)          # keep scores in [0, 100]

        # Add small amount of realistic noise per individual feature
        noise = np.random.normal(0, 2, samples.shape)
        samples = np.clip(samples + noise, 0, 100)

        for row in samples:
            composite = float(
                0.15 * row[0] +
                0.20 * row[1] +
                0.20 * row[2] +
                0.15 * row[3] +
                0.15 * row[4] +
                0.15 * row[5]
            )
            rows.append({
                **{FEATURE_NAMES[i]: round(float(row[i]), 2) for i in range(6)},
                "composite_score": round(composite, 2),
                "label": label,
                "label_name": profile["name"],
            })

    df = pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)
    return df


def generate_raw_features_dataset(n_per_class: int = 500) -> pd.DataFrame:
    """
    Generates a second, more granular dataset with all individual
    game attributes so you can train more feature-rich models later.
    """
    rows = []

    raw_profiles = [
        # (label, name, mmse_mean, acc_mean, rt_mean, imm_rec, del_rec,
        #  naming_acc, nback_acc, trail_time, age_mean)
        (0, "Normal",          28.0, 92, 1.8, 88, 82, 92, 85, 65,  62),
        (1, "SCD",             25.5, 82, 2.4, 75, 65, 82, 74, 95,  66),
        (2, "MCI",             22.0, 70, 3.2, 60, 48, 68, 60, 135, 72),
        (3, "Moderate",        17.5, 55, 4.5, 42, 28, 50, 42, 210, 78),
        (4, "Severe",          11.0, 35, 6.5, 22, 10, 28, 22, 330, 82),
    ]

    for label, name, mmse_m, acc_m, rt_m, imm_m, del_m, nam_m, nb_m, trail_m, age_m in raw_profiles:
        n = n_per_class
        sigma = 0.12   # relative standard deviation

        for _ in range(n):
            mmse  = float(np.clip(np.random.normal(mmse_m,  2.5),  0, 30))
            acc   = float(np.clip(np.random.normal(acc_m,   acc_m*sigma), 0, 100))
            rt    = float(np.clip(np.random.normal(rt_m,    rt_m*sigma),  0.3, 15))
            imm   = float(np.clip(np.random.normal(imm_m,   imm_m*sigma), 0, 100))
            delayed = float(np.clip(np.random.normal(del_m, del_m*sigma), 0, 100))
            nam   = float(np.clip(np.random.normal(nam_m,   nam_m*sigma), 0, 100))
            nb    = float(np.clip(np.random.normal(nb_m,    nb_m*sigma),  0, 100))
            trail = float(np.clip(np.random.normal(trail_m, trail_m*0.2), 20, 600))
            age   = int(np.clip(np.random.normal(age_m, 7), 30, 95))

            rows.append({
                # Demographics
                "age": age,
                "family_history": int(np.random.binomial(1, 0.1 + label * 0.05)),
                # MMSE game
                "mmse_score":        round(mmse, 1),
                "mmse_accuracy_pct": round(acc, 1),
                "mmse_reaction_time":round(rt, 2),
                # Memory game
                "immediate_recall":  round(imm, 1),
                "delayed_recall":    round(delayed, 1),
                "intrusion_errors":  int(np.clip(np.random.poisson(label * 1.5), 0, 10)),
                # Naming game
                "naming_accuracy":   round(nam, 1),
                "naming_latency":    round(float(np.random.normal(rt * 1.3, 0.5)), 2),
                # N-Back game
                "nback_accuracy":    round(nb, 1),
                "false_positive_rate": round(float(np.clip(np.random.normal(
                                         label * 0.06, 0.03), 0, 0.5)), 3),
                # Trail Making Test
                "trail_completion_time": round(trail, 1),
                "trail_errors":          int(np.clip(np.random.poisson(label * 0.8), 0, 10)),
                # Label
                "label":      label,
                "label_name": name,
            })

    df = pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)
    return df


def save_datasets():
    os.makedirs("data", exist_ok=True)

    print("Generating primary 6-feature dataset …")
    df_main = generate_dataset()
    df_main.to_csv("data/synthetic_dataset.csv", index=False)
    print(f"  ✓ {len(df_main)} rows → data/synthetic_dataset.csv")

    print("Generating raw-feature dataset …")
    df_raw = generate_raw_features_dataset(n_per_class=500)
    df_raw.to_csv("data/synthetic_dataset_raw.csv", index=False)
    print(f"  ✓ {len(df_raw)} rows → data/synthetic_dataset_raw.csv")

    # Print distribution summary
    print("\nClass distribution (primary dataset):")
    counts = df_main["label_name"].value_counts()
    for name, cnt in counts.items():
        print(f"  {name:40s}: {cnt}")

    print("\nFeature statistics (primary dataset):")
    print(df_main[FEATURE_NAMES + ["composite_score"]].describe().round(2))


if __name__ == "__main__":
    save_datasets()
