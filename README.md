# SmartMunicipality AI

An intermediate-level, full-stack civic issue reporting MVP for South African municipalities.

## What is included
- FastAPI REST API with resident/admin/official roles
- PostgreSQL + SQLAlchemy database models
- Complaint submission, listing, status updates and assignment-ready fields
- Baseline NLP complaint category classifier (TF-IDF + Logistic Regression)
- Heuristic urgency scoring (clearly labelled as a prototype, not an emergency service)
- Duplicate-report similarity helper
- React + Vite frontend with resident reporting and complaint list
- Docker Compose for PostgreSQL and API
- API documentation at `/docs`

## Important limitations
This is a development starter/MVP, not a production municipal deployment. It uses a small illustrative training dataset. Predictions must be reviewed by people. Do not submit real identity numbers, sensitive personal data, or emergency reports. For emergencies, residents must use official emergency channels. Before real deployment, obtain municipal approval, conduct security/privacy reviews, add proper notification and file-storage services, and test accessibility and POPIA compliance.

## Requirements
- Python 3.10+
- Node.js 20+
- Docker Desktop (recommended for PostgreSQL), or a local PostgreSQL server

## 1. Backend setup
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000  
Swagger docs: http://127.0.0.1:8000/docs

The default SQLite database is used if `DATABASE_URL` is not set. This makes local testing easier. For PostgreSQL, use the Docker instructions below.

## 2. PostgreSQL + API with Docker
From the project root:
```bash
docker compose up --build
```
PostgreSQL is exposed on port 5432 and API on port 8000. Update credentials in `docker-compose.yml` and `.env` before sharing or deploying.

## 3. Frontend setup
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

Set `VITE_API_URL` in `frontend/.env` if your API is not at `http://127.0.0.1:8000`.

## 4. Train the baseline model
```bash
cd backend
python -m app.ai.train_model
```
This creates `backend/app/ai/models/category_model.joblib`. The app falls back to a small built-in training set if no saved model exists.

## API endpoints
- `GET /` – API welcome
- `GET /health` – health check
- `GET /api/v1/complaints` – list complaints
- `POST /api/v1/complaints` – submit complaint
- `GET /api/v1/complaints/{id}` – complaint details
- `PATCH /api/v1/complaints/{id}/status` – update status
- `GET /api/v1/analytics/summary` – basic metrics
- `POST /api/v1/ai/analyse` – preview AI analysis without saving

## Suggested next development milestones
1. Implement secure registration/login and JWT authorization.
2. Add role-based endpoint permissions and audit logs.
3. Add image upload with file-type/size validation and secure object storage.
4. Add map selection and geospatial queries (PostGIS).
5. Add notification integrations (email/SMS/WhatsApp with consent).
6. Train/evaluate models on a consented, anonymised, municipality-approved dataset.
7. Add accessibility, security testing, backup, monitoring and POPIA review.
