# Python AI Service for ATSMaster

This Python Flask service provides AI-powered resume optimization using Google Gemini API.

## Features

- **Professional Summary Optimization**: Generate compelling summaries aligned with job requirements
- **Bullet Point Enhancement**: Improve experience bullets with action verbs and metrics
- **Keyword Suggestions**: Smart keyword placement recommendations
- **ATS Compatibility Tips**: Formatting and structure recommendations
- **Cover Letter Generation**: Create tailored cover letters

## Setup

### 1. Install Dependencies

```bash
cd python-ai-service
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Add your Google Gemini API key:
```
GOOGLE_API_KEY=your_actual_api_key_here
PORT=5000
FLASK_ENV=development
```

### 3. Get Google Gemini API Key

1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy and paste into `.env`

### 4. Run the Service

```bash
python app.py
```

The service will run on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /health
```

### Optimize Summary
```
POST /api/ai/optimize-summary
Body: {
  "resumeText": "...",
  "jobDescription": "...",
  "currentSummary": "..."
}
```

### Enhance Bullets
```
POST /api/ai/enhance-bullets
Body: {
  "bullets": ["bullet1", "bullet2"],
  "jobDescription": "..."
}
```

### Keyword Suggestions
```
POST /api/ai/keyword-suggestions
Body: {
  "resumeText": "...",
  "jobDescription": "...",
  "missingSkills": ["skill1", "skill2"]
}
```

### ATS Tips
```
POST /api/ai/ats-tips
Body: {
  "resumeText": "...",
  "issues": [...]
}
```

### Generate Cover Letter
```
POST /api/ai/generate-cover-letter
Body: {
  "resumeText": "...",
  "jobDescription": "...",
  "company": "...",
  "jobTitle": "..."
}
```

## Integration with Node.js Backend

The Node.js backend makes HTTP requests to this service. Ensure this service is running before starting the Node.js server.

## Production Deployment

For production, use gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Or deploy to platforms like:
- Heroku
- Railway
- Google Cloud Run
- AWS Lambda (with API Gateway)
