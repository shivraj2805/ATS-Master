import { FileText, CheckCircle, TrendingUp } from 'lucide-react';

const ContentInterpretation = () => {
  return (
    <section className="content-interpretation-section">
      <div className="content-interpretation-container">
        <h2 className="section-title">Content Interpretation Capability</h2>
        <p className="section-subtitle">
          Similar to an ATS, we analyze and attempt to comprehend the full content of your resume
        </p>
        
        <div className="interpretation-grid">
          <div className="interpretation-main">
            <div className="interpretation-icon-wrapper">
              <FileText size={48} className="interpretation-icon" />
            </div>
            <h3>What We Analyze</h3>
            <p>
              The proportion of content we can interpret directly impacts your ATS score. 
              Our AI-powered system evaluates how well your resume is structured for 
              machine readability while maintaining human appeal.
            </p>
            <ul className="interpretation-points">
              <li>
                <CheckCircle size={20} className="check-icon" />
                Text extraction accuracy from PDF and DOCX formats
              </li>
              <li>
                <CheckCircle size={20} className="check-icon" />
                Proper identification of contact information and sections
              </li>
              <li>
                <CheckCircle size={20} className="check-icon" />
                Recognition of industry-standard terminology and skills
              </li>
              <li>
                <CheckCircle size={20} className="check-icon" />
                Measurement of keyword density and relevance
              </li>
            </ul>
          </div>

          <div className="interpretation-examples">
            <h4>Expected Format Examples</h4>
            <div className="example-card">
              <div className="example-header">
                <TrendingUp size={20} className="example-icon success" />
                <span className="example-label">Well-Formatted</span>
              </div>
              <div className="example-content">
                <p className="example-bullet">
                  • Increased user engagement by <strong>30%</strong> through UI/UX redesign
                </p>
                <p className="example-bullet">
                  • Achieved <strong>20% growth</strong> in revenue via marketing optimization
                </p>
                <p className="example-bullet">
                  • Reduced operational costs by <strong>$150K</strong> annually
                </p>
              </div>
              <div className="example-note">
                ✓ Clear metrics, action verbs, quantified results
              </div>
            </div>

            <div className="example-card warning">
              <div className="example-header">
                <TrendingUp size={20} className="example-icon warning" />
                <span className="example-label">Needs Improvement</span>
              </div>
              <div className="example-content">
                <p className="example-bullet">
                  • Responsible for improving website performance
                </p>
                <p className="example-bullet">
                  • Helped with various marketing campaigns
                </p>
                <p className="example-bullet">
                  • Worked on cost reduction initiatives
                </p>
              </div>
              <div className="example-note">
                ✗ Vague language, no metrics, passive voice
              </div>
            </div>
          </div>
        </div>

        <div className="interpretation-cta">
          <p>
            Get a detailed breakdown of your resume's parsability and receive 
            specific recommendations for improvement
          </p>
        </div>
      </div>
    </section>
  );
};

export default ContentInterpretation;
