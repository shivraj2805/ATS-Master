"""
LLM-based Resume Project Extractor (Gemini) -> Strict JSON

What it does:
- Takes resume text (string)
- Sends to Gemini with a strict JSON-only extraction prompt
- Returns a normalized JSON dict:
  {
    "projects": [
      {
        "name": "...",
        "description": "...",
        "technologies": ["..."],
        "githubUrl": "",
        "liveUrl": ""
      }
    ]
  }

Requirements:
  pip install google-generativeai

Set env var:
  export GOOGLE_API_KEY="YOUR_KEY"
  (Windows PowerShell) $env:GOOGLE_API_KEY="YOUR_KEY"
  
Note: Uses GOOGLE_API_KEY (same as rest of the app)
"""

import os
import json
import re
from typing import Any, Dict, List

import google.generativeai as genai


def build_prompt(resume_text: str) -> str:
    return f"""
You are an information extraction system.

Task: Extract ONLY the candidate's PROJECTS from the resume text.

Return STRICT JSON only (no markdown, no explanation).
The JSON must match this schema exactly:

{{
  "projects": [
    {{
      "name": "string",
      "description": "string",
      "technologies": ["string"]
    }}
  ]
}}

Rules:
- Only include real projects (not skills, not experience, not education).
- "description" should be 1-3 lines merged into one string; keep key outcomes/features.
- technologies must be inferred from the project text when possible, else [].
- Do NOT hallucinate projects or information.
- Output valid JSON. No trailing commas.

Resume text:
\"\"\"{resume_text}\"\"\"
""".strip()


def safe_json_parse(text: str) -> Dict[str, Any]:
    # 1) direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # 2) extract the first JSON object if the model wrapped extra text
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass

    return {"projects": []}


def normalize_projects_json(data: Dict[str, Any]) -> Dict[str, Any]:
    projects = data.get("projects", [])
    if not isinstance(projects, list):
        projects = []

    normed: List[Dict[str, Any]] = []
    for p in projects:
        if not isinstance(p, dict):
            continue

        name = p.get("name", "")
        desc = p.get("description", "")
        tech = p.get("technologies", [])

        name = name.strip() if isinstance(name, str) else ""
        desc = desc.strip() if isinstance(desc, str) else ""

        if isinstance(tech, list):
            tech = [t.strip() for t in tech if isinstance(t, str) and t.strip()]
            tech = tech[:20]
        else:
            tech = []

        # Keep only non-empty named projects
        if len(name) >= 2:
            normed.append(
                {
                    "name": name,
                    "description": desc,
                    "technologies": tech,
                }
            )

    return {"projects": normed}


def extract_projects_with_gemini(resume_text: str) -> Dict[str, Any]:
    """
    Extract projects from resume text using Google Gemini.
    
    Args:
        resume_text: The full text content of the resume
        
    Returns:
        Dict with "projects" key containing list of project dictionaries
        
    Raises:
        RuntimeError: If GOOGLE_API_KEY is not set
        Exception: If Gemini API call fails
    """
    api_key = os.getenv("GOOGLE_API_KEY")  # Use same key as rest of app
    if not api_key:
        raise RuntimeError("Missing GOOGLE_API_KEY environment variable.")

    genai.configure(api_key=api_key)

    # Use a fast, good extraction model
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config={
            "temperature": 0,
            # If your SDK supports it, Gemini often respects JSON-only output better:
            # "response_mime_type": "application/json"
        },
    )

    prompt = build_prompt(resume_text)
    resp = model.generate_content(prompt)

    # Some SDK versions use resp.text, others use resp.candidates[0].content.parts...
    raw_text = getattr(resp, "text", None) or ""
    parsed = safe_json_parse(raw_text)
    return normalize_projects_json(parsed)


# ========================================================================
# STANDALONE TESTING ONLY - Not used by the Flask app or website
# ========================================================================
# When this file is run directly (python project_extractor_gemini.py),
# it will test the extraction with sample data.
# 
# In production, the Flask app (app.py) calls extract_projects_with_gemini()
# with REAL resume text from uploaded PDFs, so this test code is never used.
# ========================================================================

if __name__ == "__main__":
    # Load environment variables for standalone testing
    from dotenv import load_dotenv
    load_dotenv()
    
    print("=" * 70)
    print("STANDALONE TEST MODE - Using Sample Resume Text")
    print("=" * 70)
    print("NOTE: This is ONLY for testing. Your website dynamically passes")
    print("      real resume text through the /api/extract-projects endpoint.")
    print("=" * 70 + "\n")
    
    # Sample resume text for testing
    test_resume_text = """
PROJECTS

Financial Advisor | React, Node.js, MongoDB, Socket.io, JWT, OAuth, Gemini
• Built a financial management platform with Google Gemini AI integration and OCR document processing.
• Implemented secure authentication and real-time features with Socket.io.
• Deployed on AWS with Docker containerization.

KrushiSetu – AI Agriculture Platform | Python, TensorFlow, WhatsApp API
• Developed an AI-powered agriculture platform for disease detection and crop recommendations.
• Built WhatsApp chatbot integration and REST APIs for farmer queries.
• Achieved 92% accuracy in crop disease detection using ML models.
GitHub: https://github.com/example/krushisetu

E-Commerce Platform | Next.js, Tailwind, PostgreSQL
• Full-stack e-commerce with payment gateway integration (Stripe).
• Real-time inventory management and order tracking.
Live: https://example-store.vercel.app
""".strip()

    result = extract_projects_with_gemini(test_resume_text)
    
    print("\n" + "=" * 70)
    print("TEST RESULTS:")
    print("=" * 70)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print("\n" + "=" * 70)
    print(f"✅ Found {len(result.get('projects', []))} projects")
    print("=" * 70)
