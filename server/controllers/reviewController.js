const Review = require('../models/Review');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { rating, text, metric, role, company } = req.body;

    // Check if user already submitted a review
    const existingReview = await Review.findOne({ user: req.user.id });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review'
      });
    }

    const review = await Review.create({
      user: req.user.id,
      name: req.user.name,
      rating,
      text,
      metric,
      role: role || 'Job Seeker',
      company: company || '',
      isApproved: true,
      isPublished: true
    });

    res.status(201).json({
      success: true,
      data: review,
      message: 'Review submitted and published successfully! Thank you for your feedback.'
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating review'
    });
  }
};

// @desc    Get all published reviews
// @route   GET /api/reviews
// @access  Public
exports.getPublishedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isPublished: true })
      .sort({ rating: -1, createdAt: -1 })
      .select('-user -isApproved')
      .limit(50);

    // Calculate stats
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      count: totalReviews,
      averageRating,
      data: reviews
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews'
    });
  }
};

// @desc    Get user's own review
// @route   GET /api/reviews/my-review
// @access  Private
exports.getMyReview = async (req, res) => {
  try {
    const review = await Review.findOne({ user: req.user.id });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'No review found'
      });
    }

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Get my review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching review'
    });
  }
};

// @desc    Update user's review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const { rating, text, metric, role, company } = req.body;

    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Make sure user owns the review
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Update fields
    review.rating = rating || review.rating;
    review.text = text || review.text;
    review.metric = metric || review.metric;
    review.role = role || review.role;
    review.company = company || review.company;
    review.isApproved = true; // Auto-approve updates
    review.isPublished = true;

    await review.save();

    res.status(200).json({
      success: true,
      data: review,
      message: 'Review updated and published successfully!'
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating review'
    });
  }
};

// @desc    Delete user's review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Make sure user owns the review
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting review'
    });
  }
};

// @desc    Get all reviews (admin only)
// @route   GET /api/reviews/admin/all
// @access  Private/Admin
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews'
    });
  }
};

// @desc    Approve and publish review (admin only)
// @route   PUT /api/reviews/admin/:id/approve
// @access  Private/Admin
exports.approveReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.isApproved = true;
    review.isPublished = true;
    await review.save();

    res.status(200).json({
      success: true,
      data: review,
      message: 'Review approved and published'
    });
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving review'
    });
  }
};

// @desc    Unpublish review (admin only)
// @route   PUT /api/reviews/admin/:id/unpublish
// @access  Private/Admin
exports.unpublishReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.isPublished = false;
    await review.save();

    res.status(200).json({
      success: true,
      data: review,
      message: 'Review unpublished'
    });
  } catch (error) {
    console.error('Unpublish review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unpublishing review'
    });
  }
};
