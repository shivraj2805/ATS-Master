const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  analyzeResume, 
  getResumeHistory, 
  getAnalysis 
} = require('../controllers/resumeController');
const { optionalAuth, protect } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
    }
  }
});

// Public/Optional Auth routes
router.post('/analyze', optionalAuth, upload.single('file'), analyzeResume);

// Protected routes
router.get('/history', protect, getResumeHistory);
router.get('/analysis/:id', protect, getAnalysis);

module.exports = router;
