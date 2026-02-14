import { Star, Quote } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Software Engineer',
      company: 'Tech Corp',
      rating: 5,
      text: 'ATSMaster helped me identify critical issues in my resume. After making the recommended changes, I got 150% more interview callbacks!',
      metric: '150% more callbacks'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Product Manager',
      company: 'Startup Inc',
      rating: 5,
      text: 'The AI analysis was incredibly detailed. I had no idea my resume was failing ATS scans. Fixed it in under an hour and landed my dream job.',
      metric: 'Dream job secured'
    },
    {
      name: 'Emily Watson',
      role: 'Marketing Director',
      company: 'Global Agency',
      rating: 5,
      text: 'As someone with 10+ years experience, I thought my resume was perfect. ATSMaster found formatting issues that were blocking my applications.',
      metric: '3 offers in 2 weeks'
    }
  ];

  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        <div className="testimonials-header">
          <h2 className="section-title">Trusted by Job Seekers Worldwide</h2>
          <div className="testimonials-stats">
            <div className="stat-item">
              <div className="stat-number">5,068</div>
              <div className="stat-label">Reviews</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-rating">
                <span className="stat-number">4.9</span>
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

        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <Quote size={32} className="quote-icon" />
              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={18} fill="#ffd700" color="#ffd700" />
                ))}
              </div>
              <p className="testimonial-text">{testimonial.text}</p>
              <div className="testimonial-metric">{testimonial.metric}</div>
              <div className="testimonial-author">
                <div className="author-avatar">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="author-info">
                  <div className="author-name">{testimonial.name}</div>
                  <div className="author-role">{testimonial.role} at {testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
