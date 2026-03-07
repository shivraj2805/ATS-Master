import { useState, useEffect } from 'react';
import { Star, Quote, Pencil, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReviewModal from '../ui/ReviewModal';
import { useAuth } from '../../contexts/AuthContext';

const Testimonials = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState([]);
  const [stats, setStats] = useState({ count: 0, averageRating: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/reviews');
      const data = await response.json();

      if (data.success) {
        setTestimonials(data.data);
        setStats({
          count: data.count || 0,
          averageRating: data.averageRating || 5.0
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    if (!user) {
      alert('Please log in to submit a review');
      return;
    }
    setIsModalOpen(true);
  };

  const handleSubmitSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
    // Optionally refresh reviews
    fetchReviews();
  };

  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        <div className="testimonials-header">
          <div className="flex items-center justify-center flex-wrap gap-4 mb-6">
            <h2 className="section-title">Trusted by Job Seekers Worldwide</h2>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
              <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
              <p className="text-green-800 font-semibold">{successMessage}</p>
            </div>
          )}

          <div className="testimonials-stats">
            <div className="stat-item">
              <div className="stat-number">{stats.count.toLocaleString()}</div>
              <div className="stat-label">Reviews</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-rating">
                <span className="stat-number">{stats.averageRating}</span>
                <div className="stars-small">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="#ffd700" color="#ffd700" />
                  ))}
                </div>
              </div>
              <div className="stat-label">Average Rating</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="testimonials-grid">
            {testimonials.slice(0, 3).map((testimonial, index) => (
              <div key={testimonial._id || index} className="testimonial-card">
                <Quote size={32} className="quote-icon" />
                <div className="testimonial-rating">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={18} fill="#ffd700" color="#ffd700" />
                  ))}
                </div>
                <p className="testimonial-text">{testimonial.text}</p>
                {testimonial.metric && (
                  <div className="testimonial-metric">{testimonial.metric}</div>
                )}
                <div className="testimonial-author">
                  <div className="author-avatar">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="author-info">
                    <div className="author-name">{testimonial.name}</div>
                    <div className="author-role">
                      {testimonial.role}
                      {testimonial.company && ` at ${testimonial.company}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* See All Reviews Button */}
        {!loading && testimonials.length > 3 && (
          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/reviews')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 border-2 border-primary-600 rounded-xl font-bold text-lg hover:bg-primary-600 hover:text-white transition-all hover:shadow-lg"
            >
              See All {stats.count} Reviews
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Write a Review CTA */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-3xl p-8 md:p-12 border-2 border-primary-200">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Star size={32} fill="#ffd700" color="#ffd700" />
              <Star size={40} fill="#ffd700" color="#ffd700" />
              <Star size={32} fill="#ffd700" color="#ffd700" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-gray-800 mb-3">
              Share Your Success Story
            </h3>
            <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
              Did ATSMaster help you land more interviews or your dream job? 
              Share your experience and inspire other job seekers!
            </p>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
            >
              <Pencil size={24} />
              Write Your Review
            </button>
          </div>
        </div>
      </div>

      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitSuccess={handleSubmitSuccess}
      />
    </section>
  );
};

export default Testimonials;
