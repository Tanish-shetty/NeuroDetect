Cognitive Behavioral Intelligence System for Alzheimer’s & Pseudo-Dementia Detection
A multimodal AI-driven platform focused on early detection and longitudinal monitoring of Alzheimer’s Disease and Pseudo-Dementia using:


Behavioral telemetry from cognitive games


Clinical assessment data


MRI-based neuroimaging features


The project emphasizes behavioral biomarkers such as hesitation, reaction time variability, correction patterns, and cognitive fluctuation collected through interactive neuropsychological mini-games.

Project Vision
Traditional cognitive assessment systems rely heavily on static scores and clinical observations. This project aims to build a more intelligent and dynamic system capable of analyzing:


Cognitive behavior patterns


Temporal progression


Executive dysfunction


Memory decline


Attention instability


Interaction-based digital biomarkers


The long-term goal is to create a scalable platform for:


Early screening


Continuous monitoring


Cognitive risk prediction


Research on behavioral biomarkers



Core Features
Cognitive Assessment Games
The platform includes gamified neuropsychological tasks such as:
1. MMSE-Based Cognitive Assessment
Measures:


Orientation


Attention


Recall


Language


Calculation ability



2. Grocery Memory Recall Game
Measures:


Immediate recall


Delayed recall


Episodic memory


Recall consistency



3. Boston Naming Test
Measures:


Semantic memory


Language retrieval


Naming ability



4. N-Back Test
Measures:


Working memory


Sustained attention


Cognitive flexibility



5. Trail Making Test
Measures:


Executive function


Task switching


Processing speed


Visual attention



Behavioral Telemetry Collection
The system captures hidden behavioral biomarkers during gameplay, including:


Reaction time


Hesitation duration


Correction frequency


Cursor/touch movement


Hover duration


Path efficiency


Movement entropy


Confidence variability


Error recovery behavior


Attention drift


These interaction patterns are used to generate cognitive biomarkers for machine learning models.

Multimodal AI Pipeline
The platform combines:
ModalityPurposeBehavioral DataPrimary cognitive signalClinical DataSupporting contextMRI FeaturesStructural neurodegeneration evidence
The fusion system aims to improve differentiation between:


Alzheimer’s Disease


Pseudo-Dementia


Mild Cognitive Impairment (MCI)


Healthy cognition



Planned System Architecture
React/Next.js Frontend        ↓Cognitive Games        ↓Behavioral Telemetry Collection        ↓FastAPI Backend        ↓PostgreSQL Database        ↓Feature Engineering Pipeline        ↓Fusion Model(Behavioral + Clinical + MRI)        ↓Prediction Engine        ↓Dashboard & Longitudinal Analytics

Tech Stack
Frontend


React / Next.js


Tailwind CSS


Framer Motion



Backend


FastAPI


Python



Database


PostgreSQL



Machine Learning


XGBoost


LightGBM


PyTorch



Visualization & Analytics


Recharts


Custom behavioral visualizations


Longitudinal cognitive analytics



Machine Learning Approach
Initial Phase
The project will initially use:


Engineered behavioral features


Synthetic gameplay telemetry


Real clinical & MRI datasets


Models:


XGBoost


LightGBM


Random Forest



Advanced Phase
Future improvements may include:


LSTM-based temporal learning


Transformer-based behavioral modeling


Attention-based multimodal fusion


Sequential telemetry analysis



Datasets
Planned Public Datasets


ADNI (Alzheimer’s Disease Neuroimaging Initiative)


OASIS



Custom Data


Synthetic behavioral gameplay data


Real user telemetry collected through cognitive games



Key Research Focus Areas


Digital cognitive biomarkers


Behavioral AI


Pseudo-dementia differentiation


Longitudinal cognitive monitoring


Executive dysfunction analysis


Human-computer interaction patterns


Temporal cognitive progression



Current Status
🚧 Project currently in early development phase.
Planned milestones:


 Frontend game development


 Behavioral telemetry engine


 Backend API development


 Synthetic behavioral dataset generation


 ML pipeline implementation


 Fusion model development


 Dashboard & analytics system


 Real-world user validation



Future Scope


Real-time cognitive monitoring


Explainable AI for healthcare


Adaptive cognitive assessments


Personalized risk tracking


Clinician dashboard integration


Mobile deployment


Remote neuropsychological screening
