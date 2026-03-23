# 🛡️ AI Compliance & Risk Intelligence Platform

> An AI-powered platform for enterprise document compliance analysis — upload PDFs, index them with a local RAG pipeline, and get intelligent compliance insights, risk analysis, and downloadable reports.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)
![LangChain](https://img.shields.io/badge/LangChain-RAG-1C3C3C?style=flat-square)
![Groq](https://img.shields.io/badge/LLM-Groq-F55036?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Local Setup](#-local-setup)
- [Environment Variables](#-environment-variables)
- [Running the App](#-running-the-app)
- [Docker (production-style)](#-docker-production-style)
- [Using the App](#-using-the-app)
- [API Reference](#-api-reference)
- [Example API Calls](#-example-api-calls)
- [Storage Behavior](#-storage-behavior)
- [Use Cases](#-use-cases)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Author](#-author)
- [License](#-license)

---

## 🔍 Overview

The **AI Compliance & Risk Intelligence Platform** is a full-stack application that enables enterprise teams to analyze legal, regulatory, and policy documents using AI. Simply upload one or more PDF documents, and the platform indexes them into a local RAG (Retrieval-Augmented Generation) pipeline. You can then query your documents for compliance gaps, ask natural-language questions, and generate professional compliance reports — all in one workflow.

Built with a **FastAPI** backend, a **React + Vite** frontend, **LangChain** for retrieval orchestration, **FAISS** for vector search, and **Groq** for fast LLM inference.

---

## ✨ Key Features

- 📄 **Batch PDF Upload** — Upload one or multiple PDFs in a single session
- 🧠 **RAG Pipeline** — Documents are chunked, embedded, and indexed via FAISS for semantic retrieval
- 🔍 **Compliance Analysis** — Run targeted risk and compliance queries across all indexed documents
- 💬 **Multi-document Chat** — Ask natural-language questions across your entire document set
- 📊 **Report Generation** — Download a professional compliance summary as a PDF (via ReportLab)
- 🗂️ **Session Management** — Add or remove documents; sessions auto-reset on backend restart or new upload batch
- ⚡ **Groq LLM** — Fast inference with `llama-3.3-70b-versatile`; graceful heuristic fallback when unavailable
- 🔌 **OpenAPI Docs** — Interactive Swagger UI available at `/docs`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, Uvicorn, Python 3.10+ |
| **Frontend** | React 18, Vite, Axios |
| **RAG / Retrieval** | LangChain, sentence-transformers (`all-MiniLM-L6-v2`), FAISS |
| **LLM** | Groq API (`llama-3.3-70b-versatile`) |
| **Report Generation** | ReportLab |
| **Dev Tooling** | PowerShell scripts, `.cmd` launchers |

---

## 📁 Project Structure

```
AI-Compliance-Risk-Intelligence-Platform/
├── backend/
│   ├── app.py                  # FastAPI application entry point
│   ├── config/                 # Configuration & environment loading
│   ├── data/documents/         # Uploaded PDFs (session-scoped)
│   ├── rag_pipeline/           # Chunking, embedding, FAISS indexing
│   ├── risk_engine/            # Compliance & risk heuristics
│   ├── routes/                 # API route definitions
│   └── services/               # Business logic & report generation
├── frontend/
│   ├── src/                    # React components & pages
│   └── package.json
├── .env.example                # Environment variable template
├── requirements.txt            # Python dependencies
├── setup_project.py            # Project setup helper
├── start-dev.ps1               # Windows: start both servers
├── stop-dev.ps1                # Windows: stop tracked servers
├── backend_run.cmd             # Quick backend launcher
├── frontend_run.cmd            # Quick frontend launcher
└── README.md
```

---

## ✅ Prerequisites

- **Python** 3.10 or newer
- **Node.js** 18 or newer & **npm**
- A free **[Groq API key](https://console.groq.com/)** for LLM-powered analysis

---

## 🚀 Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Viraj1525/AI-Compliance-Risk-Intelligence-Platform.git
cd AI-Compliance-Risk-Intelligence-Platform
```

### 2. Set Up the Python Environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```env
GROQ_API_KEY=your_groq_api_key_here
```

See the full [Environment Variables](#-environment-variables) section below for all options.

---

## ⚙️ Environment Variables

```env
# ── LLM ──────────────────────────────────────────────────
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL_NAME=llama-3.3-70b-versatile

# ── Embeddings ───────────────────────────────────────────
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
EMBEDDING_MODEL_OFFLINE=false
# EMBEDDING_MODEL_CACHE_DIR=D:\models\sentence-transformers

# ── Backend ──────────────────────────────────────────────
API_HOST=127.0.0.1
API_PORT=8000

# ── Frontend / CORS ──────────────────────────────────────
FRONTEND_DEV_URL=http://127.0.0.1:5173
ALLOWED_ORIGINS=http://127.0.0.1:5173

# ── Vite Proxy ───────────────────────────────────────────
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
```

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Required for LLM analysis & chat. Without it, responses fall back to heuristics. |
| `EMBEDDING_MODEL_OFFLINE` | Set to `true` to load embeddings from local cache (no internet needed). |
| `EMBEDDING_MODEL_CACHE_DIR` | Local path to a cached sentence-transformers model. |
| `VITE_API_PROXY_TARGET` | The backend URL that Vite forwards `/api` requests to in development. |

---

## ▶️ Running the App

### Option 1 — Manual (Cross-Platform)

Open **two terminals** from the project root:

**Terminal 1 — Backend:**
```bash
cd backend
../.venv/Scripts/python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
# macOS/Linux: ../.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

### Option 2 — PowerShell Scripts (Windows)

```powershell
# Start both servers
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1

# Stop both servers
powershell -ExecutionPolicy Bypass -File .\stop-dev.ps1
```

The `start-dev.ps1` script manages PIDs (stored in `.run/`) and routes logs to `logs/`.

### Access Points

| Service | URL |
|---|---|
| Frontend App | http://127.0.0.1:5173 |
| Backend API | http://127.0.0.1:8000 |
| Swagger Docs | http://127.0.0.1:8000/docs |
| Health Check | http://127.0.0.1:8000/health |

---

## 🐳 Docker (production-style)

1. **Configure environment** — Copy `.env.example` to `.env.production` and set real values (`GROQ_API_KEY`, `SUPABASE_*`, `FRONTEND_DEV_URL` / `ALLOWED_ORIGINS` for your domain, and `VITE_SUPABASE_*` for the frontend build).

2. **Supabase schema** — In the Supabase SQL editor, run [`supabase/migrations/001_risk_analyses.sql`](supabase/migrations/001_risk_analyses.sql) to create the `risk_analyses` table.

3. **Build & run** (from the project root):

```bash
# Recommended: pass env file so Compose can substitute variables and the frontend build sees Vite envs
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

**Windows (helper script):**

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-up.ps1
```

4. **Verify**

| Service | URL |
|---|---|
| Frontend (Nginx) | http://localhost:8080 |
| Backend API | http://localhost:8000 |
| Health | http://localhost:8000/health |

The frontend container proxies `/api/*` to the backend. Large PDF uploads are allowed up to **100MB** (see `docker/nginx.conf`).

5. **Smoke test**

```bash
python scripts/smoke_test.py --base-url http://127.0.0.1:8000
```

**Note:** First backend startup can take several minutes while ML dependencies initialize; the Compose health check allows up to **5 minutes** before marking the service unhealthy.

---

## 🖥️ Using the App

1. **Upload** — Go to the upload page and select one or more PDFs. All files in the batch are indexed together into a shared session.
2. **Analyze** — Navigate to the Analyze tab and run compliance or risk queries (e.g., *"Identify GDPR violations"* or *"Summarize data retention risks"*).
3. **Chat** — Use the Chat interface to ask free-form questions across all indexed documents.
4. **Report** — Generate and download a professional PDF compliance report.
5. **Manage** — View indexed documents and remove individual files from the session.

> **Note:** Uploading a new batch clears the previous session. Restarting the backend also clears temporary files and index data.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root status check |
| `GET` | `/health` | Backend health check |
| `POST` | `/upload-document` | Upload a single PDF |
| `POST` | `/upload-documents` | Upload multiple PDFs in one batch |
| `POST` | `/analyze-risk` | Run compliance or risk analysis |
| `POST` | `/chat` | Ask questions across indexed documents |
| `POST` | `/generate-report` | Generate a downloadable compliance PDF |
| `GET` | `/documents` | List documents indexed in the current session |
| `DELETE` | `/documents/{document_name}` | Remove a specific document from the session |

Full interactive documentation is available at **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**.

---

## 🔧 Example API Calls

**Upload a single document:**
```bash
curl -X POST "http://127.0.0.1:8000/upload-document" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample.pdf"
```

**Upload multiple documents:**
```bash
curl -X POST "http://127.0.0.1:8000/upload-documents" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@policy.pdf" \
  -F "files=@contract.pdf"
```

**Run a compliance analysis:**
```bash
curl -X POST "http://127.0.0.1:8000/analyze-risk" \
  -H "Content-Type: application/json" \
  -d '{"query": "Analyze these documents for GDPR and data security risks"}'
```

**Ask a question via chat:**
```bash
curl -X POST "http://127.0.0.1:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the key data retention obligations mentioned?"}'
```

**Generate a compliance report:**
```bash
curl -X POST "http://127.0.0.1:8000/generate-report" \
  -H "Content-Type: application/json" \
  -d '{"query": "Create an executive compliance summary"}'
```

---

## 💾 Storage Behavior

This project uses lightweight session-scoped local storage:

| Location | Contents |
|---|---|
| `backend/data/documents/` | Uploaded PDFs for the current session |
| `backend/reports/` | Generated compliance report PDFs |
| In-memory / local FAISS | Embeddings and chunk metadata for the active session |

**Auto-cleared when:**
- The backend server restarts
- A new upload batch is submitted

This design ensures a clean slate for every new analysis session without requiring a database.

---

## 🏢 Use Cases

- **Enterprise compliance review** — Audit internal policies against regulatory frameworks (GDPR, HIPAA, SOC 2)
- **Legal document analysis** — Surface risk clauses and obligations in contracts
- **Data privacy verification** — Check privacy policies for gaps or non-compliance
- **Internal governance monitoring** — Evaluate governance documents against company standards
- **Risk management automation** — Automate first-pass risk triage across large document sets

---

## 🔎 Troubleshooting

| Issue | Solution |
|---|---|
| Frontend loads but API calls fail | Ensure the backend is running on port `8000` |
| Analysis returns weak or generic results | Verify `GROQ_API_KEY` is correctly set in `.env` |
| Slow startup on first run | Normal — the embedding model (`all-MiniLM-L6-v2`) initializes on first load |
| Want offline embeddings | Cache the model locally and set `EMBEDDING_MODEL_OFFLINE=true` |
| PowerShell script blocked | Run with `-ExecutionPolicy Bypass` flag |

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please keep PRs focused and include a brief description of what changed and why.

---

## 👤 Author

**Viraj Agrawal** — AI Developer focused on Generative AI, Retrieval-Augmented Generation (RAG), and AI-powered enterprise applications.

- GitHub: [@Viraj1525](https://github.com/Viraj1525)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
