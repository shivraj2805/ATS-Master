# Link Extractor Integration - Installation Guide

## Overview
The Link Extractor Agent has been successfully integrated into the ATS system. It automatically extracts and classifies links from PDF resumes into categories:
- GitHub profiles
- LinkedIn profiles
- LeetCode profiles
- Portfolio websites
- Email addresses
- Other links

## Changes Made

### Backend (Server)
1. **New Service**: `server/services/linkExtractorService.js`
   - Handles communication with Python AI service for link extraction
   - Formats and validates extracted links

2. **Updated Controller**: `server/controllers/resumeController.js`
   - Integrated link extraction in the resume analysis flow
   - Added `extracted_links` to API response

3. **Updated Model**: `server/models/AnalysisResult.js`
   - Added `extractedLinks` field to store link data

4. **Updated Dependencies**: `server/package.json`
   - Added `form-data` package for file uploads

### Python AI Service
1. **New Endpoint**: `/api/extract-links` in `python-ai-service/app.py`
   - Accepts PDF file uploads
   - Calls the link extractor agent
   - Returns classified links

2. **Updated Dependencies**: `python-ai-service/requirements.txt`
   - Added: langgraph, pydantic, pymupdf

### Frontend (Client)
1. **New Component**: `client/src/components/results/ExtractedLinks.jsx`
   - Beautiful UI to display categorized links
   - Clickable links with icons
   - Statistics and pro tips

2. **Updated Dashboard**: `client/src/components/results/ResultsDashboard.jsx`
   - Integrated ExtractedLinks component
   - Displays after candidate profile section

## Installation Steps

### Step 1: Install Python Dependencies
```bash
cd python-ai-service
pip install -r requirements.txt
```

### Step 2: Install Node.js Dependencies
```bash
cd ../server
npm install
```

### Step 3: Verify Link Extractor File
Make sure `python-ai-service/link-extractor.py` exists and is complete.

### Step 4: Start Services

Terminal 1 - Python AI Service:
```bash
cd python-ai-service
python app.py
```

Terminal 2 - Node.js Server:
```bash
cd server
npm run dev
```

Terminal 3 - React Client:
```bash
cd client
npm run dev
```

## Testing

1. Upload a PDF resume with links (GitHub, LinkedIn, etc.)
2. The analysis results page will now show an "Extracted Links" section
3. Links are categorized and clickable
4. Email links open the mail client
5. Other links open in new tab

## API Response Structure

The `/api/resume/analyze` endpoint now includes:
```json
{
  "extracted_links": {
    "github": ["https://github.com/username"],
    "linkedin": ["https://linkedin.com/in/username"],
    "leetcode": ["https://leetcode.com/username"],
    "portfolio": ["https://myportfolio.com"],
    "email": ["mailto:user@example.com"],
    "other": ["https://other-link.com"],
    "total": 6
  }
}
```

## Troubleshooting

### Link extraction fails
- Check if Python AI service is running on http://localhost:5000
- Verify PyMuPDF is installed: `pip show pymupdf`
- Check console logs for errors

### Links not displayed in UI
- Verify the API response includes `extracted_links`
- Check browser console for errors
- Ensure ExtractedLinks component is imported correctly

### PDF processing errors
- Only PDF files are supported for link extraction
- Ensure the PDF contains actual hyperlinks (not just text)
- Check if temp_uploads folder is writable

## Features

### Link Extraction
- ✅ Real hyperlinks from PDF annotations
- ✅ Plain text URLs/emails as fallback
- ✅ Automatic normalization and deduplication
- ✅ Smart classification by domain

### UI Features
- ✅ Beautiful categorized display
- ✅ Click to open links
- ✅ Statistics overview
- ✅ Pro tips for candidates
- ✅ Responsive design

## Next Steps

Consider adding:
1. Link validation (check if URLs are accessible)
2. QR code extraction from resumes
3. Social media profile strength analysis
4. Link analytics (when recruiters click links)
5. Suggestions for missing important links
