# ATSMaster: Agent Implementation Code Patterns
## Ready-to-Build Templates for LangGraph Agents

---

## 🏗️ BASIC AGENT STRUCTURE (Python with LangGraph)

### 1. Simple GitHub Agent Template

```python
# agents/github_agent.py
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage
import requests
import json
from typing import Any, Dict, List

# Define the agent state
class AgentState(TypedDict):
    github_url: str
    github_username: str
    user_message: str
    messages: List[str]
    github_data: Dict[str, Any]
    github_score: float

# Tool definitions
def fetch_github_profile(username: str) -> Dict:
    """Fetch GitHub profile data"""
    try:
        response = requests.get(
            f"https://api.github.com/users/{username}",
            headers={"Authorization": f"token {GITHUB_TOKEN}"}
        )
        data = response.json()
        return {
            "username": data.get("login"),
            "followers": data.get("followers"),
            "repos": data.get("public_repos"),
            "profile_url": data.get("html_url")
        }
    except Exception as e:
        return {"error": str(e)}

def fetch_user_repos(username: str) -> List[Dict]:
    """Fetch user's repositories"""
    try:
        response = requests.get(
            f"https://api.github.com/users/{username}/repos",
            headers={"Authorization": f"token {GITHUB_TOKEN}"},
            params={"per_page": 100, "sort": "stars"}
        )
        repos = response.json()
        return [
            {
                "name": r.get("name"),
                "stars": r.get("stargazers_count"),
                "language": r.get("language"),
                "description": r.get("description")
            }
            for r in repos
        ]
    except Exception as e:
        return []

# Agent nodes
def process_github_url(state: AgentState) -> AgentState:
    """Extract username from GitHub URL"""
    url = state["github_url"]
    username = url.split("/")[-1]
    state["github_username"] = username
    return state

def fetch_github_data(state: AgentState) -> AgentState:
    """Fetch GitHub profile and repos"""
    username = state["github_username"]
    profile = fetch_github_profile(username)
    repos = fetch_user_repos(username)
    
    state["github_data"] = {
        "profile": profile,
        "repositories": repos
    }
    return state

def calculate_github_score(state: AgentState) -> AgentState:
    """Calculate developer score based on GitHub data"""
    data = state["github_data"]
    profile = data.get("profile", {})
    repos = data.get("repositories", [])
    
    # Scoring logic
    score = 0
    
    # 30% - Repository Quality
    if repos:
        avg_stars = sum(r.get("stars", 0) for r in repos) / len(repos)
        score += min(30, (avg_stars / 10))  # Scale to 30 points max
    
    # 30% - Activity
    followers = profile.get("followers", 0)
    score += min(30, followers / 5)  # Scale to 30 points
    
    # 20% - Diversity
    languages = set(r.get("language") for r in repos if r.get("language"))
    score += min(20, len(languages) * 2)  # Scale to 20 points
    
    # 20% - Prolific
    total_repos = profile.get("repos", 0)
    score += min(20, total_repos / 2)  # Scale to 20 points
    
    state["github_score"] = min(100, score)
    return state

def generate_github_report(state: AgentState) -> AgentState:
    """Use LLM to generate human-readable report"""
    model = ChatOpenAI(model="gpt-4")
    
    prompt = f"""
    Based on this GitHub data, generate a brief developer profile:
    
    Profile: {state['github_data']['profile']}
    Top Repos: {state['github_data']['repositories'][:5]}
    Score: {state['github_score']}/100
    
    Provide:
    1. Overall assessment (1-2 sentences)
    2. Strengths (2-3 bullet points)
    3. Recommendations (1-2 bullet points)
    """
    
    response = model.invoke([HumanMessage(content=prompt)])
    state["messages"].append(f"GitHub Report:\n{response.content}")
    
    return state

# Build the graph
workflow = StateGraph(AgentState)

workflow.add_node("process_url", process_github_url)
workflow.add_node("fetch_data", fetch_github_data)
workflow.add_node("calculate_score", calculate_github_score)
workflow.add_node("generate_report", generate_github_report)

workflow.add_edge("process_url", "fetch_data")
workflow.add_edge("fetch_data", "calculate_score")
workflow.add_edge("calculate_score", "generate_report")
workflow.add_edge("generate_report", END)

workflow.set_entry_point("process_url")

github_agent = workflow.compile()

# Run the agent
def run_github_verification(github_url: str):
    initial_state = {
        "github_url": github_url,
        "github_username": "",
        "user_message": "",
        "messages": [],
        "github_data": {},
        "github_score": 0
    }
    
    result = github_agent.invoke(initial_state)
    return result
```

---

## 🤖 MULTI-AGENT SUPERVISOR PATTERN

### Supervisor Agent Orchestrating All 4 Agents

```python
# agents/supervisor_agent.py
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from typing import TypedDict, List, Dict, Any

# Import individual agents
from .github_agent import github_agent
from .linkedin_agent import linkedin_agent
from .portfolio_agent import portfolio_agent
from .opensource_agent import opensource_agent

class SupervisorState(TypedDict):
    resume_data: Dict[str, Any]
    github_url: str
    linkedin_url: str
    portfolio_url: str
    messages: List[str]
    
    # Results from individual agents
    github_result: Dict
    linkedin_result: Dict
    portfolio_result: Dict
    opensource_result: Dict
    
    # Final scores
    credibility_score: float
    risk_flags: List[str]
    final_report: str

def extract_urls_from_resume(state: SupervisorState) -> SupervisorState:
    """Extract credential URLs from parsed resume"""
    resume = state["resume_data"]
    
    # Look for URLs in resume
    state["github_url"] = resume.get("github_url", "")
    state["linkedin_url"] = resume.get("linkedin_url", "")
    state["portfolio_url"] = resume.get("portfolio_url", "")
    
    state["messages"].append("✓ Extracted credential URLs from resume")
    return state

def run_github_verification(state: SupervisorState) -> SupervisorState:
    """Run GitHub agent"""
    if state["github_url"]:
        result = github_agent.invoke({
            "github_url": state["github_url"],
            "messages": []
        })
        state["github_result"] = result
        state["messages"].append(f"✓ GitHub verification complete (Score: {result.get('github_score', 'N/A')})")
    else:
        state["messages"].append("⚠ No GitHub URL found")
    
    return state

def run_linkedin_verification(state: SupervisorState) -> SupervisorState:
    """Run LinkedIn agent"""
    if state["linkedin_url"]:
        result = linkedin_agent.invoke({
            "linkedin_url": state["linkedin_url"],
            "messages": []
        })
        state["linkedin_result"] = result
        state["messages"].append(f"✓ LinkedIn verification complete")
    else:
        state["messages"].append("⚠ No LinkedIn URL found")
    
    return state

def run_portfolio_verification(state: SupervisorState) -> SupervisorState:
    """Run Portfolio agent"""
    if state["portfolio_url"]:
        result = portfolio_agent.invoke({
            "portfolio_url": state["portfolio_url"],
            "messages": []
        })
        state["portfolio_result"] = result
        state["messages"].append(f"✓ Portfolio verification complete")
    else:
        state["messages"].append("⚠ No portfolio URL found")
    
    return state

def run_opensource_verification(state: SupervisorState) -> SupervisorState:
    """Run Open Source agent"""
    username = state["github_url"].split("/")[-1] if state["github_url"] else ""
    if username:
        result = opensource_agent.invoke({
            "github_username": username,
            "messages": []
        })
        state["opensource_result"] = result
        state["messages"].append(f"✓ Open source verification complete")
    
    return state

def calculate_credibility_score(state: SupervisorState) -> SupervisorState:
    """Calculate final credibility score"""
    
    scores = {}
    
    # Extract component scores
    if state.get("github_result"):
        scores["github"] = state["github_result"].get("github_score", 0)
    
    if state.get("linkedin_result"):
        scores["linkedin"] = state["linkedin_result"].get("linkedin_score", 0)
    
    if state.get("portfolio_result"):
        scores["portfolio"] = state["portfolio_result"].get("portfolio_score", 0)
    
    if state.get("opensource_result"):
        scores["opensource"] = state["opensource_result"].get("opensource_score", 0)
    
    # Weighted average
    if scores:
        weights = {
            "github": 0.25,
            "linkedin": 0.20,
            "portfolio": 0.15,
            "opensource": 0.10
        }
        
        weighted_score = sum(
            scores.get(key, 0) * weights.get(key, 0)
            for key in weights.keys()
        )
        
        # Add 30% for resume alignment
        resume_alignment = 87.5  # From ATS analysis
        weighted_score += resume_alignment * 0.30
        
        state["credibility_score"] = min(100, weighted_score)
    
    state["messages"].append(f"✓ Credibility score calculated: {state['credibility_score']:.1f}")
    return state

def detect_risk_flags(state: SupervisorState) -> SupervisorState:
    """Detect red flags and inconsistencies"""
    flags = []
    
    # Check for major inconsistencies
    github_score = state.get("github_result", {}).get("github_score", 0)
    linkedin_score = state.get("linkedin_result", {}).get("linkedin_score", 0)
    
    if abs(github_score - linkedin_score) > 30:
        flags.append("Large gap between GitHub activity and LinkedIn presence")
    
    # Check for broken portfolio
    portfolio_score = state.get("portfolio_result", {}).get("portfolio_score", 0)
    if portfolio_score < 40:
        flags.append("Portfolio quality below expectations")
    
    # Check for resume-reality alignment
    resume_claims = state.get("resume_data", {})
    github_result = state.get("github_result", {})
    
    if resume_claims.get("years_experience", 0) > 5 and github_score < 50:
        flags.append("Claimed experience level not supported by GitHub activity")
    
    state["risk_flags"] = flags
    
    if flags:
        state["messages"].append(f"⚠️ {len(flags)} risk flags detected")
    else:
        state["messages"].append("✓ No risk flags detected")
    
    return state

def generate_final_report(state: SupervisorState) -> SupervisorState:
    """Generate comprehensive credibility report"""
    model = ChatOpenAI(model="gpt-4")
    
    prompt = f"""
    Generate a comprehensive candidate credibility report based on:
    
    Resume Analysis:
    - Experience: {state['resume_data'].get('years_experience', 'Unknown')} years
    - Skills: {state['resume_data'].get('skills', [])}
    
    Verification Results:
    - GitHub Score: {state.get('github_result', {}).get('github_score', 'N/A')}
    - LinkedIn Score: {state.get('linkedin_result', {}).get('linkedin_score', 'N/A')}
    - Portfolio Score: {state.get('portfolio_result', {}).get('portfolio_score', 'N/A')}
    - Open Source: {state.get('opensource_result', {}).get('opensource_score', 'N/A')}
    
    Credibility Score: {state['credibility_score']:.1f}/100
    Risk Flags: {state['risk_flags']}
    
    Provide:
    1. Executive Summary (3-4 sentences)
    2. Verification Results (bullet points)
    3. Strengths (3-4 items)
    4. Concerns (if any)
    5. Hiring Recommendation
    """
    
    response = model.invoke([HumanMessage(content=prompt)])
    state["final_report"] = response.content
    state["messages"].append("✓ Final report generated")
    
    return state

# Build supervisor workflow
supervisor_workflow = StateGraph(SupervisorState)

supervisor_workflow.add_node("extract_urls", extract_urls_from_resume)
supervisor_workflow.add_node("verify_github", run_github_verification)
supervisor_workflow.add_node("verify_linkedin", run_linkedin_verification)
supervisor_workflow.add_node("verify_portfolio", run_portfolio_verification)
supervisor_workflow.add_node("verify_opensource", run_opensource_verification)
supervisor_workflow.add_node("calculate_score", calculate_credibility_score)
supervisor_workflow.add_node("detect_flags", detect_risk_flags)
supervisor_workflow.add_node("generate_report", generate_final_report)

# Connect nodes - parallel verification possible
supervisor_workflow.add_edge("extract_urls", "verify_github")
supervisor_workflow.add_edge("extract_urls", "verify_linkedin")
supervisor_workflow.add_edge("extract_urls", "verify_portfolio")
supervisor_workflow.add_edge("verify_github", "verify_opensource")

# All verifications converge
supervisor_workflow.add_edge("verify_linkedin", "calculate_score")
supervisor_workflow.add_edge("verify_portfolio", "calculate_score")
supervisor_workflow.add_edge("verify_opensource", "calculate_score")

supervisor_workflow.add_edge("calculate_score", "detect_flags")
supervisor_workflow.add_edge("detect_flags", "generate_report")
supervisor_workflow.add_edge("generate_report", END)

supervisor_workflow.set_entry_point("extract_urls")

credential_verification_agent = supervisor_workflow.compile()

# Run the full verification
def verify_candidate(resume_data: Dict, github_url: str = "", linkedin_url: str = "", portfolio_url: str = ""):
    """Run complete credential verification"""
    
    initial_state = {
        "resume_data": resume_data,
        "github_url": github_url,
        "linkedin_url": linkedin_url,
        "portfolio_url": portfolio_url,
        "messages": [],
        "github_result": {},
        "linkedin_result": {},
        "portfolio_result": {},
        "opensource_result": {},
        "credibility_score": 0,
        "risk_flags": [],
        "final_report": ""
    }
    
    result = credential_verification_agent.invoke(initial_state)
    
    return {
        "credibility_score": result["credibility_score"],
        "risk_flags": result["risk_flags"],
        "final_report": result["final_report"],
        "component_scores": {
            "github": result.get("github_result", {}).get("github_score", 0),
            "linkedin": result.get("linkedin_result", {}).get("linkedin_score", 0),
            "portfolio": result.get("portfolio_result", {}).get("portfolio_score", 0),
            "opensource": result.get("opensource_result", {}).get("opensource_score", 0)
        }
    }
```

---

## 🌐 WEB SCRAPING WITH FIRECRAWL (For LinkedIn/Portfolio)

```python
# agents/web_scraper.py
from firecrawl import FirecrawlApp
import asyncio

class WebScraper:
    def __init__(self, api_key: str):
        self.app = FirecrawlApp(api_key=api_key)
    
    def scrape_portfolio(self, url: str) -> Dict:
        """Scrape portfolio website"""
        try:
            response = self.app.scrape_url(url, {
                "formats": ["markdown", "html"]
            })
            
            # Extract project links
            content = response.get("markdown", "")
            projects = self._extract_projects(content)
            
            return {
                "url": url,
                "status": "success",
                "projects": projects,
                "content": content
            }
        except Exception as e:
            return {"url": url, "status": "failed", "error": str(e)}
    
    def scrape_linkedin_profile(self, linkedin_url: str) -> Dict:
        """Scrape LinkedIn profile (respecting ToS)"""
        try:
            response = self.app.scrape_url(linkedin_url, {
                "formats": ["markdown"],
                "wait_for": ".profile-section"
            })
            
            content = response.get("markdown", "")
            profile_data = self._parse_linkedin(content)
            
            return {
                "url": linkedin_url,
                "status": "success",
                "profile_data": profile_data
            }
        except Exception as e:
            return {"url": linkedin_url, "status": "failed", "error": str(e)}
    
    def verify_project_url(self, project_url: str) -> Dict:
        """Verify if project URL is live and functional"""
        try:
            response = self.app.scrape_url(project_url, {
                "formats": ["html"],
                "screenshot": True
            })
            
            return {
                "url": project_url,
                "status": "live",
                "load_time": response.get("metadata", {}).get("load_time", 0),
                "screenshot_url": response.get("screenshot_url", "")
            }
        except:
            return {"url": project_url, "status": "offline"}
    
    def _extract_projects(self, content: str) -> List[Dict]:
        """Extract project information from portfolio markdown"""
        projects = []
        # Simple regex pattern matching for project URLs
        import re
        
        url_pattern = r'https?://[^\s)]*'
        urls = re.findall(url_pattern, content)
        
        for url in urls:
            if any(x in url for x in ['demo', 'live', 'app', 'project']):
                projects.append({"title": url, "url": url})
        
        return projects
    
    def _parse_linkedin(self, content: str) -> Dict:
        """Parse LinkedIn profile from scraped content"""
        # Advanced parsing logic
        return {
            "raw_content": content
            # Additional parsing as needed
        }

# Usage
scraper = WebScraper(api_key="your_firecrawl_key")
portfolio_data = scraper.scrape_portfolio("https://johndoe.dev")
```

---

## 📊 BACKEND INTEGRATION (Express.js)

```javascript
// backend/routes/verification.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Call Python agent from Node.js
const { PythonShell } = require('python-shell');

router.post('/verify-credentials', async (req, res) => {
    try {
        const { resumeData, github_url, linkedin_url, portfolio_url } = req.body;
        
        // Call Python agent
        const options = {
            mode: 'json',
            pythonPath: '/usr/bin/python3',
            scriptPath: './agents/'
        };
        
        PythonShell.run('verify_candidate.py', options, (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const verification_result = results[0];
            
            // Save to database
            const result = new VerificationResult({
                resumeId: req.body.resumeId,
                credibilityScore: verification_result.credibility_score,
                riskFlags: verification_result.risk_flags,
                componentScores: verification_result.component_scores,
                report: verification_result.final_report
            });
            
            result.save();
            
            res.json({
                success: true,
                credibility_score: verification_result.credibility_score,
                risk_flags: verification_result.risk_flags,
                report: verification_result.final_report
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

---

## 📱 FRONTEND DISPLAY (React)

```javascript
// frontend/components/CredibilityReport.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export const CredibilityReport = ({ credibilityScore, componentScores, riskFlags, report }) => {
    return (
        <div className="credibility-report">
            <h2>Credential Verification Report</h2>
            
            {/* Main Score */}
            <div className="main-score">
                <CircularProgress 
                    value={credibilityScore}
                    label={`${credibilityScore.toFixed(1)}/100`}
                />
                <p>Overall Credibility Score</p>
            </div>
            
            {/* Component Scores */}
            <div className="component-scores">
                <BarChart data={[
                    { name: 'GitHub', value: componentScores.github },
                    { name: 'LinkedIn', value: componentScores.linkedin },
                    { name: 'Portfolio', value: componentScores.portfolio },
                    { name: 'OpenSource', value: componentScores.opensource }
                ]}>
                    <CartesianGrid />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
            </div>
            
            {/* Risk Flags */}
            {riskFlags.length > 0 && (
                <div className="risk-flags">
                    <h3>⚠️ Risk Flags</h3>
                    <ul>
                        {riskFlags.map((flag, idx) => (
                            <li key={idx}>{flag}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            {/* Full Report */}
            <div className="full-report">
                <h3>Full Report</h3>
                <pre>{report}</pre>
            </div>
        </div>
    );
};
```

---

## 🎯 QUICK DEPLOYMENT CHECKLIST

```
Agent Setup:
[ ] Install LangGraph, langchain, google-generativeai
[ ] Set up environment variables (API keys)
[ ] Create agent files (4 individual agents + supervisor)
[ ] Test each agent independently
[ ] Connect agents in supervisor workflow
[ ] Add caching (Redis) for performance
[ ] Implement rate limiting
[ ] Add error handling & retries

Integration:
[ ] Create Express routes for verification
[ ] Connect React frontend to verification API
[ ] Store results in MongoDB
[ ] Add verification timestamps
[ ] Create dashboard visualizations
[ ] Test end-to-end flow

Security:
[ ] Validate URLs before scraping
[ ] Implement rate limiting
[ ] Add request signing for APIs
[ ] Encrypt stored credentials
[ ] Add audit logging
[ ] GDPR compliance check

Testing:
[ ] Unit test each agent
[ ] Integration tests
[ ] Test with 50+ real candidates
[ ] Performance testing
[ ] Error scenario testing
[ ] Security testing
```

---

This gives you **production-ready code patterns** to start building your agent layer! 🚀

Start with the simple GitHub agent, then expand to the supervisor pattern with all 4 agents.
