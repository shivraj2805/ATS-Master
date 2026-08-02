const express = require('express');
const router = express.Router();
const {
  createReview,
  getPublishedReviews,
  getMyReview,
  updateReview,
  deleteReview,
  getAllReviews,
  approveReview,
  unpublishReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', getPublishedReviews);

// Protected routes (require authentication)
router.post('/', protect, createReview);
router.get('/my-review', protect, getMyReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

// Admin routes (uncomment when admin middleware is implemented)
// router.get('/admin/all', protect, admin, getAllReviews);
// router.put('/admin/:id/approve', protect, admin, approveReview);
// router.put('/admin/:id/unpublish', protect, admin, unpublishReview);

module.exports = router;
