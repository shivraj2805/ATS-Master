import os
import json
import random
import re
import math
import time
import base64
import datetime as dt
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
import requests

# Import competitive profile agent
from competitive_profile_agent_gemini import (
    run_agent as run_cp_agent,
    extract_leetcode,
    score_leetcode_quality,
    compute_resume_score_from_cp
)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

# GitHub API Configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_HEADERS = {"Accept": "application/vnd.github+json"}
if GITHUB_TOKEN:
    GITHUB_HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"

# Generation configuration for varied responses
generation_config = {
    "temperature": 0.9,  # Higher temperature for more creative/varied responses
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 2048,
}

model = genai.GenerativeModel(
    'gemini-2.5-flash',
    generation_config=generation_config
)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'AI Service',
        'model': 'gemini-2.5-flash',
        'temperature': generation_config['temperature'],
        'capabilities': [
            'optimize-summary (5 varied styles)',
            'enhance-bullets (5 enhancement approaches)', 
            'keyword-suggestions (3 output formats)',
            'ats-tips (5 focus areas)',
            'cover-letter-generation',
            'github-profile-analysis',
            'competitive-programming-analysis (LeetCode)',
            'batch-profile-analysis'
        ]
    })

@app.route('/api/ai/optimize-summary', methods=['POST'])
def optimize_summary():
    """Generate an optimized professional summary based on resume and job description"""
    try:
        data = request.json
        resume_text = data.get('resumeText', '')
        job_description = data.get('jobDescription', '')
        current_summary = data.get('currentSummary', '')
        
        if not resume_text or not job_description:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Vary the format and style for each request
        formats = [
            {
                "style": "achievement-focused",
                "instructions": "Write the summary in a results-driven format emphasizing quantifiable achievements and impact. Start with years of experience and domain expertise."
            },
            {
                "style": "skills-forward",
                "instructions": "Lead with technical skills and expertise, then highlight relevant experience. Use industry-specific terminology."
            },
            {
                "style": "value-proposition",
                "instructions": "Frame as a value proposition - what unique value does the candidate bring? Focus on solving business problems."
            },
            {
                "style": "storytelling",
                "instructions": "Create a narrative arc showing professional evolution and growth. Connect past achievements to future potential."
            },
            {
                "style": "executive-style",
                "instructions": "Write in an executive style with strategic thinking emphasis. Highlight leadership, vision, and business impact."
            }
        ]
        
        # Randomly select a format for variety
        selected_format = random.choice(formats)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        prompt = f"""You are an expert resume writer with 15+ years of experience. Today's date: {datetime.now().strftime("%B %d, %Y")}.

Create a compelling professional summary using the {selected_format['style']} approach.

FORMAT INSTRUCTIONS: {selected_format['instructions']}

REQUIREMENTS:
1. Must be 50-80 words (3-4 compelling sentences)
2. Align candidate's experience with job requirements
3. Include specific skills from job description naturally
4. Use powerful action verbs
5. Make it unique - avoid generic phrases
6. Optimize for ATS scanning with relevant keywords
7. Show personality and unique value proposition

Job Description:
{job_description}

Candidate's Full Resume:
{resume_text}

Current Summary (reference only):
{current_summary or 'None provided'}

Generate ONLY the optimized professional summary. Make it compelling, unique, and tailored specifically to this role. No explanations."""

        response = model.generate_content(prompt)
        optimized_summary = response.text.strip()
        
        # Remove any markdown formatting or extra text
        optimized_summary = optimized_summary.replace('**', '').replace('##', '').strip()
        
        return jsonify({
            'success': True,
            'optimized_summary': optimized_summary,
            'original_summary': current_summary,
            'style_used': selected_format['style'],
            'generation_id': f"{timestamp}_{random.randint(1000, 9999)}"
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/enhance-bullets', methods=['POST'])
def enhance_bullets():
    """Enhance bullet points with action verbs and quantifiable achievements"""
    try:
        data = request.json
        bullets = data.get('bullets', [])
        job_description = data.get('jobDescription', '')
        
        if not bullets or not job_description:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Different enhancement styles
        enhancement_styles = [
            {
                "style": "metric_driven",
                "instruction": "Transform into metric-heavy results statements with specific numbers and percentages"
            },
            {
                "style": "action_oriented",
                "instruction": "Lead with powerful action verbs, emphasize initiative and leadership"
            },
            {
                "style": "context_action_result",
                "instruction": "Use CAR format: Context, Action taken, Result achieved"
            },
            {
                "style": "challenge_solution_impact",
                "instruction": "Frame as: Challenge faced, Solution implemented, Impact delivered"
            },
            {
                "style": "skill_showcase",
                "instruction": "Highlight technical skills and tools used, emphasize expertise demonstration"
            }
        ]
        
        enhanced_bullets = []
        
        for i, bullet in enumerate(bullets[:5]):  # Limit to 5 bullets at a time
            # Vary style for each bullet or use the same style for consistency
            selected_style = random.choice(enhancement_styles) if i == 0 else selected_style
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            
            prompt = f"""You are an expert resume writer specializing in achievement-focused bullet points.

ENHANCEMENT STYLE: {selected_style['style']}
INSTRUCTIONS: {selected_style['instruction']}

Original Bullet:
{bullet}

Job Description Context:
{job_description[:600]}

REQUIREMENTS:
1. Start with a strong, specific action verb
2. Include quantifiable metrics (use [X%] or [Y units] if actual numbers unknown)
3. Align with job description keywords naturally
4. Keep to 1-2 lines maximum (15-25 words)
5. Focus on impact and results, not just responsibilities
6. Make it ATS-friendly with relevant keywords
7. Be specific and concrete - avoid vague terms

Return ONLY the enhanced bullet point. No explanations, no bullets or numbering."""

            response = model.generate_content(prompt)
            enhanced = response.text.strip()
            
            # Clean up the enhanced bullet
            enhanced = enhanced.lstrip('•-*0123456789. ').strip()
            
            enhanced_bullets.append({
                'original': bullet,
                'enhanced': enhanced,
                'style': selected_style['style'],
                'generation_id': f"{timestamp}_{i}"
            })
        
        return jsonify({
            'success': True,
            'enhanced_bullets': enhanced_bullets,
            'style_used': selected_style['style']
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/keyword-suggestions', methods=['POST'])
def keyword_suggestions():
    """Generate keyword placement suggestions"""
    try:
        data = request.json
        resume_text = data.get('resumeText', '')
        job_description = data.get('jobDescription', '')
        missing_skills = data.get('missingSkills', [])
        
        if not resume_text or not job_description:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Vary output format
        output_formats = [
            {
                "format": "structured_json",
                "prompt_addition": "Return as a JSON array of objects with: section, keyword, suggestion, example"
            },
            {
                "format": "detailed_list",
                "prompt_addition": "Return as a numbered list with detailed explanations for each suggestion"
            },
            {
                "format": "section_based",
                "prompt_addition": "Group suggestions by resume section (Summary, Experience, Skills, etc.)"
            }
        ]
        
        selected_format = random.choice(output_formats)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        prompt = f"""You are an ATS optimization expert analyzing a resume-job match. Request ID: {timestamp}

Job Description:
{job_description}

Resume Content:
{resume_text}

Missing/Weak Skills Identified: {', '.join(missing_skills[:15])}

TASK: Provide 6-8 SPECIFIC, ACTIONABLE keyword placement suggestions.

For EACH suggestion:
1. Identify the EXACT keyword/skill to add
2. Specify WHERE in the resume (which section, which bullet)
3. Provide NATURAL phrasing to incorporate it
4. Give a concrete EXAMPLE sentence

{selected_format['prompt_addition']}

Make suggestions realistic and natural - don't force keywords where they don't belong.
Focus on high-impact changes that improve ATS matching."""

        response = model.generate_content(prompt)
        
        # Try to parse as JSON, otherwise return as structured text
        try:
            suggestions_text = response.text.strip()
            # Remove markdown code blocks if present
            if '```json' in suggestions_text:
                suggestions_text = suggestions_text.split('```json')[1].split('```')[0].strip()
            elif '```' in suggestions_text:
                suggestions_text = suggestions_text.split('```')[1].split('```')[0].strip()
            
            # Try JSON parse
            suggestions = json.loads(suggestions_text)
        except:
            # Fallback: create structured suggestions from text
            lines = response.text.strip().split('\n')
            suggestions = []
            for line in lines:
                line = line.strip()
                if line and len(line) > 20 and not line.startswith('#'):
                    # Remove numbering if present
                    cleaned = line.lstrip('0123456789.-) ')
                    if cleaned:
                        suggestions.append({
                            'suggestion': cleaned,
                            'type': 'keyword_enhancement'
                        })
            suggestions = suggestions[:8]  # Limit to 8
        
        return jsonify({
            'success': True,
            'suggestions': suggestions,
            'format_used': selected_format['format'],
            'generation_id': f"{timestamp}_{random.randint(1000, 9999)}"
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/ats-tips', methods=['POST'])
def ats_tips():
    """Generate ATS compatibility tips"""
    try:
        data = request.json
        resume_text = data.get('resumeText', '')
        issues = data.get('issues', [])
        
        if not resume_text:
            return jsonify({'error': 'Missing resume text'}), 400
        
        # Vary the focus area for each request
        focus_areas = [
            {
                "area": "formatting_and_structure",
                "emphasis": "Focus on document structure, section organization, and ATS-friendly formatting"
            },
            {
                "area": "keyword_optimization",
                "emphasis": "Emphasize keyword density, placement, and relevance"
            },
            {
                "area": "content_quality",
                "emphasis": "Focus on bullet point quality, achievement quantification, and impact statements"
            },
            {
                "area": "technical_compatibility",
                "emphasis": "Highlight file format, font choices, and technical ATS parsing considerations"
            },
            {
                "area": "strategic_positioning",
                "emphasis": "Cover strategic improvements like section ordering, keyword front-loading, and skills showcase"
            }
        ]
        
        selected_focus = random.choice(focus_areas)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        prompt = f"""You are an ATS optimization expert with deep knowledge of how applicant tracking systems parse and rank resumes. Analysis ID: {timestamp}

PRIMARY FOCUS: {selected_focus['emphasis']}

Resume Content:
{resume_text}

Known Issues: {json.dumps(issues) if issues else 'None detected'}

TASK: Provide 5-7 SPECIFIC, ACTIONABLE ATS compatibility tips.

For EACH tip include:
1. Category (Formatting/Keywords/Content/Technical/Strategy)
2. Clear, actionable title
3. Detailed description (2-3 sentences)
4. Priority level (high/medium/low)
5. Expected impact on ATS score

Return as JSON array of tip objects with: category, title, description, priority, impact

Make tips specific to THIS resume - avoid generic advice. Focus on changes that will most improve ATS compatibility."""

        response = model.generate_content(prompt)
        
        try:
            tips_text = response.text.strip()
            # Remove markdown code blocks if present
            if '```json' in tips_text:
                tips_text = tips_text.split('```json')[1].split('```')[0].strip()
            elif '```' in tips_text:
                tips_text = tips_text.split('```')[1].split('```')[0].strip()
            tips = json.loads(tips_text)
        except:
            # Fallback: split by newlines and create simple tips
            lines = response.text.strip().split('\n')
            tips = []
            for line in lines:
                line = line.strip()
                if line and len(line) > 15 and not line.strip().startswith('#'):
                    cleaned = line.lstrip('0123456789.-) ')
                    if cleaned:
                        tips.append({
                            'title': cleaned[:100],
                            'description': cleaned,
                            'priority': 'medium',
                            'category': 'General'
                        })
            tips = tips[:7]
        
        return jsonify({
            'success': True,
            'tips': tips,
            'focus_area': selected_focus['area'],
            'generation_id': f"{timestamp}_{random.randint(1000, 9999)}"
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/generate-cover-letter', methods=['POST'])
def generate_cover_letter():
    """Generate a tailored cover letter"""
    try:
        data = request.json
        resume_text = data.get('resumeText', '')
        job_description = data.get('jobDescription', '')
        company = data.get('company', 'the company')
        job_title = data.get('jobTitle', 'the position')
        
        if not resume_text or not job_description:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Varied cover letter tones
        tones = [
            {
                "tone": "professional_enthusiastic",
                "guidance": "Professional yet enthusiastic, showing genuine excitement for the role"
            },
            {
                "tone": "confident_assertive",
                "guidance": "Confident and assertive, highlighting unique value proposition"
            },
            {
                "tone": "collaborative_team_focused",
                "guidance": "Emphasize collaboration skills and team contribution"
            },
            {
                "tone": "innovative_forward_thinking",
                "guidance": "Showcase innovation mindset and forward-thinking approach"
            }
        ]
        
        selected_tone = random.choice(tones)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        prompt = f"""You are an expert cover letter writer. Create a compelling cover letter with this approach:

TONE: {selected_tone['tone']}
GUIDANCE: {selected_tone['guidance']}

Job Title: {job_title}
Company: {company}

Job Description:
{job_description}

Candidate's Resume:
{resume_text}

STRUCTURE:
1. Opening: Hook with enthusiasm and clear position statement
2. Body Paragraph 1: Align 2-3 key achievements with job requirements
3. Body Paragraph 2: Show company knowledge and cultural fit
4. Closing: Strong call to action and next steps

REQUIREMENTS:
- Keep to 3-4 paragraphs (250-350 words)
- Maintain the specified tone throughout
- Use specific examples from resume
- Reference company/role specifically (not generic)
- Make every sentence earn its place
- End with confidence and clear interest

Generate the complete cover letter. No subject lines or extra formatting."""

        response = model.generate_content(prompt)
        cover_letter = response.text.strip()
        
        return jsonify({
            'success': True,
            'cover_letter': cover_letter,
            'tone_used': selected_tone['tone'],
            'generation_id': f"{timestamp}_{random.randint(1000, 9999)}"
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extract-links', methods=['POST'])
def extract_links():
    """Extract and classify links from uploaded PDF resume"""
    try:
        # Check if file is uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check if PDF file (by extension OR content type)
        is_pdf = (
            file.filename.lower().endswith('.pdf') or 
            file.content_type == 'application/pdf'
        )
        
        if not is_pdf:
            return jsonify({'error': 'Only PDF files are supported'}), 400
        
        # Save file temporarily (ensure .pdf extension)
        upload_folder = os.path.join(os.getcwd(), 'temp_uploads')
        os.makedirs(upload_folder, exist_ok=True)
        
        # Use original filename if it has .pdf, otherwise add .pdf extension
        if file.filename.lower().endswith('.pdf'):
            temp_filename = file.filename
        else:
            # Add .pdf extension to temp filename
            temp_filename = file.filename + '.pdf'
        
        temp_path = os.path.join(upload_folder, temp_filename)
        file.save(temp_path)
        
        try:
            # Import and run link extractor
            import sys
            sys.path.insert(0, os.path.dirname(__file__))
            
            # Import using the actual filename with hyphens
            import importlib.util
            spec = importlib.util.spec_from_file_location(
                "link_extractor",
                os.path.join(os.path.dirname(__file__), "link-extractor.py")
            )
            link_extractor = importlib.util.module_from_spec(spec)
            # Register module in sys.modules before executing (required for @dataclass)
            sys.modules[spec.name] = link_extractor
            spec.loader.exec_module(link_extractor)
            
            result = link_extractor.run_resume_link_agent(temp_path)
            total_links = sum(len(v) for v in result.get('buckets', {}).values())
            
            print(f"\n{'='*70}")
            print(f"📎 LINK EXTRACTION RESULTS")
            print(f"{'='*70}")
            print(f"File: {file.filename}")
            print(f"Total links found: {total_links}")
            
            buckets = result.get('buckets', {})
            
            # Show LeetCode links (IMPORTANT for debugging)
            leetcode_links = buckets.get('leetcode', [])
            if leetcode_links:
                print(f"\n✅ LeetCode links found: {len(leetcode_links)}")
                for idx, link in enumerate(leetcode_links):
                    print(f"   [{idx}] {link}")
                    # Extract username
                    import re
                    username_match = re.search(r'leetcode\.com/([^\/\?#]+)', link)
                    if username_match:
                        print(f"       → Username: {username_match.group(1)}")
            else:
                print(f"\n⚠️  No LeetCode links found in this resume")
            
            # Show GitHub links
            github_links = buckets.get('github', [])
            if github_links:
                print(f"\n✅ GitHub links found: {len(github_links)}")
                for idx, link in enumerate(github_links):
                    print(f"   [{idx}] {link}")
            else:
                print(f"\n⚠️  No GitHub links found in this resume")
            
            print(f"{'='*70}\n")
            print(f"✅ Link extraction complete")
            
            # Clean up temp file
            os.remove(temp_path)
            
            response_data = {
                'success': True,
                'buckets': result.get('buckets', {}),
                'extracted': result.get('extracted', {}),
                'links_with_text': result.get('extracted', {}).get('links_with_text', {}),
                'total_links': total_links
            }
            return jsonify(response_data)
        
        except Exception as extraction_error:
            print(f"❌ Link extraction failed: {extraction_error}")
            # Clean up temp file on error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise extraction_error
    
    except Exception as e:
        print(f"❌ Link extraction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'buckets': {
                'github': [],
                'linkedin': [],
                'leetcode': [],
                'portfolio': [],
                'email': [],
                'other': []
            }
        }), 200  # Return 200 with empty buckets instead of 500

@app.route('/api/extract-projects', methods=['POST'])
def extract_projects():
    """Extract projects from resume text using Gemini"""
    try:
        data = request.json
        resume_text = data.get('resumeText', '')
        
        if not resume_text:
            return jsonify({
                'success': False,
                'error': 'Missing resume text',
                'projects': []
            }), 400
        
        print(f"\n{'='*70}")
        print(f"🔍 PROJECT EXTRACTION STARTED")
        print(f"{'='*70}")
        print(f"Resume text length: {len(resume_text)} characters")
        
        # Import and run project extractor
        from project_extractor_gemini import extract_projects_with_gemini
        
        result = extract_projects_with_gemini(resume_text)
        projects = result.get('projects', [])
        
        print(f"\n✅ Found {len(projects)} projects")
        for idx, proj in enumerate(projects):
            print(f"   [{idx+1}] {proj.get('name', 'Unnamed')}")
            if proj.get('technologies'):
                print(f"       Tech: {', '.join(proj['technologies'][:5])}")
            if proj.get('githubUrl'):
                print(f"       GitHub: {proj['githubUrl']}")
            if proj.get('liveUrl'):
                print(f"       Live: {proj['liveUrl']}")
        
        print(f"{'='*70}\n")
        
        return jsonify({
            'success': True,
            'projects': projects,
            'total': len(projects)
        })
    
    except Exception as e:
        print(f"❌ Project extraction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'projects': []
        }), 500

@app.route('/api/verify-projects', methods=['POST'])
def verify_projects():
    """Verify resume projects against GitHub repositories"""
    try:
        data = request.json
        github_username = data.get('github_username', '')
        projects = data.get('projects', [])
        
        if not github_username:
            return jsonify({
                'success': False,
                'error': 'GitHub username is required',
                'verification': None
            }), 400
        
        if not projects or not isinstance(projects, list):
            return jsonify({
                'success': False,
                'error': 'Projects list is required',
                'verification': None
            }), 400
        
        print(f"\n{'='*70}")
        print(f"🔍 PROJECT VERIFICATION STARTED")
        print(f"{'='*70}")
        print(f"GitHub Username: {github_username}")
        print(f"Projects to verify: {len(projects)}")
        
        # Import and run project verifier
        from project_verifier_agent import verify_projects_agent
        
        payload = {
            "github_username": github_username,
            "projects": projects
        }
        
        result = verify_projects_agent(payload)
        
        summary = result.get('summary', {})
        print(f"\n✅ Verification complete")
        print(f"   Total: {summary.get('total_projects', 0)}")
        print(f"   Found: {summary.get('found', 0)}")
        print(f"   Maybe: {summary.get('maybe', 0)}")
        print(f"   Not Found: {summary.get('not_found', 0)}")
        print(f"   Verification Rate: {summary.get('verification_rate', 0)}%")
        print(f"{'='*70}\n")
        
        return jsonify({
            'success': True,
            'verification': result
        })
    
    except Exception as e:
        print(f"❌ Project verification error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'verification': None
        }), 500

# ==================== GitHub Analysis Integration ====================

def clamp(x: float, lo: float, hi: float) -> float:
    """Clamp value between min and max"""
    return max(lo, min(hi, x))

def days_since(iso_ts: Optional[str]) -> Optional[int]:
    """Calculate days since a timestamp"""
    if not iso_ts:
        return None
    try:
        d = dt.datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
        now = dt.datetime.now(dt.timezone.utc)
        return (now - d).days
    except Exception:
        return None

def recency_score(pushed_at: Optional[str]) -> float:
    """Calculate recency score based on last push date"""
    if not pushed_at:
        return 55.0
    d = days_since(pushed_at)
    if d is None:
        return 55.0
    if d < 0:
        return 80.0
    return clamp(100.0 * math.exp(-d / 600.0), 35.0, 100.0)

def keywords_score(text: str, keywords: List[str]) -> Tuple[float, Dict[str, int]]:
    """Calculate keyword match score"""
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

def _sleep_if_rate_limited(r: requests.Response):
    """Handle GitHub API rate limiting"""
    try:
        remaining = int(r.headers.get("X-RateLimit-Remaining", "1"))
        reset_ts = int(r.headers.get("X-RateLimit-Reset", "0"))
        if remaining <= 0 and reset_ts > 0:
            wait = max(1, reset_ts - int(time.time()) + 2)
            time.sleep(wait)
        else:
            if r.status_code in (403, 429):
                time.sleep(3)
    except Exception:
        pass

def gh_get(url: str, params: Optional[Dict[str, Any]] = None, extra_headers: Optional[Dict[str, str]] = None) -> Tuple[Optional[Any], Optional[str], Optional[requests.Response]]:
    """Make GitHub API GET request with rate limit handling"""
    try:
        headers = dict(GITHUB_HEADERS)
        if extra_headers:
            headers.update(extra_headers)
        
        last_r = None
        max_retries = 3
        
        for attempt in range(max_retries):
            r = requests.get(url, headers=headers, params=params, timeout=25)
            last_r = r
            
            # Handle rate limiting
            if r.status_code in (403, 429):
                _sleep_if_rate_limited(r)
                if attempt < max_retries - 1:
                    continue
            
            # Handle gateway errors with exponential backoff
            if r.status_code in (502, 503, 504):
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt)  # 1s, 2s, 4s
                    print(f'⚠️ GitHub API gateway error {r.status_code}, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})')
                    time.sleep(wait_time)
                    continue
                else:
                    return None, f"GitHub API is temporarily unavailable (Error {r.status_code}). Please try again in a few minutes.", r
            
            # Check for HTML response (error page)
            content_type = r.headers.get('Content-Type', '')
            if 'text/html' in content_type and r.status_code >= 400:
                return None, f"GitHub API returned error page (Status {r.status_code}). The service may be temporarily down.", r
            
            # Handle other HTTP errors
            if r.status_code >= 400:
                try:
                    error_data = r.json()
                    error_msg = error_data.get('message', r.text[:200])
                except Exception:
                    error_msg = r.text[:200] if len(r.text) < 200 else r.text[:200] + '...'
                return None, f"GitHub API error {r.status_code}: {error_msg}", r
            
            # Success - parse JSON
            try:
                return r.json(), None, r
            except ValueError:
                return None, f"GitHub API returned invalid JSON (Status {r.status_code})", r
        
        # All retries exhausted
        if last_r is not None:
            return None, f"GitHub API error after {max_retries} attempts (Status {last_r.status_code})", last_r
        return None, "Unknown GitHub API error", None
        
    except requests.exceptions.Timeout:
        return None, "GitHub API request timed out. Please try again.", None
    except requests.exceptions.ConnectionError:
        return None, "Could not connect to GitHub API. Check your internet connection.", None
    except Exception as e:
        return None, f"Unexpected error: {str(e)}", None

def get_user(username: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Get GitHub user profile"""
    data, err, _ = gh_get(f"https://api.github.com/users/{username}")
    return data, err

def list_all_repos(username: str) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """List all user repositories"""
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

def get_readme(owner: str, repo: str) -> Tuple[str, Optional[str]]:
    """Get repository README content"""
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

def get_community_profile(owner: str, repo: str) -> Tuple[Dict[str, Any], Optional[str]]:
    """Get repository community health metrics"""
    data, err, _ = gh_get(f"https://api.github.com/repos/{owner}/{repo}/community/profile")
    
    if err or not data or not isinstance(data, dict):
        return {"health_percentage": 60.0, "files": {}}, None
    
    if "health_percentage" not in data or data["health_percentage"] is None:
        data["health_percentage"] = 60.0
    
    try:
        hp = float(data.get("health_percentage", 60.0))
        data["health_percentage"] = max(40.0, hp)
    except Exception:
        data["health_percentage"] = 60.0
    
    if "files" not in data or not isinstance(data["files"], dict):
        data["files"] = {}
    
    return data, err

def repo_score(owner: str, repo: Dict[str, Any], community: Optional[Dict[str, Any]], keywords: List[str]) -> Dict[str, Any]:
    """Calculate comprehensive repository score"""
    name = repo.get("name", "")
    desc = repo.get("description", "") or ""
    topics = repo.get("topics", []) or []
    stars = int(repo.get("stargazers_count") or 0)
    forks = int(repo.get("forks_count") or 0)
    pushed_at = repo.get("pushed_at") or repo.get("updated_at")
    is_fork = bool(repo.get("fork", False))
    archived = bool(repo.get("archived", False))
    
    # Health (soft signal)
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
    
    readme_content, _ = get_readme(owner, name)
    if len(readme_content.strip()) >= 200:
        meta += 35
    elif len(readme_content.strip()) > 40:
        meta += 20
    
    meta = clamp(meta, 0.0, 100.0)
    
    # Activity
    act = recency_score(pushed_at)
    
    # Popularity
    pop_raw = math.log1p(stars * 4 + forks * 2) * 18
    pop = clamp(pop_raw, 0.0, 100.0)
    
    # Engineering (basic)
    eng = 45.0
    
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
    """Calculate GitHub profile score"""
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
    """Calculate overall GitHub account score"""
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

def grade_from_score(x: int) -> str:
    """Convert score to grade"""
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
    """Convert activity score to label"""
    if avg_act >= 75:
        return "High"
    if avg_act >= 50:
        return "Medium"
    return "Low"

def build_github_report(username: str, profile_data: Dict[str, Any], repos: List[Dict[str, Any]], keywords: List[str], resume_text: str = '') -> Dict[str, Any]:
    """
    Build comprehensive GitHub analysis report WITH RESUME ALIGNMENT
    
    SCORING METHODOLOGY:
    1. Base GitHub Profile Score (0-100) - profile completeness, followers, repos
    2. Repository Quality Score (0-100) - stars, activity, documentation, engineering practices
    3. Resume Alignment Bonus (0-15 points) - keyword match between resume skills and GitHub repos
       - 70%+ keyword match: +15 points
       - 50-70% match: +10 points
       - 30-50% match: +5 points
       - <30% match: +0 points
    
    Final Score = min(100, Base Score + Resume Alignment Bonus)
    
    This ensures scores reflect both standalone GitHub quality AND alignment with the specific resume.
    """
    # Score profile
    profile_s = profile_score(profile_data)
    
    # Score all repos
    repo_scores = []
    for repo in repos[:35]:  # Limit to top 35 recent repos
        owner = repo.get("owner", {}).get("login", username)
        community, _ = get_community_profile(owner, repo.get("name", ""))
        score = repo_score(owner, repo, community, keywords)
        repo_scores.append(score)
    
    # Calculate base overall score
    base_overall = overall_account_score(profile_s["score"], repo_scores)
    
    # RESUME ALIGNMENT FACTOR - Apply multiplier based on keyword match
    resume_alignment_bonus = 0
    if keywords and len(keywords) > 0:
        # Count keyword hits across all repos
        found_set = set()
        for r in repo_scores:
            hits = r.get("keyword_hits") or {}
            if isinstance(hits, dict):
                for k, v in hits.items():
                    try:
                        if k and int(v) > 0:
                            found_set.add(k)
                    except Exception:
                        pass
        
        kw_match_ratio = len(found_set) / max(1, len(keywords))
        
        # Bonus: 0-15 points based on resume alignment
        if kw_match_ratio >= 0.70:  # 70%+ match
            resume_alignment_bonus = 15
        elif kw_match_ratio >= 0.50:  # 50-70% match
            resume_alignment_bonus = 10
        elif kw_match_ratio >= 0.30:  # 30-50% match
            resume_alignment_bonus = 5
        
        print(f'📊 Resume Alignment: {kw_match_ratio:.1%} ({len(found_set)}/{len(keywords)} keywords) → +{resume_alignment_bonus} bonus')
    
    # Apply bonus and recalculate
    overall = min(100, base_overall + resume_alignment_bonus)
    grade = grade_from_score(overall)
    
    # Track if alignment was applied
    resume_alignment_applied = resume_alignment_bonus > 0
    
    # Sort and get top repos
    repos_sorted = sorted(repo_scores, key=lambda r: r.get("score", 0), reverse=True)
    top_n = max(1, int(len(repos_sorted) * 0.40))
    top_repos_list = repos_sorted[:top_n]
    
    avg_repo_score = int(round(
        sum(r.get("score", 0) for r in top_repos_list) / max(1, len(top_repos_list))
    )) if top_repos_list else 0
    
    # Keyword alignment
    found_set = set()
    for r in repo_scores:
        hits = r.get("keyword_hits") or {}
        if isinstance(hits, dict):
            for k, v in hits.items():
                try:
                    if k and int(v) > 0:
                        found_set.add(k)
                except Exception:
                    pass
    
    kw_found = len(found_set)
    kw_total = len(keywords)
    
    # Activity
    avg_activity = (
        sum((r.get("signals") or {}).get("activity", 0) for r in repo_scores) / max(1, len(repo_scores))
    ) if repo_scores else 0.0
    activity_level = activity_label(avg_activity)
    
    # Build good_repos
    good_repos = {}
    for r in repos_sorted[:8]:
        if r.get("score", 0) >= 70:
            nm = r.get("repo")
            if nm:
                good_repos[nm] = {
                    "score": f'{r.get("score")}/100',
                    "url": r.get("html_url"),
                    "stars": r.get("stars", 0),
                    "forks": r.get("forks", 0)
                }
    
    # Top projects
    top_projects = []
    for r in repos_sorted[:5]:
        top_projects.append({
            "name": r.get("repo"),
            "url": r.get("html_url"),
            "score": r.get("score", 0),
            "stars": r.get("stars", 0)
        })
    
    # Risks and recommendations
    risks = []
    recommendations = []
    
    if kw_total > 0 and kw_found / max(1, kw_total) < 0.5:
        risks.append("Low keyword alignment with job requirements")
        recommendations.append("Add projects featuring the target role's tech stack")
    
    if len(good_repos) < 3:
        recommendations.append("Polish top 3 repositories with comprehensive READMEs")
    
    if not recommendations:
        recommendations.append("Keep shipping consistently and pin top repos")
    
    return {
        "username": username,
        "overall_score": overall,
        "grade": grade,
        "resume_alignment_applied": resume_alignment_applied,
        "resume_alignment_bonus": resume_alignment_bonus,
        "github_strength": {
            "profile_score": profile_s["score"],
            "repo_score": avg_repo_score,
            "activity_level": activity_level,
            "engineering_maturity": "High" if avg_repo_score >= 75 else "Medium" if avg_repo_score >= 60 else "Low",
            "project_hygiene": "Strong" if len(good_repos) >= 5 else "Medium"
        },
        "top_projects": top_projects,
        "good_repos": good_repos,
        "ats_signals": {
            "keyword_alignment": f"{kw_found}/{kw_total}",
            "opensource_impact": "Strong" if any(r.get("stars", 0) > 100 for r in repos_sorted[:5]) else "Moderate",
            "consistency": activity_level
        },
        "risks": risks,
        "recommendations": recommendations,
        "total_repos": len(repos),
        "profile_data": {
            "bio": profile_data.get("bio", ""),
            "company": profile_data.get("company", ""),
            "location": profile_data.get("location", ""),
            "followers": profile_data.get("followers", 0),
            "following": profile_data.get("following", 0),
            "public_repos": profile_data.get("public_repos", 0)
        }
    }

@app.route('/api/analyze-github', methods=['POST'])
def analyze_github():
    """Analyze GitHub profile and match with job requirements AND resume"""
    try:
        data = request.json
        github_username = data.get('githubUsername', '').strip()
        job_description = data.get('jobDescription', '')
        keywords_from_frontend = data.get('keywords', [])
        resume_text = data.get('resumeText', '')  # NEW: Get resume text
        resume_skills = data.get('resumeSkills', [])  # NEW: Get resume skills
        
        if not github_username:
            return jsonify({'error': 'GitHub username is required'}), 400
        
        print(f'\n{"="*60}')
        print(f'🔍 GITHUB ANALYSIS REQUEST')
        print(f'{"="*60}')
        print(f'Username: {github_username}')
        print(f'Resume Keywords Provided: {len(keywords_from_frontend)}')
        print(f'Resume Text Length: {len(resume_text)} chars')
        print(f'Resume Skills Provided: {len(resume_skills)} skills')
        print(f'{"="*60}\n')
        
        # Build comprehensive keywords from multiple sources
        keywords = []
        
        # 1. Use keywords from frontend (from resume analysis)
        if keywords_from_frontend and len(keywords_from_frontend) > 0:
            keywords.extend([str(k).lower().strip() for k in keywords_from_frontend if k])
            print(f'✓ Added {len(keywords_from_frontend)} keywords from resume analysis')
        
        # 2. Extract from resume skills
        if resume_skills:
            keywords.extend([str(s).lower().strip() for s in resume_skills if s])
            print(f'✓ Added {len(resume_skills)} skills from resume')
        
        # 3. Extract from resume text itself
        if resume_text:
            # Extract technical terms from resume
            resume_keywords = re.findall(r'\b(?:python|javascript|react|node|java|docker|kubernetes|aws|typescript|angular|vue|mongodb|sql|postgresql|redis|git|ci/cd|devops|machine learning|ai|data|api|rest|graphql|microservices|cloud|azure|gcp|linux|bash|shell|testing|jest|pytest|jenkins|github actions|terraform|ansible|django|flask|fastapi|express|spring|\.net|c\+\+|go|rust|ruby|rails|php|laravel|swift|kotlin|android|ios|flutter|next\.js|nest\.js|graphql|firebase|heroku|digital ocean|vercel|netlify|webpack|vite|babel|sass|tailwind)\b', resume_text.lower())
            keywords.extend(resume_keywords)
            print(f'✓ Extracted {len(resume_keywords)} technical terms from resume text')
        
        # 4. Fallback: extract from job description
        if job_description and len(keywords) < 5:
            tech_keywords = re.findall(r'\b(?:python|javascript|react|node|java|docker|kubernetes|aws|typescript|angular|vue|mongodb|sql|postgresql|redis|git|ci/cd|devops|machine learning|ai|data|api|rest|graphql|microservices|cloud|azure|gcp|linux|bash|shell|testing|jest|pytest|jenkins|github actions|terraform|ansible)\b', job_description.lower())
            keywords.extend(tech_keywords)
            print(f'✓ Extracted {len(tech_keywords)} keywords from job description')
        
        # Remove duplicates and limit
        keywords = list(set(keywords))[:30]
        print(f'✅ Total unique keywords for analysis: {len(keywords)}')
        
        if len(keywords) == 0:
            print('⚠ No keywords provided, analyzing without keyword matching')
        
        # Fetch GitHub data
        profile_data, err = get_user(github_username)
        if err or not profile_data:
            return jsonify({'error': f'GitHub user not found: {github_username}'}), 404
        
        repos, err = list_all_repos(github_username)
        if err:
            return jsonify({'error': f'Failed to fetch repositories: {err}'}), 500
        
        # Build comprehensive report with resume context
        report = build_github_report(github_username, profile_data, repos, keywords, resume_text)
        
        print(f"✅ GitHub analysis complete - {github_username} - Score: {report['overall_score']}/100 (Resume-aligned)")
        
        return jsonify({
            'success': True,
            'report': report
        })
    
    except Exception as e:
        print(f"❌ GitHub analysis error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== Competitive Profile Analysis Integration ====================

@app.route('/api/analyze-competitive-profile', methods=['POST'])
def analyze_competitive_profile():
    """
    Analyze competitive programming profiles (LeetCode, etc.) with resume context
    
    SCORING METHODOLOGY:
    1. Base LeetCode Score (0-100) - problems solved, difficulty distribution, profile quality
    2. Resume Alignment Adjustment (-3 to +8 points):
       - Resume prominently features CP (3+ mentions) + advanced keywords: +8 points
       - Resume mentions CP (2+ mentions): +5 points  
       - Resume briefly mentions algorithms (1 mention): +2 points
       - Strong LeetCode but NOT on resume: -3 points (profile-resume mismatch)
    
    Final Score = clamp(Base Score + Alignment Adjustment, 0, 100)
    
    This rewards candidates who showcase their CP achievements on resume AND penalizes
    those with strong profiles not reflected in their resume (missed opportunity).
    """
    try:
        data = request.json
        leetcode_url = data.get('leetcodeUrl', '').strip()
        use_llm = data.get('useLLM', True)  # Default to using Gemini enrichment
        debug_llm = data.get('debugLLM', False)
        resume_text = data.get('resumeText', '')  # NEW: Get resume text for context
        
        if not leetcode_url:
            return jsonify({'error': 'LeetCode URL is required'}), 400
        
        # Extract username from URL for display
        leetcode_username = 'Unknown'
        if 'leetcode.com' in leetcode_url:
            # Extract username from various LeetCode URL formats
            import re
            username_match = re.search(r'leetcode\.com/([^\/\?#]+)', leetcode_url)
            if username_match:
                leetcode_username = username_match.group(1)
        
        print(f'\n{"="*60}')
        print(f'🏆 COMPETITIVE PROGRAMMING ANALYSIS REQUEST')
        print(f'{"="*60}')
        print(f'LeetCode URL: {leetcode_url}')
        print(f'LeetCode Username: {leetcode_username}')
        print(f'Resume Text Provided: {len(resume_text)} chars')
        print(f'Use LLM Enrichment: {use_llm}')
        print(f'{"="*60}\n')
        
        print(f'🔍 Analyzing CP profile: {leetcode_username} ({leetcode_url})')
        if resume_text:
            print(f'✓ Using resume context ({len(resume_text)} chars) for personalized analysis')
        else:
            print(f'⚠ No resume text provided - scoring will be based on LeetCode data only')
        
        print(f'\n🚀 Calling run_cp_agent with URL: {leetcode_url}\n')
        
        # Run the CP agent
        report = run_cp_agent(leetcode_url, use_llm=use_llm, debug_llm=debug_llm)
        
        print(f'\n✅ CP agent completed analysis\n')
        
        # Convert Pydantic model to dict
        report_dict = report.model_dump()
        
        # ENHANCED RESUME ALIGNMENT for CP
        if resume_text and 'overall_score' in report_dict:
            # Check resume mentions AND experience level
            resume_lower = resume_text.lower()
            
            # Keywords that indicate CP experience
            cp_keywords = ['leetcode', 'competitive programming', 'coding contest', 'hackerrank', 
                          'codeforces', 'codechef', 'topcoder', 'algorithm', 'data structure', 
                          'dynamic programming', 'graph algorithm', 'dsa']
            
            # Advanced indicators
            advanced_keywords = ['competitive programming', 'contest', 'rating', 'ranking', 
                                'algorithmic problem solving', 'icpc', 'acm']
            
            cp_mentions = sum(1 for kw in cp_keywords if kw in resume_lower)
            advanced_mentions = sum(1 for kw in advanced_keywords if kw in resume_lower)
            
            # Calculate bonus based on mentions + actual LeetCode performance
            bonus = 0
            base_score = report_dict['overall_score']
            
            if cp_mentions >= 3 and advanced_mentions >= 1:
                # Resume prominently features CP + strong LeetCode profile
                bonus = 8
                integration_msg = '+8 points: Resume highlights CP experience matching strong LeetCode profile'
            elif cp_mentions >= 2:
                # Resume mentions CP, aligns well
                bonus = 5
                integration_msg = '+5 points: Resume mentions CP experience'
            elif cp_mentions == 1:
                # Minimal mention
                bonus = 2
                integration_msg = '+2 points: Resume briefly mentions algorithmic work'
            else:
                # No mention - opportunity for improvement
                bonus = -3  # Small penalty for profile-resume mismatch
                integration_msg = '-3 points: Strong LeetCode profile not mentioned in resume'
            
            # Apply bonus
            report_dict['overall_score'] = min(100, max(0, base_score + bonus))
            
            report_dict['resume_integration'] = {
                'cp_mentioned_in_resume': cp_mentions > 0,
                'cp_keywords_found': cp_mentions,
                'advanced_indicators': advanced_mentions,
                'alignment_bonus': bonus,
                'alignment_message': integration_msg,
                'suggestion': 'Add LeetCode achievements to experience/projects section' if bonus <= 0 else 'Well integrated! Consider adding specific contest rankings.'
            }
            
            print(f'🎯 Resume-CP Alignment: {cp_mentions} mentions → {bonus:+d} points (Final: {report_dict["overall_score"]}/100)')
        
        print(f"✅ CP analysis complete - Score: {report_dict['overall_score']}/100 (Grade: {report_dict['grade']})")
        
        return jsonify({
            'success': True,
            'report': report_dict
        })
    
    except Exception as e:
        print(f"❌ CP analysis error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/batch-analyze-profiles', methods=['POST'])
def batch_analyze_profiles():
    """Analyze both GitHub and Competitive Programming profiles in one request"""
    try:
        data = request.json
        github_username = data.get('githubUsername', '').strip()
        leetcode_url = data.get('leetcodeUrl', '').strip()
        job_description = data.get('jobDescription', '')
        keywords = data.get('keywords', [])
        
        results = {
            'success': True,
            'github': None,
            'competitive_profile': None
        }
        
        # Analyze GitHub if provided
        if github_username:
            try:
                print(f'🔍 Analyzing GitHub: {github_username}')
                profile_data, err = get_user(github_username)
                if not err and profile_data:
                    repos, err = list_all_repos(github_username)
                    if not err:
                        report = build_github_report(github_username, profile_data, repos, keywords)
                        results['github'] = report
                        print(f"✅ GitHub analysis complete - Score: {report['overall_score']}/100")
            except Exception as e:
                print(f"⚠️ GitHub analysis failed: {e}")
                results['github'] = {'error': str(e)}
        
        # Analyze Competitive Profile if provided
        if leetcode_url:
            try:
                print(f'🔍 Analyzing CP profile: {leetcode_url}')
                report = run_cp_agent(leetcode_url, use_llm=True, debug_llm=False)
                results['competitive_profile'] = report.model_dump()
                print(f"✅ CP analysis complete - Score: {results['competitive_profile']['overall_score']}/100")
            except Exception as e:
                print(f"⚠️ CP analysis failed: {e}")
                results['competitive_profile'] = {'error': str(e)}
        
        return jsonify(results)
    
    except Exception as e:
        print(f"❌ Batch analysis error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

    print("\n" + "="*70)
    print("🚀 ATS MASTER - AI SERVICE STARTING")
    print("="*70)
    print(f"✅ Service listening on port {port}")
    print("✅ AI Model: gemini-2.5-flash")
    print(f"✅ Temperature: {generation_config['temperature']} (high creativity)")
    print("\n📊 Core Capabilities:")
    print("   • Professional Summary Optimization (5 styles)")
    print("   • Bullet Point Enhancement (5 approaches)")
    print("   • Keyword Suggestions (3 formats)")
    print("   • ATS Compatibility Tips (5 focus areas)")
    print("   • Cover Letter Generation (4 tones)")
    print("\n🔗 Profile Analysis Pipeline:")
    print("   1. Extract links from resume PDF (GitHub, LeetCode, LinkedIn)")
    print("   2. Analyze GitHub profile → Resume-aligned score (0-100)")
    print("   3. Analyze LeetCode profile → Resume-aligned score (0-100)")
    print("   4. Generate personalized recommendations")
    print("\n💡 Key Features:")
    print("   • Dynamic scoring based on resume content")
    print("   • Keyword alignment bonuses (0-15 points)")
    print("   • Resume integration scoring (-3 to +8 points)")
    print("   • Each resume gets unique, personalized analysis")
    print("="*70 + "\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
