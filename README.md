# AI Compliance & Risk Intelligence Platform

An end-to-end platform for compliance and risk analysis of enterprise PDF documents using Retrieval-Augmented Generation (RAG), heuristic + LLM analysis, interactive chat, and downloadable reports.

## What This Project Does

1. Upload one or more PDF documents.
2. Extract text, split into chunks, and generate embeddings.
3. Index embeddings in a FAISS (or NumPy fallback) vector index.
4. Run compliance risk analysis and score results.
5. Ask contextual questions through chat.
6. Generate PDF reports.
7. Generate Mermaid flowcharts from document structure.
8. Optionally log analysis events to Supabase.

## Core Features

- Multi-file PDF upload (`/upload-document`, `/upload-documents`)
- Session-based document indexing and retrieval
- Semantic search over indexed document chunks
- AI compliance analysis (`/analyze-risk`)
- Conversational document chat with history (`/chat`)
- Compliance report generation with downloadable PDF (`/generate-report`)
- Mermaid flowchart generation (`/generate-flowchart`)
- Document listing and deletion (`/documents`, `DELETE /documents/{document_name}`)
- Optional Supabase logging for risk analyses
- Dockerized deployment (FastAPI + Nginx)

## Architecture

### Backend flow

`FastAPI routes -> service layer -> RAG pipeline -> risk engine -> response/report/logging`

### Frontend flow

`React pages -> Axios client (/api proxy) -> FastAPI endpoints -> UI state + visualizations`

## Complete Technology and Keyword Inventory

This section is intentionally explicit and based on the current repository files.

### Backend runtime and API

- Python 3.11 (Docker) / Python 3.10+ (local compatible)
- FastAPI
- Uvicorn (`uvicorn[standard]`)
- Starlette middleware (`BaseHTTPMiddleware`, static files)
- Pydantic / pydantic-settings
- python-dotenv
- python-multipart

### RAG, embeddings, and retrieval

- LangChain (`langchain`, `langchain-core`, `langchain-community`)
- LangChain text splitters (`langchain-text-splitters`, `RecursiveCharacterTextSplitter`)
- PyPDFLoader (LangChain community loader)
- pypdf fallback PDF extraction (`PdfReader`)
- sentence-transformers (`all-MiniLM-L6-v2` by default)
- FAISS (`faiss-cpu`) vector index
- NumPy fallback vector index (`NumpyIndex`) when FAISS is unavailable
- Local hash-based embedding fallback (`LocalEmbeddingModel`) when sentence-transformers is unavailable

### AI and analysis

- Groq API (`groq` SDK)
- Default model keyword: `llama-3.3-70b-versatile`
- Heuristic fallback risk analysis rules (keyword + severity)
- Heuristic chat fallback (keyword overlap + sentence ranking)
- Compliance score heuristics (`High`, `Medium`, `Low` impact)

### Document/report/flowchart processing

- ReportLab PDF generation
- Mermaid.js flowchart code generation
- Mermaid rendering in frontend via dynamic ESM import from jsDelivr CDN
- Flowchart sanitization logic for malformed Mermaid node syntax

### Database and persistence integrations

- Supabase REST API integration via `requests`
- PostgreSQL ecosystem dependencies present: `sqlalchemy`, `psycopg2-binary`
- Supabase SQL migration for `risk_analyses` table (`jsonb`, `uuid`, `timestamptz`)

### Frontend framework and libraries

- React 19
- React DOM 19
- Vite 7
- React Router DOM 7
- Axios
- Framer Motion
- React Hot Toast
- React Dropzone
- Lucide React
- Recharts
- Tailwind CSS 4 + `@tailwindcss/vite`
- ESLint 9 + React Hooks / React Refresh plugins

### Deployment and ops

- Docker Compose
- Docker multi-stage builds
- Nginx reverse proxy + SPA routing
- PowerShell automation scripts (`start-dev.ps1`, `stop-dev.ps1`, `scripts/docker-up.ps1`)
- Health check smoke test (`scripts/smoke_test.py`)
- Vercel rewrite config for frontend-to-backend API routing

### Additional dependencies currently listed in `requirements.txt`

- `transformers`
- `torch`
- `pymupdf`
- `easyocr`
- `opencv-python`
- `pandas`
- `tqdm`

These are present in dependency files; current core execution paths primarily use the components listed above.

## Project Structure

```text
.
|-- backend/
|   |-- app.py
|   |-- config/
|   |   |-- settings.py
|   |   `-- supabase_client.py
|   |-- rag_pipeline/
|   |   |-- document_loader.py
|   |   |-- text_splitter.py
|   |   |-- embeddings.py
|   |   |-- retriever.py
|   |   `-- vector_store.py
|   |-- risk_engine/
|   |   |-- compliance_checker.py
|   |   `-- risk_scoring.py
|   |-- routes/
|   |   |-- upload_routes.py
|   |   |-- analysis_routes.py
|   |   |-- chat_routes.py
|   |   |-- report_routes.py
|   |   |-- document_routes.py
|   |   `-- flowchart_routes.py
|   `-- services/
|       |-- document_service.py
|       |-- analysis_service.py
|       |-- chat_service.py
|       |-- report_service.py
|       `-- flowchart_service.py
|-- frontend/
|   |-- package.json
|   |-- vite.config.js
|   |-- vercel.json
|   `-- src/
|       |-- App.jsx
|       |-- main.jsx
|       |-- api/axios.js
|       |-- components/
|       |   |-- Sidebar.jsx
|       |   `-- Topbar.jsx
|       `-- pages/
|           |-- Dashboard.jsx
|           |-- Upload.jsx
|           |-- Analyze.jsx
|           |-- Chat.jsx
|           |-- Report.jsx
|           `-- Flowchart.jsx
|-- docker/
|   |-- backend.Dockerfile
|   |-- frontend.Dockerfile
|   `-- nginx.conf
|-- scripts/
|   |-- docker-up.ps1
|   `-- smoke_test.py
|-- supabase/
|   |-- config.toml
|   `-- migrations/001_risk_analyses.sql
|-- docker-compose.yml
|-- requirements.txt
|-- .env.example
|-- start-dev.ps1
|-- stop-dev.ps1
`-- README.md
```

## API Reference (Accurate to Current Code)

### Health and root

- `GET /` -> root status message
- `GET /health` -> health check

### Upload and document management

- `POST /upload-document` (multipart, single `file`)
- `POST /upload-documents` (multipart, multiple `files`)
- `GET /documents`
- `DELETE /documents/{document_name}`

### Analysis, chat, report, flowchart

- `POST /analyze-risk`
  - Body: `{ "query": "..." }` (optional)
- `POST /chat`
  - Body: `{ "question": "...", "history": [{ "role": "user|assistant", "content": "..." }] }`
- `POST /generate-report`
  - Body: `{ "query": "..." }` (optional)
- `POST /generate-flowchart`
  - Body: `{ "document_name": "..." }` (optional, omit for all docs)

Swagger docs: `http://127.0.0.1:8000/docs`

## Environment Variables

Copy `.env.example` to `.env` (local) or `.env.production` (docker/prod).

### AI / RAG

- `GROQ_API_KEY`
- `GROQ_MODEL_NAME`
- `EMBEDDING_MODEL_NAME`
- `EMBEDDING_MODEL_OFFLINE`
- `EMBEDDING_MODEL_CACHE_DIR`

### Backend

- `API_HOST`
- `API_PORT`
- `APP_ENV`

### CORS / frontend connectivity

- `FRONTEND_DEV_URL`
- `ALLOWED_ORIGINS`

### Vite and frontend runtime

- `VITE_API_BASE_URL`
- `VITE_API_PROXY_TARGET`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Supabase backend logging

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Local Development

### 1) Install backend dependencies

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 3) Configure environment

```bash
copy .env.example .env
```

### 4) Run backend and frontend

Terminal A:

```bash
cd backend
..\.venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Terminal B:

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

### 5) Windows helper scripts

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
powershell -ExecutionPolicy Bypass -File .\stop-dev.ps1
```

## Docker Deployment

```bash
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

URLs:

- Frontend (Nginx): `http://localhost:8080`
- Backend API: `http://localhost:8000`
- Health: `http://localhost:8000/health`

Smoke test:

```bash
python scripts/smoke_test.py --base-url http://127.0.0.1:8000
```

## Storage and Session Behavior

- Uploaded files: `backend/data/documents/`
- Vector index and chunks: `backend/embeddings/`
- Generated reports: `backend/reports/`

Session reset behavior:

- Uploading a new batch clears previous session state.
- Backend startup clears analysis session state.

## Supabase Logging Setup

1. Configure Supabase env variables.
2. Run `supabase/migrations/001_risk_analyses.sql` in Supabase SQL Editor.
3. Backend will log best-effort risk analysis events to `risk_analyses`.

If Supabase variables are missing or network fails, core analysis still works (logging is non-blocking).

## Troubleshooting

- `No documents uploaded yet.` -> Upload PDFs first.
- `No relevant context found` -> Try a more specific query.
- Weak AI responses -> Validate `GROQ_API_KEY` and model availability.
- Slow first run -> Embedding/model initialization can take time.
- CORS/API issues -> Check `ALLOWED_ORIGINS`, `FRONTEND_DEV_URL`, and Vite proxy settings.
- Flowchart render errors -> Regenerate; sanitizer and fallback heuristics are already built in.

## License

MIT. See `LICENSE`.
