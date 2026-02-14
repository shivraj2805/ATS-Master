class DomainClassifier {
  constructor() {
    this.DOMAIN_KEYWORDS = {
      'Software / IT': [
        'software', 'developer', 'engineer', 'programming', 'code', 'application',
        'web', 'mobile', 'frontend', 'backend', 'fullstack', 'devops',
        'api', 'microservices', 'architecture', 'deployment', 'testing'
      ],
      'Data / AI': [
        'data', 'machine learning', 'ml', 'ai', 'artificial intelligence',
        'deep learning', 'nlp', 'computer vision', 'data science',
        'analytics', 'statistics', 'model', 'algorithm', 'prediction',
        'neural network', 'tensorflow', 'pytorch'
      ],
      'Marketing': [
        'marketing', 'digital marketing', 'social media', 'seo', 'sem',
        'content', 'campaign', 'brand', 'advertising', 'engagement',
        'conversion', 'analytics', 'growth', 'strategy'
      ],
      'Finance': [
        'finance', 'financial', 'accounting', 'investment', 'banking',
        'risk', 'audit', 'compliance', 'portfolio', 'trading',
        'budgeting', 'forecasting', 'analysis'
      ],
      'Sales': [
        'sales', 'business development', 'account management', 'crm',
        'revenue', 'quota', 'pipeline', 'leads', 'prospecting',
        'negotiation', 'closing', 'client relations'
      ],
      'Design': [
        'design', 'ui', 'ux', 'user interface', 'user experience',
        'graphic', 'visual', 'prototype', 'wireframe', 'figma',
        'sketch', 'adobe', 'creative'
      ],
      'General': []
    };
  }

  classify(text, skillsData) {
    const textLower = text.toLowerCase();
    const domainScores = {};

    // Score each domain
    for (const [domain, keywords] of Object.entries(this.DOMAIN_KEYWORDS)) {
      if (domain === 'General') continue;
      
      let score = 0;
      const matchedKeywords = [];

      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          score++;
          matchedKeywords.push(keyword);
        }
      }

      domainScores[domain] = {
        score,
        matchedKeywords
      };
    }

    // Find primary domain
    let primaryDomain = 'General';
    let maxScore = 0;
    let primaryKeywords = [];

    for (const [domain, data] of Object.entries(domainScores)) {
      if (data.score > maxScore) {
        maxScore = data.score;
        primaryDomain = domain;
        primaryKeywords = data.matchedKeywords;
      }
    }

    // Calculate confidence (normalize to 0-100)
    const totalPossibleMatches = this.DOMAIN_KEYWORDS[primaryDomain]?.length || 1;
    const confidence = Math.min(100, Math.round((maxScore / totalPossibleMatches) * 100) + 40);

    // Find secondary domain
    let secondaryDomain = null;
    let secondMaxScore = 0;
    for (const [domain, data] of Object.entries(domainScores)) {
      if (domain !== primaryDomain && data.score > secondMaxScore && data.score >= 2) {
        secondMaxScore = data.score;
        secondaryDomain = domain;
      }
    }

    return {
      primary: primaryDomain,
      confidence: Math.min(95, Math.max(50, confidence)),
      secondary: secondaryDomain,
      keywords_matched: primaryKeywords.slice(0, 10)
    };
  }
}

module.exports = DomainClassifier;
