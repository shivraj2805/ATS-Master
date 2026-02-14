"""
Resume Hyperlink Extraction Agent (LangGraph, Python)

✅ Extracts REAL clickable hyperlinks from PDF annotations (the hidden targets behind "Portfolio", etc.)
✅ Also extracts plain-text URLs/emails as fallback
✅ Normalizes + de-dupes
✅ Classifies into github/linkedin/leetcode/portfolio/email/other

Install:
  pip install langgraph pydantic pymupdf

Usage:
  from resume_link_agent import run_resume_link_agent
  result = run_resume_link_agent("your_resume.pdf")
  print(result["buckets"])

NOTE: In production, this is called via app.py with uploaded resume PDFs.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Optional
from urllib.parse import urlparse

import fitz  # PyMuPDF
from langgraph.graph import StateGraph, END


# -----------------------------
# Helpers
# -----------------------------
URL_REGEX = re.compile(r"\bhttps?://[^\s<>()\"']+|\bwww\.[^\s<>()\"']+", re.IGNORECASE)
EMAIL_REGEX = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)


def clean_url(u: str) -> Optional[str]:
    if not u:
        return None
    s = str(u).strip()

    # Common PDF junk / trailing punctuation
    s = s.strip()
    s = re.sub(r"[),.;:]+$", "", s)

    # Normalize www. -> https://www.
    if re.match(r"^www\.", s, flags=re.IGNORECASE):
        s = "https://" + s

    # Sometimes PDFs store "mailto:" already; keep it
    if s.lower().startswith("mailto:"):
        return s

    # Basic sanity: accept http(s) only
    if s.lower().startswith("http://") or s.lower().startswith("https://"):
        return s

    return None


def extract_text_urls(text: str) -> list[str]:
    found: set[str] = set()
    for m in URL_REGEX.findall(text or ""):
        found.add(m)
    for e in EMAIL_REGEX.findall(text or ""):
        found.add(f"mailto:{e}")
    return list(found)


def classify_links(urls: list[str]) -> dict[str, list[str]]:
    buckets: dict[str, set[str]] = {
        "github": set(),
        "linkedin": set(),
        "leetcode": set(),
        "portfolio": set(),
        "email": set(),
        "other": set(),
    }

    for u in urls:
        lu = u.lower()

        if lu.startswith("mailto:"):
            buckets["email"].add(u)
            continue

        host = ""
        try:
            host = urlparse(u).netloc.lower()
        except Exception:
            host = ""

        if "github.com" in host:
            buckets["github"].add(u)
        elif "linkedin.com" in host:
            buckets["linkedin"].add(u)
        elif "leetcode.com" in host:
            buckets["leetcode"].add(u)
        else:
            # portfolio heuristics (custom domain / common hosting)
            if any(x in host for x in ["vercel.app", "netlify.app", "github.io"]):
                buckets["portfolio"].add(u)
            elif any(host.endswith(tld) for tld in [".dev", ".me", ".app", ".io"]):
                buckets["portfolio"].add(u)
            else:
                buckets["other"].add(u)

    # Convert sets -> sorted lists
    return {k: sorted(v) for k, v in buckets.items()}


# -----------------------------
# Core PDF extraction (real hyperlinks with display text)
# -----------------------------
def extract_links_from_pdf(pdf_path: str) -> dict[str, Any]:
    """
    Extracts:
      - annotation links: real clickable targets (URI) + display text (anchor text)
      - text URLs/emails: regex fallback from page text
    Returns both the URL and the display text for each link
    """
    doc = fitz.open(pdf_path)

    urls: set[str] = set()
    raw: list[dict[str, Any]] = []
    links_with_text: dict[str, str] = {}  # url -> display_text

    for page_index in range(len(doc)):
        page = doc[page_index]
        page_no = page_index + 1

        # 1) Real clickable hyperlinks are in link annotations
        for link in page.get_links():
            # link dict keys vary; common: "uri" for external URL
            uri = link.get("uri")
            if uri:
                cu = clean_url(uri)
                if cu:
                    urls.add(cu)
                    
                    # Extract display text from link rectangle
                    display_text = "Link"
                    if "rect" in link:
                        rect = link["rect"]
                        # Get text within the link rectangle
                        words = page.get_text("words", clip=rect)
                        if words:
                            # Combine words in the rectangle
                            display_text = " ".join([w[4] for w in words if len(w) > 4])
                    
                    # Store display text for this URL
                    if cu not in links_with_text:
                        links_with_text[cu] = display_text
                    
                    raw.append({
                        "source": "annotation",
                        "page": page_no,
                        "url": uri,
                        "display_text": display_text
                    })

        # 2) Fallback: extract printed URLs/emails from page text
        text = page.get_text("text") or ""
        for u in extract_text_urls(text):
            cu = clean_url(u) if not u.lower().startswith("mailto:") else u
            if cu:
                urls.add(cu)
                # For text links, the URL itself is the display text
                if cu not in links_with_text:
                    links_with_text[cu] = cu.replace("mailto:", "").replace("https://", "").replace("http://", "")
                
                raw.append({
                    "source": "text",
                    "page": page_no,
                    "url": u,
                    "display_text": links_with_text.get(cu, u)
                })

    doc.close()

    return {
        "urls": sorted(urls),
        "raw": raw,
        "links_with_text": links_with_text  # url -> display_text mapping
    }


# -----------------------------
# LangGraph Agent
# -----------------------------

@dataclass
class AgentState:
    pdf_path: str = ""
    extracted: dict = field(default_factory=dict)
    normalized_urls: list = field(default_factory=list)
    buckets: dict = field(default_factory=dict)


def node_extract(state: AgentState) -> dict:
    extracted = extract_links_from_pdf(state.pdf_path)
    # extracted["urls"] are already cleaned + deduped
    return {"extracted": extracted, "normalized_urls": extracted["urls"]}


def node_classify(state: AgentState) -> dict:
    buckets = classify_links(state.normalized_urls or [])
    return {"buckets": buckets}


def build_resume_link_agent():
    graph = StateGraph(AgentState)
    graph.add_node("extract", node_extract)
    graph.add_node("classify", node_classify)

    graph.set_entry_point("extract")
    graph.add_edge("extract", "classify")
    graph.add_edge("classify", END)

    return graph.compile()


AGENT = build_resume_link_agent()


def run_resume_link_agent(pdf_path: str) -> dict[str, Any]:
    """
    Returns:
      {
        "pdf_path": "...",
        "normalized_urls": [...],
        "buckets": {...},
        "extracted": { "raw": [...], "urls": [...] }
      }
    """
    return AGENT.invoke({"pdf_path": pdf_path})


# -----------------------------
# CLI test
# -----------------------------
if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 2:
        print("Usage: python resume_link_agent.py <resume.pdf>")
        sys.exit(1)

    result = run_resume_link_agent(sys.argv[1])
    print(json.dumps(result["buckets"], indent=2))
    # If you want debugging:
    # print(json.dumps(result["extracted"]["raw"][:20], indent=2))
