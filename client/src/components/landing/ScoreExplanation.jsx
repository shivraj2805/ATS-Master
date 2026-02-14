import { CheckCircle, TrendingUp, Target } from 'lucide-react';

const ScoreExplanation = () => {
  return (
    <section className="score-explanation-section">
      <div className="score-explanation-container">
        <div className="score-content">
          <h2 className="section-title-white">Understanding Your ATS Score</h2>
          
          <div className="score-points">
            <div className="score-point">
              <div className="point-icon">
                <CheckCircle size={24} />
              </div>
              <div>
                <h4>Content Parsed</h4>
                <p>We analyze how well ATS systems can read your resume</p>
              </div>
            </div>

            <div className="score-point">
              <div className="point-icon">
                <Target size={24} />
              </div>
              <div>
                <h4>Issue Detection</h4>
                <p>Identify formatting and content problems</p>
              </div>
            </div>

            <div className="score-point">
              <div className="point-icon">
                <TrendingUp size={24} />
              </div>
              <div>
                <h4>Final Score</h4>
                <p>Get a comprehensive 0-100 compatibility score</p>
              </div>
            </div>
          </div>
        </div>

        <div className="score-visual">
          <div className="score-meter">
            <div className="score-circle">
              <span className="score-number">80+</span>
              <span className="score-label">Great Score</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScoreExplanation;
