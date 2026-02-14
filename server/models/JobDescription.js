const mongoose = require('mongoose');

const jobDescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Allow anonymous job descriptions
  },
  jobTitle: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  parsedData: {
    requiredSkills: [String],
    preferredSkills: [String],
    qualifications: [String],
    experience: String,
    responsibilities: [String],
    keywords: [String],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

// Index for faster queries
jobDescriptionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('JobDescription', jobDescriptionSchema);
