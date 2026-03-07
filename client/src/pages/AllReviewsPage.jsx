import { useState, useEffect } from 'react';
import { Star, Quote, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const AllReviewsPage = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ count: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/reviews');
      const data = await response.json();

      if (data.success) {
        setReviews(data.data);
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow bg-gradient-to-b from-gray-50 to-white pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-primary-600 font-semibold mb-8 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              All Customer Reviews
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              See what our users are saying about ATSMaster
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div className="text-center">
                <div className="text-4xl font-black text-primary-600">
                  {stats.count.toLocaleString()}
                </div>
                <div className="text-gray-600 font-semibold">Total Reviews</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center mb-1">
                  <span className="text-4xl font-black text-primary-600">
                    {stats.averageRating}
                  </span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={20} fill="#ffd700" color="#ffd700" />
                    ))}
                  </div>
                </div>
                <div className="text-gray-600 font-semibold">Average Rating</div>
              </div>
            </div>
          </div>

          {/* Reviews Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-100"
                >
                  <Quote size={32} className="text-primary-200 mb-4" />
                  
                  {/* Rating */}
                  <div className="flex mb-4">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} size={18} fill="#ffd700" color="#ffd700" />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {review.text}
                  </p>

                  {/* Metric */}
                  {review.metric && (
                    <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-semibold text-sm mb-4 inline-block">
                      {review.metric}
                    </div>
                  )}

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-lg">
                      {review.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{review.name}</div>
                      <div className="text-sm text-gray-600">
                        {review.role}
                        {review.company && ` at ${review.company}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AllReviewsPage;
