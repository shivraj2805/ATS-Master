# ATS Master — System Design Document

> **Version:** 1.0 &nbsp;|&nbsp; **Date:** July 2026 &nbsp;|&nbsp; **Stack:** React · Node.js · Python/Flask · MongoDB · Gemini AI

---

## 1. Overview

**ATS Master** is an AI-powered Applicant Tracking System (ATS) resume analyzer and optimizer. It helps job seekers maximize their resume's match against a given job description by providing:

- Deep ATS compatibility scoring
- Semantic + keyword matching against job descriptions
- AI-generated optimization suggestions (summaries, bullet points, cover letters)
- GitHub profile and LeetCode competitive programming analysis
- Project verification against live GitHub repositories
- PDF report generation

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│         React + Vite (Port 5173)  ·  Tailwind CSS                  │
│  Pages: Landing · Login · Signup · Profile · Results ·              │
│         GitHub Result · CP Result · All Reviews                     │
└────────────────────┬────────────────────────────────────────────────┘
                     │ HTTP / REST
┌────────────────────▼────────────────────────────────────────────────┐
│                       API GATEWAY LAYER                             │
│              Node.js + Express (Port 3001)                          │
│  Routes: /api/auth · /api/resume · /api/optimization ·             │
│          /api/reviews · /api/download-report                        │
│  Middleware: JWT Auth · Multer Upload · CORS                        │
└──────┬───────────────────────────────────────────┬──────────────────┘
       │ Mongoose ODM                               │ HTTP (internal)
┌──────▼──────────┐                   ┌────────────▼──────────────────┐
│   MongoDB Atlas │                   │     Python AI Service         │
│  (Database)     │                   │     Flask (Port 5000)          │
│                 │                   │                               │
│  Collections:   │                   │  Endpoints:                   │
│  · users        │                   │  · /api/ai/optimize-summary   │
│  · resumes      │                   │  · /api/ai/enhance-bullets    │
│  · analysisresults│                 │  · /api/ai/keyword-suggestions│
│  · jobdescriptions│                 │  · /api/ai/ats-tips           │
│  · reviews      │                   │  · /api/ai/generate-cover-letter│
└─────────────────┘                   │  · /api/extract-links         │
                                      │  · /api/extract-projects      │
                                      │  · /api/verify-projects       │
                                      │  · /api/github-analysis       │
                                      │  · /api/competitive-profile   │
                                      │  · /api/batch-profile-analysis│
                                      └────────────┬──────────────────┘
                                                   │
                              ┌────────────────────▼──────────┐
                              │   Google Gemini 2.5 Flash API  │
                              │   GitHub REST API              │
                              │   LeetCode Scraping/API        │
                              └───────────────────────────────┘
```

---

## 3. Service Architecture (Microservices via Docker)

| Service | Container | Port | Technology |
|---|---|---|---|
| **Client** | `atsmaster-client` | 5173 | React 18 + Vite + Tailwind |
| **Server** | `atsmaster-server` | 3001 | Node.js + Express + Mongoose |
| **AI Service** | `atsmaster-python-ai` | 5000 | Python + Flask + Gemini SDK |
| **Database** | External / MongoDB Atlas | 27017 | MongoDB |

All three containers are orchestrated via **Docker Compose**. The server depends on the AI service, and the client depends on both.

---

## 4. Component Breakdown

### 4.1 Client (React + Vite)

```
client/src/
├── pages/
│   ├── LandingPage.jsx         # Home / marketing page
│   ├── LoginPage.jsx           # User authentication
│   ├── SignupPage.jsx          # User registration
│   ├── ProfilePage.jsx         # User profile & history
│   ├── ResultsPage.jsx         # ATS analysis results
│   ├── GitHubResultPage.jsx    # GitHub profile analysis display
│   ├── CPResultPage.jsx        # Competitive programming results
│   ├── AllReviewsPage.jsx      # Browse all user reviews
│   └── NotFoundPage.jsx        # 404 handler
├── components/                 # Reusable UI components
├── contexts/                   # React Context (Auth state)
├── config/                     # API base URL config
└── styles/                     # Global styles
```

**State Management:** React Context API for authentication state.  
**Routing:** React Router v6.  
**HTTP Client:** Axios.

---

### 4.2 Server (Node.js + Express)

```
server/
├── index.js                    # App entry, middleware, route mounting
├── config/
│   └── database.js             # MongoDB connection (Mongoose)
├── models/
│   ├── User.js                 # User schema (bcrypt, JWT)
│   ├── Resume.js               # Resume + parsed data schema
│   ├── JobDescription.js       # JD schema with parsed keywords
│   ├── AnalysisResult.js       # ATS scores, matches, suggestions
│   └── Review.js               # User testimonial reviews
├── controllers/
│   ├── authController.js       # register / login / getMe
│   ├── resumeController.js     # analyzeResume / history / getAnalysis
│   ├── optimizationController.js # AI content generation calls
│   ├── reportController.js     # PDF report generation
│   └── reviewController.js     # CRUD for reviews
├── routes/
│   ├── auth.js                 # POST /register, /login; GET /me
│   ├── resume.js               # POST /analyze; GET /history, /analysis/:id
│   ├── optimization.js         # POST /generate, /enhance-bullets, /cover-letter
│   └── review.js               # CRUD /api/reviews
├── middleware/
│   └── auth.js                 # protect (JWT required) / optionalAuth
└── services/
    ├── resumeParser.js         # PDF/DOCX text extraction
    ├── semanticAnalyzer.js     # TF-IDF / cosine similarity scoring
    ├── atsScorer.js            # Composite ATS score calculation
    ├── skillExtractor.js       # Named entity / skill extraction
    ├── domainClassifier.js     # Job domain classification
    ├── aiService.js            # Internal bridge to Python AI service
    └── linkExtractorService.js # Link parsing coordination
```

**Authentication:** JWT (jsonwebtoken) with bcrypt password hashing.  
**File Upload:** Multer (5 MB limit, PDF/DOCX only) → `uploads/` folder.  
**AI Bridge:** `aiService.js` forwards requests to the Python Flask service via HTTP.

---

### 4.3 Python AI Service (Flask + Gemini)

```
python-ai-service/
├── app.py                              # Main Flask app + all AI routes
├── competitive_profile_agent_gemini.py # LeetCode CP analysis agent
├── github-agent.py                     # GitHub profile deep analysis
├── link-extractor.py                   # PDF hyperlink extraction tool
├── project_extractor_gemini.py         # Extract projects from resume text
├── project_verifier_agent.py           # Verify projects vs GitHub repos
└── requirements.txt                    # Python dependencies
```

**AI Model:** `gemini-2.5-flash` via Google Generative AI SDK.  
**Varied Outputs:** Each generation endpoint uses randomized style/tone selection to produce diverse responses across repeated calls.

---

## 5. Data Flow

### 5.1 Resume Analysis Flow

```
User uploads PDF/DOCX + pastes Job Description
        │
        ▼
[Client] POST /api/resume/analyze (multipart/form-data)
        │
        ▼
[Server] Multer saves file → resumeParser.js extracts raw text
        │
        ├──► jobDescriptionId → saves JobDescription document to MongoDB
        │
        ├──► skillExtractor.js → extract candidate skills
        │
        ├──► semanticAnalyzer.js → TF-IDF cosine similarity scoring
        │
        ├──► atsScorer.js → composite score (keyword, semantic, formatting)
        │
        ├──► linkExtractorService.js → calls Python /api/extract-links
        │
        ├──► Saves Resume document (parsedData) to MongoDB
        │
        └──► Saves AnalysisResult document → responds with full analysis JSON
                │
                ▼
        [Client] Displays Results Page
```

### 5.2 AI Optimization Flow

```
User requests optimization (summary / bullets / cover letter)
        │
        ▼
[Client] POST /api/optimization/generate (or enhance-bullets / cover-letter)
        │
        ▼
[Server - optimizationController] → aiService.js → HTTP POST to Python service
        │
        ▼
[Python Service] → Gemini 2.5 Flash API (with randomized style selection)
        │
        ▼
[Server] Returns AI-generated content to client
        │
        ▼
[Client] Displays optimized content with copy/apply options
```

### 5.3 GitHub / CP Analysis Flow

```
User provides GitHub URL / LeetCode profile from resume
        │
        ▼
[Client] POST /api/resume/analyze (triggers link extraction)
        │
        ▼
[Server] linkExtractorService → Python /api/extract-links
        │
        ▼
[Python] link-extractor.py extracts GitHub + LeetCode URLs from PDF
        │
        ├──► GitHub URL → /api/github-analysis (github-agent.py)
        │       └──► GitHub REST API → repo stats, languages, commits
        │               └──► Gemini: AI narrative analysis
        │
        └──► LeetCode URL → /api/competitive-profile (competitive_profile_agent)
                └──► LeetCode scraping → problem counts, ratings, streaks
                        └──► Gemini: CP score + narrative
```

---

## 6. API Reference Summary

### Node.js Server (Port 3001)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | Register new user |
| `POST` | `/api/auth/login` | ❌ | Login, returns JWT |
| `GET` | `/api/auth/me` | ✅ JWT | Get current user profile |
| `POST` | `/api/resume/analyze` | Optional | Upload resume + JD for analysis |
| `GET` | `/api/resume/history` | ✅ JWT | Get user's analysis history |
| `GET` | `/api/resume/analysis/:id` | ✅ JWT | Fetch specific analysis |
| `POST` | `/api/optimization/generate` | Optional | Generate AI optimizations |
| `POST` | `/api/optimization/enhance-bullets` | Optional | Enhance bullet points |
| `POST` | `/api/optimization/cover-letter` | Optional | Generate cover letter |
| `POST` | `/api/download-report` | ❌ | Download PDF analysis report |
| `GET` | `/api/reviews` | ❌ | Get published user reviews |
| `POST` | `/api/reviews` | ✅ JWT | Submit a review |
| `GET` | `/api/reviews/my-review` | ✅ JWT | Get user's own review |
| `PUT` | `/api/reviews/:id` | ✅ JWT | Update own review |
| `DELETE` | `/api/reviews/:id` | ✅ JWT | Delete own review |

### Python AI Service (Port 5000)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `POST` | `/api/ai/optimize-summary` | Generate professional summary |
| `POST` | `/api/ai/enhance-bullets` | Enhance experience bullet points |
| `POST` | `/api/ai/keyword-suggestions` | Keyword placement suggestions |
| `POST` | `/api/ai/ats-tips` | ATS compatibility tips |
| `POST` | `/api/ai/generate-cover-letter` | Generate tailored cover letter |
| `POST` | `/api/extract-links` | Extract links from PDF resume |
| `POST` | `/api/extract-projects` | Extract projects from resume text |
| `POST` | `/api/verify-projects` | Verify projects vs GitHub |
| `POST` | `/api/github-analysis` | Full GitHub profile analysis |
| `POST` | `/api/competitive-profile` | LeetCode CP profile analysis |
| `POST` | `/api/batch-profile-analysis` | GitHub + CP combined analysis |

---

## 7. Security Architecture

| Concern | Solution |
|---|---|
| Password Storage | `bcryptjs` with salt rounds = 10 |
| Authentication | JWT (RS256), expiry configurable via `JWT_EXPIRE` env |
| File Upload Safety | Type whitelist (PDF/DOCX), 5 MB size limit via Multer |
| CORS | Configurable via `CLIENT_URL` env variable |
| Secrets Management | `.env` files (never committed); `.env.example` for reference |
| Anonymous Access | `optionalAuth` middleware allows unauthenticated resume analysis |
| Admin Actions | Review approval/unpublish routes reserved for future admin role |

---

## 8. Scoring Engine

The ATS scoring is a **composite multi-factor algorithm**:

| Component | Weight | Description |
|---|---|---|
| `keywordScore` | ~40% | Keyword match between resume and JD (TF-IDF) |
| `semanticScore` | ~30% | Cosine similarity of embedded content vectors |
| `section_completeness` | ~10% | Presence of key resume sections |
| `formatting_score` | ~10% | ATS-friendly formatting compliance |
| `experience_clarity` | ~5% | Bullet point structure and clarity |
| `project_impact` | ~5% | Quality of project descriptions |

**Final `finalAtsScore`** is stored in `AnalysisResult.scores.finalAtsScore` (0–100).

---

## 9. Infrastructure & Deployment

```
docker-compose.yml
├── atsmaster-client  (port 5173) → depends on: server, python-ai-service
├── atsmaster-server  (port 3001) → depends on: python-ai-service
│       └── env: MONGODB_URI, JWT_SECRET, AI_SERVICE_URL
└── atsmaster-python-ai (port 5000)
        └── env: GOOGLE_API_KEY, FLASK_ENV, GITHUB_TOKEN
```

**MongoDB:** Can be hosted on MongoDB Atlas (cloud) or local via `host.docker.internal`.  
**AI Calls:** All Gemini API calls are made server-side from the Python service — the API key is never exposed to the browser.

---

## 10. Technology Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Axios |
| Backend API | Node.js, Express.js, Mongoose, Multer, JWT, bcryptjs |
| AI Service | Python 3, Flask, Flask-CORS, Google Generative AI SDK |
| AI Model | Gemini 2.5 Flash |
| Database | MongoDB (Mongoose ODM) |
| File Parsing | pdf-parse / mammoth (DOCX) on Node.js; PyPDF2 / pdfplumber on Python |
| NLP/Scoring | TF-IDF, cosine similarity (semanticAnalyzer.js) |
| External APIs | GitHub REST API v3, LeetCode (scraping) |
| Containerization | Docker, Docker Compose |
| Version Control | Git |
