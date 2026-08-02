import { Target, Search, Database, Check } from 'lucide-react';

const ScoringSystem = () => {
  return (
    <section className="scoring-system-section">
      <div className="scoring-system-container">
        <h2 className="section-title">Two-Tier ATS Scoring System</h2>
        <p className="section-subtitle">
          Understanding how Applicant Tracking Systems evaluate your resume
        </p>
        
        <div className="scoring-tiers">
          <div className="tier-card">
            <div className="tier-icon-wrapper">
              <Search size={40} className="tier-icon" />
            </div>
            <h3>Tier 1: Initial ATS Screening</h3>
            <p>
              The success of your resume is highly dependent on passing the initial 
              ATS screening. Systems scan for specific keywords, proper formatting, 
              and standard section headers. Without these elements, your resume may 
              never reach human eyes.
            </p>
            <div className="tier-features">
              <span className="tier-badge">Keyword Matching</span>
              <span className="tier-badge">Format Recognition</span>
              <span className="tier-badge">Section Detection</span>
            </div>
          </div>

          <div className="tier-card">
            <div className="tier-icon-wrapper">
              <Database size={40} className="tier-icon" />
            </div>
            <h3>Tier 2: Database Entry & Ranking</h3>
            <p>
              Once parsed, your resume is stored in the company's candidate database. 
              The ATS assigns a compatibility score based on how well your qualifications 
              match the job requirements. Higher scores increase your chances of being 
              shortlisted for review.
            </p>
            <div className="tier-features">
              <span className="tier-badge">Qualification Scoring</span>
              <span className="tier-badge">Skills Ranking</span>
              <span className="tier-badge">Experience Weight</span>
            </div>
          </div>
        </div>

        <div className="scoring-flow">
          <div className="flow-step">
            <Target size={28} />
            <p>Resume Submitted</p>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">
            <Search size={28} />
            <p>ATS Parsing</p>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">
            <Database size={28} />
            <p>Score Calculation</p>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step success">
            <Check size={28} />
            <p>Human Review</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScoringSystem;
