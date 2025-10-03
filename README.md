# 🏥 Doctor Smart Storage

A modern, efficient web application for doctors to manage patient information, billing, medicine, and medical issues.

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
pip install poetry
poetry install
poetry shell

# Set up environment
cp .env.example .env
# Edit .env with your database and AWS credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 📋 Features

### Phase 1 (MVP)
- ✅ Patient Management (CRUD)
- 🔄 Appointment Scheduling
- 🔄 Prescription Management
- 🔄 Medicine Inventory
- 🔄 Billing System
- 🔄 Document Storage

### Phase 2
- Drug Interaction Checks
- Reports & Analytics
- Multi-clinic Support
- Advanced Security

## 🏗️ Architecture

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Storage**: AWS S3 for documents
- **Auth**: JWT tokens with role-based access
- **Background Jobs**: Celery + Redis

## 📊 Database Schema

```
patients → appointments, documents, prescriptions, invoices, issues
users → appointments (as doctor), prescriptions (as doctor)
medicines → prescription_items, inventory_events
prescriptions → prescription_items
invoices → payments
issues → treatments
```

## 🔐 Security

- JWT authentication with access/refresh tokens
- Role-based access control (DOCTOR, STAFF, ADMIN)
- Audit logging for all PHI access
- Encrypted storage (S3 SSE + PostgreSQL encryption)
- HTTPS everywhere

## 🧪 API Endpoints

### Patients
- `GET /api/v1/patients` - List patients
- `POST /api/v1/patients` - Create patient
- `GET /api/v1/patients/{id}` - Get patient
- `PATCH /api/v1/patients/{id}` - Update patient
- `DELETE /api/v1/patients/{id}` - Soft delete patient

### Coming Soon
- Appointments, Prescriptions, Billing, Documents, Medicine

## 🛠️ Development

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test

# Code formatting
cd backend && black . && isort .
cd frontend && npm run lint
```

## 📝 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/doctor_storage

# JWT
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=doctor-storage-documents

# Redis
REDIS_URL=redis://localhost:6379
```

## 🚀 Deployment

- Backend: Docker + AWS ECS/EC2
- Frontend: Vercel/Netlify
- Database: AWS RDS PostgreSQL
- Storage: AWS S3
- Cache: AWS ElastiCache Redis

---

**Status**: 🔄 In Development - Phase 1 MVP
**Next**: Implement authentication, appointments, and prescriptions
