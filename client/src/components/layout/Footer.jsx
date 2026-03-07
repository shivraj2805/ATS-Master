import { useState, useEffect } from 'react';
import { Facebook, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    // Fetch review count
    fetch('http://localhost:3001/api/reviews')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.count) {
          setReviewCount(data.count);
        }
      })
      .catch(err => console.error('Error fetching review count:', err));
  }, []);

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* About us */}
          <div className="footer-column">
            <h3 className="footer-heading">About us</h3>
            <ul className="footer-links">
              <li><a href="#">Company</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="/reviews">Reviews</a></li>
              <li><a href="#">LLM Info</a></li>
            </ul>
          </div>

          {/* Contact us */}
          <div className="footer-column">
            <h3 className="footer-heading">Contact us</h3>
            <ul className="footer-links">
              <li><a href="mailto:support@atsmaster.com">support@atsmaster.com</a></li>
              <li><a href="#">Help</a></li>
              <li><a href="#">Press</a></li>
            </ul>
          </div>

          {/* Languages */}
          <div className="footer-column">
            <h3 className="footer-heading">Languages</h3>
            <ul className="footer-links footer-languages">
              <li><a href="#">English (UK)</a></li>
              <li><a href="#">French (FR)</a></li>
              <li><a href="#">German (DE)</a></li>
              <li><a href="#">Spanish (ES)</a></li>
              <li><a href="#">Swedish (SE)</a></li>
              <li><a href="#">Portuguese (BR)</a></li>
              <li><a href="#">Italian (IT)</a></li>
              <li><a href="#">Norwegian (NO)</a></li>
              <li><a href="#">Dutch (NL)</a></li>
              <li><a href="#">Finnish (FI)</a></li>
              <li><a href="#">Czech (CS)</a></li>
              <li><a href="#">Polish (PL)</a></li>
           
            </ul>
          </div>

          {/* Reviews & AI */}
          <div className="footer-column">
            <div className="footer-reviews">
              <div className="trustpilot-stars">
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star half">★</span>
              </div>
              <p className="review-count">{reviewCount.toLocaleString()} Reviews</p>
              <Link to="/reviews" className="reviews-link">Read More Reviews at Reviews.io</Link>
            </div>
            <div className="footer-ai">
              <h4 className="footer-ai-heading">Ask AI about ATSMaster</h4>
              <ul className="footer-ai-links">
                <li><a href="https://chat.openai.com/" target="_blank" rel="noopener noreferrer">ChatGPT</a></li>
                <li><a href="https://www.perplexity.ai/" target="_blank" rel="noopener noreferrer">Perplexity</a></li>
                <li><a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer">Gemini</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-social">
            <a href="#" className="social-icon">
              <Facebook size={24} />
            </a>
            <a href="#" className="social-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
          
          <div className="footer-credits">
            <p className="made-with-love">
              Made with love by people who care. <Heart size={16} className="heart-icon" />
            </p>
            <p className="copyright">© 2026. All rights reserved.</p>
          </div>
          
          <div className="footer-legal">
            <p className="legal-text">
              This site is protected by reCAPTCHA and the Google{' '}
              <a href="#">Privacy Policy</a> and <a href="#">Terms of Service</a> apply.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
