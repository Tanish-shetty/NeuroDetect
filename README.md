# NeuroDetect

### AI-Powered Behavioral Intelligence System for Pseudo-Dementia & Cognitive Decline Detection

NeuroDetect is a behavioral AI platform designed for the early detection and monitoring of **Pseudo-Dementia**, **Mild Cognitive Impairment (MCI)**, and other cognitive decline conditions through digital behavioral biomarkers.

Unlike traditional cognitive assessment systems that rely primarily on test scores, NeuroDetect focuses on analyzing **how users perform cognitive tasks**, capturing subtle interaction patterns such as hesitation, reaction time variability, correction behavior, attention drift, and cognitive fluctuations.

The platform combines cognitive assessment games, behavioral telemetry, clinical information, and machine learning to generate cognitive risk insights and support longitudinal monitoring.

---

## Key Features

### Cognitive Assessment Suite

The platform includes gamified neuropsychological assessments:

* MMSE-Based Cognitive Assessment
* Grocery Memory Recall Game
* Boston Naming Test
* N-Back Working Memory Test
* Trail Making Test

### Behavioral Telemetry Engine

Captures interaction-based cognitive biomarkers such as:

* Reaction Time
* Hesitation Duration
* Correction Frequency
* Error Recovery Behavior
* Attention Drift
* Cursor/Touch Movement Patterns
* Path Efficiency
* Confidence Variability
* Cognitive Consistency Across Tasks

### AI-Powered Risk Assessment

Supports differentiation between:

* Healthy Cognition
* Subjective Cognitive Decline
* Mild Cognitive Impairment (MCI)
* Pseudo-Dementia
* Alzheimer's Disease Risk

---

## System Architecture

```text
Frontend (React / Next.js)
        ↓
Cognitive Assessment Games
        ↓
Behavioral Telemetry Collection
        ↓
FastAPI Backend
        ↓
PostgreSQL / SQLite
        ↓
Feature Engineering Pipeline
        ↓
Machine Learning Models
        ↓
Risk Prediction Engine
        ↓
Dashboard & Longitudinal Analytics
```

---

## Tech Stack

### Frontend

* React.js / Next.js
* Tailwind CSS
* Framer Motion

### Backend

* FastAPI
* Python

### Database

* PostgreSQL
* SQLite

### Machine Learning

* XGBoost
* LightGBM
* Random Forest
* TensorFlow / PyTorch

### Analytics & Visualization

* Recharts
* Custom Behavioral Analytics Dashboard

---

## Risk Assessment Framework

Each assessment contributes to a composite cognitive risk score:

| Domain                | Weight |
| --------------------- | ------ |
| Patient Clinical Data | 15%    |
| MMSE Assessment       | 20%    |
| Memory Recall         | 20%    |
| Boston Naming Test    | 15%    |
| N-Back Test           | 15%    |
| Trail Making Test     | 15%    |

### Risk Categories

| Level | Classification               |
| ----- | ---------------------------- |
| 0     | Normal                       |
| 1     | Subjective Cognitive Decline |
| 2     | Mild Cognitive Impairment    |
| 3     | Moderate Cognitive Risk      |
| 4     | High Cognitive Risk          |

---

## Backend API

| Method | Endpoint               |
| ------ | ---------------------- |
| POST   | `/patients/`           |
| GET    | `/patients/{id}`       |
| POST   | `/games/mmse`          |
| POST   | `/games/memory`        |
| POST   | `/games/naming`        |
| POST   | `/games/nback`         |
| POST   | `/games/trail`         |
| POST   | `/assess/{patient_id}` |
| GET    | `/assess/{patient_id}` |
| GET    | `/health`              |
| GET    | `/model/status`        |
| POST   | `/model/train`         |

### API Documentation

```bash
http://localhost:8000/docs
```

---

## Machine Learning Pipeline

### Current Phase

* Behavioral feature engineering
* Synthetic telemetry generation
* Cognitive risk scoring
* Multi-class cognitive risk prediction

### Future Enhancements

* Sequential behavioral analysis
* LSTM-based temporal modeling
* Transformer-based behavioral learning
* Multimodal fusion models
* Explainable AI for healthcare

---

## Datasets

### Public Datasets

* ADNI (Alzheimer's Disease Neuroimaging Initiative)
* OASIS

### Custom Data

* Synthetic behavioral gameplay telemetry
* Real-world user interaction data
* Longitudinal cognitive assessment records

---

## Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd neurodetect
```

### 2. Create Virtual Environment

```bash
python -m venv venv
```

**Linux / macOS**

```bash
source venv/bin/activate
```

**Windows**

```bash
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Train Model & Generate Dataset

```bash
python ml_model.py
```

This will:

* Generate synthetic datasets
* Train the prediction model
* Save trained model artifacts

### 5. Start the API Server

```bash
uvicorn main:app --reload --port 8000
```

---

## Research Focus

### Primary Focus

* Pseudo-Dementia Detection
* Behavioral Biomarker Discovery
* Cognitive Fluctuation Analysis
* Executive Dysfunction Assessment
* Human-Computer Interaction Patterns

### Secondary Focus

* Alzheimer's Disease Risk Assessment
* Mild Cognitive Impairment Detection
* Longitudinal Cognitive Monitoring
* Digital Cognitive Health Analytics

---

## Project Roadmap

* Cognitive Game Development
* Behavioral Telemetry Engine
* Backend API Development
* Synthetic Dataset Expansion
* Machine Learning Pipeline Optimization
* Longitudinal Analytics Dashboard
* Clinical Validation & User Studies

---

## Future Scope

* Real-Time Cognitive Monitoring
* Personalized Cognitive Risk Tracking
* Explainable AI for Healthcare
* Remote Neuropsychological Screening
* Clinician Dashboard Integration
* Mobile Application Deployment

---

## Disclaimer

NeuroDetect is a research and educational project intended to explore behavioral biomarkers and AI-based cognitive assessment. It is **not a medical diagnostic tool** and should not be used as a substitute for professional clinical evaluation.

---

**Building the future of behavioral AI for cognitive health and Pseudo-Dementia detection.**
