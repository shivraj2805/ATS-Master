const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Allow anonymous uploads
  },
  filename: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    required: false,
  },
  parsedData: {
    contactInfo: {
      name: String,
      email: String,
      phone: String,
      location: String,
      linkedin: String,
      github: String,
      portfolio: String,
    },
    summary: String,
    skills: [String],
    experience: [{
      company: String,
      position: String,
      duration: String,
      description: String,
      bullets: [String],
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      year: String,
      gpa: String,
    }],
    certifications: [String],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      links: [String],
    }],
    rawText: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

// Index for faster queries
resumeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);
