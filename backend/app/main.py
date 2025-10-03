from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from pathlib import Path
from .core.config import settings
from .core.deps import create_tables
from .api.routes import patients, appointments, medicines, billing

API_PREFIX = "/api/v1"

# Tags metadata for nicer docs and client generation
openapi_tags = [
    {"name": "patients", "description": "Patient records, demographics and clinical info."},
    {"name": "appointments", "description": "Clinic scheduling and appointments."},
    {"name": "medicines", "description": "Inventory items and stock levels."},
    {"name": "billing", "description": "Invoices, payments and insurance claims."},
]

app = FastAPI(
    title="Doctor Smart Storage API",
    description="Smart storage system for doctors - Backend API",
    version="1.0.0",
    openapi_tags=openapi_tags,
)

# CORS middleware - Allow all origins for deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression for large responses (tables, CSVs)
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Ensure tables are created once server starts (and not at import time)
@app.on_event("startup")
async def startup_event():
    create_tables()

# API Routers
app.include_router(patients.router, prefix=API_PREFIX, tags=["patients"])
app.include_router(appointments.router, prefix=API_PREFIX, tags=["appointments"])
app.include_router(medicines.router, prefix=API_PREFIX, tags=["medicines"])
app.include_router(billing.router, prefix=API_PREFIX, tags=["billing"])

# Serve static web files - Fix the path to go up two levels
# Current: /doctor-smart-storage/backend/app/main.py
# Target:  /doctor-smart-storage/web/
current_dir = Path(__file__).parent.parent.parent  # Go up 3 levels: app -> backend -> doctor-smart-storage
web_path = current_dir / "web"

print(f"Looking for web files at: {web_path}")
print(f"Web path exists: {web_path.exists()}")

if web_path.exists():
    app.mount("/static", StaticFiles(directory=str(web_path)), name="static")
    
    @app.get("/")
    async def serve_web_app():
        return FileResponse(str(web_path / "index.html"))
else:
    print("Web directory not found!")

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Doctor Smart Storage API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
