"""
GitHub Quality Agent (LangGraph) - Portfolio Scoring (Gemini optional)
--------------------------------------------------------------------
✅ Fixes low-score problem for strong profiles (portfolio-style scoring):
- Popular repos (stars/forks) score high.
- Community health is a soft signal (won’t kill great repos).
- README + description + topics matter a lot.
- CI/tests are bonuses (not punishments).
- Overall ignores junk repos (top 40% only) + adds star portfolio bonus.
- good_repos never empty (score-based + star-based fallback).

✅ UPDATED OUTPUT (Recruiter/ATS-friendly):
- overall_score + grade
- github_strength (profile_score, repo_score, activity_level, engineering_maturity, project_hygiene)
- top_projects (list)
- ats_signals (keyword_alignment, opensource_impact, consistency)
- risks (list)
- recommendations (list)
- final_summary (Gemini optional)
- good_repos (kept for UI cards)

Install:
  pip install langgraph langchain requests python-dotenv langchain-google-genai

.env (recommended):
  GITHUB_TOKEN=ghp_xxx
  GOOGLE_API_KEY=xxx

Run:
  python github_agent_portfolio.py
"""

import os
import re
import math
import json
import time
import base64
import datetime as dt
from typing import Any, Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

HEADERS = {"Accept": "application/vnd.github+json"}
if GITHUB_TOKEN:
    HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"

# To avoid very long waits on accounts with many repos:
# Deep checks = community profile + workflows + tests + Dockerfile/package.json + README scoring
MAX_DEEP_CHECK_REPOS = 35


# -----------------------------
# HTTP / GitHub helpers (rate-limit handling + retry)
# -----------------------------
def _sleep_if_rate_limited(r: requests.Response):
    try:
        remaining = int(r.headers.get("X-RateLimit-Remaining", "1"))
        reset_ts = int(r.headers.get("X-RateLimit-Reset", "0"))

        if remaining <= 0 and reset_ts > 0:
            wait = max(1, reset_ts - int(time.time()) + 2)
            time.sleep(wait)
        else:
            # secondary rate limit: small backoff
            if r.status_code in (403, 429):
                time.sleep(3)
    except Exception:
        pass


def gh_get(
    url: str,
    params: Optional[Dict[str, Any]] = None,
    extra_headers: Optional[Dict[str, str]] = None,
) -> Tuple[Optional[Any], Optional[str], Optional[requests.Response]]:
    try:
        headers = dict(HEADERS)
        if extra_headers:
            headers.update(extra_headers)

        last_r = None
        for attempt in range(2):  # one retry after sleeping
            r = requests.get(url, headers=headers, params=params, timeout=25)
            last_r = r

            if r.status_code in (403, 429):
                _sleep_if_rate_limited(r)
                if attempt == 0:
                    continue

            if r.status_code >= 400:
                return None, f"GitHub API error {r.status_code}: {r.text[:250]}", r

            return r.json(), None, r

        if last_r is not None:
            return None, f"GitHub API error {last_r.status_code}: {last_r.text[:250]}", last_r
        return None, "Unknown GitHub API error", None

    except Exception as e:
        return None, str(e), None


def get_user(username: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    data, err, _ = gh_get(f"https://api.github.com/users/{username}")
    return data, err


def list_all_repos(username: str) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    repos: List[Dict[str, Any]] = []
    page = 1
    while True:
        data, err, _ = gh_get(
            f"https://api.github.com/users/{username}/repos",
            params={"per_page": 100, "page": page, "sort": "updated", "direction": "desc"},
        )
        if err:
            return [], err
        if not isinstance(data, list) or len(data) == 0:
            break
        repos.extend(data)
        if len(data) < 100:
            break
        page += 1
    return repos, None


def get_repo(owner: str, repo: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    data, err, _ = gh_get(f"https://api.github.com/repos/{owner}/{repo}")
    return data, err


def get_readme(owner: str, repo: str) -> Tuple[str, Optional[str]]:
    data, err, _ = gh_get(f"https://api.github.com/repos/{owner}/{repo}/readme")
    if err or not data:
        return "", err

    content = data.get("content", "")
    encoding = data.get("encoding", "")
    if encoding == "base64" and content:
        try:
            return base64.b64decode(content).decode("utf-8", errors="ignore"), None
        except Exception as e:
            return "", str(e)

    return "", "README found but could not decode"


def list_workflows(owner: str, repo: str) -> bool:
    data, err, _ = gh_get(f"https://api.github.com/repos/{owner}/{repo}/actions/workflows")
    if err or not data:
        return False
    workflows = data.get("workflows", [])
    return isinstance(workflows, list) and len(workflows) > 0


def content_exists(owner: str, repo: str, path: str) -> bool:
    data, err, _ = gh_get(f"https://api.github.com/repos/{owner}/{repo}/contents/{path}")
    return err is None and data is not None


# -----------------------------
# Portfolio-friendly community health (soft signal)
# -----------------------------
def get_community_profile(owner: str, repo: str) -> Tuple[Dict[str, Any], Optional[str]]:
    data, err, _ = gh_get(f"https://api.github.com/repos/{owner}/{repo}/community/profile")

    # Portfolio-friendly baseline:
    if err or not data or not isinstance(data, dict):
        return {"health_percentage": 60.0, "files": {}}, None

    if "health_percentage" not in data or data["health_percentage"] is None:
        data["health_percentage"] = 60.0

    # Prevent ultra-low health from killing scores
    try:
        hp = float(data.get("health_percentage", 60.0))
        data["health_percentage"] = max(40.0, hp)
    except Exception:
        data["health_percentage"] = 60.0

    if "files" not in data or not isinstance(data["files"], dict):
        data["files"] = {}

    return data, err


# -----------------------------
# Scoring helpers
# -----------------------------
def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def days_since(iso_ts: Optional[str]) -> Optional[int]:
    if not iso_ts:
        return None
    try:
        d = dt.datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
        now = dt.datetime.now(dt.timezone.utc)
        return (now - d).days
    except Exception:
        return None


def recency_score(pushed_at: Optional[str]) -> float:
    if not pushed_at:
        return 55.0
    d = days_since(pushed_at)
    if d is None:
        return 55.0
    if d < 0:
        return 80.0
    # 0d~100, 30d~95, 180d~74, 365d~60, 2y~45
    return clamp(100.0 * math.exp(-d / 600.0), 35.0, 100.0)


def keywords_score(text: str, keywords: List[str]) -> Tuple[float, Dict[str, int]]:
    if not keywords:
        return 0.0, {}
    t = (text or "").lower()
    hits: Dict[str, int] = {}
    present = 0
    for kw in keywords:
        k = kw.strip().lower()
        if not k:
            continue
        cnt = len(re.findall(r"\b" + re.escape(k) + r"\b", t))
        hits[k] = cnt
        if cnt > 0:
            present += 1
    ratio = present / max(1, len(keywords))
    return 100.0 * ratio, hits


# -----------------------------
# Portfolio-style repo scoring (FIXED)
# -----------------------------
def repo_score(
    owner: str,
    repo: Dict[str, Any],
    community: Optional[Dict[str, Any]],
    keywords: List[str],
    ci_present: bool,
    tests_present: bool,
    deep: bool,
) -> Dict[str, Any]:
    name = repo.get("name", "")
    desc = repo.get("description", "") or ""
    topics = repo.get("topics", []) or []
    stars = int(repo.get("stargazers_count") or 0)
    forks = int(repo.get("forks_count") or 0)
    pushed_at = repo.get("pushed_at") or repo.get("updated_at")
    is_fork = bool(repo.get("fork", False))
    archived = bool(repo.get("archived", False))

    # Health (soft)
    health = 60.0
    files = {}
    if community and isinstance(community, dict):
        files = community.get("files", {}) if isinstance(community.get("files"), dict) else {}
        try:
            health = float(community.get("health_percentage", 60.0))
        except Exception:
            health = 60.0
    health = clamp(health, 40.0, 100.0)

    # Meta: description + topics + README
    meta = 0.0
    if len(desc.strip()) >= 20:
        meta += 40
    elif len(desc.strip()) > 0:
        meta += 20

    if isinstance(topics, list):
        if len(topics) >= 5:
            meta += 35
        elif len(topics) >= 2:
            meta += 25
        elif len(topics) == 1:
            meta += 15

    readme_content = ""
    if deep:
        readme_content, _ = get_readme(owner, name)

    if len(readme_content.strip()) >= 200:
        meta += 35
    elif len(readme_content.strip()) > 40:
        meta += 20

    meta = clamp(meta, 0.0, 100.0)

    # Activity
    act = recency_score(pushed_at)

    # Popularity (dominant)
    pop_raw = math.log1p(stars * 4 + forks * 2) * 18
    pop = clamp(pop_raw, 0.0, 100.0)

    # Engineering (bonus)
    eng = 45.0
    if ci_present:
        eng += 20
    if tests_present:
        eng += 15
    if deep and content_exists(owner, name, "Dockerfile"):
        eng += 10
    if deep and content_exists(owner, name, "package.json"):
        eng += 10
    eng = clamp(eng, 0.0, 100.0)

    # Keywords
    full_text = f"{desc} {' '.join(topics)} {readme_content}".lower()
    kw_score, kw_hits = keywords_score(full_text, keywords)
    kw_score = kw_score if keywords else 60.0
    kw_score = clamp(kw_score, 0.0, 100.0)

    # Star bonus
    star_bonus = clamp(math.log1p(stars) * 3.5, 0.0, 12.0)

    # Portfolio weights
    score = (
        pop * 0.30
        + meta * 0.25
        + act * 0.20
        + eng * 0.10
        + kw_score * 0.10
        + health * 0.05
    ) + star_bonus

    if is_fork:
        score *= 0.92
    if archived:
        score *= 0.95

    score = clamp(score, 35.0, 100.0)

    return {
        "repo": name,
        "score": int(round(score)),
        "signals": {
            "health_pct": int(round(health)),
            "meta": int(round(meta)),
            "activity": int(round(act)),
            "popularity": int(round(pop)),
            "engineering": int(round(eng)),
            "keyword_alignment": int(round(kw_score)),
        },
        "flags": {
            "fork": is_fork,
            "archived": archived,
            "ci": ci_present,
            "tests": tests_present,
            "has_readme": bool(files.get("readme")) if isinstance(files, dict) else None,
            "has_license": bool(files.get("license")) if isinstance(files, dict) else None,
            "has_contributing": bool(files.get("contributing")) if isinstance(files, dict) else None,
        },
        "stars": stars,
        "forks": forks,
        "pushed_at": pushed_at,
        "topics": topics,
        "keyword_hits": kw_hits,
        "html_url": repo.get("html_url"),
    }


def profile_score(profile: Dict[str, Any]) -> Dict[str, Any]:
    breakdown = {}

    bio = profile.get("bio") or ""
    blog = profile.get("blog") or ""
    loc = profile.get("location") or ""
    company = profile.get("company") or ""
    email = profile.get("email") or ""
    followers = int(profile.get("followers") or 0)
    public_repos = int(profile.get("public_repos") or 0)

    breakdown["bio"] = 20 if len(bio.strip()) >= 20 else (10 if len(bio.strip()) > 0 else 0)
    breakdown["blog_or_site"] = 15 if len(blog.strip()) > 5 else 0
    breakdown["location"] = 5 if len(loc.strip()) > 0 else 0
    breakdown["company"] = 5 if len(company.strip()) > 0 else 0
    breakdown["email"] = 5 if len(email.strip()) > 0 else 0
    breakdown["followers"] = int(round(clamp(math.log1p(followers) * 8, 0, 25)))
    breakdown["repo_count"] = int(round(clamp(math.log1p(public_repos) * 10, 0, 25)))

    pts = clamp(float(sum(breakdown.values())), 0.0, 100.0)
    return {"score": int(round(pts)), "breakdown": breakdown}


def overall_account_score(profile_s: int, repo_scores: List[Dict[str, Any]]) -> int:
    if not repo_scores:
        return int(round(clamp(profile_s, 0, 100)))

    repo_scores = sorted(repo_scores, key=lambda x: x.get("score", 0), reverse=True)

    # TOP 40% only
    n = max(1, int(len(repo_scores) * 0.40))
    top_repos = repo_scores[:n]

    repo_avg = sum(r.get("score", 0) for r in top_repos) / max(1, len(top_repos))

    # top-star portfolio bonus
    top_stars = sorted((r.get("stars", 0) for r in repo_scores), reverse=True)[:5]
    star_bonus = clamp(math.log1p(sum(top_stars)) * 6.0, 0.0, 20.0)

    strong = sum(1 for r in top_repos if r.get("score", 0) >= 80)
    strong_bonus = clamp(strong * 2.5, 0.0, 10.0)

    overall = (profile_s * 0.25) + (repo_avg * 0.55) + star_bonus + strong_bonus
    return int(round(clamp(overall, 0, 100)))


# -----------------------------
# Final JSON format helpers
# -----------------------------
def grade_from_score(x: int) -> str:
    if x >= 90:
        return "Elite"
    if x >= 80:
        return "Excellent"
    if x >= 70:
        return "Strong"
    if x >= 60:
        return "Good"
    if x >= 50:
        return "Average"
    return "Learning"


def activity_label(avg_act: float) -> str:
    if avg_act >= 75:
        return "High"
    if avg_act >= 50:
        return "Medium"
    return "Low"


# -----------------------------
# Recruiter-friendly labels (NEW)
# -----------------------------
def maturity_label(avg_repo_score: float, strong_repo_ratio: float) -> str:
    # strong_repo_ratio = repos>=80 among top set
    if avg_repo_score >= 85 and strong_repo_ratio >= 0.50:
        return "Elite"
    if avg_repo_score >= 78 and strong_repo_ratio >= 0.35:
        return "High"
    if avg_repo_score >= 68:
        return "Medium"
    return "Low"


def hygiene_label(improve: Dict[str, int], total_repos: int) -> str:
    # Convert raw "missing files" counts into a simple label.
    if total_repos <= 0:
        return "Unknown"

    missing = improve.get("add_topics", 0) + improve.get("add_license", 0) + improve.get("add_contributing", 0)
    ratio = missing / max(1, total_repos * 3)

    if ratio <= 0.20:
        return "Strong"
    if ratio <= 0.45:
        return "Medium"
    return "Weak"


def keyword_alignment_label(found: int, total: int) -> str:
    if total <= 0:
        return "Not Provided"
    ratio = found / max(1, total)
    if ratio >= 0.80:
        return "High"
    if ratio >= 0.45:
        return "Medium"
    return "Low"


def impact_label(repo_scores: List[Dict[str, Any]]) -> str:
    # Uses stars/forks + top repo score to describe OSS impact
    if not repo_scores:
        return "Unknown"
    top = sorted(repo_scores, key=lambda r: r.get("score", 0), reverse=True)[:5]
    top_stars = sum(int(r.get("stars", 0)) for r in top)
    best = max((r.get("score", 0) for r in repo_scores), default=0)

    if top_stars >= 5000 or best >= 92:
        return "Exceptional"
    if top_stars >= 500 or best >= 85:
        return "Strong"
    if top_stars >= 50 or best >= 75:
        return "Moderate"
    return "Low"


# -----------------------------
# NEW final JSON builder (REPLACES old build_final_output)
# -----------------------------
def build_final_output(report: Dict[str, Any]) -> Dict[str, Any]:
    score_obj = report.get("score") or {}
    repos = score_obj.get("repos") or []

    username = report.get("username", "")
    overall = int(score_obj.get("overall", 0))
    grade = grade_from_score(overall)

    profile = score_obj.get("profile", {"score": 0, "breakdown": {}})
    profile_s = int(profile.get("score", 0))

    total_repos = len(repos)
    repos_sorted = sorted(repos, key=lambda r: r.get("score", 0), reverse=True)

    # Top 40% (same philosophy as your scoring)
    top_n = max(1, int(total_repos * 0.40)) if total_repos else 0
    top_repos_list = repos_sorted[:top_n] if top_n else []

    avg_repo_score = int(round(
        sum(r.get("score", 0) for r in top_repos_list) / max(1, len(top_repos_list))
    )) if top_repos_list else 0

    # Keyword alignment (found keywords in any repo hits)
    keywords = score_obj.get("keywords", []) or []
    kw_total = len(keywords)
    found_set = set()

    if kw_total > 0:
        for r in repos:
            hits = r.get("keyword_hits") or {}
            if isinstance(hits, dict):
                for k, v in hits.items():
                    try:
                        if k and int(v) > 0:
                            found_set.add(k)
                    except Exception:
                        pass

    kw_found = len(found_set)
    kw_label = keyword_alignment_label(kw_found, kw_total)

    # Activity labels
    avg_activity = (
        sum((r.get("signals") or {}).get("activity", 0) for r in repos) / max(1, total_repos)
    ) if total_repos else 0.0
    activity_level = activity_label(avg_activity)

    # Consistency label from activity
    consistency = (
        "Very High" if avg_activity >= 80
        else ("High" if avg_activity >= 65 else ("Medium" if avg_activity >= 50 else "Low"))
    )

    # Build "things to improve" counts (internal)
    improve = {"add_topics": 0, "add_license": 0, "add_contributing": 0}
    for r in repos:
        topics = r.get("topics") or []
        flags = r.get("flags") or {}
        if isinstance(topics, list) and len(topics) == 0:
            improve["add_topics"] += 1
        if flags.get("has_license") is False:
            improve["add_license"] += 1
        if flags.get("has_contributing") is False:
            improve["add_contributing"] += 1
    improve = dict(sorted(improve.items(), key=lambda x: x[1], reverse=True))

    # good_repos (kept for UI cards): score-based + star-based fallback
    good_repos: Dict[str, Dict[str, str]] = {}
    for r in repos_sorted:
        if r.get("score", 0) >= 70 and len(good_repos) < 8:
            nm = r.get("repo")
            if nm:
                good_repos[nm] = {"score": f'{r.get("score")}/100', "url": r.get("html_url")}

    if len(good_repos) < 5:
        by_stars = sorted(repos, key=lambda r: r.get("stars", 0), reverse=True)
        for r in by_stars[:10]:
            if len(good_repos) >= 8:
                break
            nm = r.get("repo")
            if nm and nm not in good_repos:
                good_repos[nm] = {"score": f'{r.get("score")}/100', "url": r.get("html_url")}

    # Top projects list (for recruiter UI)
    top_projects = []
    for r in repos_sorted[:5]:
        top_projects.append({
            "name": r.get("repo"),
            "url": r.get("html_url"),
            "score": r.get("score", 0)
        })

    # Engineering maturity + hygiene labels
    strong_in_top = sum(1 for r in top_repos_list if r.get("score", 0) >= 80)
    strong_ratio = strong_in_top / max(1, len(top_repos_list)) if top_repos_list else 0.0
    eng_maturity = maturity_label(avg_repo_score, strong_ratio)
    hygiene = hygiene_label(improve, total_repos)

    # Open-source impact (human readable)
    oss_impact = impact_label(repos_sorted)

    # Risks
    risks: List[str] = []
    if kw_total > 0 and kw_label == "Low":
        risks.append("Keyword mismatch with target role keywords (low alignment).")
    if hygiene == "Weak":
        risks.append("Repository hygiene looks weak (missing topics/license/contributing in many repos).")
    if total_repos == 0:
        risks.append("No public repositories found.")

    # Recommendations (actionable)
    recommendations: List[str] = []
    if kw_total > 0 and kw_label in ("Low", "Medium"):
        recommendations.append("Add/feature 1–2 projects strongly matching the target role keywords (stack-aligned repos).")
    if improve.get("add_topics", 0) > 0:
        recommendations.append("Add clear repo topics for your top projects (improves discovery + recruiter scan speed).")
    if improve.get("add_license", 0) > 0:
        recommendations.append("Add LICENSE to your top repos (signals professional open-source hygiene).")
    if improve.get("add_contributing", 0) > 0:
        recommendations.append("Add CONTRIBUTING.md for your best repos (signals maturity for collaboration).")
    if not recommendations:
        recommendations.append("Keep shipping consistently and pin your top 3 repos for recruiter-first visibility.")

    # Summary: keep Gemini output if available, else fallback
    llm_summary = report.get("summary")
    summary = llm_summary.strip().replace("\n", " ") if isinstance(llm_summary, str) and llm_summary.strip() else (
        f"Strong GitHub presence with {len(good_repos)} standout repos. "
        f"Activity: {activity_level}. Keyword alignment: {kw_label}. "
        f"Next: polish top repos (README/topics/license) and add 1 stack-aligned project."
    )

    # ✅ NEW schema output (recruiter-friendly)
    return {
        "username": username,
        "overall_score": overall,
        "grade": grade,

        "github_strength": {
            "profile_score": profile_s,
            "repo_score": avg_repo_score,
            "activity_level": activity_level,
            "engineering_maturity": eng_maturity,
            "project_hygiene": hygiene
        },

        "top_projects": top_projects,
        "good_repos": good_repos,

        "ats_signals": {
            "keyword_alignment": f"{kw_label} ({kw_found}/{kw_total})" if kw_total else "Not Provided (0/0)",
            "opensource_impact": oss_impact,
            "consistency": consistency
        },

        "risks": risks,
        "recommendations": recommendations,

        "final_summary": summary
    }


# -----------------------------
# LangGraph nodes
# -----------------------------
def node_parse_input(state: Dict[str, Any]) -> Dict[str, Any]:
    keywords = state.get("keywords") or []
    clean = [str(k).strip().lower() for k in keywords if str(k).strip()]
    state["keywords"] = list(dict.fromkeys(clean))

    state.setdefault("errors", [])
    state.setdefault("repos", [])
    state.setdefault("repo_scores", [])
    state.setdefault("profile", None)
    state.setdefault("score", None)
    state.setdefault("summary", None)
    state.setdefault("report", None)
    return state


def node_fetch_profile(state: Dict[str, Any]) -> Dict[str, Any]:
    prof, err = get_user(state["username"])
    if err:
        state["errors"].append(err)
    state["profile"] = prof
    return state


def node_fetch_repos(state: Dict[str, Any]) -> Dict[str, Any]:
    repos, err = list_all_repos(state["username"])
    if err:
        state["errors"].append(err)
        state["repos"] = []
        return state
    state["repos"] = repos
    return state


def node_score_all_repos(state: Dict[str, Any]) -> Dict[str, Any]:
    username = state["username"]
    keywords = state.get("keywords", [])
    repos = state.get("repos", [])

    # Sort by recency to choose deep-check repos
    repos_sorted = sorted(
        repos,
        key=lambda r: (r.get("pushed_at") or r.get("updated_at") or ""),
        reverse=True
    )

    deep_names = set()
    for r in repos_sorted[:MAX_DEEP_CHECK_REPOS]:
        if r.get("name"):
            deep_names.add(r["name"])

    repo_scores: List[Dict[str, Any]] = []
    community_cache: Dict[str, Any] = {}

    for repo in repos_sorted:
        owner = repo.get("owner", {}).get("login", username)
        name = repo.get("name")
        if not name:
            continue

        deep = name in deep_names

        # Topics: only deep-check
        if deep:
            repo_full, err = get_repo(owner, name)
            if repo_full and not err:
                repo["topics"] = repo_full.get("topics", []) or repo.get("topics", [])

        # Community: only deep-check, else baseline
        if deep:
            key = f"{owner}/{name}"
            if key in community_cache:
                community = community_cache[key]
            else:
                community, _ = get_community_profile(owner, name)
                community_cache[key] = community
        else:
            community = {"health_percentage": 60.0, "files": {}}

        # CI/tests: only deep-check
        if deep:
            ci = list_workflows(owner, name) or content_exists(owner, name, ".github/workflows")
            tests = (
                content_exists(owner, name, "tests")
                or content_exists(owner, name, "test")
                or content_exists(owner, name, "__tests__")
                or content_exists(owner, name, "pytest.ini")
                or content_exists(owner, name, "jest.config.js")
                or content_exists(owner, name, "vitest.config.js")
            )
        else:
            ci = False
            tests = False

        repo_scores.append(
            repo_score(owner, repo, community, keywords, ci_present=ci, tests_present=tests, deep=deep)
        )

    state["repo_scores"] = repo_scores
    return state


def node_overall_scoring(state: Dict[str, Any]) -> Dict[str, Any]:
    profile = state.get("profile") or {}
    p = profile_score(profile) if profile else {"score": 0, "breakdown": {}}

    repos = state.get("repo_scores", [])
    overall = overall_account_score(p["score"], repos)

    state["score"] = {
        "overall": overall,
        "profile": p,
        "repos": repos,
        "keywords": state.get("keywords", []),
        "repo_count_checked": len(repos),
    }
    return state


def node_llm_summary(state: Dict[str, Any]) -> Dict[str, Any]:
    if not GOOGLE_API_KEY or not state.get("score"):
        return state
    if not state.get("use_llm", True):
        return state

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.2,
        google_api_key=GOOGLE_API_KEY,
    )

    repos = state["score"].get("repos", [])
    repos_sorted = sorted(repos, key=lambda x: x.get("score", 0), reverse=True)
    top_repos = repos_sorted[:5]
    worst_repos = sorted(repos, key=lambda x: x.get("score", 0))[:5]

    prompt = f"""
You are a GitHub profile reviewer for ATSMaster.
Return EXACTLY 3 lines:

Line1: Strengths: ...
Line2: Gaps: ...
Line3: Action: ...

Username: {state["username"]}
Overall score: {state["score"]["overall"]}/100
Repos checked: {state["score"]["repo_count_checked"]}
Keywords: {state["score"]["keywords"]}

Top repos:
{top_repos}

Weak repos:
{worst_repos}
"""
    try:
        state["summary"] = llm.invoke(prompt).content
    except Exception as e:
        state["errors"].append(f"Gemini error: {e}")
        state["summary"] = None

    return state


def node_finalize(state: Dict[str, Any]) -> Dict[str, Any]:
    report = {
        "username": state.get("username"),
        "errors": state.get("errors", []),
        "score": state.get("score"),
        "summary": state.get("summary"),
    }
    state["report"] = report
    return state


# -----------------------------
# Build graph
# -----------------------------
def build_graph():
    g = StateGraph(dict)
    g.add_node("parse_input", node_parse_input)
    g.add_node("fetch_profile", node_fetch_profile)
    g.add_node("fetch_repos", node_fetch_repos)
    g.add_node("score_all_repos", node_score_all_repos)
    g.add_node("overall_scoring", node_overall_scoring)
    g.add_node("llm_summary", node_llm_summary)
    g.add_node("finalize", node_finalize)

    g.set_entry_point("parse_input")
    g.add_edge("parse_input", "fetch_profile")
    g.add_edge("fetch_profile", "fetch_repos")
    g.add_edge("fetch_repos", "score_all_repos")
    g.add_edge("score_all_repos", "overall_scoring")
    g.add_edge("overall_scoring", "llm_summary")
    g.add_edge("llm_summary", "finalize")
    g.add_edge("finalize", END)

    return g.compile()


# -----------------------------
# Interactive run (prints ONLY final JSON)
# -----------------------------
def main():
    app = build_graph()

    username = input("Enter GitHub username: ").strip()
    if not username:
        print(json.dumps({"error": "Username is required"}, indent=2))
        return

    keywords_input = input(
        "Enter keywords (comma separated, optional).\n"
        "Example: react, node, docker, jwt\n"
        "Press Enter to skip keywords:\n> "
    ).strip()

    keywords = [k.strip() for k in keywords_input.split(",") if k.strip()] if keywords_input else []
    use_llm ="y"

    out = app.invoke({"username": username, "keywords": keywords, "use_llm": use_llm})
    report = out.get("report", out)

    final_out = build_final_output(report)
    print(json.dumps(final_out, indent=2))


if __name__ == "__main__":
    main()
