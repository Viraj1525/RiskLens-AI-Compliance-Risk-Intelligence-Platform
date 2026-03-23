import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from config.settings import get_allowed_origins
from routes.upload_routes import router as upload_router
from routes.analysis_routes import router as analysis_router
from routes.chat_routes import router as chat_router
from routes.report_routes import router as report_router
from routes.document_routes import router as document_router
from services.document_service import clear_analysis_session

app = FastAPI(
    title="AI Compliance & Risk Intelligence Platform",
    description="AI-powered system to detect compliance risks in enterprise documents",
    version="1.0.0",
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Basic security headers for production deployments."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(analysis_router)
app.include_router(chat_router)
app.include_router(report_router)
app.include_router(document_router)

os.makedirs("reports", exist_ok=True)
app.mount("/reports", StaticFiles(directory="reports"), name="reports")


@app.on_event("startup")
def reset_temporary_analysis_state():
    clear_analysis_session()


@app.get("/")
def root():
    return {"message": "AI Compliance Platform Running", "status": "OK"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
