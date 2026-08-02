const aiService = require('../services/aiService');
const AnalysisResult = require('../models/AnalysisResult');
const Resume = require('../models/Resume');

// @desc    Generate improvement suggestions for resume quality
// @route   POST /api/optimization/generate
// @access  Public
exports.generateOptimizations = async (req, res) => {
  try {
    const { analysisId } = req.body;

    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: 'Analysis ID is required'
      });
    }

    // Fetch analysis result
    const analysis = await AnalysisResult.findById(analysisId)
      .populate('resumeId')
      .populate('jobDescriptionId');

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    const resume = analysis.resumeId;
    const jobDescription = analysis.jobDescriptionId;

    // Generate quality improvement suggestions (rule-based analysis)
    const suggestions = generateQualitySuggestions(
      resume.parsedData,
      jobDescription.description,
      analysis
    );

    res.json({
      success: true,
      suggestions: {
        summary_improvements: suggestions.summaryImprovements,
        keyword_recommendations: suggestions.keywordRecommendations,
        formatting_tips: suggestions.formattingTips,
        content_enhancements: suggestions.contentEnhancements,
        skill_development: suggestions.skillDevelopment,
        overall_quality_score: suggestions.qualityScore
      }
    });

  } catch (error) {
    console.error('Suggestion generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate suggestions',
      error: error.message
    });
  }
};

// Helper function to generate quality improvement suggestions
function generateQualitySuggestions(parsedData, jobDescription, analysis) {
  const suggestions = {
    summaryImprovements: [],
    keywordRecommendations: [],
    formattingTips: [],
    contentEnhancements: [],
    skillDevelopment: [],
    qualityScore: 0
  };

  let qualityPoints = 0;
  let maxPoints = 0;
  const resumeText = parsedData.rawText || '';
  const resumeTextLower = resumeText.toLowerCase();

  // ===== SUMMARY ANALYSIS =====
  const summary = parsedData.sections?.summary || parsedData.summary || '';
  maxPoints += 15;
  
  if (!summary || summary.trim().length === 0) {
    suggestions.summaryImprovements.push({
      type: 'critical',
      issue: 'Missing Professional Summary',
      suggestion: 'Add a compelling 3-4 line professional summary at the top of your resume highlighting your key strengths and career goals.',
      impact: 'high'
    });
  } else {
    qualityPoints += 5;
    
    if (summary.length < 100) {
      suggestions.summaryImprovements.push({
        type: 'improvement',
        issue: 'Summary too brief',
        suggestion: 'Expand your summary to 3-4 sentences (150-200 words). Include your years of experience, key skills, and major achievements.',
        impact: 'medium'
      });
    } else {
      qualityPoints += 5;
    }
    
    if (summary.length > 400) {
      suggestions.summaryImprovements.push({
        type: 'improvement',
        issue: 'Summary too lengthy',
        suggestion: 'Condense your summary to 3-4 impactful sentences. Focus on your most relevant achievements and skills.',
        impact: 'medium'
      });
    } else {
      qualityPoints += 5;
    }

    // Check if summary includes key elements
    if (!summary.match(/\d+\+?\s*(year|yr)/i)) {
      suggestions.summaryImprovements.push({
        type: 'improvement',
        issue: 'Missing experience timeline',
        suggestion: 'Include your years of experience in the summary (e.g., "5+ years of experience in...").',
        impact: 'medium'
      });
    }
  }

  // ===== KEYWORDS AND SKILLS ANALYSIS =====
  maxPoints += 20;
  const missingSkills = analysis.missing || [];
  const matchedSkills = analysis.matched || [];
  const partialSkills = analysis.partial || [];
  
  if (missingSkills.length > 0) {
    // Critical missing skills
    const criticalMissing = missingSkills.slice(0, 5);
    suggestions.keywordRecommendations.push({
      type: 'critical',
      issue: `Missing ${missingSkills.length} key skills from job description`,
      suggestion: `Add these critical skills if you have them: ${criticalMissing.join(', ')}. Place them in your Skills section and mention in relevant experience bullets.`,
      keywords: criticalMissing,
      impact: 'high'
    });

    // Additional missing skills
    if (missingSkills.length > 5) {
      const additionalMissing = missingSkills.slice(5, 10);
      suggestions.keywordRecommendations.push({
        type: 'improvement',
        issue: 'Additional skills to consider',
        suggestion: `Also consider adding: ${additionalMissing.join(', ')}. These appear in the job description and could strengthen your application.`,
        keywords: additionalMissing,
        impact: 'medium'
      });
    }
    
    qualityPoints += Math.max(0, 10 - missingSkills.length);
  } else {
    qualityPoints += 10;
  }

  if (matchedSkills.length > 0) {
    suggestions.keywordRecommendations.push({
      type: 'positive',
      issue: null,
      suggestion: `Excellent! You have ${matchedSkills.length} matching skills. Make sure they appear in your Skills section AND are demonstrated in your experience bullets with specific examples.`,
      keywords: matchedSkills.slice(0, 8),
      impact: 'positive'
    });
    qualityPoints += 10;
  }

  // Keyword density check
  const jobKeywords = jobDescription.toLowerCase().split(/\s+/).filter(word => word.length > 4);
  const uniqueJobKeywords = [...new Set(jobKeywords)].slice(0, 20);
  const matchedKeywordCount = uniqueJobKeywords.filter(kw => resumeTextLower.includes(kw)).length;
  
  if (matchedKeywordCount < uniqueJobKeywords.length * 0.3) {
    suggestions.keywordRecommendations.push({
      type: 'improvement',
      issue: 'Low keyword density',
      suggestion: 'Your resume has low keyword overlap with the job description. Naturally incorporate more job-specific terms throughout your resume.',
      impact: 'high'
    });
  }

  // ===== EXPERIENCE SECTION ANALYSIS =====
  const experience = parsedData.sections?.experience || parsedData.experience || [];
  maxPoints += 25;
  
  if (!experience || experience.length === 0) {
    suggestions.contentEnhancements.push({
      type: 'critical',
      issue: 'No work experience listed',
      suggestion: 'Add your work experience with company names, job titles, dates, and bullet points describing your achievements using the STAR method.',
      impact: 'high'
    });
  } else {
    qualityPoints += 5;
    
    // Check for quantifiable achievements
    const numberPattern = /\d+%|\d+\+|\$\d+|\d+[kK]|(\d+)\s*(years?|months?|times?|people|users|clients|projects)/gi;
    const numbersFound = resumeText.match(numberPattern);
    
    if (!numbersFound || numbersFound.length < 3) {
      suggestions.contentEnhancements.push({
        type: 'improvement',
        issue: 'Insufficient quantifiable achievements',
        suggestion: 'Add specific numbers and metrics throughout your experience section. Examples: "Increased efficiency by 40%", "Managed $2M budget", "Led team of 12 developers", "Reduced processing time by 3 hours".',
        impact: 'high'
      });
    } else {
      qualityPoints += 8;
      suggestions.contentEnhancements.push({
        type: 'positive',
        issue: null,
        suggestion: `Good! You have ${numbersFound.length} quantifiable metrics. Consider adding more to every bullet point possible to maximize impact.`,
        impact: 'positive'
      });
    }
    
    // Check for strong action verbs
    const strongVerbs = ['achieved', 'led', 'managed', 'developed', 'implemented', 'created', 'designed', 
      'improved', 'increased', 'reduced', 'optimized', 'streamlined', 'launched', 'delivered', 'drove',
      'established', 'spearheaded', 'orchestrated', 'pioneered', 'transformed'];
    const weakPhrases = ['responsible for', 'worked on', 'helped with', 'assisted', 'duties included'];
    
    const hasStrongVerbs = strongVerbs.some(verb => resumeTextLower.includes(verb));
    const hasWeakPhrases = weakPhrases.some(phrase => resumeTextLower.includes(phrase));
    
    if (hasWeakPhrases) {
      suggestions.contentEnhancements.push({
        type: 'improvement',
        issue: 'Weak action verbs and passive language',
        suggestion: 'Replace weak phrases like "responsible for" or "helped with" with strong action verbs. Start each bullet with: Achieved, Led, Developed, Implemented, Optimized, Streamlined.',
        impact: 'high'
      });
    } else if (!hasStrongVerbs) {
      suggestions.contentEnhancements.push({
        type: 'improvement',
        issue: 'Missing powerful action verbs',
        suggestion: 'Use more impactful action verbs at the start of each bullet point: Spearheaded, Orchestrated, Transformed, Pioneered, Accelerated, Drove.',
        impact: 'medium'
      });
    } else {
      qualityPoints += 6;
    }

    // Check for result-oriented language
    const resultWords = ['resulting in', 'which led to', 'achieving', 'thereby', 'consequently', 'leading to'];
    const hasResults = resultWords.some(word => resumeTextLower.includes(word));
    
    if (!hasResults) {
      suggestions.contentEnhancements.push({
        type: 'improvement',
        issue: 'Lack of result-oriented statements',
        suggestion: 'Connect your actions to outcomes. Use phrases like: "resulting in 25% cost reduction", "leading to $50K revenue increase", "achieving 99% customer satisfaction".',
        impact: 'high'
      });
    } else {
      qualityPoints += 6;
    }
  }

  // ===== FORMATTING AND STRUCTURE =====
  maxPoints += 20;
  const resumeLength = resumeText.length;
  
  if (resumeLength < 800) {
    suggestions.formattingTips.push({
      type: 'critical',
      issue: 'Resume too short',
      suggestion: 'Your resume appears very brief. Expand to 1-2 pages by adding more details about your responsibilities, achievements, skills, and relevant projects.',
      impact: 'high'
    });
  } else if (resumeLength < 1500) {
    suggestions.formattingTips.push({
      type: 'improvement',
      issue: 'Resume could use more detail',
      suggestion: 'Consider expanding your resume to include more specific achievements, technical skills, and project details. Aim for 1-2 full pages.',
      impact: 'medium'
    });
    qualityPoints += 5;
  } else if (resumeLength > 6000) {
    suggestions.formattingTips.push({
      type: 'improvement',
      issue: 'Resume too lengthy',
      suggestion: 'Your resume exceeds 2 pages. Trim it down by removing older/irrelevant experience, condensing bullet points, and focusing on recent achievements.',
      impact: 'medium'
    });
    qualityPoints += 5;
  } else {
    qualityPoints += 10;
  }

  // Contact information checks
  const hasEmail = parsedData.email || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText);
  const hasPhone = parsedData.phone || /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(resumeText);
  const hasLinkedIn = /linkedin\.com|linkedin/i.test(resumeText);
  const hasLocation = parsedData.location || /(city|state|country|remote)/i.test(resumeText);
  
  if (!hasEmail) {
    suggestions.formattingTips.push({
      type: 'critical',
      issue: 'Missing email address',
      suggestion: 'Add a professional email address to your contact section. Use format: firstname.lastname@email.com',
      impact: 'high'
    });
  } else {
    qualityPoints += 3;
  }

  if (!hasPhone) {
    suggestions.formattingTips.push({
      type: 'critical',
      issue: 'Missing phone number',
      suggestion: 'Include your phone number in the contact section with country code if applying internationally.',
      impact: 'high'
    });
  } else {
    qualityPoints += 3;
  }

  if (!hasLinkedIn) {
    suggestions.formattingTips.push({
      type: 'improvement',
      issue: 'No LinkedIn profile',
      suggestion: 'Add your LinkedIn profile URL. Ensure your LinkedIn is updated and matches your resume.',
      impact: 'medium'
    });
  } else {
    qualityPoints += 2;
  }

  if (!hasLocation) {
    suggestions.formattingTips.push({
      type: 'improvement',
      issue: 'Missing location information',
      suggestion: 'Include your location (City, State) or indicate "Remote" if seeking remote positions.',
      impact: 'low'
    });
  } else {
    qualityPoints += 2;
  }

  // Section structure checks
  const hasSummary = !!summary;
  const hasExperience = experience && experience.length > 0;
  const hasEducation = (parsedData.sections?.education || parsedData.education || []).length > 0;
  const hasSkills = /skills?:|technical skills?:|core competencies:/i.test(resumeText);

  if (!hasSkills) {
    suggestions.formattingTips.push({
      type: 'improvement',
      issue: 'Missing Skills section',
      suggestion: 'Add a dedicated "Skills" or "Technical Skills" section. List both hard skills (software, tools) and relevant soft skills.',
      impact: 'high'
    });
  }

  // ===== EDUCATION ANALYSIS =====
  maxPoints += 10;
  if (!hasEducation) {
    suggestions.formattingTips.push({
      type: 'improvement',
      issue: 'Education section missing or incomplete',
      suggestion: 'Add an Education section with: degree name, institution, graduation year, relevant coursework/honors (if recent graduate).',
      impact: 'medium'
    });
  } else {
    qualityPoints += 10;
  }

  // ===== ATS COMPATIBILITY CHECKS =====
  // Check for images/graphics mention
  if (/\[image\]|\[graphic\]|\[photo\]/i.test(resumeText)) {
    suggestions.formattingTips.push({
      type: 'improvement',
      issue: 'Images or graphics detected',
      suggestion: 'Remove images, photos, and graphics. ATS systems cannot parse these and they may cause processing errors.',
      impact: 'high'
    });
  }

  // Check for tables
  if (/\|.*\|/.test(resumeText) || /\t.*\t/.test(resumeText)) {
    suggestions.formattingTips.push({
      type: 'improvement',
      issue: 'Potential table formatting detected',
      suggestion: 'Avoid using tables for content layout. Use simple bullet points and standard formatting for better ATS compatibility.',
      impact: 'medium'
    });
  }

  // ===== SKILL DEVELOPMENT =====
  maxPoints += 15;
  if (missingSkills.length > 3) {
    const topMissing = missingSkills.slice(0, 8);
    suggestions.skillDevelopment.push({
      type: 'recommendation',
      issue: 'Skill gap analysis',
      suggestion: 'The job requires skills you haven\'t listed. Consider developing these in-demand capabilities:',
      skills: topMissing,
      resources: [
        '📚 Free courses: Coursera, edX, Udemy, LinkedIn Learning',
        '🛠️ Practice projects: GitHub, personal portfolio',
        '🎓 Industry certifications: AWS, Google, Microsoft, Cisco',
        '👥 Networking: Professional meetups, online communities'
      ],
      impact: 'medium'
    });
    qualityPoints += 5;
  } else {
    qualityPoints += 15;
    if (missingSkills.length > 0) {
      suggestions.skillDevelopment.push({
        type: 'recommendation',
        issue: 'Minor skill enhancement',
        suggestion: 'You\'re close to a perfect match! Consider these final skills:',
        skills: missingSkills,
        resources: [
          '⚡ Quick online tutorials',
          '📖 Documentation and official guides',
          '🎯 Weekend workshop or bootcamp'
        ],
        impact: 'low'
      });
    }
  }

  // Additional enhancement suggestions
  suggestions.contentEnhancements.push({
    type: 'improvement',
    issue: 'Enhance with relevant keywords',
    suggestion: 'Mirror the language used in the job description. If they say "customer success", use that exact phrase instead of "client satisfaction".',
    impact: 'high'
  });

  suggestions.contentEnhancements.push({
    type: 'improvement',
    issue: 'Include relevant projects or achievements',
    suggestion: 'Add a "Projects" or "Key Achievements" section if you have notable accomplishments outside of regular work duties.',
    impact: 'medium'
  });

  suggestions.formattingTips.push({
    type: 'improvement',
    issue: 'File format recommendation',
    suggestion: 'Save and submit your resume as a .docx or .pdf file. Avoid .pages, .rtf, or image formats for better ATS compatibility.',
    impact: 'medium'
  });

  suggestions.formattingTips.push({
    type: 'improvement',
    issue: 'Keep formatting simple',
    suggestion: 'Use standard fonts (Arial, Calibri, Times New Roman), clear section headings, and consistent formatting. Avoid fancy designs, columns, or text boxes.',
    impact: 'medium'
  });

  // Calculate quality score
  suggestions.qualityScore = Math.round((qualityPoints / maxPoints) * 100);

  return suggestions;
}

// @desc    Provide suggestions to improve bullet points
// @route   POST /api/optimization/enhance-bullets
// @access  Public
exports.enhanceBullets = async (req, res) => {
  try {
    const { bullets, jobDescription } = req.body;

    if (!bullets || !Array.isArray(bullets)) {
      return res.status(400).json({
        success: false,
        message: 'Bullets array is required'
      });
    }

    // Generate improvement suggestions for each bullet point
    const bulletSuggestions = bullets.map((bullet, index) => {
      const suggestions = [];
      const bullet_lower = bullet.toLowerCase();
      
      // Check for action verb
      const strongActionVerbs = [
        'achieved', 'improved', 'increased', 'decreased', 'reduced',
        'developed', 'implemented', 'led', 'managed', 'created',
        'designed', 'optimized', 'launched', 'delivered', 'drove',
        'established', 'generated', 'accelerated', 'streamlined', 'spearheaded'
      ];
      
      const weakVerbs = ['responsible for', 'worked on', 'helped', 'assisted', 'did', 'made'];
      const startsWithActionVerb = strongActionVerbs.some(verb => bullet_lower.startsWith(verb));
      const hasWeakVerb = weakVerbs.some(verb => bullet_lower.includes(verb));
      
      if (hasWeakVerb) {
        suggestions.push({
          type: 'action_verb',
          message: 'Replace weak phrases with strong action verbs',
          example: 'Instead of "Responsible for managing", use "Managed" or "Led"',
          priority: 'high'
        });
      } else if (!startsWithActionVerb) {
        suggestions.push({
          type: 'action_verb',
          message: 'Start with a strong action verb',
          examples: ['Achieved', 'Developed', 'Implemented', 'Increased', 'Led'],
          priority: 'medium'
        });
      }
      
      // Check for quantifiable results
      const hasNumbers = /\d+%|\d+\+|\$\d+|\d+ (years|months|times|people|users|clients)/.test(bullet);
      if (!hasNumbers) {
        suggestions.push({
          type: 'quantification',
          message: 'Add specific numbers or metrics to show impact',
          examples: [
            'Add percentages: "Increased sales by 35%"',
            'Add quantities: "Managed team of 8 developers"',
            'Add timeframes: "Delivered project 2 weeks ahead of schedule"'
          ],
          priority: 'high'
        });
      }
      
      // Check length
      if (bullet.length < 30) {
        suggestions.push({
          type: 'length',
          message: 'Bullet point is too short - add more details about your achievement',
          priority: 'medium'
        });
      } else if (bullet.length > 150) {
        suggestions.push({
          type: 'length',
          message: 'Bullet point is too long - make it more concise and focused',
          priority: 'low'
        });
      }
      
      // Check for impact/result
      const hasResult = /increased|improved|reduced|decreased|generated|saved|accelerated|enhanced/.test(bullet_lower);
      if (!hasResult) {
        suggestions.push({
          type: 'impact',
          message: 'Show the result or impact of your work',
          example: 'Add outcome: "resulting in...", "which led to...", "improving..."',
          priority: 'high'
        });
      }
      
      // Provide overall quality assessment
      let quality = 'good';
      const highPriority = suggestions.filter(s => s.priority === 'high').length;
      if (highPriority >= 2) {
        quality = 'needs improvement';
      } else if (highPriority === 1) {
        quality = 'fair';
      } else if (suggestions.length === 0) {
        quality = 'excellent';
      }
      
      return {
        original: bullet,
        quality,
        suggestions: suggestions.length > 0 ? suggestions : [{
          type: 'positive',
          message: 'This bullet point is well-written!',
          priority: 'none'
        }]
      };
    });

    res.json({
      success: true,
      bullet_suggestions: bulletSuggestions,
      overall_tips: [
        'Use the STAR method: Situation, Task, Action, Result',
        'Keep bullets between 1-2 lines each',
        'Focus on achievements, not just responsibilities',
        'Use industry-specific keywords relevant to the role',
        'Quantify results whenever possible'
      ]
    });

  } catch (error) {
    console.error('Bullet suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate bullet suggestions',
      error: error.message
    });
  }
};

// @desc    Generate cover letter
// @route   POST /api/optimization/cover-letter
// @access  Public
exports.generateCoverLetter = async (req, res) => {
  try {
    const { analysisId, company, jobTitle } = req.body;

    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: 'Analysis ID is required'
      });
    }

    // Fetch analysis
    const analysis = await AnalysisResult.findById(analysisId)
      .populate('resumeId')
      .populate('jobDescriptionId');

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    const resume = analysis.resumeId;
    const jobDescription = analysis.jobDescriptionId;

    // Check AI service
    const isAIAvailable = await aiService.healthCheck();
    if (!isAIAvailable) {
      return res.status(503).json({
        success: false,
        message: 'AI service unavailable'
      });
    }

    const result = await aiService.generateCoverLetter(
      resume.parsedData.rawText,
      jobDescription.description,
      company || jobDescription.company || 'the company',
      jobTitle || jobDescription.jobTitle || 'the position'
    );

    res.json({
      success: true,
      cover_letter: result.cover_letter
    });

  } catch (error) {
    console.error('Cover letter generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate cover letter',
      error: error.message
    });
  }
};

module.exports = exports;
