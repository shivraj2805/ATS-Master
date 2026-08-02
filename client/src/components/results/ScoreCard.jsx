const ScoreCard = ({ score = 82, semanticAnalysis = null }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return '#60a5fa'; // blue
    if (score >= 60) return '#fbbf24'; // yellow
    return '#dc2626'; // red
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Work';
  };

  const getConfidenceBadge = (confidence) => {
    const badges = {
      high: { label: 'High Confidence', color: 'bg-green-100 text-green-800' },
      medium: { label: 'Medium Confidence', color: 'bg-yellow-100 text-yellow-800' },
      low: { label: 'Low Confidence', color: 'bg-orange-100 text-orange-800' },
      none: { label: 'No Job Description', color: 'bg-gray-100 text-gray-800' }
    };
    return badges[confidence] || badges.none;
  };

  const getJdLengthLabel = (category) => {
    const labels = {
      short: 'Short JD (<80 words)',
      medium: 'Medium JD (80-200 words)',
      long: 'Detailed JD (>200 words)'
    };
    return labels[category] || 'No JD provided';
  };

  return (
    <div className="score-card">
      <div className="score-circle-container">
        <svg className="score-svg" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={getScoreColor(score)}
            strokeWidth="20"
            strokeDasharray={`${(score / 100) * 565.48} 565.48`}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="score-content">
          <span className="score-number">{score}</span>
          <span className="score-max">/100</span>
          <span className="score-label">{getScoreLabel(score)}</span>
        </div>
      </div>
      
      <div className="score-description">
        <h3>Your ATS Compatibility Score</h3>
        <p className="score-summary">
          Your resume scored <strong>{score} out of 100</strong>, placing it in the <strong>{getScoreLabel(score)}</strong> category.
        </p>

        {/* Semantic Analysis Transparency */}
        {semanticAnalysis && (
          <div className="semantic-transparency mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Analysis Details</h4>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(semanticAnalysis.semantic_confidence).color}`}>
                {getConfidenceBadge(semanticAnalysis.semantic_confidence).label}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">📄</span>
                <div>
                  <span className="text-gray-500 text-xs">Job Description:</span>
                  <p className="font-medium text-gray-700">{getJdLengthLabel(semanticAnalysis.jd_length_category)}</p>
                </div>
              </div>
              
              {semanticAnalysis.must_haves && semanticAnalysis.must_haves.total > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">✅</span>
                  <div>
                    <span className="text-gray-500 text-xs">Must-Have Skills:</span>
                    <p className="font-medium text-gray-700">
                      {semanticAnalysis.must_haves.matched}/{semanticAnalysis.must_haves.total} matched
                    </p>
                  </div>
                </div>
              )}
              
              {semanticAnalysis.nice_to_haves && semanticAnalysis.nice_to_haves.total > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">💡</span>
                  <div>
                    <span className="text-gray-500 text-xs">Nice-to-Have:</span>
                    <p className="font-medium text-gray-700">
                      {semanticAnalysis.nice_to_haves.matched}/{semanticAnalysis.nice_to_haves.total} matched
                    </p>
                  </div>
                </div>
              )}
              
              {semanticAnalysis.weights && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">⚖️</span>
                  <div>
                    <span className="text-gray-500 text-xs">Scoring Weights:</span>
                    <p className="font-medium text-gray-700 text-xs">
                      {semanticAnalysis.weights.skill_weight}% skills, {semanticAnalysis.weights.text_weight}% similarity
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Missing must-haves warning */}
            {semanticAnalysis.must_haves && 
             semanticAnalysis.must_haves.matched < semanticAnalysis.must_haves.total && (
              <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                <p className="text-orange-800">
                  ⚠️ You're missing <strong>{semanticAnalysis.must_haves.total - semanticAnalysis.must_haves.matched}</strong> required skills. 
                  Check the recommendations below to improve your score.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="score-context">
          <h4>What does this mean?</h4>
          {score >= 80 && (
            <p>✅ Your resume is well-optimized for ATS systems. It should pass initial screenings and reach human recruiters. Keep up the good work!</p>
          )}
          {score >= 60 && score < 80 && (
            <p>⚠️ Your resume has a good foundation but needs improvement. Follow the recommendations below to increase your chances of passing ATS filters.</p>
          )}
          {score < 60 && (
            <p>❌ Your resume needs significant optimization to pass ATS screenings. Don't worry—our recommendations will help you improve quickly.</p>
          )}
        </div>
        <div className="score-benchmark">
          <p className="benchmark-label">Industry Benchmark</p>
          <div className="benchmark-bar">
            <div className="benchmark-range good"></div>
            <div className="benchmark-range excellent"></div>
            <div className="benchmark-marker" style={{ left: `${score}%` }}>
              <div className="marker-dot"></div>
              <span className="marker-label">You</span>
            </div>
          </div>
          <div className="benchmark-labels">
            <span>0 - Needs Work</span>
            <span>60 - Good</span>
            <span>80+ - Excellent</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
