import { Lightbulb, TrendingUp, Target, Zap } from 'lucide-react';

const Recommendations = () => {
  const recommendations = [
    {
      priority: 'high',
      icon: <Zap size={24} />,
      title: 'Add LinkedIn Profile URL',
      description: 'Include your LinkedIn profile link in the contact section. This increases credibility and provides recruiters with additional information.',
      impact: 'Quick Win - 5 minutes'
    },
    {
      priority: 'high',
      icon: <Target size={24} />,
      title: 'Optimize Bullet Points',
      description: 'Make some bullet points more concise. Aim for 1-2 lines per bullet point and start each with a strong action verb.',
      impact: 'High Impact - 15 minutes'
    },
    {
      priority: 'medium',
      icon: <TrendingUp size={24} />,
      title: 'Reorder Sections',
      description: 'Move your Skills section right after your Professional Summary. This ensures ATS systems and recruiters see your key qualifications early.',
      impact: 'Medium Impact - 10 minutes'
    },
    {
      priority: 'medium',
      icon: <Lightbulb size={24} />,
      title: 'Add Quantifiable Achievements',
      description: 'Include more metrics and numbers in your work experience (e.g., "Increased sales by 30%" instead of "Improved sales").',
      impact: 'High Impact - 30 minutes'
    },
    {
      priority: 'low',
      icon: <Target size={24} />,
      title: 'Enhance Professional Summary',
      description: 'Consider adding 1-2 more industry-specific keywords to your professional summary to improve ATS matching.',
      impact: 'Low Impact - 10 minutes'
    }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  return (
    <div className="recommendations">
      <h2>Recommendations for Improvement</h2>
      <p className="recommendations-subtitle">
        Follow these suggestions to boost your ATS score and increase your chances of landing interviews
      </p>
      
      <div className="recommendations-list">
        {recommendations.map((rec, index) => (
          <div key={index} className={`recommendation-card ${getPriorityColor(rec.priority)}`}>
            <div className="rec-header">
              <div className="rec-icon">
                {rec.icon}
              </div>
              <div className="rec-title-section">
                <div className="rec-priority">
                  {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} Priority
                </div>
                <h3>{rec.title}</h3>
              </div>
            </div>
            
            <p className="rec-description">{rec.description}</p>
            
            <div className="rec-impact">
              <span className="impact-label">Time Investment:</span>
              <span className="impact-value">{rec.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Recommendations;
