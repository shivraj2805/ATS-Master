const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Please provide your role'],
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating'],
    min: 1,
    max: 5
  },
  text: {
    type: String,
    required: [true, 'Please provide review text'],
    trim: true,
    minlength: [10, 'Review must be at least 10 characters'],
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  metric: {
    type: String,
    trim: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
reviewSchema.index({ isPublished: 1, rating: -1 });
reviewSchema.index({ user: 1 });

module.exports = mongoose.model('Review', reviewSchema);
