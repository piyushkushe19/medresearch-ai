# 🧠 MedResearch AI — Intelligent Medical Research Assistant

> Intelligent Medical Research Assistant powered by AI, real scientific sources, and full-stack engineering.

> MedResearch AI is a production-grade MERN stack platform that retrieves, ranks, and summarizes **real medical research papers** and **clinical trials** using open-source LLMs. It is designed to help users explore evidence-based healthcare information faster and smarter.
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

```bash
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

## 🌐 Local URLs

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5001 |

---

## 📡 Core Endpoints

```http
POST /api/query
POST /api/chat
GET  /api/research?q=...
GET  /api/trials?q=...
```

## 💡 Why This Project Matters

- Medical information is scattered across multiple platforms and often difficult to understand.

- MedResearch AI simplifies access to trusted evidence by combining research retrieval with AI reasoning.

## 🚀 Future Improvements
- User authentication
- Saved reports / bookmarks
- PDF exports
- Citation graphs
- Voice search
- Live deployment
- RAG source highlighting

## ⚠️ Disclaimer

- This platform is for research and educational purposes only.
- Not medical advice
- Not a replacement for doctors
- Always consult healthcare professionals for decisions

# 🧠 MedResearch AI
> Search Smarter. Learn Faster. Trust Evidence.