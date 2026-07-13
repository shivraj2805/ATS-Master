# Resume Project Verification Pipeline

This document details the two-stage execution flow of the **Resume Project Verification Pipeline**: Project Extraction and Project Verification & Quality Scoring.

---

## 🔄 End-to-End Pipeline Flow (Mermaid Diagram)

```mermaid
graph TD
    Start([Upload Resume]) --> ParseResume[Parse Resume Text]
    
    subgraph Phase 1: Project Extraction (Flask API)
        ParseResume --> ExtrReq[POST /api/extract-projects]
        ExtrReq --> GeminiExtr[Invoke Gemini 2.5 Flash]
        GeminiExtr --> |Extract name, description, tech| NormProj[Normalize Project Structures]
        NormProj --> ProjList[Generate Project JSON List]
    end

    subgraph Phase 2: Project Verification (Flask API)
        ProjList --> VerifyReq[POST /api/verify-projects]
        VerifyReq --> FetchRepos[GET /users/username/repos]
        
        subgraph Per-Project Match Loop
            FetchRepos --> ProjectLoop[For each Resume Project...]
            ProjectLoop --> RoughMatch[Compute Jaccard token overlap with all repos]
            RoughMatch --> SelectTop3[Select Top 3 Candidate Repos]
            SelectTop3 --> FetchReadme[GET README files for Top 2 Candidates]
            FetchReadme --> RefinedMatch[Recalculate match score using README context]
            RefinedMatch --> BestCandidate[Select best-matching repository]
            BestCandidate --> CheckPresence{Refined Score >= 55?}
            
            CheckPresence -->|No: NOT_FOUND| SetNotFound[Status: NOT_FOUND, Conf: 0.20]
            CheckPresence -->|Yes: FOUND / MAYBE| FetchLangs[GET /repos/owner/repo/languages]
            FetchLangs --> CalcQuality[Calculate Repository Quality Score]
        end
    end

    subgraph Score Aggregation (Node.js Controller)
        SetNotFound --> CompileResults[Aggregate Results & Summarize]
        CalcQuality --> CompileResults
        CompileResults --> CalcVerifScore[Calculate Verification Score]
        CompileResults --> CalcAvgQuality[Calculate Avg Quality of Verified Projects]
        CalcVerifScore --> BaseProjScore[Compute Base Project Score]
        CalcAvgQuality --> BaseProjScore
        BaseProjScore --> CredPenalty[Apply Missing Profile Penalty Factor]
        CredPenalty --> FinalProjScore[Compute Final Verified Project Score]
    end

    FinalProjScore --> End([Return Final Report JSON])

    style Start fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style End fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style CheckPresence fill:#F59E0B,stroke:#78350F,stroke-width:2px
    style GeminiExtr fill:#10B981,stroke:#064E3B,stroke-width:2px,color:#fff
```

---

## 🛠️ Step-by-Step Walkthrough

### Phase 1: Project Extraction
* **Purpose**: Parse raw resume text and extract discrete candidate projects.
* **Execution**: Node.js backend calls `/api/extract-projects` in the Python Flask service.
* **Gemini Parsing**:
  * Invokes `gemini-2.5-flash` with a system prompt enforcing a strict JSON schema.
  * Extracted attributes: `name`, `description`, and `technologies` (skills and stack tags).
  * Sanitizes the response using `safe_json_parse` (extracts text between `{...}` brackets if wrapped in formatting).
  * Validates that project names contain at least 2 characters.

### Phase 2: Project Verification
* **Purpose**: Confirm whether projects claimed on the resume actually exist in the candidate's public GitHub portfolio.
* **Execution**: Node.js backend calls `/api/verify-projects` with the extracted projects list and the candidate's GitHub username.
* **Step 1: Retrieve Repositories**:
  * Calls `GET https://api.github.com/users/{username}/repos` to list the candidate's public repositories.
* **Step 2: Two-Step Match Matching**:
  * **Rough Match**: Compares the project name and description against all public repositories.
    * Uses a Jaccard token index matching names: an exact match gains +65, substring overlap gains +50, token set Jaccard adds up to 35.
    * Checks description token hits in repository metadata: adds 4 points per hit (max 35).
    * Identifies the top 3 candidate repositories.
  * **Refined Match**:
    * Fetches README content for the top 2 candidate repositories using `GET /repos/{owner}/{repo}/readme`.
    * Performs a search for project description tokens in the README content.
    * Re-calculates and selects the highest scoring match.
* **Step 3: Status Classification**:
  * **FOUND**: Best refined score $\ge 80$ (confidence coefficient: 0.90)
  * **MAYBE**: Best refined score $\ge 55$ (confidence coefficient: 0.55)
  * **NOT_FOUND**: Best refined score $< 55$ (confidence coefficient: 0.20)
* **Step 4: Quality Scoring (0-100)**:
  * For verified projects (FOUND or MAYBE), the system calculates a quality score out of 100:
    * **Popularity (30 pts max)**: Log-scaled function of stargazers and forks.
    * **Recency (30 pts max)**: Pushed date decay formula: $30 \times e^{-\text{days}/180}$.
    * **Hygiene (25 pts max)**: README present (+10), topics present (+6), has issues (+4), has homepage/live URL (+3). Messy issue counts without stars penalty (-2).
    * **Tech Richness (15 pts max)**: Queries `/repos/{owner}/{repo}/languages` to count technologies. Clamps language count $\times 4$ to 12. Adds +3 if primary language is set.

---

## 📊 Score Calculation & Missing Project Penalty

The Node.js controller aggregates these metrics to compute the final project credit:

### 1. Average Quality of Verified Projects
The system calculates the weighted average quality score of verified repositories:
$$\text{AvgProjectQuality} = \frac{\sum (Q_i \times W_i)}{\sum W_i}$$
*Where $Q_i$ is the project's quality score and $W_i$ is the presence weight ($1.0$ for FOUND, $0.5$ for MAYBE).*

### 2. Base Project Score
The verified rate and quality scores are combined:
$$\text{VerificationScore} = \frac{F + 0.5 \times M}{\max(1, T)} \times 100$$
$$\text{BaseProjectScore} = 0.70 \times \text{VerificationScore} + 0.30 \times \text{AvgProjectQuality}$$
*Where $T$ is the total projects extracted, $F$ is the count of FOUND projects, and $M$ is the count of MAYBE projects.*

### 3. Credibility Penalty Factor
To penalize profiles with high ratios of unverified projects, a penalty factor $\text{PenaltyFactor}$ is applied:
$$\text{PenaltyFactor} = e^{-1.2 \times \frac{N}{T}}$$
$$\text{ProjectScore} = \text{BaseProjectScore} \times \text{PenaltyFactor}$$
*Where $N$ is the count of NOT_FOUND projects. This exponential decay rapidly penalizes candidate scores as the ratio of unverified projects rises.*
