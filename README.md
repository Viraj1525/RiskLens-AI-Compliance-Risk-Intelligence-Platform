# AI Compliance and Risk Intelligence Platform

AI-assisted platform for uploading enterprise PDFs, indexing them with a local RAG pipeline, and generating compliance analysis, chat answers, and audit reports.

## What it does

- Upload one or more PDF files in a single batch
- Analyze all uploaded PDFs together in one shared session
- Ask questions across the indexed documents
- Generate a compliance report PDF
- Remove indexed documents from the current session
- Reset old uploads automatically when the backend restarts or a new upload batch begins

## Stack

- Backend: FastAPI, Uvicorn, Python
- Frontend: React, Vite, Axios
- Retrieval: sentence-transformers, FAISS
- LLM: Groq with heuristic fallback if API access is unavailable

## Project structure

```text
AI-Compliance-Risk-Intelligence-Platform/
|-- backend/
|   |-- app.py
|   |-- routes/
|   |-- services/
|   |-- rag_pipeline/
|   |-- risk_engine/
|   |-- config/
|   `-- data/documents/
|-- frontend/
|   |-- src/
|   `-- package.json
|-- .env.example
|-- requirements.txt
|-- start-dev.ps1
|-- stop-dev.ps1
|-- backend_run.cmd
|-- frontend_run.cmd
`-- README.md
```

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- npm

## Local setup

1. Clone the repository and open it in your terminal.

2. Create a virtual environment and install backend dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

3. Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

4. Create a `.env` file in the project root.

Smallest working example:

```env
GROQ_API_KEY=your_groq_api_key
```

You can also copy values from `.env.example` and adjust them for your machine.

## Environment variables

Common local variables:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL_NAME=llama-3.3-70b-versatile
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
EMBEDDING_MODEL_OFFLINE=false
API_HOST=127.0.0.1
API_PORT=8000
FRONTEND_DEV_URL=http://127.0.0.1:5173
ALLOWED_ORIGINS=http://127.0.0.1:5173
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
```

Notes:

- `GROQ_API_KEY` enables LLM-powered analysis and chat.
- If Groq is unavailable, the app falls back to heuristic analysis.
- `EMBEDDING_MODEL_OFFLINE=true` is useful if you already have the embedding model cached locally.
- `VITE_API_PROXY_TARGET` controls where the Vite dev server forwards `/api` requests.

## Run locally

### Option 1: Start manually

Open two terminals from the project root.

Backend:

```bash
cd backend
..\.venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Frontend:

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

### Option 2: Use the included Windows scripts

From the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

This starts the frontend and backend, stores PID files in `.run/`, and writes logs to `logs/`.

To stop tracked processes:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-dev.ps1
```

## Open in browser

- Frontend: `http://127.0.0.1:5173`
- Backend docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

The frontend uses a Vite proxy, so browser requests to `/api` go to the backend server.

## How to use the app

1. Open the upload page.
2. Upload one PDF or multiple PDFs together.
3. Wait until indexing is complete.
4. Go to Analyze to run compliance or risk queries.
5. Use Chat to ask document-specific questions.
6. Use Report to generate the compliance report and risk distribution graph.

Important behavior:

- A new upload batch clears the previous analysis session.
- All PDFs uploaded in the same batch are analyzed together.
- Restarting the backend also clears old temporary files and indexed session data.

## API endpoints

- `GET /` - root status
- `GET /health` - backend health check
- `POST /upload-document` - upload one PDF
- `POST /upload-documents` - upload multiple PDFs in one batch
- `POST /analyze-risk` - run compliance/risk analysis
- `POST /chat` - ask questions across indexed documents
- `POST /generate-report` - generate report PDF
- `GET /documents` - list indexed documents in the current session
- `DELETE /documents/{document_name}` - delete one indexed document

## Example API calls

Upload one document:

```bash
curl -X POST "http://127.0.0.1:8000/upload-document" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample.pdf"
```

Upload multiple documents:

```bash
curl -X POST "http://127.0.0.1:8000/upload-documents" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@policy.pdf" \
  -F "files=@contract.pdf"
```

Analyze risk:

```bash
curl -X POST "http://127.0.0.1:8000/analyze-risk" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"Analyze these documents for GDPR and security risks\"}"
```

Generate report:

```bash
curl -X POST "http://127.0.0.1:8000/generate-report" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"Create an executive compliance summary\"}"
```

## Local storage behavior

This project uses temporary session-style storage for local runs:

- Uploaded files are stored in `backend/data/documents/`
- Embeddings and chunk metadata are stored in `backend/embeddings/`
- Generated reports are stored in `backend/reports/`

These are cleared when:

- the backend starts
- a new upload batch is submitted

This prevents old documents from affecting a new analysis session.

## Troubleshooting

- If the frontend opens but API calls fail, make sure the backend is running on port `8000`.
- If uploads work but analysis is weak, check whether `GROQ_API_KEY` is set.
- If model loading is slow on first run, that is usually the embedding model initializing.
- If you want to avoid network access for embeddings, cache the model locally and set `EMBEDDING_MODEL_OFFLINE=true`.

## License

MIT
