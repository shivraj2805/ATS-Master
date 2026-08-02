const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: false,
  },
  jobDescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobDescription',
    required: false,
  },
  scores: {
    semanticScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    keywordScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    finalAtsScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    breakdown: {
      keyword_relevance: Number,
      section_completeness: Number,
      formatting_score: Number,
      skill_relevance: Number,
      experience_clarity: Number,
      project_impact: Number,
    }
  },
  matched: {
    skills: [String],
    experience: [String],
    education: [String],
  },
  partial: [String],
  missing: [String],
  suggestions: [{
    category: {
      type: String,
      enum: ['keyword', 'formatting', 'experience', 'skills', 'education', 'summary', 'general'],
    },
    suggestion: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
  }],
  extractedLinks: {
    github: [String],
    linkedin: [String],
    leetcode: [String],
    portfolio: [String],
    email: [String],
    other: [String],
    total: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

// Index for faster queries
analysisResultSchema.index({ userId: 1, createdAt: -1 });
analysisResultSchema.index({ resumeId: 1 });
analysisResultSchema.index({ 'scores.finalAtsScore': -1 });

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);
