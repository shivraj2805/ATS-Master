import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SecondaryUpload = () => {
  const navigate = useNavigate();

  const handleUpload = () => {
    // Scroll to top upload section or trigger upload directly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Alternative: navigate('/upload');
  };

  return (
    <section className="secondary-upload-section">
      <div className="secondary-upload-container">
        <div className="secondary-upload-content">
          <h2>Get Your Resume Score Now!</h2>
          <p>
            Upload your resume and receive a detailed ATS compatibility report 
            in under 30 seconds. Completely free, no signup required.
          </p>
          
          <button onClick={handleUpload} className="secondary-upload-btn">
            <Upload size={24} />
            Check My Resume Score
          </button>

          <div className="secondary-upload-features">
            <div className="feature-pill">
              <span className="feature-icon">✓</span>
              16-point analysis
            </div>
            <div className="feature-pill">
              <span className="feature-icon">✓</span>
              Instant results
            </div>
            <div className="feature-pill">
              <span className="feature-icon">✓</span>
              AI-powered insights
            </div>
            <div className="feature-pill">
              <span className="feature-icon">✓</span>
              100% free
            </div>
          </div>
        </div>

        <div className="secondary-upload-visual">
          <div className="visual-card">
            <div className="visual-score">
              <div className="visual-number">87</div>
              <div className="visual-label">ATS Score</div>
            </div>
            <div className="visual-checks">
              <div className="visual-check success">✓ Format optimized</div>
              <div className="visual-check success">✓ Keywords matched</div>
              <div className="visual-check success">✓ Sections complete</div>
              <div className="visual-check warning">⚠ Skills needs work</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecondaryUpload;
