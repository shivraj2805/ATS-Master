require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');
const { getSemanticAnalyzer } = require('./services/semanticAnalyzer');

// Import routes
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const optimizationRoutes = require('./routes/optimization');
const { downloadReport } = require('./controllers/reportController');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize application
const initializeApp = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize semantic analyzer
    console.log('Initializing AI models...');
    await getSemanticAnalyzer();
    console.log('AI models ready');

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`✅ MongoDB Connected`);
      console.log(`✅ AI Models Initialized`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/optimization', optimizationRoutes);
app.post('/api/download-report', downloadReport);

// Health check routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'ATSMaster API - AI-Driven Resume Optimization', 
    status: 'running',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: 'connected',
    ai_models: 'initialized'
  });
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Initialize and start the application
initializeApp();

module.exports = app;