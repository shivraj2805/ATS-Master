# ATS Master Full Architecture & Data Flow

This document details the complete end-to-end architecture and system interactions of the **ATS Master** application.

---

## 🏗️ System Architecture & Data Flow (Mermaid Diagram)

```mermaid
graph TB
    subgraph Client Layer
        WebUI[React/Next.js Client] <--> |REST API / JSON| NodeServer
    end

    subgraph Node.js Backend Server
        NodeServer[Express Server index.js]
        
        subgraph Controllers
            ResumeCtrl[resumeController.js]
            ReportCtrl[reportController.js]
        end

        subgraph Services
            ParserSrv[resumeParser.js]
            SkillsSrv[skillExtractor.js]
            DomainSrv[domainClassifier.js]
            ScorerSrv[atsScorer.js]
            LinkSrv[linkExtractorService.js]
            AISrv[aiService.js]
            SemanticSrv[semanticAnalyzer.js]
        end

        NodeServer --> ResumeCtrl
        ResumeCtrl --> ParserSrv
        ResumeCtrl --> SkillsSrv
        ResumeCtrl --> DomainSrv
        ResumeCtrl --> LinkSrv
        ResumeCtrl --> AISrv
        ResumeCtrl --> SemanticSrv
        ResumeCtrl --> ScorerSrv
    end

    subgraph Database Layer
        Mongo[(MongoDB)] <--> ResumeCtrl
    end

    subgraph Python AI Service
        FlaskSrv[Flask Application app.py]
        
        LinkExtr[link-extractor.py]
        GHAgent[github-agent.py]
        CPAgent[competitive_profile_agent_gemini.py]
        ProjExtr[project_extractor_gemini.py]
        ProjVerif[project_verifier_agent.py]
        
        AISrv -->|HTTP Requests| FlaskSrv
        
        FlaskSrv --> LinkExtr
        FlaskSrv --> GHAgent
        FlaskSrv --> CPAgent
        FlaskSrv --> ProjExtr
        FlaskSrv --> ProjVerif
    end

    subgraph External Interfaces
        LinkExtr -->|PDF Link Parsing| PDFLocal[Local File System]
        GHAgent -->|REST Queries| GitHubAPI[GitHub REST API]
        CPAgent -->|GraphQL POST| LeetCodeGraphQL[LeetCode GraphQL API]
        
        ProjExtr -->|API Calls| GeminiAPI[Google Gemini 2.5 Flash]
        GHAgent -->|API Calls| GeminiAPI
        CPAgent -->|API Calls| GeminiAPI
        SemanticSrv -->|Local Embeddings/Matching| LLM[LLM / Semantic Engine]
    end

    style WebUI fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style NodeServer fill:#3B82F6,stroke:#1D4ED8,stroke-width:2px,color:#fff
    style FlaskSrv fill:#10B981,stroke:#064E3B,stroke-width:2px,color:#fff
    style Mongo fill:#F59E0B,stroke:#78350F,stroke-width:2px,color:#fff
```

---

## ⚡ Parallel Execution Optimization Model

To optimize response times, the Node.js backend implements a parallel promise execution pattern (`Promise.all`) during resume processing. Instead of executing steps sequentially, independent tasks run concurrently:

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Recruiter Dashboard
    participant Node as Node.js Controller
    participant Flask as Flask AI Service
    participant Mongo as MongoDB Database

    Recruiter->>Node: Upload Resume & Job Description
    Node->>Node: Parse Resume Text & Extract Skills (Node.js)
    Node->>Flask: POST /api/extract-links (Find Profile Links)
    Flask-->>Node: Return Extracted Links (GitHub, Leetcode, etc.)
    
    Note over Node, Flask: Start Parallel AI Operations (Promise.all)
    par Parallel Process A: GitHub Profile Analysis
        Node->>Flask: POST /api/analyze-github (GitHub Agent)
        Flask->>Node: Return GitHub Score & Analytics
    and Parallel Process B: LeetCode Profile Analysis
        Node->>Flask: POST /api/analyze-competitive-profile (CP Agent)
        Flask->>Node: Return CP Score & Analytics
    and Parallel Process C: Project Extraction
        Node->>Flask: POST /api/extract-projects (Gemini Extractor)
        Flask->>Node: Return Extracted Projects JSON
    end
    Note over Node, Flask: End Parallel AI Operations
    
    Node->>Flask: POST /api/verify-projects (Verify Extracted Projects on GitHub)
    Flask-->>Node: Return Project Verification Rate & Quality
    Node->>Node: Perform Job Description Semantic Matching
    Node->>Node: Calculate Final ATS Score (60% Resume + 40% Proof Score)
    
    Node->>Mongo: Store Resume & AnalysisResult Documents
    Node-->>Recruiter: Send Complete Evaluation Report Response
```

---

## 📐 Scoring Formula Breakdowns

The application uses a hybrid evaluation system combining written resumes with live proof of expertise:

### 1. Proof Score
The proof score validates claims by looking at public profiles:
$$\text{ProofScore} = 0.30 \times \text{GitHubScore} + 0.40 \times \text{ProjectScore} + 0.30 \times \text{CPScore}$$
*   **GitHubScore**: Evaluated by the GitHub Quality Agent (0-100).
*   **CPScore**: Evaluated by the Competitive Profile Agent (0-100).
*   **ProjectScore**: Project Verification Rate (0-100) adjusted by average verified project quality and penalized for unverified projects:
    $$\text{ProjectScore} = \left( 0.70 \times \text{VerificationScore} + 0.30 \times \text{AvgProjectQuality} \right) \times e^{-1.2 \times \frac{N}{T}}$$

### 2. Final ATS Score
The final score balances written content matching with live developer portfolio verifications:
$$\text{Final ATS Score} = 0.60 \times \text{ResumeScore} + 0.40 \times \text{ProofScore}$$
*   **ResumeScore**: Initial keyword, skill coverages, semantic similarity matching score (0-100).
*   If profile URLs are not present (e.g., missing GitHub or Leetcode links), their values default to 0 in the calculation.

---

## 🗄️ Database Schema Structures

### `Resumes` Collection
Stores the parsed candidate profile data:
*   `userId`: Reference to the recruiter/user.
*   `filename`: Original uploaded filename.
*   `parsedData`: Structured fields containing contact info, professional summary, skills lists, experience bullets, education, and project lists.

### `JobDescriptions` Collection
Stores details of the target job requirement:
*   `userId`: Reference to the recruiter/user.
*   `jobTitle` / `company`: Metadata.
*   `description`: Raw text of the requirements.
*   `parsedData`: Extracted required skills and domain classification.

### `AnalysisResults` Collection
Maps the resume to the job description and aggregates scoring metadata:
*   `resumeId` / `jobDescriptionId`: Relationship references.
*   `scores`: Combines semantic scores, keyword matching scores, overall final ATS score, and the complete scoring formula breakdown (weights, raw profile scores).
*   `matched` / `partial` / `missing`: Lists of candidate skills matching target roles.
*   `suggestions`: Detailed lists of improvement tasks.
*   `extractedLinks`: List of all hyperlinks found in the resume.
