import os

try:
    from dotenv import load_dotenv
except Exception:
    def load_dotenv():
        return False


load_dotenv()


MODEL_NAME = os.getenv("GROQ_MODEL_NAME", "llama-3.3-70b-versatile")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
EMBEDDING_MODEL_CACHE_DIR = os.getenv("EMBEDDING_MODEL_CACHE_DIR")
EMBEDDING_MODEL_OFFLINE = os.getenv("EMBEDDING_MODEL_OFFLINE", "false").lower() in {"1", "true", "yes"}

API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
FRONTEND_DEV_URL = os.getenv("FRONTEND_DEV_URL", "http://127.0.0.1:5173")


def get_allowed_origins():
    raw = os.getenv("ALLOWED_ORIGINS", FRONTEND_DEV_URL)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]
