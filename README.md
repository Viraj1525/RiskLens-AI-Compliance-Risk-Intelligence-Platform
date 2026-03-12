# AI Compliance and Risk Intelligence Platform

AI-assisted platform for uploading enterprise PDF documents, indexing them with a local RAG pipeline, and generating compliance analysis, chat answers, and downloadable reports.

## What It Does

- Upload one PDF or multiple PDFs in a single batch
- Analyze all uploaded PDFs together in one shared session
- Ask questions across indexed documents
- Generate a compliance report PDF
- Remove indexed documents from the current session
- Reset old uploads automatically when the backend restarts or a new upload batch begins

## Tech Stack

- Backend: FastAPI, Uvicorn, Python
- Frontend: React, Vite, Axios
- Retrieval: LangChain, sentence-transformers, FAISS
- LLM: Groq with local heuristic fallbacks where supported
- Reporting: ReportLab

## Project Structure

```text
AI-Compliance-Risk-Intelligence-Platform/
|-- backend/
|   |-- app.py
|   |-- config/
|   |-- data/documents/
|   |-- rag_pipeline/
|   |-- risk_engine/
|   |-- routes/
|   `-- services/
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

## Local Setup

1. Clone the repository and open it in your terminal.

```bash
git clone https://github.com/Viraj1525/AI-Compliance-Risk-Intelligence-Platform.git
cd AI-Compliance-Risk-Intelligence-Platform
```

2. Create a virtual environment and install backend dependencies.

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

3. Install frontend dependencies.

```bash
cd frontend
npm install
cd ..
```

4. Create a `.env` file in the project root. You can copy `.env.example` and adjust values for your machine.

Smallest working example:

```env
GROQ_API_KEY=your_groq_api_key
```

## Environment Variables

Common local variables:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL_NAME=llama-3.3-70b-versatile
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
EMBEDDING_MODEL_OFFLINE=false
# EMBEDDING_MODEL_CACHE_DIR=D:\models\sentence-transformers

API_HOST=127.0.0.1
API_PORT=8000
FRONTEND_DEV_URL=http://127.0.0.1:5173
ALLOWED_ORIGINS=http://127.0.0.1:5173

VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
```

Notes:

- `GROQ_API_KEY` enables LLM-powered analysis and chat.
- If Groq access is unavailable, parts of the app may fall back to heuristic behavior.
- `EMBEDDING_MODEL_OFFLINE=true` is useful if the embedding model is already cached locally.
- `VITE_API_PROXY_TARGET` controls where the Vite dev server forwards `/api` requests.

## Run Locally

### Option 1: Start Manually

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

### Option 2: Use the Included Windows Scripts

From the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

This starts the frontend and backend, stores PID files in `.run/`, and writes logs to `logs/`.

To stop tracked processes:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-dev.ps1
```

## Open in Browser

- Frontend: `http://127.0.0.1:5173`
- Backend docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

The frontend uses a Vite proxy, so browser requests to `/api` are forwarded to the backend.

## How to Use the App

1. Open the upload page.
2. Upload one PDF or multiple PDFs together.
3. Wait until indexing is complete.
4. Go to Analyze to run compliance or risk queries.
5. Use Chat to ask document-specific questions.
6. Use Report to generate the compliance report.

Important behavior:

- A new upload batch clears the previous analysis session.
- All PDFs uploaded in the same batch are analyzed together.
- Restarting the backend also clears old temporary files and indexed session data.

## API Endpoints

- `GET /` - root status
- `GET /health` - backend health check
- `POST /upload-document` - upload one PDF
- `POST /upload-documents` - upload multiple PDFs in one batch
- `POST /analyze-risk` - run compliance or risk analysis
- `POST /chat` - ask questions across indexed documents
- `POST /generate-report` - generate a report PDF
- `GET /documents` - list indexed documents in the current session
- `DELETE /documents/{document_name}` - delete one indexed document

## Example API Calls

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

## Local Storage Behavior

This project uses temporary session-style storage for local runs:

- Uploaded files are stored in `backend/data/documents/`
- Embeddings and chunk metadata are stored in backend-managed local storage during the session
- Generated reports are stored in `backend/reports/`

These are cleared when:

- the backend starts
- a new upload batch is submitted

This prevents old documents from affecting a new analysis session.

## Troubleshooting

- If the frontend opens but API calls fail, make sure the backend is running on port `8000`.
- If uploads work but analysis quality is weak, check whether `GROQ_API_KEY` is set.
- If model loading is slow on first run, that is usually the embedding model initializing.
- If you want to avoid network access for embeddings, cache the model locally and set `EMBEDDING_MODEL_OFFLINE=true`.

## Use Cases

- Enterprise compliance review
- Legal document analysis
- Data privacy policy verification
- Internal governance monitoring
- Risk management automation

## Author

**Viraj Agrawal**

AI Developer focused on:

- Generative AI
- Retrieval-Augmented Generation (RAG)
- AI-powered enterprise applications

GitHub:
https://github.com/Viraj1525

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

This project is licensed under the MIT License.
