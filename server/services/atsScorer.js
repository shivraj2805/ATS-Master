class ATSScorer {
  constructor() {
    this.DOMAIN_KEYWORDS = {
      'Software / IT': [
        'developed', 'built', 'implemented', 'designed', 'architected',
        'optimized', 'deployed', 'integrated', 'automated', 'tested',
        'scalable', 'performance', 'api', 'database', 'cloud', 'agile'
      ],
      'Data / AI': [
        'analyzed', 'modeled', 'predicted', 'visualized', 'processed',
        'accuracy', 'precision', 'training', 'dataset', 'pipeline'
      ],
      'Marketing': [
        'campaign', 'engagement', 'conversion', 'roi', 'brand',
        'content', 'strategy', 'growth', 'optimization', 'analytics'
      ],
      'Finance': [
        'analyzed', 'forecasted', 'budgeted', 'audited', 'compliance',
        'risk', 'revenue', 'investment', 'portfolio'
      ],
      'General': [
        'managed', 'led', 'achieved', 'improved', 'increased',
        'reduced', 'delivered', 'collaborated', 'created', 'developed'
      ]
    };

    this.REQUIRED_SECTIONS = ['experience', 'education', 'skills'];
    this.RECOMMENDED_SECTIONS = ['summary', 'projects', 'certifications'];
  }

  calculateScore(parsedData, skills, domain, parsingMethod = 'standard', ocrConfidence = null) {
    const isOCR = parsingMethod === 'ocr';
    const ocrPenaltyReduction = isOCR ? 0.7 : 1.0;
    const ocrMinScoreFloor = isOCR ? 25 : 0;

    const rawText = parsedData.raw_text || '';
    const sections = parsedData.sections || {};
    const formatting = parsedData.formatting || {};
    const candidate = parsedData.candidate || {};
    const experience = parsedData.experience || {};
    const projects = parsedData.projects || [];

    // Calculate individual scores
    const keywordScore = this._calculateKeywordScore(rawText, domain.primary);
    const sectionScore = this._calculateSectionScore(sections, candidate);
    const formattingScore = this._calculateFormattingScore(formatting, rawText, isOCR, ocrPenaltyReduction);
    const skillScore = this._calculateSkillScore(skills);
    const experienceScore = this._calculateExperienceScore(experience);
    const projectScore = this._calculateProjectScore(projects);

    // Create breakdown
    const breakdown = {
      keyword_relevance: keywordScore,
      section_completeness: sectionScore,
      formatting_score: formattingScore,
      skill_relevance: skillScore,
      experience_clarity: experienceScore,
      project_impact: projectScore
    };

    // Calculate weighted final score
    const weights = {
      keyword_relevance: 0.20,
      section_completeness: 0.20,
      formatting_score: 0.15,
      skill_relevance: 0.20,
      experience_clarity: 0.15,
      project_impact: 0.10
    };

    let finalScore = Math.round(
      keywordScore * weights.keyword_relevance +
      sectionScore * weights.section_completeness +
      formattingScore * weights.formatting_score +
      skillScore * weights.skill_relevance +
      experienceScore * weights.experience_clarity +
      projectScore * weights.project_impact
    );

    // Apply OCR minimum score floor
    if (isOCR && finalScore < ocrMinScoreFloor) {
      finalScore = ocrMinScoreFloor;
    }

    // Determine category
    const category = this._getScoreCategory(finalScore);

    // Identify issues
    const issues = this._identifyIssues(rawText, sections, formatting, skills, candidate, experience, isOCR, ocrConfidence);

    // Generate suggestions
    const suggestions = this._generateSuggestions(rawText, domain.primary, skills, sections, experience, projects);

    // Keywords analysis
    const keywordsAnalysis = this._analyzeKeywords(rawText, domain.primary);

    return {
      score: finalScore,
      breakdown,
      category,
      issues,
      suggestions,
      keywords_analysis: keywordsAnalysis
    };
  }

  _calculateKeywordScore(text, domain) {
    const textLower = text.toLowerCase();
    const keywords = this.DOMAIN_KEYWORDS[domain] || this.DOMAIN_KEYWORDS['General'];
    
    const found = keywords.filter(kw => textLower.includes(kw)).length;
    const keywordRatio = found / keywords.length;
    
    const actionVerbs = ['achieved', 'built', 'created', 'delivered', 'enhanced', 
                         'improved', 'launched', 'managed', 'optimized'];
    const verbCount = actionVerbs.filter(v => textLower.includes(v)).length;
    const verbRatio = Math.min(1.0, verbCount / 5);
    
    const score = Math.round((keywordRatio * 60) + (verbRatio * 40));
    return Math.min(100, score);
  }

  _calculateSectionScore(sections, candidate) {
    let score = 0;
    
    // Required sections (60 points)
    for (const section of this.REQUIRED_SECTIONS) {
      if (sections[section] && sections[section].length > 50) {
        score += 20;
      }
    }
    
    // Contact info (20 points)
    if (candidate.email) score += 10;
    if (candidate.phone) score += 10;
    
    // Recommended sections (20 points)
    for (const section of this.RECOMMENDED_SECTIONS) {
      if (sections[section] && sections[section].length > 30) {
        score += 7;
      }
    }
    
    return Math.min(100, score);
  }

  _calculateFormattingScore(formatting, text, isOCR, penaltyFactor) {
    let score = 100;
    
    const wordCount = formatting.word_count || 0;
    if (wordCount < 200) score -= 20 * penaltyFactor;
    else if (wordCount > 1000) score -= 10 * penaltyFactor;
    
    // Check for common issues
    if (text.includes('\t\t') || /\s{4,}/.test(text)) {
      score -= 10 * penaltyFactor;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  _calculateSkillScore(skills) {
    const totalSkills = skills.total_count || 0;
    
    if (totalSkills === 0) return 0;
    if (totalSkills >= 15) return 100;
    if (totalSkills >= 10) return 85;
    if (totalSkills >= 5) return 70;
    return 50;
  }

  _calculateExperienceScore(experience) {
    const positions = experience.positions || [];
    if (positions.length === 0) return 30;
    
    let score = 50;
    
    // Pattern matching for better outcome detection
    const rawText = JSON.stringify(positions).toLowerCase();
    
    // Metrics and quantifiable achievements (numbers, percentages, scale)
    const metricsPatterns = [
      /\d+%/, // percentages: "30% improvement"
      /\d+x/, // multipliers: "10x faster"
      /\d+\s*(users|customers|clients|requests|ms|seconds|minutes|hours)/, // scale: "1M users"
      /\$\d+/, // money: "$500K revenue"
      /reduced|improved|increased|decreased|optimized.*?\d+/, // action + number
    ];
    
    const metricsCount = metricsPatterns.filter(pattern => pattern.test(rawText)).length;
    
    if (metricsCount >= 3) score += 30;
    else if (metricsCount >= 2) score += 20;
    else if (metricsCount >= 1) score += 10;
    
    // Scope and impact words
    const scopeWords = ['scalable', 'production', 'deployed', 'enterprise', 'high-traffic', 
                        'real-time', 'distributed', 'microservices', 'architecture'];
    const scopeCount = scopeWords.filter(word => rawText.includes(word)).length;
    
    if (scopeCount >= 3) score += 15;
    else if (scopeCount >= 1) score += 10;
    
    // Penalize vague phrases
    const vaguePatterns = [
      /worked on/g,
      /responsible for/g,
      /involved in/g,
      /helped with/g
    ];
    
    const vagueCount = vaguePatterns.reduce((sum, pattern) => {
      const matches = rawText.match(pattern);
      return sum + (matches ? matches.length : 0);
    }, 0);
    
    // Check action verb usage
    const avgActionVerbs = positions.reduce((sum, p) => sum + (p.action_verbs_count || 0), 0) / positions.length;
    
    if (avgActionVerbs >= 2) score += 10;
    else if (avgActionVerbs >= 1) score += 5;
    
    // Penalize if too many vague phrases (> 3)
    if (vagueCount > 3) {
      score -= 15;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  _calculateProjectScore(projects) {
    if (!projects || projects.length === 0) return 40;
    
    let score = 50;
    
    // Base score for project count
    if (projects.length >= 3) score += 20;
    else if (projects.length >= 2) score += 10;
    
    // Check for proof links (GitHub, live demo, portfolio)
    const proofLinkPatterns = [
      /github\.com/i,
      /gitlab\.com/i,
      /bitbucket\.org/i,
      /https?:\/\//i, // any URL
    ];
    
    let projectsWithLinks = 0;
    let projectsWithTechStack = 0;
    let projectsWithImpact = 0;
    
    const impactWords = ['deployed', 'users', 'production', 'live', 'published', 
                         'downloads', 'visitors', 'performance', 'improved'];
    
    projects.forEach(project => {
      const projectText = JSON.stringify(project).toLowerCase();
      
      // Has links?
      if (proofLinkPatterns.some(pattern => pattern.test(projectText))) {
        projectsWithLinks++;
      }
      
      // Has tech stack/technologies?
      if (project.technologies && project.technologies.length > 0) {
        projectsWithTechStack++;
      } else if (projectText.includes('using') || projectText.includes('built with')) {
        projectsWithTechStack++;
      }
      
      // Has impact statement?
      if (impactWords.some(word => projectText.includes(word))) {
        projectsWithImpact++;
      }
    });
    
    // Reward proof links (GitHub repos, live demos)
    if (projectsWithLinks >= 2) score += 20;
    else if (projectsWithLinks >= 1) score += 10;
    
    // Reward tech stack descriptions
    const techStackRatio = projectsWithTechStack / projects.length;
    score += Math.round(techStackRatio * 15);
    
    // Reward impact statements
    const impactRatio = projectsWithImpact / projects.length;
    score += Math.round(impactRatio * 15);
    
    return Math.min(100, Math.max(40, score));
  }

  _getScoreCategory(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  }

  _identifyIssues(text, sections, formatting, skills, candidate, experience, isOCR, ocrConfidence) {
    const issues = [];

    if (isOCR) {
      issues.push({
        type: 'parsing',
        severity: 'low',
        description: `Resume was processed using OCR (scanned document detected). Confidence: ${ocrConfidence || 'unknown'}.`,
        suggestion: 'For best results, upload a text-based PDF or DOCX file rather than a scanned document.'
      });
    }

    if (!candidate.email) {
      issues.push({
        type: 'contact',
        severity: 'high',
        description: 'No email address found.',
        suggestion: 'Add a professional email address at the top of your resume.'
      });
    }

    if (!sections.experience || sections.experience.length < 50) {
      issues.push({
        type: 'content',
        severity: 'high',
        description: 'Work experience section is missing or too short.',
        suggestion: 'Add detailed work experience with achievements and responsibilities.'
      });
    }

    if (skills.total_count < 5) {
      issues.push({
        type: 'skills',
        severity: 'medium',
        description: 'Limited technical skills detected.',
        suggestion: 'Add more relevant skills and technologies you are proficient in.'
      });
    }

    if (formatting.word_count < 200) {
      issues.push({
        type: 'length',
        severity: 'medium',
        description: 'Resume appears too short.',
        suggestion: 'Expand your content with more details about your experience and achievements.'
      });
    }

    return issues;
  }

  _generateSuggestions(text, domain, skills, sections, experience, projects) {
    const suggestions = [];

    suggestions.push({
      category: 'keyword',
      title: 'Add Domain-Specific Keywords',
      description: 'Include more keywords relevant to your target job domain to improve ATS matching.',
      priority: 'high',
      examples: this.DOMAIN_KEYWORDS[domain]?.slice(0, 5) || []
    });

    if (skills.total_count < 10) {
      suggestions.push({
        category: 'skills',
        title: 'Expand Your Skills Section',
        description: 'List more technical skills, tools, and technologies you have experience with.',
        priority: 'high',
        examples: ['Add frameworks', 'List tools and platforms', 'Include soft skills']
      });
    }

    if (!projects || projects.length < 2) {
      suggestions.push({
        category: 'general',
        title: 'Add Project Experience',
        description: 'Include 2-3 relevant projects showcasing your skills and impact.',
        priority: 'medium',
        examples: ['Personal projects', 'Academic projects', 'Open source contributions']
      });
    }

    suggestions.push({
      category: 'formatting',
      title: 'Use Action Verbs',
      description: 'Start bullet points with strong action verbs to demonstrate impact.',
      priority: 'medium',
      examples: ['Developed', 'Implemented', 'Increased', 'Reduced', 'Led']
    });

    suggestions.push({
      category: 'experience',
      title: 'Quantify Achievements',
      description: 'Add numbers and metrics to demonstrate the impact of your work.',
      priority: 'high',
      examples: ['Include percentages', 'Show time savings', 'Highlight user growth', 'Mention cost reductions']
    });

    return suggestions;
  }

  _analyzeKeywords(text, domain) {
    const textLower = text.toLowerCase();
    const domainKeywords = this.DOMAIN_KEYWORDS[domain] || this.DOMAIN_KEYWORDS['General'];
    
    const found = domainKeywords.filter(kw => textLower.includes(kw));
    const missing = domainKeywords.filter(kw => !textLower.includes(kw));
    
    return {
      found: found.slice(0, 10),
      missing: missing.slice(0, 10),
      recommended: missing.slice(0, 5)
    };
  }
}

module.exports = ATSScorer;
