const Resume = require('../models/Resume');
const JobDescription = require('../models/JobDescription');
const AnalysisResult = require('../models/AnalysisResult');
const ResumeParser = require('../services/resumeParser');
const SkillExtractor = require('../services/skillExtractor');
const DomainClassifier = require('../services/domainClassifier');
const ATSScorer = require('../services/atsScorer');
const { getSemanticAnalyzer } = require('../services/semanticAnalyzer');
const LinkExtractorService = require('../services/linkExtractorService');
const aiService = require('../services/aiService');
const path = require('path');
const fs = require('fs');

// Initialize services
const resumeParser = new ResumeParser();
const skillExtractor = new SkillExtractor();
const domainClassifier = new DomainClassifier();
const atsScorer = new ATSScorer();
const linkExtractor = new LinkExtractorService();

// @desc    Analyze resume with optional job description
// @route   POST /api/resume/analyze
// @access  Public (or Private if authentication required)
exports.analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        detail: 'No file uploaded' 
      });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    // Parse resume
    const parsedData = await resumeParser.parse(filePath, fileExt);

    // Extract skills
    const skillsData = skillExtractor.extract(parsedData.raw_text);

    // Classify domain
    const domainData = domainClassifier.classify(parsedData.raw_text, skillsData);

    // Step 2: MANDATORY Link Extraction (ATS Agent Pipeline Step)
    // ══════════════════════════════════════════════════════════════════════
    // FLOW: Resume PDF → Python Link Extractor → GitHub/LeetCode URLs
    //       → Pass to Profile Analysis Agents → Resume-Aligned Scores
    // ══════════════════════════════════════════════════════════════════════
    // Extract links from resume - REQUIRED for complete ATS analysis
    let extractedLinks = {
      github: [],
      linkedin: [],
      leetcode: [],
      portfolio: [],
      email: [],
      other: [],
      total: 0,
      links_with_text: {}
    };

    // Store profile analysis results
    let profileAnalysis = {
      github: null,
      competitiveProgramming: null
    };

    if (fileExt === '.pdf') {
      try {
        const linkData = await linkExtractor.extractLinks(filePath, req.file.originalname);
        
        if (linkData.success) {
          extractedLinks = {
            ...linkData.links,
            total: linkData.total,
            links_with_text: linkData.links_with_text || {}
          };
          console.log('✅ Link extraction completed - Found', linkData.total, 'links');
          
          // Log extracted links for debugging
          if (extractedLinks.github.length > 0) {
            console.log('   📎 GitHub:', extractedLinks.github.join(', '));
          }
          if (extractedLinks.leetcode.length > 0) {
            console.log('   📎 LeetCode:', extractedLinks.leetcode.join(', '));
          }
          if (extractedLinks.linkedin.length > 0) {
            console.log('   📎 LinkedIn:', extractedLinks.linkedin.join(', '));
          }

          // Step 3: Analyze Competitive Programming Profile (if LeetCode link found)
          if (extractedLinks.leetcode && extractedLinks.leetcode.length > 0) {
            try {
              const leetcodeUrl = extractedLinks.leetcode[0]; // Use first LeetCode link from resume
              
              console.log('\n' + '═'.repeat(70));
              console.log('🏆 COMPETITIVE PROGRAMMING ANALYSIS - BACKEND');
              console.log('═'.repeat(70));
              console.log('📌 LeetCode URL from Resume:', leetcodeUrl);
              console.log('📌 Resume Filename:', req.file.originalname);
              console.log('📌 Extracted from:', 'extracted_links.leetcode[0]');
              console.log('📌 Full extracted_links.leetcode array:', JSON.stringify(extractedLinks.leetcode));
              console.log('📌 This URL was extracted from the uploaded PDF by link-extractor.py');
              console.log('📌 NO hard-coded URLs exist in the codebase');
              console.log('═'.repeat(70));
              
              // VERIFICATION: Show what we're actually sending
              console.log('\n🔍 SENDING TO PYTHON AI SERVICE:');
              console.log('   URL:', leetcodeUrl);
              console.log('   Type:', typeof leetcodeUrl);
              console.log('   Length:', leetcodeUrl.length);
              console.log('   Calling:', 'aiService.analyzeCompetitiveProfile()');
              console.log('');
              
              const cpResult = await aiService.analyzeCompetitiveProfile(
                leetcodeUrl, 
                true,
                parsedData.raw_text  // Pass resume text for personalized analysis
              );
              
              if (cpResult.success && cpResult.report) {
                profileAnalysis.competitiveProgramming = cpResult.report;
                const analyzedUsername = cpResult.report.platform_data?.leetcode?.username || 'Unknown';
                console.log(`✅ CP Analysis complete`);
                console.log(`   Score: ${cpResult.report.overall_score}/100 (Grade: ${cpResult.report.grade})`);
                console.log(`   Username analyzed: ${analyzedUsername}`);
                console.log(`   ⚠️  If this username is WRONG, the PDF link extraction failed!`);
                console.log(`   ⚠️  The agent correctly analyzed the URL we sent.`);
              }
            } catch (cpError) {
              console.warn('⚠️ CP profile analysis failed:', cpError.message);
              profileAnalysis.competitiveProgramming = { error: cpError.message };
            }
          } else {
            console.log('\n⚠️  No LeetCode links found in extracted_links.leetcode');
            console.log('   extracted_links:', JSON.stringify(extractedLinks, null, 2));
          }

          // Step 4: Analyze GitHub Profile (if GitHub link found)
          if (extractedLinks.github && extractedLinks.github.length > 0) {
            try {
              // Extract username from GitHub URL in resume
              const githubUrl = extractedLinks.github[0];
              const githubUsername = githubUrl.split('/').filter(Boolean).pop();
              
              if (githubUsername) {
                console.log('🔍 Analyzing GitHub profile from resume:', githubUrl, `(@${githubUsername})`);
                // Prepare resume skills for GitHub analysis
                const resumeSkills = [
                  ...(skillsData.technical_skills || []),
                  ...(skillsData.frameworks || []),
                  ...(skillsData.tools || [])
                ];
                
                // Convert skills to keywords (lowercase)
                const keywords = resumeSkills.map(s => String(s).toLowerCase().trim()).filter(k => k.length > 0);
                
                const githubResult = await aiService.analyzeGitHub(
                  githubUsername, 
                  '', 
                  keywords,  // Pass keywords from resume
                  parsedData.raw_text,  // Pass resume text
                  resumeSkills  // Pass resume skills
                );
                
                if (githubResult.success && githubResult.report) {
                  profileAnalysis.github = githubResult.report;
                  console.log(`✅ GitHub Analysis complete - Score: ${githubResult.report.overall_score}/100`);
                }
              }
            } catch (githubError) {
              console.warn('⚠️ GitHub profile analysis failed:', githubError.message);
              profileAnalysis.github = { error: githubError.message };
            }
          }
        } else {
          console.warn('⚠️ Link extraction failed:', linkData.error);
        }
      } catch (linkError) {
        console.error('❌ Link extraction error:', linkError.message);
      }
    }

    // Job description is required
    if (!req.body.jobDescription || !req.body.jobDescription.trim()) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        detail: 'Job description is required for analysis'
      });
    }

    // Process job description
    let semanticAnalysis = null;
    let jobDescriptionId = null;

    if (req.body.jobDescription) {
      const semanticAnalyzer = await getSemanticAnalyzer();
      
      // Parse job description
      const jobDescData = semanticAnalyzer.parseJobDescription(req.body.jobDescription);
      
      // Save job description to database (optional)
      const jobDesc = await JobDescription.create({
        userId: req.user ? req.user.id : null,
        jobTitle: req.body.jobTitle || 'Untitled Position',
        company: req.body.company || '',
        description: req.body.jobDescription,
        parsedData: jobDescData,
      });
      jobDescriptionId = jobDesc._id;

      // Calculate semantic scores with parsed data
      const scores = await semanticAnalyzer.calculateAtsScore(
        parsedData.raw_text,
        req.body.jobDescription,
        parsedData
      );

      // Analyze skill matching
      const skillMatching = await semanticAnalyzer.analyzeSkillMatching(
        skillsData.technical_skills,
        jobDescData.requiredSkills
      );

      semanticAnalysis = {
        scores,
        skillMatching,
        jobRequirements: jobDescData,
      };
      
      console.log('✅ Semantic analysis completed');
    }

    // Calculate ATS score (original method)
    const atsAnalysis = atsScorer.calculateScore(
      parsedData,
      skillsData,
      domainData,
      parsedData.parsing_method,
      parsedData.ocr_confidence
    );

    // If semantic analysis available, merge scores with confidence factor
    let resumeScore = atsAnalysis.score;
    let scoreBreakdown = atsAnalysis.breakdown;
    let semanticConfidence = 'none';

    if (semanticAnalysis) {
      // Calculate confidence based on JD length
      const jdLength = semanticAnalysis.scores.breakdown?.jdLength || 0;
      const confidence = Math.min(1, jdLength / 200);
      
      // Determine confidence level for UI
      if (jdLength < 80) semanticConfidence = 'low';
      else if (jdLength < 200) semanticConfidence = 'medium';
      else semanticConfidence = 'high';
      
      // Weighted combination with confidence factor
      // When JD is short, base score matters more
      resumeScore = Math.round(
        (atsAnalysis.score * (1 - 0.5 * confidence)) + 
        (semanticAnalysis.scores.finalAtsScore * (0.5 * confidence))
      );

      scoreBreakdown = {
        ...atsAnalysis.breakdown,
        semantic_similarity: semanticAnalysis.scores.semanticScore,
        keyword_matching: semanticAnalysis.scores.keywordScore,
        must_haves_matched: semanticAnalysis.scores.breakdown?.mustHaveMatched,
        must_haves_total: semanticAnalysis.scores.breakdown?.mustHaveTotal,
        nice_to_haves_matched: semanticAnalysis.scores.breakdown?.niceToHaveMatched,
        nice_to_haves_total: semanticAnalysis.scores.breakdown?.niceToHaveTotal,
        jd_length: jdLength,
        semantic_confidence: semanticConfidence,
      };
    }

    // ⚡ NEW ATS SCORING FORMULA: Resume (70%) + Proof Score (30%)
    // Extract GitHub and CP scores from profile analysis
    let githubScore = profileAnalysis.github?.overall_score;
    let cpScore = profileAnalysis.competitiveProgramming?.overall_score;
    
    // Step 1: Normalize missing scores to 0
    if (githubScore == null || githubScore === undefined) githubScore = 0;
    if (cpScore == null || cpScore === undefined) cpScore = 0;
    
    // Step 2: Calculate proof score (average of GitHub and CP)
    const proofScore = (githubScore + cpScore) / 2;
    
    // Step 3: Calculate final ATS score (70% resume + 30% proof)
    let finalScore = (0.70 * resumeScore) + (0.30 * proofScore);
    
    // Step 4: Round and clamp between 0-100
    finalScore = Math.round(finalScore);
    finalScore = Math.max(0, Math.min(100, finalScore));
    
    // Add scoring metadata to breakdown
    scoreBreakdown.scoring_formula = {
      resume_score: resumeScore,
      github_score: githubScore,
      cp_score: cpScore,
      proof_score: Math.round(proofScore),
      final_score: finalScore,
      weights: {
        resume: 0.70,
        proof: 0.30
      },
      missing_profiles: {
        github: githubScore === 0,
        competitive_programming: cpScore === 0
      }
    };
    
    console.log('📊 Final ATS Scoring:');
    console.log(`  Resume Score: ${resumeScore}`);
    console.log(`  GitHub Score: ${githubScore}`);
    console.log(`  CP Score: ${cpScore}`);
    console.log(`  Proof Score: ${Math.round(proofScore)}`);
    console.log(`  Final ATS: ${finalScore}`);

    // Save resume to database
    const resume = await Resume.create({
      userId: req.user ? req.user.id : null,
      filename: req.file.originalname,
      parsedData: {
        contactInfo: parsedData.candidate,
        summary: parsedData.sections.summary || '',
        skills: skillsData.technical_skills,
        experience: parsedData.experience,
        education: parsedData.education,
        certifications: [],
        projects: parsedData.projects,
        rawText: parsedData.raw_text,
      },
    });

    // Save analysis result
    const analysisResult = await AnalysisResult.create({
      userId: req.user ? req.user.id : null,
      resumeId: resume._id,
      jobDescriptionId: jobDescriptionId,
      scores: {
        semanticScore: semanticAnalysis ? semanticAnalysis.scores.semanticScore : null,
        keywordScore: semanticAnalysis ? semanticAnalysis.scores.keywordScore : null,
        finalAtsScore: finalScore,
        breakdown: scoreBreakdown,
      },
      matched: {
        skills: semanticAnalysis ? semanticAnalysis.skillMatching.matched : [],
        experience: [],
        education: [],
      },
      partial: semanticAnalysis ? semanticAnalysis.skillMatching.partial : [],
      missing: semanticAnalysis ? semanticAnalysis.skillMatching.missing : [],
      suggestions: atsAnalysis.suggestions,
      extractedLinks: extractedLinks,
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Build response
    const response = {
      success: true,
      resumeId: resume._id,
      analysisId: analysisResult._id,
      candidate: parsedData.candidate,
      ats_score: finalScore,
      score_breakdown: scoreBreakdown,
      score_category: atsAnalysis.category,
      domain: domainData,
      skills: skillsData,
      projects: parsedData.projects,
      experience: parsedData.experience,
      education: parsedData.education,
      issues: atsAnalysis.issues,
      suggestions: atsAnalysis.suggestions,
      keywords_analysis: atsAnalysis.keywords_analysis,
      parsing_method: parsedData.parsing_method,
      ocr_confidence: parsedData.ocr_confidence,
    };

    // Add semantic analysis if available
    if (semanticAnalysis) {
      response.semantic_analysis = {
        semantic_score: semanticAnalysis.scores.semanticScore,
        keyword_score: semanticAnalysis.scores.keywordScore,
        matched_skills: semanticAnalysis.skillMatching.matched,
        partial_skills: semanticAnalysis.skillMatching.partial,
        missing_skills: semanticAnalysis.skillMatching.missing,
        job_requirements: semanticAnalysis.jobRequirements,
        // Enhanced transparency data
        jd_length: semanticAnalysis.scores.breakdown?.jdLength,
        jd_length_category: semanticAnalysis.scores.breakdown?.jdLength < 80 ? 'short' : 
                           semanticAnalysis.scores.breakdown?.jdLength < 200 ? 'medium' : 'long',
        semantic_confidence: semanticConfidence,
        must_haves: {
          matched: semanticAnalysis.scores.breakdown?.mustHaveMatched || 0,
          total: semanticAnalysis.scores.breakdown?.mustHaveTotal || 0
        },
        nice_to_haves: {
          matched: semanticAnalysis.scores.breakdown?.niceToHaveMatched || 0,
          total: semanticAnalysis.scores.breakdown?.niceToHaveTotal || 0
        },
        skill_coverage_score: semanticAnalysis.scores.breakdown?.skillCoverage,
        text_similarity_score: semanticAnalysis.scores.breakdown?.textSimilarity,
        weights: {
          skill_weight: semanticAnalysis.scores.breakdown?.skillWeight,
          text_weight: semanticAnalysis.scores.breakdown?.textWeight
        }
      };
    }

    // Add extracted links to response
    response.extracted_links = extractedLinks;

    // Add profile analysis results (GitHub and Competitive Programming)
    if (profileAnalysis.github || profileAnalysis.competitiveProgramming) {
      response.profile_analysis = {
        github: profileAnalysis.github,
        competitive_programming: profileAnalysis.competitiveProgramming
      };
      
      console.log('📊 Profile Analysis Summary:');
      if (profileAnalysis.github && !profileAnalysis.github.error) {
        console.log(`  • GitHub: ${profileAnalysis.github.overall_score}/100 (${profileAnalysis.github.grade})`);
      }
      if (profileAnalysis.competitiveProgramming && !profileAnalysis.competitiveProgramming.error) {
        console.log(`  • CP: ${profileAnalysis.competitiveProgramming.overall_score}/100 (${profileAnalysis.competitiveProgramming.grade})`);
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Analysis error:', error);
    
    // Clean up file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      detail: 'Failed to analyze resume',
      error: error.message,
    });
  }
};

// @desc    Get user's resume history
// @route   GET /api/resume/history
// @access  Private
exports.getResumeHistory = async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: resumes.length,
      resumes,
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resume history',
      error: error.message,
    });
  }
};

// @desc    Get specific analysis result
// @route   GET /api/resume/analysis/:id
// @access  Private
exports.getAnalysis = async (req, res) => {
  try {
    const analysis = await AnalysisResult.findById(req.params.id)
      .populate('resumeId')
      .populate('jobDescriptionId');

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found',
      });
    }

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analysis',
      error: error.message,
    });
  }
};
