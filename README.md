# 🧠 MedResearch AI — Intelligent Medical Research Assistant

> Intelligent Medical Research Assistant powered by AI, real scientific sources, and full-stack engineering.

MedResearch AI is a production-grade MERN stack platform that retrieves, ranks, and summarizes **real medical research papers** and **clinical trials** using open-source LLMs. It is designed to help users explore evidence-based healthcare information faster and smarter.
---

## 🚀 Overview

MedResearch AI is a full-stack healthcare research platform that helps users explore medical evidence faster by combining:

- 📚 Real research papers  
- 🧪 Clinical trials  
- 🤖 AI-generated summaries  
- 🔍 Smart medical query understanding  

Instead of manually searching multiple sources, users can ask one question and receive structured, evidence-backed insights.

---

## ✨ Key Features

### 🔍 Smart Search Intelligence
- Detects diseases, symptoms, treatments, conditions
- Understands follow-up questions with memory
- Expands search using medical synonyms

### 📚 Multi-Source Evidence Retrieval
Aggregates real data from:

- PubMed  
- OpenAlex  
- ClinicalTrials.gov

### 📈 Intelligent Ranking Engine
Ranks studies using:

- TF-IDF relevance scoring  
- Citation impact  
- Recency weighting  
- Duplicate filtering  
- Source credibility  

### 🤖 AI Summaries with Local LLMs
Powered by Ollama + open-source models:

- Condition overview  
- Treatment insights  
- Risks / side effects  
- Latest findings  
- Clinical relevance  

### ⚡ Production Backend
- Parallel API fetching  
- Fast caching system  
- Fault-tolerant pipelines  
- Optimized response times  

---

## 🏗️ Tech Stack

| Layer | Technologies |
|------|--------------|
| Frontend | React.js, Axios, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| AI Layer | Ollama, Llama, Mistral |
| APIs | PubMed, OpenAlex, ClinicalTrials.gov |

---

## 🧠 Architecture

```text
User Query
   ↓
Query Understanding Engine
   ↓
PubMed + OpenAlex + Trials APIs
   ↓
Ranking & Deduplication Engine
   ↓
AI Summary Generator
   ↓
Structured Research Output


---

## 🏗️ Architecture Overview

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│               QUERY UNDERSTANDING LAYER                 │
│  • Entity extraction (disease, intent, location)        │
│  • Query expansion with medical synonyms               │
│  • Follow-up vs new query detection                     │
└──────────────────────┬──────────────────────────────────┘
                       │ expanded queries
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────────┐
    │ PubMed   │ │OpenAlex  │ │ClinicalTrials│
    │ API      │ │ API      │ │.gov API      │
    │ ~100 res │ │ ~100 res │ │  ~50 trials  │
    └──────────┘ └──────────┘ └──────────────┘
          │            │            │
          └────────────┼────────────┘
                       │ 200-300 raw results
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  RANKING ENGINE                         │
│  • TF-IDF term relevance scoring                       │
│  • Jaccard keyword similarity                          │
│  • Source credibility scoring                          │
│  • Recency weighting                                   │
│  • Citation impact (OpenAlex)                          │
│  • Deduplication (DOI + cosine title similarity)       │
│  • Source diversity enforcement                         │
└──────────────────────┬──────────────────────────────────┘
                       │ top 8 papers + top 5 trials
                       ▼
┌─────────────────────────────────────────────────────────┐
│              LLM REASONING LAYER (Ollama)               │
│  • Grounded prompt with retrieved evidence only        │
│  • Anti-hallucination instructions                     │
│  • Structured output format enforcement                │
│  • Fallback to structured summary if offline           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
          Structured Medical Research Report
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | ≥ 18.x  |
| MongoDB     | ≥ 6.x   |
| Ollama      | Latest  |

### 1. Install Ollama + Pull Model

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the LLM (choose one)
ollama pull llama3.2          # Recommended: fast, 3B params
ollama pull mistral           # Alternative: higher quality
ollama pull llama3.1:8b       # Best quality, needs 8GB+ RAM

# Verify it's running
ollama run llama3.2 "Hello"
```

### 2. Clone & Install

```bash
git clone <repo-url>
cd medical-research-assistant

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env:
#   OLLAMA_MODEL=llama3.2
#   PUBMED_API_KEY=your_key  (optional, get free at https://www.ncbi.nlm.nih.gov/account/)
#   CONTACT_EMAIL=your@email.com  (required for OpenAlex polite pool)
#   MONGODB_URI=mongodb://localhost:27017/medical_research
```

### 4. Start MongoDB

```bash
# macOS with Homebrew
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or with Docker
docker run -d -p 27017:27017 mongo:7
```

### 5. Run the Application

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm start
```

Open **http://localhost:3000**

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### `POST /api/query`
Run the full research pipeline.

**Request:**
```json
{
  "query": "deep brain stimulation Parkinson's disease",
  "context": {
    "disease": "Parkinson's disease",
    "intent": "treatment"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": {
      "original": "deep brain stimulation Parkinson's disease",
      "disease": "Parkinson's disease",
      "intent": "treatment",
      "diseaseExpansions": ["Parkinson's disease", "parkinsonism", "PD"],
      "searchQueries": { "pubmed": "...", "openAlex": "..." }
    },
    "papers": [
      {
        "id": "pubmed_12345678",
        "title": "Deep Brain Stimulation for Parkinson Disease...",
        "authors": ["Smith J", "Jones A"],
        "year": 2023,
        "journal": "New England Journal of Medicine",
        "abstract": "...",
        "keywords": ["Parkinson disease", "DBS"],
        "url": "https://pubmed.ncbi.nlm.nih.gov/12345678/",
        "source": "PubMed",
        "relevanceScore": 87
      }
    ],
    "trials": [
      {
        "nctId": "NCT04567890",
        "title": "DBS for Advanced Parkinson's",
        "status": "RECRUITING",
        "phase": "3",
        "eligibility": { "minAge": "18 Years", "maxAge": "75 Years" },
        "locations": [{ "city": "Boston", "country": "United States" }],
        "contact": { "email": "trials@hospital.edu" },
        "url": "https://clinicaltrials.gov/study/NCT04567890"
      }
    ],
    "aiSummary": "## CONDITION OVERVIEW\n...",
    "metadata": {
      "totalRawPapers": 187,
      "finalPapers": 8,
      "finalTrials": 5,
      "llmModel": "llama3.2",
      "usedLLM": true,
      "totalTimeMs": 8432
    }
  }
}
```

---

### `POST /api/chat`
Multi-turn conversational interface with session memory.

**Request:**
```json
{
  "message": "lung cancer immunotherapy",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** Same structure as `/api/query` plus `sessionId` and `queryType` ("new" | "followup").

---

### `GET /api/research?q=...&source=all&limit=8`
Direct research retrieval (no LLM reasoning).

| Param | Values | Default |
|-------|--------|---------|
| q | search query | required |
| source | `pubmed`, `openalex`, `all` | `all` |
| limit | 1–20 | 8 |

---

### `GET /api/trials?q=...&location=...&limit=5`
Direct clinical trials search.

| Param | Description |
|-------|-------------|
| q | condition/disease |
| location | filter by country/city |
| limit | max results |

---

### `GET /api/query/understand?q=...`
Inspect query parsing without running pipeline.

---

### `GET /api/chat/:sessionId/history`
Get conversation history for a session.

---

### `DELETE /api/chat/:sessionId`
Clear a session.

---

## 🧩 Architecture Decisions

### Why keyword search over vector embeddings?
- **No GPU required** — runs on any machine
- **Medical synonyms** are handled explicitly in `queryUnderstanding.js` with domain knowledge
- **TF-IDF + Jaccard** scores are interpretable and auditable
- Vector embeddings can be added later by replacing `rankingEngine.js`

### Why Ollama over HuggingFace Inference API?
- **Fully local** — no API keys, no rate limits, no data leaving your machine
- **HIPAA-friendly** for real-world deployment
- Easily swappable: change `OLLAMA_MODEL` in `.env`

### Why in-memory caching over Redis?
- `node-cache` handles single-instance deployment well
- Results TTL = 1 hour (configurable via `CACHE_TTL_SECONDS`)
- Redis can replace this for multi-instance deployment

### Why parallel retrieval?
```js
const [pubmed, openAlex, trials] = await Promise.allSettled([...])
```
- Cuts total retrieval time from ~12s → ~4s
- `allSettled` ensures one failing API doesn't break the whole pipeline

---

## 📊 Sample Queries & Expected Output

| Query | Disease Extracted | Intent | Papers | Trials |
|-------|------------------|--------|--------|--------|
| `Parkinson's disease deep brain stimulation` | Parkinson's disease | treatment | 8 | 5 |
| `BRCA2 mutation breast cancer risk` | breast cancer | diagnosis | 8 | 3 |
| `COVID-19 long COVID neurological symptoms` | COVID-19 | general | 8 | 5 |
| `type 2 diabetes GLP-1 agonist outcomes` | diabetes mellitus | treatment | 8 | 5 |
| `Alzheimer biomarkers blood test diagnosis` | Alzheimer's disease | diagnosis | 7 | 4 |

### Follow-up Query Example
```
User:  "lung cancer treatments"
→ Disease context set to: lung cancer

User:  "what about vitamin D?"
→ System detects follow-up, expands to:
   "vitamin D lung cancer treatment"
→ Results maintain lung cancer context
```

---

## 📁 Folder Structure

```
medical-research-assistant/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express app entry point
│   │   ├── config/
│   │   │   └── database.js        # MongoDB connection
│   │   ├── routes/
│   │   │   ├── query.js           # POST /api/query
│   │   │   ├── chat.js            # POST /api/chat
│   │   │   ├── research.js        # GET /api/research
│   │   │   └── trials.js          # GET /api/trials
│   │   ├── services/
│   │   │   ├── queryUnderstanding.js   # NLP + query expansion
│   │   │   ├── researchPipeline.js     # Main orchestrator
│   │   │   └── chatService.js          # Session management
│   │   ├── retrieval/
│   │   │   ├── pubmedRetrieval.js      # PubMed E-utilities API
│   │   │   ├── openAlexRetrieval.js    # OpenAlex API
│   │   │   ├── clinicalTrialsRetrieval.js  # ClinicalTrials.gov v2
│   │   │   └── rankingEngine.js        # Scoring + dedup + ranking
│   │   ├── ai/
│   │   │   └── ollamaService.js        # Ollama LLM integration
│   │   ├── models/
│   │   │   └── Conversation.js         # MongoDB conversation schema
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   └── utils/
│   │       └── logger.js               # Winston logger
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js                 # Root component + layout
│   │   ├── App.css                # Global design system
│   │   ├── index.js
│   │   ├── services/
│   │   │   └── api.js             # Axios API client
│   │   └── components/
│   │       ├── ChatInterface.js   # Message input + display
│   │       ├── ResultsPanel.js    # Tabbed results container
│   │       ├── PaperCard.js       # Research paper display
│   │       ├── TrialCard.js       # Clinical trial display
│   │       ├── AISummary.js       # AI-generated insights
│   │       └── Sidebar.js         # Session history sidebar
│   └── package.json
│
└── README.md
```

---

## 🐳 Docker Deployment

```bash
# Run everything with Docker Compose
docker compose up

# Or build individually
docker build -t medresearch-backend ./backend
docker build -t medresearch-frontend ./frontend
```

---

## ⚙️ Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Backend port |
| `MONGODB_URI` | localhost:27017 | MongoDB connection |
| `OLLAMA_BASE_URL` | localhost:11434 | Ollama server URL |
| `OLLAMA_MODEL` | llama3.2 | Model to use |
| `PUBMED_API_KEY` | — | Optional (increases rate limit from 3→10 req/s) |
| `CONTACT_EMAIL` | — | Required for OpenAlex polite pool |
| `MAX_RAW_RESULTS_PER_SOURCE` | 100 | Raw papers per source |
| `FINAL_PAPERS_COUNT` | 8 | Papers in final output |
| `FINAL_TRIALS_COUNT` | 5 | Trials in final output |
| `CACHE_TTL_SECONDS` | 3600 | Cache TTL (1 hour) |

---
