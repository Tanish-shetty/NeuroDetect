"""
ml_model.py
───────────
Deep-learning classifier for Alzheimer's risk prediction.

Architecture: 6-feature input → fully-connected neural network → 5 classes
Framework   : TensorFlow / Keras
Training    : run  `python ml_model.py`  (generates data + trains + saves model)
Inference   : call `predict(feature_vector)` from main.py

5 Output Classes
────────────────
0 → Normal
1 → Subjective Cognitive Decline (SCD)
2 → Mild Cognitive Impairment (MCI)
3 → Moderate Alzheimer's Risk
4 → Severe / High Alzheimer's Risk
"""

import os
import json
import numpy as np
import pandas as pd

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"   # suppress TF info logs

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, regularizers
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report, confusion_matrix
import joblib

# ── Paths ─────────────────────────────────────────────────────────────────────
MODEL_PATH   = "models/neurodetect_model.keras"
SCALER_PATH  = "models/feature_scaler.joblib"
DATA_PATH    = "data/synthetic_dataset.csv"
HISTORY_PATH = "models/training_history.json"

FEATURE_COLS = [
    "patient_risk_score",
    "mmse_risk_score",
    "memory_risk_score",
    "naming_risk_score",
    "nback_risk_score",
    "trail_risk_score",
]
NUM_CLASSES  = 5
LABEL_NAMES  = [
    "Normal",
    "Subjective Cognitive Decline",
    "Mild Cognitive Impairment",
    "Moderate Alzheimer's Risk",
    "Severe / High Alzheimer's Risk",
]


# ════════════════════════════════════════════════════════════════════════════
#  MODEL ARCHITECTURE
# ════════════════════════════════════════════════════════════════════════════

def build_model(input_dim: int = 6, num_classes: int = NUM_CLASSES) -> keras.Model:
    """
    Fully-connected network with:
    • Batch normalisation after each hidden layer (training stability)
    • Dropout for regularisation
    • L2 weight decay
    • Softmax output for probability distribution across 5 classes
    """
    reg = regularizers.l2(1e-4)

    model = keras.Sequential([
        keras.Input(shape=(input_dim,), name="risk_scores"),

        # Block 1
        layers.Dense(128, kernel_regularizer=reg, name="dense_1"),
        layers.BatchNormalization(),
        layers.Activation("relu"),
        layers.Dropout(0.3),

        # Block 2
        layers.Dense(64, kernel_regularizer=reg, name="dense_2"),
        layers.BatchNormalization(),
        layers.Activation("relu"),
        layers.Dropout(0.25),

        # Block 3
        layers.Dense(32, kernel_regularizer=reg, name="dense_3"),
        layers.BatchNormalization(),
        layers.Activation("relu"),
        layers.Dropout(0.2),

        # Block 4
        layers.Dense(16, kernel_regularizer=reg, name="dense_4"),
        layers.Activation("relu"),

        # Output
        layers.Dense(num_classes, activation="softmax", name="predictions"),
    ], name="NeuroDetect")

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


# ════════════════════════════════════════════════════════════════════════════
#  TRAINING
# ════════════════════════════════════════════════════════════════════════════

def train(
    data_path:   str = DATA_PATH,
    model_path:  str = MODEL_PATH,
    scaler_path: str = SCALER_PATH,
    epochs:      int = 80,
    batch_size:  int = 256,
):
    print("═" * 60)
    print(" NeuroDetect — Model Training")
    print("═" * 60)

    # ── Load data ────────────────────────────────────────────────────────────
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Generating …")
        from dataset_generator import save_datasets
        save_datasets()

    df = pd.read_csv(data_path)
    X  = df[FEATURE_COLS].values.astype(np.float32)
    y  = df["label"].values.astype(np.int32)

    print(f"Dataset : {len(df)} samples, {NUM_CLASSES} classes")
    for i, name in enumerate(LABEL_NAMES):
        print(f"  Class {i} ({name:35s}): {(y==i).sum()}")

    # ── Normalise ────────────────────────────────────────────────────────────
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)

    # ── Split ────────────────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.15, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.12, random_state=42, stratify=y_train
    )
    print(f"\nSplit → Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

    # ── Build model ──────────────────────────────────────────────────────────
    model = build_model(input_dim=X.shape[1])
    model.summary()

    # ── Callbacks ────────────────────────────────────────────────────────────
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=12, restore_best_weights=True, verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6, verbose=1
        ),
        keras.callbacks.ModelCheckpoint(
            model_path, save_best_only=True, monitor="val_accuracy", verbose=1
        ),
    ]

    # ── Train ────────────────────────────────────────────────────────────────
    # Class weights to handle slight imbalance
    total = len(y_train)
    class_weight = {
        i: total / (NUM_CLASSES * (y_train == i).sum())
        for i in range(NUM_CLASSES)
    }

    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        class_weight=class_weight,
        callbacks=callbacks,
        verbose=1,
    )

    # ── Evaluate ─────────────────────────────────────────────────────────────
    print("\n── Test Evaluation ──")
    loss, acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test accuracy : {acc*100:.2f}%")
    print(f"Test loss     : {loss:.4f}")

    y_pred = np.argmax(model.predict(X_test, verbose=0), axis=1)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=LABEL_NAMES))
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # ── Save scaler ──────────────────────────────────────────────────────────
    os.makedirs("models", exist_ok=True)
    joblib.dump(scaler, scaler_path)
    print(f"\n✓ Scaler   saved → {scaler_path}")
    print(f"✓ Model    saved → {model_path}")

    # Save training history
    hist_dict = {k: [float(v) for v in vals]
                 for k, vals in history.history.items()}
    with open(HISTORY_PATH, "w") as f:
        json.dump(hist_dict, f, indent=2)
    print(f"✓ History  saved → {HISTORY_PATH}")

    return model, scaler


# ════════════════════════════════════════════════════════════════════════════
#  INFERENCE
# ════════════════════════════════════════════════════════════════════════════

_model  = None
_scaler = None


def _load():
    global _model, _scaler
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            print("Model not found — training now …")
            _model, _scaler = train()
        else:
            _model  = keras.models.load_model(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)


def predict(
    patient_risk:  float,
    mmse_risk:     float,
    memory_risk:   float,
    naming_risk:   float,
    nback_risk:    float,
    trail_risk:    float,
) -> dict:
    """
    Returns:
        {
          "predicted_class": int,
          "risk_level":      str,
          "confidence":      float,
          "probabilities":   [float × 5],
          "composite_score": float,
        }
    """
    _load()

    features = np.array([[
        patient_risk, mmse_risk, memory_risk,
        naming_risk, nback_risk, trail_risk,
    ]], dtype=np.float32)

    features_scaled = _scaler.transform(features)
    probs           = _model.predict(features_scaled, verbose=0)[0]
    predicted_class = int(np.argmax(probs))
    confidence      = float(probs[predicted_class])

    composite = (
        0.15 * patient_risk +
        0.20 * mmse_risk    +
        0.20 * memory_risk  +
        0.15 * naming_risk  +
        0.15 * nback_risk   +
        0.15 * trail_risk
    )

    return {
        "predicted_class": predicted_class,
        "risk_level":      LABEL_NAMES[predicted_class],
        "confidence":      round(confidence, 4),
        "probabilities":   [round(float(p), 4) for p in probs],
        "composite_score": round(composite, 2),
    }


def is_model_ready() -> bool:
    return os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH)


# ════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from dataset_generator import save_datasets
    save_datasets()
    train()
