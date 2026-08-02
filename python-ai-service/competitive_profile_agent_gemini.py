"""
Competitive Profile Quality Agent (LeetCode)
+ LeetCode GraphQL fallback (reliable, no login)
+ Gemini 2.5 Flash enrichment (SMALL JSON mode, works across SDK versions)
+ ATS-ready CP summary + deterministic resume score (never overwritten if Gemini fails)
+ Platform scoring is true 0–100 based ONLY on that platform’s quality
  (single LeetCode can score 90+ if it is genuinely strong)
+ Updated LeetCode scoring so 317/170/26 => ~76
+ Loads GOOGLE_API_KEY from .env using os + python-dotenv

Requirements:
  python -m pip install -U google-genai requests pydantic python-dotenv

.env (same folder as this script):
  GOOGLE_API_KEY=...

Run (standalone testing):
  python competitive_profile_agent_gemini.py --leetcode "https://leetcode.com/YourUsername/"

NOTE: In production, this is called via app.py with links extracted from resume PDFs.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from google import genai
from google.genai import types

load_dotenv()  # loads GOOGLE_API_KEY


# --------------------------- Models ---------------------------

class PlatformResult(BaseModel):
    platform: str
    url: str
    username: Optional[str] = None
    public: bool = True
    stats: Dict[str, Any] = Field(default_factory=dict)
    raw_confidence: float = 0.6
    notes: List[str] = Field(default_factory=list)


class LLMAnalysis(BaseModel):
    skills_inferred: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    action_plan_2_weeks: List[str] = Field(default_factory=list)
    resume_ready_summary: str = ""


class ResumeCPInsights(BaseModel):
    ats_cp_summary: str = ""
    resume_score_from_cp: int = 0
    resume_score_breakdown: Dict[str, int] = Field(default_factory=dict)
    improvement_bullets: List[str] = Field(default_factory=list)


class AgentReport(BaseModel):
    overall_score: int
    grade: str
    platform_scores: Dict[str, int]
    skills_inferred: List[str]
    strengths: List[str]
    gaps: List[str]
    action_items: List[str]
    platform_data: Dict[str, PlatformResult]
    llm_analysis: Optional[LLMAnalysis] = None
    resume_cp_insights: Optional[ResumeCPInsights] = None


# --------------------------- Helpers ---------------------------

def safe_username_from_url(url: str) -> str:
    p = urlparse(url)
    parts = [x for x in p.path.split("/") if x]
    return parts[-1] if parts else ""


def to_int(x: Any) -> int:
    try:
        return int(float(x))
    except Exception:
        return 0


def clamp(n: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, n))


def normalize_leetcode_url(url: str) -> str:
    u = (url or "").strip()
    if not u:
        return u
    m = re.match(r"^https?://(www\.)?leetcode\.com/u/([^/]+)/?$", u)
    if m:
        username = m.group(2)
        return f"https://leetcode.com/{username}/"
    m2 = re.match(r"^https?://(www\.)?leetcode\.com/([^/]+)/?$", u)
    if m2:
        username = m2.group(2)
        if username not in ["problemset", "problems", "contest", "explore", "accounts", "store", "u"]:
            return f"https://leetcode.com/{username}/"
    return u


def parse_json_best_effort(txt: str) -> Optional[Dict[str, Any]]:
    txt = (txt or "").strip()
    if not txt:
        return None

    try:
        d = json.loads(txt)
        if isinstance(d, dict):
            return d
    except Exception:
        pass

    first = txt.find("{")
    last = txt.rfind("}")
    if first != -1 and last != -1 and last > first:
        cand = txt[first:last + 1]
        try:
            d = json.loads(cand)
            if isinstance(d, dict):
                return d
        except Exception:
            pass

    return None


# --------------------------- LeetCode GraphQL ---------------------------

LEETCODE_GRAPHQL = "https://leetcode.com/graphql"

def leetcode_graphql_stats(username: str) -> Tuple[Dict[str, Any], List[str], bool]:
    notes: List[str] = []
    if not username:
        return {}, ["Missing username."], False

    query = """
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
      }
    }
    """
    payload = {"query": query, "variables": {"username": username}}
    headers = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}

    try:
        r = requests.post(LEETCODE_GRAPHQL, headers=headers, json=payload, timeout=20)
        if r.status_code != 200:
            return {}, [f"LeetCode GraphQL HTTP {r.status_code}"], False

        data = r.json()
        if "errors" in data:
            notes.append(f"GraphQL error: {data['errors'][0].get('message', 'unknown')}")
            return {}, notes, False

        mu = (data.get("data") or {}).get("matchedUser")
        if not mu:
            return {}, ["No matchedUser returned (wrong username or hidden)."], False

        ac = (((mu.get("submitStatsGlobal") or {}).get("acSubmissionNum")) or [])
        stats: Dict[str, Any] = {}
        for row in ac:
            diff = (row.get("difficulty") or "").lower()
            cnt = to_int(row.get("count"))
            if diff == "all":
                stats["solved_total"] = cnt
            elif diff == "easy":
                stats["easy"] = cnt
            elif diff == "medium":
                stats["medium"] = cnt
            elif diff == "hard":
                stats["hard"] = cnt

        return stats, notes, True

    except Exception as e:
        return {}, [f"GraphQL failed: {type(e).__name__}: {e}"], False


def extract_leetcode(url: str) -> PlatformResult:
    """
    Extract LeetCode profile data using GraphQL API
    
    NOTE: This function receives the URL from the resume link extractor.
    It normalizes the URL and extracts the username, then fetches data via LeetCode GraphQL.
    """
    print(f'📥 extract_leetcode() called with URL: {url}')
    
    url = normalize_leetcode_url(url)
    username = safe_username_from_url(url)
    
    print(f'📝 Normalized URL: {url}')
    print(f'👤 Extracted Username: {username}')
    
    res = PlatformResult(platform="leetcode", url=url, username=username)

    print(f'🔍 Fetching LeetCode GraphQL data for username: {username}')
    stats, notes, ok = leetcode_graphql_stats(username or "")
    
    if ok and stats:
        res.public = True
        res.stats.update(stats)
        res.raw_confidence = 0.85
        res.notes.extend(notes)
        print(f'✅ LeetCode data fetched successfully for {username}')
        print(f'   Stats: {stats}')
        return res

    res.public = False
    res.raw_confidence = 0.2
    res.notes.extend(notes)
    print(f'❌ Failed to fetch LeetCode data for {username}')
    print(f'   Reason: {notes}')
    return res


# --------------------------- Scoring (Updated to match 317/170/26 => ~76) ---------------------------

def score_leetcode_quality(p: PlatformResult) -> Tuple[int, List[str], List[str], List[str], Dict[str, int]]:
    """
    Returns:
      score (0..100),
      strengths[],
      gaps[],
      actions[],
      breakdown dict (for transparency)
    """
    if not p.public:
        return 0, [], ["leetcode: profile not accessible publicly (or blocked)."], ["Make LeetCode profile public."], {}

    strengths: List[str] = []
    gaps: List[str] = []
    actions: List[str] = []

    solved = to_int(p.stats.get("solved_total"))
    med = to_int(p.stats.get("medium"))
    hard = to_int(p.stats.get("hard"))
    # contest_rating usually not available from our current GraphQL query
    rating = to_int(p.stats.get("contest_rating"))

    # 1) Volume (0..35)
    if solved >= 900:
        vol = 35
    elif solved >= 700:
        vol = 32
    elif solved >= 500:
        vol = 28
    elif solved >= 300:
        vol = 25
    elif solved >= 150:
        vol = 18
    else:
        vol = 10

    if solved >= 300:
        strengths.append(f"leetcode: strong volume ({solved} solved).")
    elif solved >= 150:
        strengths.append(f"leetcode: moderate volume ({solved} solved).")
        actions.append("Increase solved to 300+ for stronger signal.")
    else:
        gaps.append(f"leetcode: low solved count ({solved}).")
        actions.append("Build consistency: 3–5 problems/day for 4 weeks.")

    # 2) Difficulty depth (0..40)
    # Medium part (0..18): +3 per 40 medium
    med_part = min(18, (med // 40) * 3)
    # Hard part (0..22): +4 per 5 hard
    hard_part = min(22, (hard // 5) * 4)
    depth = clamp(med_part + hard_part, 0, 40)

    if hard >= 25:
        strengths.append(f"leetcode: solid hard exposure ({hard} hard).")
    elif hard > 0:
        gaps.append(f"leetcode: hard count is low ({hard}).")
        actions.append("Add 15–25 Hard (DP/Graphs/Trees) in the next month.")
    else:
        gaps.append("leetcode: no hard problems detected.")
        actions.append("Start with 10 Hard problems after upsolving Medium.")

    # 3) Balance (0..15) using (Medium+Hard)/Solved
    mh = med + hard
    ratio = (mh / max(1, solved)) if solved > 0 else 0.0
    if ratio >= 0.75:
        bal = 15
    elif ratio >= 0.65:
        bal = 13
    elif ratio >= 0.55:
        bal = 11
    elif ratio >= 0.45:
        bal = 9
    else:
        bal = 6

    if ratio < 0.55 and solved >= 150:
        gaps.append("leetcode: easy-heavy profile; push more Medium/Hard.")
        actions.append("Shift to 70% Medium + 20% Hard for the next month.")

    # 4) Contest bonus (0..10) OPTIONAL
    # not required for good score; only boosts if available
    if rating >= 2000:
        contest = 10
    elif rating >= 1700:
        contest = 8
    elif rating >= 1500:
        contest = 6
    elif rating > 0:
        contest = 4
    else:
        contest = 0
        actions.append("Optional: join weekly contests to add rating/rank signal.")

    # 5) Consistency bonus (0..8) to make 300+ solved reflect consistency
    if solved >= 400:
        cons = 8
    elif solved >= 300:
        cons = 6
    elif solved >= 200:
        cons = 4
    elif solved >= 100:
        cons = 2
    else:
        cons = 0

    score = clamp(vol + depth + bal + contest + cons, 0, 100)

    breakdown = {
        "volume": vol,            # /35
        "depth": depth,           # /40
        "balance": bal,           # /15
        "contest_bonus": contest, # /10
        "consistency_bonus": cons # /8
    }

    # Dedupe actions
    seen = set()
    dedup_actions = []
    for a in actions:
        if a not in seen:
            seen.add(a)
            dedup_actions.append(a)

    return score, strengths[:10], gaps[:10], dedup_actions[:10], breakdown


def overall_from_platform_scores(platform_scores: Dict[str, int]) -> int:
    # LeetCode-only agent: overall equals the one platform score
    if not platform_scores:
        return 0
    return next(iter(platform_scores.values()))


def grade_from_score(score: int) -> str:
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 70: return "C"
    if score >= 60: return "D"
    return "E"


# --------------------------- Deterministic Resume CP Score ---------------------------

def compute_resume_score_from_cp(leetcode: PlatformResult, lc_score: int, lc_breakdown: Dict[str, int]) -> ResumeCPInsights:
    solved = to_int(leetcode.stats.get("solved_total"))
    med = to_int(leetcode.stats.get("medium"))
    hard = to_int(leetcode.stats.get("hard"))

    # Stable resume score: map platform score to resume score with explainable breakdown
    breakdown = {
        "leetcode_quality_score": clamp(lc_score, 0, 100),
        "problem_solving_volume": clamp(lc_breakdown.get("volume", 0), 0, 35),
        "difficulty_depth": clamp(lc_breakdown.get("depth", 0), 0, 40),
        "profile_balance": clamp(lc_breakdown.get("balance", 0), 0, 15),
    }

    # Weighted into a resume number (0..100)
    resume_score = int(round(
        0.55 * breakdown["leetcode_quality_score"] +
        0.20 * (breakdown["difficulty_depth"] * (100 / 40)) +
        0.15 * (breakdown["problem_solving_volume"] * (100 / 35)) +
        0.10 * (breakdown["profile_balance"] * (100 / 15))
    ))
    resume_score = clamp(resume_score, 0, 100)

    ats = (
        f"Competitive Programming: Solved {solved}+ DSA problems "
        f"({med} Medium, {hard} Hard) on LeetCode; strong foundations in Data Structures & Algorithms."
    )

    bullets = [
        "Increase Hard problems to 40+ for stronger advanced DSA signal.",
        "Do weekly contests + upsolve to build ranking/rating evidence.",
        "Write 2–3 short notes on DP/Graphs patterns you used.",
    ]

    return ResumeCPInsights(
        ats_cp_summary=ats,
        resume_score_from_cp=resume_score,
        resume_score_breakdown=breakdown,
        improvement_bullets=bullets,
    )


# --------------------------- Gemini (SMALL JSON to avoid truncation) ---------------------------

LLM_SYSTEM_SMALL = """Return ONLY a SMALL JSON object. No markdown, no extra text.
Keep every string short (max ~12 words). Keep lists short (max 5 items).

Required keys EXACTLY:
skills_inferred: string[]
strengths: string[]
gaps: string[]
action_plan_2_weeks: string[]   (each item like "Week1: ...", "Week2: ...")
resume_ready_summary: string    (one line)

Do NOT add any other keys.
"""


def gemini_small_json(payload: Dict[str, Any], debug_llm: bool = False) -> Tuple[Optional[Dict[str, Any]], str]:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None, "GOOGLE_API_KEY missing."

    client = genai.Client(api_key=api_key)

    resp = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Content(role="user", parts=[
                types.Part(text=LLM_SYSTEM_SMALL),
                types.Part(text=json.dumps(payload, ensure_ascii=False)),
            ])
        ],
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=650,
        ),
    )

    txt = (getattr(resp, "text", None) or "").strip()

    # fallback: candidates parts (SDK variations)
    if not txt:
        try:
            cands = getattr(resp, "candidates", None) or []
            if cands:
                parts = getattr(cands[0].content, "parts", None) or []
                txt = "\n".join([p.text for p in parts if getattr(p, "text", None)]).strip()
        except Exception:
            pass

    if debug_llm:
        print("\n--- GEMINI RAW START ---")
        print(txt)
        print("--- GEMINI RAW END ---\n")

    data = parse_json_best_effort(txt)
    return data, txt


# --------------------------- Main ---------------------------

def run_agent(leetcode_url: str, use_llm: bool, debug_llm: bool) -> AgentReport:
    """
    Main entry point for CP analysis
    
    IMPORTANT: This function receives the LeetCode URL directly from the API request.
    The URL comes from extracted_links.leetcode[0] in the resume analysis.
    NO hard-coded URLs or usernames are used here.
    """
    print(f'\n{"="*70}')
    print(f'🎯 CP AGENT EXECUTION')
    print(f'{"="*70}')
    print(f'Input LeetCode URL: {leetcode_url}')
    print(f'URL Source: Extracted from uploaded resume PDF')
    print(f'{"="*70}\n')
    
    lc = extract_leetcode(leetcode_url)
    
    # Log what username was extracted from the URL
    if lc.username:
        print(f'✅ Extracted username from URL: {lc.username}')
    else:
        print(f'⚠️  Could not extract username from URL: {leetcode_url}')
    
    platforms = {"leetcode": lc}

    lc_score, strengths, gaps, actions, breakdown = score_leetcode_quality(lc)

    platform_scores = {"leetcode": lc_score}
    overall = overall_from_platform_scores(platform_scores)
    grade = grade_from_score(overall)

    # baseline inferred skills from stats (deterministic)
    skills: List[str] = []
    if lc.public:
        if to_int(lc.stats.get("hard")) >= 10:
            skills += ["Advanced problem solving", "DP", "Graphs"]
        if to_int(lc.stats.get("medium")) >= 30:
            skills += ["DSA fundamentals"]
    skills = sorted(set(skills))

    report = AgentReport(
        overall_score=overall,
        grade=grade,
        platform_scores=platform_scores,
        skills_inferred=skills,
        strengths=strengths,
        gaps=gaps,
        action_items=actions,
        platform_data=platforms,
        llm_analysis=None,
        resume_cp_insights=compute_resume_score_from_cp(lc, lc_score, breakdown) if lc.public else None
    )

    if use_llm:
        payload = {
            "leetcode_stats": lc.stats,
            "leetcode_score": lc_score,
            "score_breakdown": breakdown,
            "strengths": strengths,
            "gaps": gaps,
        }

        ext, raw_txt = gemini_small_json(payload, debug_llm=debug_llm)
        if ext:
            report.llm_analysis = LLMAnalysis(
                skills_inferred=ext.get("skills_inferred", []),
                strengths=ext.get("strengths", []),
                gaps=ext.get("gaps", []),
                action_plan_2_weeks=ext.get("action_plan_2_weeks", []),
                resume_ready_summary=ext.get("resume_ready_summary", ""),
            )
        else:
            preview = raw_txt[:300].replace("\n", " ")
            report.llm_analysis = LLMAnalysis(gaps=[f"Gemini JSON parse failed. Preview: {preview}"])

    return report


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--leetcode", required=True, help="LeetCode profile URL")
    ap.add_argument("--no-llm", action="store_true", help="Disable Gemini enrichment")
    ap.add_argument("--debug-llm", action="store_true", help="Print Gemini raw output")
    return ap.parse_args()


def main():
    args = parse_args()
    report = run_agent(args.leetcode, use_llm=(not args.no_llm), debug_llm=args.debug_llm)
    print(report.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
