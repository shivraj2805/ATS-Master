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
# Matching helpers
# ---------------------------

def name_flat(s: str) -> str:
    """Strip ALL separators (hyphens, underscores, spaces, dots) and lowercase.
    'ATSMaster' → 'atsmaster'
    'ATS-Master' → 'atsmaster'
    'ATS_Master' → 'atsmaster'
    'ats master' → 'atsmaster'
    """
    return re.sub(r'[-_\s.]', '', s).lower()


def camel_split_tokens(s: str) -> List[str]:
    """Split a CamelCase / hyphenated / underscored name into lowercase tokens.
    'ATSMaster'  → ['ats', 'master']
    'ATS-Master' → ['ats', 'master']
    'KrushiSetu' → ['krushi', 'setu']
    """
    # Insert space before an uppercase letter that follows a lowercase letter
    s = re.sub(r'([a-z])([A-Z])', r'\1 \2', s)
    # Insert space between a run of uppercase and the next uppercase+lowercase
    s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1 \2', s)
    # Replace any remaining separator with a space
    s = re.sub(r'[-_./]', ' ', s)
    return [t.lower() for t in s.split() if len(t) >= 2]


def name_similarity_score(project_name: str, repo_name: str) -> Tuple[int, str]:
    """
    Return (score 0-100, human-readable reason).

    Strategies tried in priority order:
    1. Flat match  – strip all separators and compare lowercased strings.
       Handles: ATSMaster vs ATS-Master, ats_master, ats master → all 'atsmaster'.
    2. Flat substring – one flat form contains the other.
    3. CamelCase-token Jaccard – split both names into tokens first, then overlap.
    4. normalize_text Jaccard fallback (original logic).
    """
    if not project_name or not repo_name:
        return 0, "empty name"

    pf = name_flat(project_name)
    rf = name_flat(repo_name)

    # --- Strategy 1: exact flat match ---
    if pf and rf and pf == rf:
        return 100, f"flat-exact ('{pf}')"

    # --- Strategy 2: one flat form contains the other ---
    if pf and rf and len(pf) >= 3 and len(rf) >= 3:
        if pf in rf or rf in pf:
            ratio = min(len(pf), len(rf)) / max(len(pf), len(rf), 1)
            if ratio >= 0.75:
                return 85, f"flat-contains (ratio {ratio:.2f})"
            elif ratio >= 0.50:
                return 65, f"flat-partial (ratio {ratio:.2f})"

    # --- Strategy 3: CamelCase token Jaccard ---
    pt = set(camel_split_tokens(project_name))
    rt = set(camel_split_tokens(repo_name))
    if pt and rt:
        common = pt & rt
        j = len(common) / max(1, len(pt | rt))
        if j >= 0.80:
            return 90, f"camel-tokens j={j:.2f} common={common}"
        elif j >= 0.60:
            return 70, f"camel-tokens j={j:.2f} common={common}"
        elif j >= 0.40:
            return 50, f"camel-tokens j={j:.2f}"
        elif j >= 0.20:
            return 30, f"camel-tokens j={j:.2f}"

    # --- Strategy 4: original normalize_text fallback ---
    pn = normalize_text(project_name)
    rn = normalize_text(repo_name)
    if pn and rn:
        if pn == rn:
            return 80, "norm-exact"
        if pn in rn or rn in pn:
            return 55, "norm-contains"
        j2 = jaccard(tokenize(pn), tokenize(rn))
        if j2 > 0:
            return int(35 * j2), f"norm-tokens j={j2:.2f}"

    return 0, "no-match"


def tech_match_score(project_technologies: List[str], repo: Dict[str, Any], readme_text: str) -> Tuple[int, str]:
    """
    Compare the project's technology list against the repo's language, topics,
    description, and README.  Returns (score 0-100, reason).
    """
    if not project_technologies:
        return 0, "no tech listed"

    # Build a searchable blob from everything the repo exposes
    repo_lang = (repo.get("language") or "").lower()
    repo_topics = " ".join(t.lower() for t in (repo.get("topics") or []))
    repo_desc = normalize_text(repo.get("description") or "")
    # Limit README to first 4 000 chars to keep things fast
    repo_readme = normalize_text((readme_text or "")[:4000])
    blob = f"{repo_lang} {repo_topics} {repo_desc} {repo_readme}"

    hits = 0
    matched = []
    for tech in project_technologies:
        t_norm = normalize_text(tech)
        if t_norm and len(t_norm) >= 2 and t_norm in blob:
            hits += 1
            matched.append(tech)

    total = max(len(project_technologies), 1)
    ratio = hits / total
    score = int(ratio * 100)
    reason = f"{hits}/{total} matched ({', '.join(matched[:4])})" if matched else f"0/{total} matched"
    return score, reason


# ---------------------------
# Main matching function
# ---------------------------

def compute_match_score(
    project_name: str,
    project_desc: str,
    repo: Dict[str, Any],
    readme_text: str,
    project_technologies: Optional[List[str]] = None,
) -> Tuple[int, Dict[str, Any]]:
    """
    Multi-signal match score (0-100) with per-component breakdown.

    Weights
    -------
    Name similarity     40 %  – flat, camelCase, token Jaccard
    Content overlap     30 %  – keyword hits in description + README
    Tech match          20 %  – resume tech list vs repo lang/topics/README
    Topic keyword bonus 10 %  – project name tokens found in repo topics
    """
    if project_technologies is None:
        project_technologies = []

    # ── 1. Name similarity (40 %) ────────────────────────────────────────────
    name_raw, name_reason = name_similarity_score(project_name, repo.get("name", ""))
    name_component = int(0.40 * name_raw)

    # ── 2. Content overlap (30 %) ─────────────────────────────────────────────
    repo_blob = normalize_text(
        f"{repo.get('description', '')} {repo.get('topics', [])} {readme_text}"
    )
    proj_blob = normalize_text(f"{project_name} {project_desc}")
    # Only count tokens of length >= 4 to avoid noise words
    proj_tokens = [t for t in tokenize(proj_blob) if len(t) >= 4]
    content_hits = sum(1 for t in proj_tokens if t in repo_blob)
    content_raw = min(100, content_hits * 6) if proj_tokens else 0
    content_component = int(0.30 * content_raw)

    # ── 3. Tech match (20 %) ─────────────────────────────────────────────────
    tech_raw, tech_reason = tech_match_score(project_technologies, repo, readme_text)
    tech_component = int(0.20 * tech_raw)

    # ── 4. Topic keyword bonus (10 %) ─────────────────────────────────────────
    repo_topics_blob = " ".join(t.lower() for t in (repo.get("topics") or []))
    proj_name_tokens = camel_split_tokens(project_name)
    topic_hits = sum(1 for t in proj_name_tokens if t in repo_topics_blob)
    topic_raw = min(100, topic_hits * 50)
    topic_component = int(0.10 * topic_raw)

    total = int(clamp(name_component + content_component + tech_component + topic_component, 0, 100))

    breakdown = {
        "name_score": name_raw,
        "name_reason": name_reason,
        "name_component": name_component,
        "content_hits": content_hits,
        "content_score": content_raw,
        "content_component": content_component,
        "tech_score": tech_raw,
        "tech_reason": tech_reason,
        "tech_component": tech_component,
        "topic_score": topic_raw,
        "topic_component": topic_component,
        "total": total,
    }

    return total, breakdown


def classify_presence(best_score: int) -> Tuple[str, float]:
    """
    Thresholds lowered from (80/55) → (65/40) to reflect the improved scoring
    which now uses 4 signals instead of 2 and normalises separators properly.
    """
    if best_score >= 65:
        conf = round(min(0.99, 0.65 + (best_score - 65) * 0.012), 2)
        return "FOUND", conf
    if best_score >= 40:
        conf = round(min(0.75, 0.40 + (best_score - 40) * 0.014), 2)
        return "MAYBE", conf
    conf = round(max(0.05, best_score * 0.008), 2)
    return "NOT_FOUND", conf


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
        # Extract technologies list for this project (new signal)
        ptechs = [str(t).strip() for t in p.get("technologies", []) if str(t).strip()]

        if not pname:
            continue

        # 2) Rough match first (no README) — uses all 4 signals except README content
        rough_scores = []
        for r in repo_slim:
            s, _ = compute_match_score(pname, pdesc, r, readme_text="", project_technologies=ptechs)
            rough_scores.append((s, r))
        rough_scores.sort(key=lambda x: x[0], reverse=True)
        top3 = rough_scores[:3]

        # 3) Refine using README for the top 2 candidates
        refined = []
        for s, r in top3[:2]:
            readme = fetch_readme_text(username, r["name"])
            s2, breakdown2 = compute_match_score(pname, pdesc, r, readme_text=readme, project_technologies=ptechs)
            refined.append((s2, r, readme, breakdown2))
        refined.sort(key=lambda x: x[0], reverse=True)

        if refined:
            best_score, best_repo, best_readme, best_breakdown = refined[0]
        else:
            best_score, best_repo, best_readme = top3[0][0], top3[0][1], ""
            _, best_breakdown = compute_match_score(pname, pdesc, best_repo, readme_text="", project_technologies=ptechs)

        present, conf = classify_presence(best_score)

        if present == "FOUND":
            found += 1
        elif present == "MAYBE":
            maybe += 1
        else:
            not_found += 1

        matched_repo_obj = None
        quality_obj = None
        match_breakdown_obj = None

        if present in ("FOUND", "MAYBE"):
            # Public-only policy: if repo is somehow private, treat as NOT_FOUND
            if PUBLIC_ONLY and best_repo.get("private", False):
                present = "NOT_FOUND"
                conf = 0.05
            else:
                matched_repo_obj = {
                    "full_name": best_repo.get("full_name", ""),
                    "html_url": best_repo.get("html_url", ""),
                    "score": best_score,
                }
                # fetch languages for quality
                langs = fetch_languages(username, best_repo["name"])
                quality_obj = quality_score(best_repo, langs, best_readme)

                # Build human-readable match breakdown for the UI
                match_breakdown_obj = {
                    "repository": best_repo.get("full_name", ""),
                    "name_match_pct": best_breakdown.get("name_score", 0),
                    "name_reason": best_breakdown.get("name_reason", ""),
                    "content_match_pct": best_breakdown.get("content_score", 0),
                    "content_hits": best_breakdown.get("content_hits", 0),
                    "tech_match_pct": best_breakdown.get("tech_score", 0),
                    "tech_reason": best_breakdown.get("tech_reason", ""),
                    "topic_match_pct": best_breakdown.get("topic_score", 0),
                    "overall_confidence_pct": best_score,
                }

        results.append({
            "resume_project": {"name": pname, "description": short(pdesc, 260)},
            "present": present,
            "match_confidence": conf,
            "matched_repo": matched_repo_obj,
            "quality": quality_obj,
            "match_breakdown": match_breakdown_obj,
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
    
    # Test payload — mirrors real resume extraction output
    payload = {
        "github_username": "shivraj2805",
        "projects": [
            {
                "name": "ATSMaster",
                "description": "AI-powered resume optimization platform with ATS scoring, GitHub profile analysis, competitive programming evaluation, and Gemini AI integration.",
                "technologies": ["React", "Node.js", "Python", "Flask", "Gemini", "MongoDB"]
            },
            {
                "name": "Financial Advisor",
                "description": "Built a financial management platform with Google Gemini AI integration, OCR document processing, JWT auth, and real-time features.",
                "technologies": ["React", "Node.js", "MongoDB", "Socket.io", "JWT", "Gemini"]
            },
            {
                "name": "KrushiSetu",
                "description": "AI agriculture platform with ML crop recommendations and a WhatsApp chatbot; REST APIs and real-time updates.",
                "technologies": ["Python", "TensorFlow", "WhatsApp API", "Flask"]
            },
        ]
    }

    out = verify_projects_agent(payload)
    print(json.dumps(out, indent=2, ensure_ascii=False))
    print("\n=== SUMMARY ===")
    for r in out["results"]:
        mb = r.get("match_breakdown") or {}
        print(f"  {r['resume_project']['name']}: {r['present']} (conf={r['match_confidence']}) "
              f"name={mb.get('name_match_pct',0)}% reason={mb.get('name_reason','')}")

