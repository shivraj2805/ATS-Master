# Link Extractor Debugging Guide

## Issue: Extracted Links Not Showing

### Quick Diagnostic Steps

1. **Check if Python AI Service is running:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status": "healthy", ...}`

2. **Test link extractor independently:**
   ```bash
   cd python-ai-service
   python test_link_extractor.py
   ```

3. **Check if dependencies are installed:**
   ```bash
   pip show langgraph pydantic pymupdf
   ```
   If missing, install:
   ```bash
   pip install langgraph pydantic pymupdf
   ```

4. **Test link extraction with a sample PDF:**
   ```bash
   cd python-ai-service
   python link-extractor.py path/to/your/resume.pdf
   ```

5. **Start the Python AI Service:**
   ```bash
   cd python-ai-service
   python app.py
   ```
   Look for: `Running on http://0.0.0.0:5000`

6. **Check Node.js server logs:**
   When you upload a resume, you should see:
   ```
   🔗 Attempting link extraction for PDF: resume.pdf
   🔗 LinkExtractorService: Starting extraction for: ...
   ✅ Python service responded: 200
   ```

7. **Check browser console:**
   Open DevTools (F12) and look for:
   ```
   ExtractedLinks received: {...}
   ResultsDashboard - extracted_links: {...}
   ```

### Common Issues

#### Issue: Python service not running
**Symptom:** Console shows "No response received from Python service"
**Solution:** Start Python service: `cd python-ai-service && python app.py`

#### Issue: Dependencies not installed
**Symptom:** Python service crashes on startup
**Solution:** 
```bash
cd python-ai-service
pip install -r requirements.txt
```

#### Issue: Links are empty arrays
**Symptom:** API returns extracted_links but all arrays are empty
**Possible causes:**
- PDF doesn't contain actual hyperlinks (only text)
- PDF is scanned/image-based
- Links are embedded differently

**Test:** Use a PDF with known hyperlinks (like a resume from LinkedIn export)

#### Issue: Frontend not displaying component
**Symptom:** No errors but component doesn't show
**Check:** Browser console for:
```javascript
ExtractedLinks received: {...}
No links found in any category
```

### Debugging with Console Logs

**Backend logs to watch for:**
```
🔗 Attempting link extraction for PDF: filename.pdf
🔗 LinkExtractorService: Starting extraction
✅ File exists, creating form data...
📤 Calling Python service at: http://localhost:5000/api/extract-links
✅ Python service responded: 200
📊 Response data: { success: true, buckets: {...} }
✅ Links extracted successfully. Total: 5
📤 Sending response with extracted_links: {...}
```

**Frontend logs to watch for:**
```javascript
ResultsDashboard - extracted_links: {github: Array(1), linkedin: Array(1), ...}
ExtractedLinks received: {github: Array(1), linkedin: Array(1), ...}
```

### Manual API Test

Test the Python endpoint directly:
```bash
curl -X POST http://localhost:5000/api/extract-links \
  -F "file=@path/to/resume.pdf"
```

Expected response:
```json
{
  "success": true,
  "buckets": {
    "github": ["https://github.com/username"],
    "linkedin": ["https://linkedin.com/in/username"],
    ...
  },
  "total_links": 5
}
```

### Checklist

- [ ] Python dependencies installed (langgraph, pydantic, pymupdf)
- [ ] Python AI service running on port 5000
- [ ] Node.js server running on port 3001
- [ ] React client running on port 5173
- [ ] Using a PDF file (not DOCX)
- [ ] PDF contains actual hyperlinks (not just text URLs)
- [ ] No errors in Python service terminal
- [ ] No errors in Node.js server terminal
- [ ] No errors in browser console

### Next Steps

After fixing issues:
1. Restart all services
2. Upload a new resume
3. Check console logs at each step
4. Verify extracted_links appears in API response
5. Verify ExtractedLinks component renders

### Still Not Working?

Share the output from:
1. Python service logs
2. Node.js server logs (including the 🔗 emoji lines)
3. Browser console logs
4. Result from: `curl http://localhost:5000/health`
