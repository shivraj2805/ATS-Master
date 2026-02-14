const express = require('express');
const router = express.Router();
const { 
  generateOptimizations,
  enhanceBullets,
  generateCoverLetter
} = require('../controllers/optimizationController');
const { optionalAuth } = require('../middleware/auth');

// All routes use optional authentication
router.post('/generate', optionalAuth, generateOptimizations);
router.post('/enhance-bullets', optionalAuth, enhanceBullets);
router.post('/cover-letter', optionalAuth, generateCoverLetter);

module.exports = router;
