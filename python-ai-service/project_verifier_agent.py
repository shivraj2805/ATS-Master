"""
GitHub Resume Project Verifier Agent (Public-only)

INPUT:
{
  "github_username": "USER",
  "projects": [
    {"name": "...", "description": "..."},
    ...
  ]
}

OUTPUT:
{
  "github_username": "...",
  "results": [
    {
      "resume_project": {"name": "...", "description": "..."},
      "present": "FOUND|MAYBE|NOT_FOUND",
      "match_confidence": 0.0-1.0,
      "matched_repo": {
        "full_name": "owner/repo",
        "html_url": "...",
        "score": 0-100
      } | null,
      "quality": {
        "score": 0-100,
        "breakdown": {...},
        "signals": [...]
      } | null,
      "top_candidates": [{...}, {...}, {...}]
    }
  ],
  "summary": {
    "total_projects": N,
    "found": X,
    "maybe": Y,
    "not_found": Z,
    "verification_rate": %
  }
}

Requirements:
  pip install requests

Optional:
  export GITHUB_TOKEN="..."  (recommended to avoid rate limits)
"""

import os
import re
import json
import math
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests


# ---------------------------
# Config
# ---------------------------

GITHUB_API = "https://api.github.com"
TOKEN = os.getenv("GITHUB_TOKEN", "").strip()

HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "ATSMaster-GitHubProjectVerifier/1.0",
}
if TOKEN:
    HEADERS["Authorization"] = f"Bearer {TOKEN}"

# Public-only policy: ignore private repos even if API returns them (rare for listForUser)
PUBLIC_ONLY = True


# ---------------------------
# Helpers
# ---------------------------

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def parse_iso(dt: Optional[str]) -> Optional[datetime]:
    if not dt:
        return None
    try:
        # GitHub ISO: "2024-10-01T12:34:56Z"
        return datetime.strptime(dt, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except Exception:
        return None

def days_ago(dt: Optional[datetime]) -> Optional[int]:
    if dt is None:
        return None
    delta = now_utc() - dt
    return max(0, int(delta.total_seconds() // 86400))

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def normalize_text(s: str) -> str:
    s = s.lower()
    s = re.sub(r"https?://\S+", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def tokenize(s: str) -> List[str]:
    s = normalize_text(s)
    return [t for t in s.split(" ") if t]

def jaccard(a: List[str], b: List[str]) -> float:
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 0.0
    return len(sa & sb) / max(1, len(sa | sb))

def safe_get(d: Dict[str, Any], key: str, default=None):
    return d.get(key, default)

def http_get(url: str, params: Optional[dict] = None) -> Tuple[int, Any]:
    resp = requests.get(url, headers=HEADERS, params=params, timeout=30)
    ct = resp.headers.get("Content-Type", "")
    if "application/json" in ct:
        try:
            return resp.status_code, resp.json()
        except Exception:
            return resp.status_code, None
    return resp.status_code, resp.text

def http_get_raw(url: str) -> Tuple[int, bytes]:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    return resp.status_code, resp.content

def base64_decode_maybe(b64_str: str) -> str:
    import base64
    try:
        return base64.b64decode(b64_str).decode("utf-8", errors="replace")
    except Exception:
        return ""

def short(s: str, n: int = 180) -> str:
    s = s.strip()
    return s if len(s) <= n else s[: n - 3] + "..."

def is_rate_limited(status: int, body: Any) -> bool:
    if status == 403 and isinstance(body, dict):
        msg = str(body.get("message", "")).lower()
        return "rate limit" in msg
    return False


# ---------------------------
# GitHub Fetchers
# ---------------------------

def fetch_user_repos(username: str, max_pages: int = 5, per_page: int = 100) -> List[Dict[str, Any]]:
    repos: List[Dict[str, Any]] = []
    for page in range(1, max_pages + 1):
        url = f"{GITHUB_API}/users/{username}/repos"
        status, data = http_get(url, params={"per_page": per_page, "page": page, "sort": "updated"})
        if is_rate_limited(status, data):
            raise RuntimeError("GitHub API rate limited. Add GITHUB_TOKEN.")
        if status != 200 or not isinstance(data, list):
            break

        for r in data:
            # Public-only policy
            if PUBLIC_ONLY and r.get("private", False):
                continue
            repos.append(r)

        if len(data) < per_page:
            break
    return repos

def fetch_readme_text(owner: str, repo: str) -> str:
    url = f"{GITHUB_API}/repos/{owner}/{repo}/readme"
    status, data = http_get(url)
    if status == 200 and isinstance(data, dict):
        content = data.get("content", "")
        return base64_decode_maybe(content)
    return ""

def fetch_languages(owner: str, repo: str) -> Dict[str, int]:
    url = f"{GITHUB_API}/repos/{owner}/{repo}/languages"
    status, data = http_get(url)
    if status == 200 and isinstance(data, dict):
        return {k: int(v) for k, v in data.items()}
    return {}

def fetch_commits_count_estimate(owner: str, repo: str) -> Optional[int]:
    """
    Commit count can be expensive. We do a cheap estimate using:
    GET /repos/{owner}/{repo} has "size", "pushed_at", etc.
    For commits, we do listCommits with per_page=1 and try to read Link header (not available here easily).
    So we keep it optional; quality can still work without exact commit count.
    """
    # Optional future enhancement: use GraphQL or Link header parsing.
    return None


# ---------------------------
# Matching
# ---------------------------

def compute_match_score(project_name: str, project_desc: str, repo: Dict[str, Any], readme_text: str) -> int:
    """
    Score 0-100 based on:
    - name similarity
    - repo description & readme overlap
    - homepage/liveUrl is not available here (you can add if you pass it)
    """
    p_name = normalize_text(project_name)
    r_name = normalize_text(repo.get("name", ""))

    # Name scoring
    score = 0
    if p_name == r_name and p_name:
        score += 65
    elif p_name and r_name and (p_name in r_name or r_name in p_name):
        score += 50
    else:
        # token overlap for names
        score += int(35 * jaccard(tokenize(p_name), tokenize(r_name)))

    # Content overlap (description + readme)
    repo_blob = normalize_text(
        f"{repo.get('description','')} {repo.get('topics',[])} {readme_text}"
    )
    proj_blob = normalize_text(f"{project_name} {project_desc}")

    proj_tokens = set(tokenize(proj_blob))
    if proj_tokens:
        hits = 0
        # count hits of meaningful tokens (len>=4 reduces noise)
        for t in proj_tokens:
            if len(t) >= 4 and t in repo_blob:
                hits += 1
        score += min(35, hits * 4)

    return int(clamp(score, 0, 100))

def classify_presence(best_score: int) -> Tuple[str, float]:
    if best_score >= 80:
        return "FOUND", 0.90
    if best_score >= 55:
        return "MAYBE", 0.55
    return "NOT_FOUND", 0.20


# ---------------------------
# Quality Scoring
# ---------------------------

def quality_score(repo: Dict[str, Any], languages: Dict[str, int], readme_text: str) -> Dict[str, Any]:
    """
    Quality score 0-100 (simple, explainable):
    - Popularity: stars/forks
    - Maintenance: recency of push
    - Project hygiene: has readme, has issues, has topics
    - Size/language diversity: languages detected
    """
    stars = int(repo.get("stargazers_count", 0) or 0)
    forks = int(repo.get("forks_count", 0) or 0)
    open_issues = int(repo.get("open_issues_count", 0) or 0)
    topics = repo.get("topics", []) or []
    pushed_at = parse_iso(repo.get("pushed_at"))
    updated_at = parse_iso(repo.get("updated_at"))

    recency_days = days_ago(pushed_at) if pushed_at else days_ago(updated_at)
    if recency_days is None:
        recency_days = 9999

    # Popularity component (log-scaled)
    pop_raw = stars * 1.0 + forks * 0.7
    pop = clamp((math.log1p(pop_raw) / math.log1p(200)) * 30, 0, 30)  # up to 30

    # Recency component (0-30)
    # <=7 days => 30, 30 days => ~22, 180 days => ~8, 365+ => ~3
    rec = 30 * math.exp(-recency_days / 180.0)
    rec = clamp(rec, 0, 30)

    # Hygiene component (0-25)
    hygiene = 0
    if readme_text.strip():
        hygiene += 10
    if topics:
        hygiene += 6
    if repo.get("has_issues", False):
        hygiene += 4
    # if repo has homepage (live demo), small positive
    if (repo.get("homepage") or "").strip():
        hygiene += 3
    # if open issues exist, not necessarily bad; but too many with no stars can be messy
    if open_issues > 20 and stars < 5:
        hygiene -= 2
    hygiene = clamp(hygiene, 0, 25)

    # Tech richness (0-15)
    lang_count = len(languages.keys())
    tech = clamp(lang_count * 4, 0, 12)
    # bonus if primary language exists
    if repo.get("language"):
        tech += 3
    tech = clamp(tech, 0, 15)

    total = int(round(pop + rec + hygiene + tech))

    signals = []
    signals.append(f"Stars={stars}, Forks={forks}")
    signals.append(f"Last push ~{recency_days} days ago")
    signals.append("README present" if readme_text.strip() else "README missing")
    if topics:
        signals.append(f"Topics: {', '.join(topics[:6])}")
    if languages:
        top_langs = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:3]
        signals.append("Top languages: " + ", ".join([k for k, _ in top_langs]))

    breakdown = {
        "popularity_30": round(pop, 2),
        "recency_30": round(rec, 2),
        "hygiene_25": round(hygiene, 2),
        "tech_15": round(tech, 2),
        "stars": stars,
        "forks": forks,
        "open_issues": open_issues,
        "last_push_days": recency_days,
        "language_count": lang_count,
    }

    return {
        "score": int(clamp(total, 0, 100)),
        "breakdown": breakdown,
        "signals": signals,
    }


# ---------------------------
# Agent
# ---------------------------

def verify_projects_agent(payload: Dict[str, Any]) -> Dict[str, Any]:
    username = str(payload.get("github_username", "")).strip()
    projects = payload.get("projects", [])

    if not username:
        raise ValueError("github_username is required")
    if not isinstance(projects, list):
        raise ValueError("projects must be a list")

    # 1) Fetch repos (public-only)
    repos = fetch_user_repos(username)

    # lightweight repo list for matching
    repo_slim = []
    for r in repos:
        repo_slim.append({
            "name": r.get("name", ""),
            "full_name": r.get("full_name", ""),
            "html_url": r.get("html_url", ""),
            "description": r.get("description", "") or "",
            "topics": r.get("topics", []) or [],
            "language": r.get("language", "") or "",
            "stargazers_count": r.get("stargazers_count", 0) or 0,
            "forks_count": r.get("forks_count", 0) or 0,
            "open_issues_count": r.get("open_issues_count", 0) or 0,
            "has_issues": r.get("has_issues", False),
            "homepage": r.get("homepage", "") or "",
            "private": r.get("private", False),
            "pushed_at": r.get("pushed_at"),
            "updated_at": r.get("updated_at"),
        })

    results = []
    found = maybe = not_found = 0

    for p in projects:
        pname = str(p.get("name", "")).strip()
        pdesc = str(p.get("description", "")).strip()

        if not pname:
            continue

        # 2) Rough match first (no README)
        rough_scores = []
        for r in repo_slim:
            s = compute_match_score(pname, pdesc, r, readme_text="")
            rough_scores.append((s, r))
        rough_scores.sort(key=lambda x: x[0], reverse=True)
        top3 = rough_scores[:3]

        # 3) Refine using README for best 1-2 candidates (faster)
        refined = []
        for s, r in top3[:2]:
            readme = fetch_readme_text(username, r["name"])
            s2 = compute_match_score(pname, pdesc, r, readme_text=readme)
            refined.append((s2, r, readme))
        refined.sort(key=lambda x: x[0], reverse=True)

        best_score, best_repo, best_readme = (refined[0] if refined else (top3[0][0], top3[0][1], ""))

        present, conf = classify_presence(best_score)

        if present == "FOUND":
            found += 1
        elif present == "MAYBE":
            maybe += 1
        else:
            not_found += 1

        matched_repo_obj = None
        quality_obj = None

        if present in ("FOUND", "MAYBE"):
            # Public-only policy: if repo is somehow private, treat as NOT_FOUND
            if PUBLIC_ONLY and best_repo.get("private", False):
                present = "NOT_FOUND"
                conf = 0.2
            else:
                matched_repo_obj = {
                    "full_name": best_repo.get("full_name", ""),
                    "html_url": best_repo.get("html_url", ""),
                    "score": best_score,
                }
                # fetch languages for quality
                langs = fetch_languages(username, best_repo["name"])
                quality_obj = quality_score(best_repo, langs, best_readme)

        results.append({
            "resume_project": {"name": pname, "description": short(pdesc, 260)},
            "present": present,
            "match_confidence": conf,
            "matched_repo": matched_repo_obj,
            "quality": quality_obj,
            "top_candidates": [
                {"full_name": r.get("full_name"), "html_url": r.get("html_url"), "score": s}
                for s, r in top3
            ],
        })

    total = len([p for p in projects if str(p.get("name", "")).strip()])
    verification_rate = int(round((found / total) * 100)) if total else 0

    return {
        "github_username": username,
        "results": results,
        "summary": {
            "total_projects": total,
            "found": found,
            "maybe": maybe,
            "not_found": not_found,
            "verification_rate": verification_rate,
        }
    }


# ---------------------------
# Run example
# ---------------------------

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    # Example payload (replace with your real data)
    payload = {
        "github_username": "shivraj2805",
        "projects": [
            {
                "name": "Financial Advisor",
                "description": "Built a financial management platform with Gemini AI integration, OCR processing, JWT auth, and real-time features."
            },
            {
                "name": "KrushiSetu",
                "description": "AI agriculture platform with ML crop recommendations and a WhatsApp chatbot; REST APIs and real-time updates."
            },
        ]
    }

    out = verify_projects_agent(payload)
    print(json.dumps(out, indent=2, ensure_ascii=False))
