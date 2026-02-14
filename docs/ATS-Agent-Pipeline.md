# ATS Resume Analysis Agent Pipeline

## Overview
This document describes the complete ATS Resume Analysis Agent pipeline that coordinates multiple analysis steps to produce a comprehensive evaluation report.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              ATS RESUME ANALYSIS AGENT                       │
│                  (Coordinating Agent)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    Step 1: Resume Parsing              │
        │    • Extract text content              │
        │    • Identify sections                 │
        │    • Preserve structure                │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    Step 2: Link Extraction (MANDATORY) │
        │    • Send PDF to Link Extractor Agent │
        │    • Extract URLs + Display Text      │
        │    • Wait for agent response          │
        │    • Classify links by category       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    Step 3: Skill Extraction            │
        │    • Identify technical skills         │
        │    • Classify frameworks/tools         │
        │    • Extract programming languages     │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    Step 4: Domain Classification       │
        │    • Determine primary domain          │
        │    • Calculate confidence score        │
        │    • Identify secondary domains        │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    Step 5: Semantic Analysis           │
        │    • Match resume to job description   │
        │    • Calculate semantic similarity     │
        │    • Identify matched/missing skills   │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    Step 6: ATS Scoring                 │
        │    • Calculate overall ATS score       │
        │    • Section-wise breakdown            │
        │    • Include link presence factor      │
        │    • Generate suggestions              │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    Step 7: Final Report Generation     │
        │    • Combine all analysis results      │
        │    • Include extracted links           │
        │    • Provide actionable insights       │
        └───────────────────────────────────────┘
```

## Detailed Pipeline Steps

### Step 1: Resume Parsing
**Input:** PDF or DOCX file  
**Output:** Structured resume data

- Extract text content while preserving structure
- Identify sections: Summary, Experience, Education, Skills, Projects
- Parse contact information
- Preserve original formatting hints

**Implementation:** `server/services/resumeParser.js`

### Step 2: Link Extraction (MANDATORY)
**Input:** Original PDF file  
**Output:** Categorized links with display text and URLs

#### Link Extractor Agent Requirements:
1. **Extract ALL hyperlinks** - not just visible URLs
2. **Capture both:**
   - Display Text (anchor text that appears in the resume)
   - Actual URL (target destination)
3. **Classify links into categories:**
   - GitHub profiles
   - LinkedIn profiles
   - LeetCode profiles
   - Portfolio websites
   - Email addresses
   - Other links
4. **Return structured data** with url → display_text mapping

#### Critical Rules:
- ❌ DO NOT hallucinate links
- ❌ DO NOT invent display text
- ✅ Extract from actual PDF link annotations
- ✅ Preserve exact display text from resume
- ✅ Wait for Link Extractor Agent response before continuing

**Implementation:**
- Agent: `python-ai-service/link-extractor.py`
- Service: `server/services/linkExtractorService.js`
- Endpoint: `POST /api/extract-links`

**Example Response:**
```json
{
  "success": true,
  "buckets": {
    "github": ["https://github.com/johndoe"],
    "linkedin": ["https://linkedin.com/in/johndoe"],
    "portfolio": ["https://johndoe.dev"],
    "email": ["mailto:john@example.com"]
  },
  "links_with_text": {
    "https://github.com/johndoe": "My GitHub",
    "https://linkedin.com/in/johndoe": "LinkedIn Profile",
    "https://johndoe.dev": "Portfolio",
    "mailto:john@example.com": "john@example.com"
  },
  "total_links": 4
}
```

### Step 3: Skill Extraction
**Input:** Parsed resume text  
**Output:** Categorized skills

- Extract programming languages (Python, JavaScript, Java, etc.)
- Identify frameworks (React, Node.js, Django, etc.)
- Extract tools and technologies (Docker, AWS, Git, etc.)
- Identify soft skills

**Implementation:** `server/services/skillExtractor.js`

### Step 4: Domain Classification
**Input:** Resume text + Skills  
**Output:** Domain classification with confidence

- Determine primary domain (e.g., "Full-Stack Development", "Data Science")
- Calculate confidence score (0-100%)
- Identify secondary domains if applicable

**Implementation:** `server/services/domainClassifier.js`

### Step 5: Semantic Analysis
**Input:** Resume text + Job Description  
**Output:** Semantic matching results

#### Important Rule:
**Use the SAME resume** that was sent to the Link Extractor Agent.  
DO NOT modify or summarize the resume before semantic matching.

- Perform semantic matching between resume and job description
- Calculate semantic similarity score (0-100)
- Identify:
  - Strong semantic matches
  - Partial matches
  - Missing concepts
- Generate keyword match score

**Implementation:** `server/services/semanticAnalyzer.js`

### Step 6: ATS Scoring
**Input:** All previous analysis results  
**Output:** Comprehensive ATS score

#### Scoring Factors:
1. **Keyword Relevance** (25%)
2. **Skill Coverage** (20%)
3. **Section Completeness** (15%)
4. **Experience Clarity** (15%)
5. **Formatting Score** (10%)
6. **Project Impact** (10%)
7. **Link Presence** (5%) ← Includes GitHub, Portfolio, LinkedIn
   - GitHub: +2%
   - Portfolio: +2%
   - LinkedIn: +1%

**Score Breakdown:**
- 90-100: Excellent
- 75-89: Good
- 60-74: Needs Improvement
- Below 60: Poor

**Implementation:** `server/services/atsScorer.js`

### Step 7: Final Report Generation
**Input:** All analysis results  
**Output:** Complete ATS evaluation report

Combines:
- Overall ATS Score (0-100)
- Score breakdown by category
- Semantic analysis results
- **Extracted links with display text**
- Matched/partial/missing skills
- Actionable suggestions
- Issues and gaps

## Data Flow Example

```javascript
// 1. Upload Resume
POST /api/resume/analyze
{
  file: resume.pdf,
  jobDescription: "...",
  jobTitle: "Senior Developer"
}

// 2. Internal Pipeline Execution
┌─ Resume Parsing
├─ Link Extraction (calls Python service)
├─ Skill Extraction
├─ Domain Classification
├─ Semantic Analysis (using ORIGINAL resume)
├─ ATS Scoring
└─ Report Assembly

// 3. Final Response
{
  "success": true,
  "ats_score": 85,
  "score_breakdown": {...},
  "extracted_links": {
    "github": [...],
    "linkedin": [...],
    "links_with_text": {
      "https://github.com/user": "My Projects"
    }
  },
  "semantic_analysis": {...},
  "skills": {...},
  "suggestions": [...]
}
```

## UI Display

The results are displayed at `/analyze-report` with:

1. **ATS Score Card** - Overall score with visual indicators
2. **Candidate Profile** - Contact information
3. **Domain Classification** - Primary domain with confidence
4. **📌 Extracted Links Section** ← Shows both display text and URLs
5. **Score Breakdown** - Detailed scoring by category
6. **Skills Analysis** - Categorized skills
7. **Semantic Matching** - Matched/missing skills
8. **Recommendations** - Actionable suggestions

## Key Principles

### 1. No Hallucination
- Only report what is actually extracted
- Do not invent skills, links, or experience
- If unsure, mark as "Not Found"

### 2. Link Extraction is MANDATORY
- Must complete before final scoring
- Affects ATS score calculation
- Critical for recruiter verification

### 3. Preserve Original Content
- Use the SAME resume for all analysis steps
- Do not modify text between steps
- Maintain exact display text from PDF

### 4. Wait for Agent Responses
- Do not proceed until Link Extractor responds
- Handle agent failures gracefully
- Log all agent interactions

### 5. Professional Output
- Be precise and factual
- Use ATS industry standards
- Provide actionable insights

## Error Handling

### Link Extraction Failure
```javascript
// Soft failure - continue with empty links
if (linkExtractror fails) {
  extractedLinks = { empty structure };
  // Log error but continue analysis
  // ATS score will be slightly lower
}
```

### Critical Failures
- PDF parsing errors → Return 400
- No job description → Return 400
- Database errors → Return 500

## Configuration

### Environment Variables
```bash
AI_SERVICE_URL=http://localhost:5000  # Python service
MONGODB_URI=mongodb://localhost:27017/ats
```

### Service Timeouts
- Link Extraction: 30 seconds
- Semantic Analysis: 30 seconds
- Overall Request: 60 seconds

## Testing

### Test Link Extraction
```bash
cd python-ai-service
python link-extractor.py sample_resume.pdf
```

### Test Full Pipeline
```bash
curl -X POST http://localhost:3001/api/resume/analyze \
  -F "file=@resume.pdf" \
  -F "jobDescription=..."
```

## Logs to Monitor

```
🔗 [ATS Agent Pipeline - Step 2] Link Extraction Started
📄 Processing PDF: resume.pdf
✅ [ATS Agent Pipeline] Link extraction completed
   └─ Found 5 links across all categories
```

## Future Enhancements

1. **Link Validation** - Check if URLs are accessible
2. **GitHub Analysis** - Analyze GitHub profile activity
3. **Portfolio Scoring** - Score portfolio quality
4. **QR Code Extraction** - Extract QR codes from resumes
5. **Social Media Integration** - Analyze social profiles
