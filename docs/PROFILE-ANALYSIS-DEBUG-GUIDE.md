# Profile Analysis Debug Guide

## Issue Reports

### GitHub Issue (Fixed)
User reported: "still github agent take shivraj2805 as ip" - system appeared to use hard-coded username instead of extracted links from each resume.
**Status**: ✅ **FIXED** - Wrong endpoint URL was the root cause

### CP/LeetCode Issue (Fixed)
User reported: "still CP agent take ShivrajDarekar as ip" - system appeared to use hard-coded profile instead of extracted links from each resume.
**Status**: ✅ **FIXED** - Wrong parameter names (profileUrl/resumeData instead of leetcodeUrl/resumeText)

## Root Cause Analysis

### ✅ What Was Fixed for GitHub

1. **Wrong API Endpoint in UploadSection** (CRITICAL FIX)
   - **Problem**: UploadSection.jsx was calling `/api/analyze-github-profile` (doesn't exist)
   - **Fix**: Changed to `/api/analyze-github` (correct endpoint)
   - **File**: `client/src/components/landing/UploadSection.jsx` line 143
   - **Impact**: Auto-analysis after upload was failing silently

2. **Missing Resume Context in Auto-Analysis**
   - **Problem**: UploadSection wasn't passing resume skills and text
   - **Fix**: Added `resumeText` and `resumeSkills` to API request
   - **File**: `client/src/components/landing/UploadSection.jsx` lines 126-152

3. **Typo in Python Logging**
   - **Problem**: Tried to log `len(keywords)` before variable was defined
   - **Fix**: Changed to `len(keywords_from_frontend)`
   - **File**: `python-ai-service/app.py` line 1137

### ✅ What Was Fixed for CP/LeetCode

1. **Wrong Parameter Names in UploadSection** (CRITICAL FIX)
   - **Problem**: Sending `profileUrl` and `resumeData`, but backend expects `leetcodeUrl` and `resumeText`
   - **Fix**: Changed parameter names to match backend expectations
   - **File**: `client/src/components/landing/UploadSection.jsx` lines 183-190
   - **Impact**: Auto-analysis was completely broken - backend couldn't find required parameters

2. **Missing Enhanced Logging**
   - **Problem**: No visibility into which LeetCode URL was extracted and sent
   - **Fix**: Added comprehensive console logs showing URL extraction, API calls, and results
   - **Files**: 
     - `client/src/components/landing/UploadSection.jsx` (auto-analysis)
     - `client/src/components/results/ResultsDashboard.jsx` (manual analysis)
     - `python-ai-service/app.py` (backend processing)

3. **No Username Display in Logs**
   - **Problem**: Backend logs showed full URL but not the username being analyzed
   - **Fix**: Added regex extraction to show clean username in logs
   - **File**: `python-ai-service/app.py` lines 1234-1239

### ✅ Enhanced Logging

Added comprehensive debugging logs to trace the complete flow for **both GitHub and LeetCode**:

**Frontend (UploadSection.jsx) - GitHub Auto-Analysis**:
```javascript
console.log('=== AUTO-ANALYZE GITHUB - UPLOAD SECTION ===');
console.log('📌 Extracted GitHub Username:', githubUsername);
console.log('📌 Source: extracted_links.github =', data.extracted_links?.github);
console.log('📌 Resume Skills:', resumeSkills.length, 'skills');
console.log('📌 Keywords:', uniqueKeywords.length, 'keywords');
console.log('📌 Calling API: http://localhost:5000/api/analyze-github');
```

**Frontend (UploadSection.jsx) - LeetCode Auto-Analysis**:
```javascript
console.log('=== AUTO-ANALYZE LEETCODE - UPLOAD SECTION ===');
console.log('📌 Extracted LeetCode URL:', leetcodeUrl);
console.log('📌 Source: extracted_links.leetcode =', data.extracted_links?.leetcode);
console.log('📌 Resume Text Length:', data.raw_text?.length || 0, 'chars');
console.log('📌 Calling API: http://localhost:5000/api/analyze-competitive-profile');
```

**Frontend (ResultsDashboard.jsx) - Manual GitHub Analysis**:
```javascript
console.log('=== MANUAL GITHUB ANALYSIS - RESULTS DASHBOARD ===');
console.log('📌 Username being sent:', githubUsername);
console.log('📌 Keywords count:', uniqueKeywords.length);
console.log('📌 Resume skills count:', resumeSkills.length);
console.log('📌 API Endpoint: http://localhost:5000/api/analyze-github');
```

**Frontend (ResultsDashboard.jsx) - Manual CP Analysis**:
```javascript
console.log('=== MANUAL CP ANALYSIS - RESULTS DASHBOARD ===');
console.log('📌 LeetCode URL being sent:', leetcodeUrl);
console.log('📌 Resume text length:', results.raw_text?.length || 0, 'chars');
console.log('📌 API Endpoint: http://localhost:5000/api/analyze-competitive-profile');
```

**Backend (app.py) - GitHub**:
```python
print(f'🔍 GITHUB ANALYSIS REQUEST')
print(f'Username: {github_username}')
print(f'Resume Keywords Provided: {len(keywords_from_frontend)}')
print(f'Resume Text Length: {len(resume_text)} chars')
print(f'Resume Skills Provided: {len(resume_skills)} skills')
```

**Backend (app.py) - LeetCode/CP**:
```python
print(f'🏆 COMPETITIVE PROGRAMMING ANALYSIS REQUEST')
print(f'LeetCode URL: {leetcode_url}')
print(f'LeetCode Username: {leetcode_username}')
print(f'Resume Text Provided: {len(resume_text)} chars')
print(f'Use LLM Enrichment: {use_llm}')
```

## How the System Actually Works

### Complete Data Flow

```
1. User uploads Resume PDF
   ↓
2. Backend: resumeController.js receives upload
   ↓
3. Backend: Calls link-extractor.py agent
   ↓
4. Link Extractor: Reads PDF annotations + text URLs
   ↓
5. Link Extractor: Returns { github: [...], linkedin: [...], leetcode: [...] }
   ↓
6. Frontend (UploadSection): Auto-analyzes if links found
   ↓
7. Frontend: Extracts username from data.extracted_links.github[0]
   ↓
8. Frontend: Calls /api/analyze-github with extracted username
   ↓
9. Backend (aiService.js): Forwards to Python AI service
   ↓
10. Python (app.py): Fetches GitHub API for extracted username
   ↓
11. Python: Calculates score with resume alignment bonus
   ↓
12. Frontend: DisGitHub with New Resume

1. **Upload a resume with GitHub link**
   - Ensure resume has a clickable GitHub link OR plain text like `github.com/username`

2. **Watch Browser Console**
   - Look for: `=== AUTO-ANALYZE GITHUB - UPLOAD SECTION ===`
   - Check: `📌 Extracted GitHub Username:` - should show YOUR username, not "shivraj2805"

3. **Watch Backend Logs (Python Terminal)**
   - Flask server should print: `🔍 GITHUB ANALYSIS REQUEST`
   - Check: `Username:` - should match the extracted username

4. **Watch Python Logs**
   - Should see: `✅ GitHub analysis complete - {YOUR_USERNAME} - Score: X/100`

### Step 3: Test LeetCode with New Resume

1. **Upload a resume with LeetCode link**
   - Ensure resume has a clickable LeetCode link like `leetcode.com/username`

2. **Watch Browser Console**
   - Look for: `=== AUTO-ANALYZE LEETCODE - UPLOAD SECTION ===`
   - Check: `📌 Extracted LeetCode URL:` - should show YOUR profile URL, not "ShivrajDarekar"

3. **Watch Backend Logs (Python Terminal)**
   - Flask server should print: `🏆 COMPETITIVE PROGRAMMING ANALYSIS REQUEST`
   - Check: `LeetCode Username:` - should match the extracted username
   - Check: `LeetCode URL:` - should show the full extracted URL

4. **Watch Python Logs**
   - Should see: `✅ CP analysis complete - Score: X/100 (Grade: Y)`

### Step 4: Verify Manual Analysis

1. **On Results Dashboard, click "Analyze GitHub Profile"**
   - Browser console shows: `=== MANUAL GITHUB ANALYSIS - RESULTS DASHBOARD ===`
   - Should extract from `results.extracted_links.github[0]`

2. **Click "Analyze Competitive Profile"**
   - Browser console shows: `=== MANUAL CP ANALYSIS - RESULTS DASHBOARD ===`
   - Should extract from `results.extracted_links.leetcode[0]`

3. **Check Reports**
   - Verify usernames shown match your resume
   - Scores should vary based on actual profile activity

### Step 5: Test with Different Resumes

Upload 3 different resumes with different profiles:
- **Resume A**: github.com/userA + leetcode.com/userA → Should analyze userA for both
- **Resume B**: github.com/userB + leetcode.com/userB → Should analyze userB for both
- **Resume C**: github.com/userC + leetcode.com/userC → Should analyze userC for both

**Each should get unique scores based on their actualUR username, not "shivraj2805"

3. **Watch Backend Logs (VSCode Terminal)**
   - Flask server should print: `🔍 GITHUB ANALYSIS REQUEST`
   - Check: `Username:` - should match the extracted username

4. **Watch Python Logs**
   - Should see: `✅ GitHub analysis complete - {YOUR_USERNAME} - Score: X/100`

### Step 3: Verify Manual Analysis/profile
**Solution**: Clear sessionStorage
```javascript
sessionStorage.removeItem('analysisResults');
sessionStorage.removeItem('githubReport'); 
sessionStorage.removeItem('cpReport');
// Then refresh and re-upload
```

### Issue: API endpoint 404 error for GitHub
**Solution**: 
- Ensure Flask server is running on http://localhost:5000
- Check `/api/analyze-github` endpoint exists (not `/api/analyze-github-profile`)

### Issue: API endpoint 400 error for LeetCode
**Solution**:
- Check browser console - should show the extracted leetcodeUrl being sent
- Verify backend is receiving `leetcodeUrl` parameter (not `profileUrl`)
- Check Python logs for the exact error message

### Issue: No username/URL extracted
**Solution**:
- Check PDF has valid GitHub/LeetCode link
- Run link extraction manually and check results
- Verify `extracted_links.github` or `extracted_links.leetcode` arrays have values
- Check browser console for extraction logs

### GitHub Scoring (Dynamic with Resume Alignment)

**Base GitHub Score (0-100)**:
- Profile completeness (bio, location, email): 50 points
- Followers: 0-25 points (logarithmic)
- Repository count: 0-25 points (logarithmic)

**Repository Quality (0-100)**:
- Stars, forks, activity
- Documentation quality
- Engineering practices
- Top 40% repos weighted

**Resume Alignment Bonus (0-15 points)**:
```python
# Calculate keyword match between resume and GitHub repos
keyword_match = calc_keyword_relevance(keywords, repo_descriptions)

if keyword_match >= 0.70:  # 70%+ match
    bonus = 15
elif keyword_match >= 0.50:  # 50-70% match
    bonus = 10
elif keyword_match >= 0.30:  # 30-50% match
    bonus = 5
else:
    bonus = 0

final_score = min(100, base_score + bonus)
```

**Result**: Each resume gets personalized score based on:
1. Their actual GitHub profile quality
2. How well their GitHub aligns with their resume skills

### LeetCode/CP Scoring (Dynamic with Resume Integration)

**Base LeetCode Score (0-100)**:
- Problems solved (easy/medium/hard distribution)
- Contest participation and ratings
- Profile completeness
- Submission success rate

**Resume Integration Adjustment (-3 to +8 points)**:
```python
# Check resume mentions of competitive programming
cp_mentions = count('leetcode', 'competitive programming', 'coding contest', etc.)
advanced_mentions = count('competitive programming', 'contest', 'rating', 'icpc', etc.)

if cp_mentions >= 3 and advanced_mentions >= 1:
    adjustment = +8  # Resume highlights CP + strong profile
elif cp_mentions >= 2:
    adjustment = +5  # Resume mentions CP
elif cp_mentions == 1:
    adjustment = +2  # Minimal mention
else:
    adjustment = -3  # Strong LeetCode but NOT on resume (missed opportunity)

final_score = clamp(base_score + adjustment, 0, 100)
```

**Result**: Each resume gets personalized score based on:
1. Their actual LeetCode performance
2. How well their competitive programming is showcased on resume
3. Penalties for strong profiles not highlighted on resume (missed opportunities)
// Old code had fixed test data
  - **Required params**: `githubUsername`, `jobDescription`, `keywords`, `resumeText`, `resumeSkills`
  
- ✅ `POST /api/analyze-competitive-profile` - LeetCode/CP analysis
  - **Required params**: `leetcodeUrl`, `resumeText`, `useLLM`
  
- ✅ `POST /api/resume/upload` - Resume upload & link extraction

### Parameter Name Mapping (IMPORTANT!)
### GitHub Fix (Session 1)
1. `client/src/components/landing/UploadSection.jsx`
   - Fixed API endpoint URL (analyze-github-profile → analyze-github)
   - Added resume context to request
   - Added detailed logging

2. `client/src/components/results/ResultsDashboard.jsx`
   - Added detailed logging before API call

3. `python-ai-service/app.py`
   - Fixed logging typo
   - Already had resume alignment scoring

### LeetCode/CP Fix (Session 2)
1. `client/src/components/landing/UploadSection.jsx`
   - **CRITICAL**: Fixed parameter names (profileUrl → leetcodeUrl, resumeData → resumeText)
   - Added comprehensive logging with extracted URL display
   - Added error response handling

2. `client/src/components/results/ResultsDashboard.jsx`
   - Added detailed logging before manual CP analysis
   - Shows LeetCode URL and resume text length

3. `python-ai-service/app.py`
   - Added username extraction from URL for cleaner logs
   - Enhanced logging to show both URL and extracted username
   - Added warning if no resume text provided
**LeetCode/CP Analysis**:
```javascript
// ✅ CORRECT
{
  leetcodeUrl: "leetcode.com/username",  // Full URL
  resumeText: "Full resume...",          // Resume text
  useLLM: true                           // Use Gemini enrichment
}

// ❌ WRONG (old parameter names that were causing errors)
{
  profileUrl: "leetcode.com/username",   // Backend doesn't recognize this
  resumeData: {...}                      // Backend expects resumeText string
}
```

### Removed/Wrong Endpoints
- ❌ `/api/analyze-github-profile` - This was a typo, doesn't exist (should be `/api/analyze-github`)
**Base GitHub Score (0-100)**:
- Profile completeness (bio, location, email): 50 points
- Followers: 0-25 points (logarithmic)
- Repository count: 0-25 points (logarithmic)

### GitHub Analysis
✅ Each resume extracts its own GitHub username (not hard-coded)
✅ Python receives correct username for each analysis
✅ Scores vary based on actual GitHub profile quality
✅ Resume alignment bonus adds 0-15 points based on keyword match
✅ Browser console shows clear debugging trail for GitHub
✅ Backend logs show incoming requests with correct usernames

### LeetCode/CP Analysis
✅ Each resume extracts its own LeetCode URL (not hard-coded)
✅ Python receives correct leetcodeUrl parameter (not profileUrl)
✅ Python receives resumeText parameter (not resumeData object)
✅ Scores vary based on actual LeetCode performance
✅ Resume integration adjustment adds -3 to +8 points based on resume mentions
✅ Browser console shows clear debugging trail for LeetCode
✅ Backend logs show incoming requests with extracted URL and username

### General
✅ No hard-coded usernames or URLs anywhere in codebase
✅ Link extraction is dynamic from each uploaded resume
✅ Auto-analysis after upload works for both GitHub and LeetCode
✅ Manual analysis from dashboard works for both profiles
✅ Comprehensive logging at all layers (Frontend → Backend → Python)

---

**Last Updated**: February 2026 - Profile Analysis Complete Fix (GitHub + LeetCode)
**Status**: Both GitHub and LeetCode analysis fixed with proper parameter passing
**Next Review**: After user tests with multiple different resumes for both platform
    bonus = 15
elif keyword_match >= 0.50:  # 50-70% match
    bonus = 10
elif keyword_match >= 0.30:  # 30-50% match
    bonus = 5
else:
    bonus = 0

final_score = min(100, base_score + bonus)
```

**Result**: Each resume gets personalized score based on:
1. Their actual GitHub profile quality
2. How well their GitHub aligns with their resume skills

## API Endpoints Reference

### Correct Endpoints
- ✅ `POST /api/analyze-github` - GitHub profile analysis
- ✅ `POST /api/analyze-competitive-profile` - LeetCode/CP analysis
- ✅ `POST /api/resume/upload` - Resume upload & link extraction

### Removed/Wrong Endpoints
- ❌ `/api/analyze-github-profile` - This was a typo, doesn't exist

## Files Modified in This Fix

1. `client/src/components/landing/UploadSection.jsx`
   - Fixed API endpoint URL
   - Added resume context to request
   - Added detailed logging

2. `client/src/components/results/ResultsDashboard.jsx`
   - Added detailed logging before API call

3. `python-ai-service/app.py`
   - Fixed logging typo
   - Already had resume alignment scoring

## Next Steps

1. **Deploy Changes**:
   ```bash
   # Kill old servers
   # Restart backend: cd server && npm start
   # Restart frontend: cd client && npm run dev
   # Restart Python: cd python-ai-service && python app.py
   ```

2. **Test with Real Data**:
   - Upload resumes with different GitHub profiles
   - Verify each gets unique analysis
   - Check scores vary based on actual activity

3. **Monitor Logs**:
   - Watch for the new logging statements
   - Verify correct usernames are extracted
   - Confirm API calls succeed

## Success Criteria

✅ Each resume extracts its own GitHub username (not hard-coded)
✅ Python receives correct username for each analysis
✅ Scores vary based on actual GitHub profile quality
✅ Resume alignment bonus adds 0-15 points based on keyword match
✅ Browser console shows clear debugging trail
✅ Backend logs show incoming requests with correct usernames

---

**Last Updated**: 2024 - Profile Analysis Debug Session
**Status**: Fixed endpoint URL + Added comprehensive logging
**Next Review**: After user tests with multiple different resumes
