import { Download, Share2, FileText } from 'lucide-react';

const ResultsActions = () => {
  const handleDownloadReport = () => {
    alert('Report download functionality will be implemented with backend integration');
  };

  const handleShareResults = () => {
    alert('Share functionality will be implemented');
  };

  const handleDownloadOptimized = () => {
    alert('Optimized resume download will be available after implementing optimization suggestions');
  };

  return (
    <div className="results-actions">
      <h2>Ready to Improve Your Resume?</h2>
      <p className="actions-subtitle">Take action on our recommendations and boost your chances of landing interviews</p>
      
      <div className="actions-grid">
        <button className="action-button primary" onClick={handleDownloadReport}>
          <Download size={20} />
          <span>
            <strong>Download Full Report</strong>
            <small>PDF with detailed analysis</small>
          </span>
        </button>
        
        <button className="action-button secondary" onClick={handleDownloadOptimized}>
          <FileText size={20} />
          <span>
            <strong>Get Optimized Version</strong>
            <small>Resume with applied fixes</small>
          </span>
        </button>
        
        <button className="action-button secondary" onClick={handleShareResults}>
          <Share2 size={20} />
          <span>
            <strong>Share Results</strong>
            <small>Send to email or save link</small>
          </span>
        </button>
      </div>
      
      <div className="next-steps-info">
        <h3>📋 Your Action Plan</h3>
        <div className="action-plan-steps">
          <div className="plan-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Review Recommendations</h4>
              <p>Focus on high-priority items first—they have the biggest impact on your score</p>
            </div>
          </div>
          <div className="plan-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Update Your Resume</h4>
              <p>Apply the suggested changes to your resume. Most improvements take less than 15 minutes</p>
            </div>
          </div>
          <div className="plan-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Test Again</h4>
              <p>Re-upload your updated resume to see your score improvement and ensure you're on track</p>
            </div>
          </div>
          <div className="plan-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Start Applying</h4>
              <p>Use your optimized resume when applying to jobs to maximize your interview chances</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsActions;
