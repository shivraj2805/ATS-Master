# Competitive Profile Agent Flow (LeetCode)

This document details the architecture and execution flow of the **Competitive Profile Agent**, which evaluates a candidate's problem-solving capability and algorithm proficiency on LeetCode.

---

## 🔄 Agent Execution Flow (Mermaid Diagram)

```mermaid
graph TD
    Start([Start CP Analysis]) --> RecvURL[Receive LeetCode URL]
    
    subgraph URL Normalization
        RecvURL --> NormURL[Normalize URL: /u/username -> /username]
        NormURL --> ExtractUser[Extract username via safe_username_from_url]
    end

    subgraph Data Extraction (GraphQL)
        ExtractUser --> GraphQLReq[POST query userProfile to leetcode.com/graphql]
        GraphQLReq --> ParseStats[Parse solved_total, easy, medium, hard]
    end

    subgraph Platform Quality Scoring
        ParseStats --> CalcVolume[1. Volume Score: up to 35 pts]
        ParseStats --> CalcDepth[2. Difficulty Depth: up to 40 pts]
        ParseStats --> CalcBalance[3. Balance Ratio: up to 15 pts]
        ParseStats --> CalcContest[4. Contest Bonus: up to 10 pts]
        ParseStats --> CalcConsist[5. Consistency Bonus: up to 8 pts]
        
        CalcVolume --> CombineScores[Sum & Clamp to 0-100]
        CalcDepth --> CombineScores
        CalcBalance --> CombineScores
        CalcContest --> CombineScores
        CalcConsist --> CombineScores
    end

    subgraph Resume-CP Insights
        CombineScores --> CalcResumeCP[Calculate Stable Resume Score 0-100]
        CalcResumeCP --> GenATSSummary[Generate ATS CP Summary]
    end

    subgraph Gemini AI Enrichment
        CombineScores --> CheckLLM{Is Gemini Enabled?}
        CheckLLM -->|Yes| PromptGemini[POST Payload to Gemini 2.5 Flash]
        PromptGemini --> ParseGeminiJSON[Parse strict Small JSON Schema]
        CheckLLM -->|No| FallbackInference[Determine Inferred Skills Deterministically]
        ParseGeminiJSON --> AssembleReport[Assemble Final AgentReport]
        FallbackInference --> AssembleReport
    end

    AssembleReport --> End([Return CP Analysis JSON])

    style Start fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style End fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style CheckLLM fill:#F59E0B,stroke:#78350F,stroke-width:2px
    style PromptGemini fill:#10B981,stroke:#064E3B,stroke-width:2px,color:#fff
```

---

## 🛠️ Step-by-Step Execution Walkthrough

### 1. URL Normalization & Username Extraction
* Trims and normalizes the input URL format.
  * e.g., `https://leetcode.com/u/username/` is converted to the canonical `https://leetcode.com/username/`.
* Extracts the terminal username part using `safe_username_from_url`.

### 2. LeetCode GraphQL Data Fetching
* Sends a POST request to `https://leetcode.com/graphql` with a user profile query.
* Queries the `matchedUser(username: $username)` field for `submitStatsGlobal { acSubmissionNum { difficulty count } }`.
* Extracts count variables for total solved, easy, medium, and hard problems.
* If GraphQL fails or is blocked (e.g. invalid username or private profile), the profile is marked non-public, raw confidence is set to 0.2, and score is set to 0.

### 3. Deterministic Platform Scoring
Evaluates the profile quality based on five key components:
* **Volume (35 pts max)**: Solved counts:
  * $\ge 900$ solved ➔ 35 pts
  * $\ge 700$ solved ➔ 32 pts
  * $\ge 500$ solved ➔ 28 pts
  * $\ge 300$ solved ➔ 25 pts
  * $\ge 150$ solved ➔ 18 pts
  * $< 150$ solved ➔ 10 pts
* **Difficulty Depth (40 pts max)**: Sum of:
  * **Medium solved**: +3 points per 40 medium solved (up to 18 pts).
  * **Hard solved**: +4 points per 5 hard solved (up to 22 pts).
  * Clamps depth total between **0 and 40**.
* **Balance (15 pts max)**: Ratio of $\frac{\text{Medium} + \text{Hard}}{\text{Total Solved}}$:
  * Ratio $\ge 0.75$ ➔ 15 pts
  * Ratio $\ge 0.65$ ➔ 13 pts
  * Ratio $\ge 0.55$ ➔ 11 pts
  * Ratio $\ge 0.45$ ➔ 9 pts
  * Ratio $< 0.45$ ➔ 6 pts
* **Contest Rating (10 pts max)**: Add rating-based bonus if contest history exists:
  * Rating $\ge 2000$ ➔ 10 pts
  * Rating $\ge 1700$ ➔ 8 pts
  * Rating $\ge 1500$ ➔ 6 pts
  * Rating $> 0$ ➔ 4 pts
* **Consistency (8 pts max)**: Evaluates solution streak milestones:
  * Solved $\ge 400$ ➔ 8 pts
  * Solved $\ge 300$ ➔ 6 pts
  * Solved $\ge 200$ ➔ 4 pts
  * Solved $\ge 100$ ➔ 2 pts

### 4. Resume CP Insights Score
Translates the LeetCode platform score into an ATS-aligned resume credit rating (0-100):
$$\text{Resume CP Score} = 0.55 \times \text{QualityScore} + 0.20 \times \left(\text{Depth} \times \frac{100}{40}\right) + 0.15 \times \left(\text{Volume} \times \frac{100}{35}\right) + 0.10 \times \left(\text{Balance} \times \frac{100}{15}\right)$$
Generates a structured bullet point (e.g. *"Competitive Programming: Solved 300+ DSA problems..."*) to insert into resume templates, and provides a list of immediate improvements.

### 5. Gemini 2.5 Flash Enrichment
* Submits a payload with stats, platform score, breakdown, strengths, and gaps to Gemini.
* Enforces a strict system instructions prompt to return a **small JSON schema** to prevent response truncation:
  * `skills_inferred`: list of technical competencies.
  * `strengths`: list of algorithmic capabilities.
  * `gaps`: missing structures or depth.
  * `action_plan_2_weeks`: structured roadmap.
  * `resume_ready_summary`: single-line profile snapshot.
* If Gemini fails or is disabled, the system falls back to a deterministic rules engine to infer skills (e.g. $\ge 10$ Hard solved infers *"Advanced problem solving, DP, Graphs"*; $\ge 30$ Medium solved infers *"DSA fundamentals"*).

---

## 📊 Summary of Scoring Model

| Dimension | Max Points | Core Input Parameter |
| :--- | :---: | :--- |
| **Volume Score** | 35 | Solved problem counts |
| **Difficulty Depth** | 40 | Number of Medium (step size 40) and Hard (step size 5) solved |
| **Balance Score** | 15 | Ratio of Medium + Hard questions to total solved |
| **Contest Bonus** | 10 | Contest rating milestones |
| **Consistency Bonus** | 8 | Total solved milestones |
| **Total Platform Score** | **100** | Clamped sum |
