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
        } else {
          console.warn('⚠️ Link extraction failed:', linkData.error);
        }
      } catch (linkError) {
        console.error('❌ Link extraction error:', linkError.message);
      }
    }

    // Steps 3-5: Run ALL AI Operations in PARALLEL (Profile Analysis + Project Extraction)
    // This significantly reduces processing time by running independent operations simultaneously
    console.log('\n🚀 Starting all AI operations in parallel...');
    
    let extractedProjects = [];
    const allAiPromises = [];
    
    // Profile Analysis Promises (GitHub + LeetCode)
    const hasLeetCode = extractedLinks.leetcode && extractedLinks.leetcode.length > 0;
    const hasGitHub = extractedLinks.github && extractedLinks.github.length > 0;
    
    // LeetCode analysis promise
    if (hasLeetCode) {
      const leetcodeUrl = extractedLinks.leetcode[0];
      console.log('📌 LeetCode URL:', leetcodeUrl);
      
      const leetcodePromise = aiService.analyzeCompetitiveProfile(
        leetcodeUrl, 
        true,
        parsedData.raw_text
      ).then(cpResult => {
        if (cpResult.success && cpResult.report) {
          profileAnalysis.competitiveProgramming = cpResult.report;
          console.log(`✅ CP Analysis complete - Score: ${cpResult.report.overall_score}/100 (${cpResult.report.grade})`);
        }
      }).catch(cpError => {
        console.warn('⚠️ CP profile analysis failed:', cpError.message);
        profileAnalysis.competitiveProgramming = { error: cpError.message };
      });
      
      allAiPromises.push(leetcodePromise);
    }
    
    // GitHub analysis promise
    if (hasGitHub) {
      const githubUrl = extractedLinks.github[0];
      const githubUsername = githubUrl.split('/').filter(Boolean).pop();
      
      if (githubUsername) {
        console.log('📌 GitHub Username:', githubUsername);
        
        const resumeSkills = [
          ...(skillsData.technical_skills || []),
          ...(skillsData.frameworks || []),
          ...(skillsData.tools || [])
        ];
        
        const keywords = resumeSkills.map(s => String(s).toLowerCase().trim()).filter(k => k.length > 0);
        
        const githubPromise = aiService.analyzeGitHub(
          githubUsername, 
          '', 
          keywords,
          parsedData.raw_text,
          resumeSkills
        ).then(githubResult => {
          if (githubResult.success && githubResult.report) {
            profileAnalysis.github = githubResult.report;
            console.log(`✅ GitHub Analysis complete - Score: ${githubResult.report.overall_score}/100 (${githubResult.report.grade})`);
          }
        }).catch(githubError => {
          console.warn('⚠️ GitHub profile analysis failed:', githubError.message);
          profileAnalysis.github = { error: githubError.message };
        });
        
        allAiPromises.push(githubPromise);
      }
    }
    
    // Project extraction promise (Gemini AI) - runs in parallel with profiles
    const projectExtractionPromise = aiService.extractProjects(parsedData.raw_text)
      .then(projectResult => {
        if (projectResult.success && projectResult.projects) {
          extractedProjects = projectResult.projects;
          console.log(`✅ Project extraction complete - Found ${extractedProjects.length} projects`);
        }
      })
      .catch(projectError => {
        console.warn('⚠️ Project extraction failed:', projectError.message);
      });
    
    allAiPromises.push(projectExtractionPromise);
    
    // Wait for ALL AI operations to complete in parallel
    if (allAiPromises.length > 0) {
      await Promise.all(allAiPromises);
      console.log('✅ All parallel AI operations completed\n');
    }

    // Step 6: Verify Projects against GitHub (if GitHub link found and projects extracted)
    let projectVerification = null;
    if (extractedProjects.length > 0 && extractedLinks.github && extractedLinks.github.length > 0) {
      try {
        // Extract GitHub username from first GitHub link
        const githubUrl = extractedLinks.github[0];
        const githubUsername = githubUrl.split('/').filter(Boolean).pop();
        
        if (githubUsername) {
          console.log(`\n🔍 Verifying ${extractedProjects.length} projects against GitHub (@${githubUsername})...`);
          const verifyResult = await aiService.verifyProjects(githubUsername, extractedProjects);
          
          if (verifyResult.success && verifyResult.verification) {
            projectVerification = verifyResult.verification;
            const summary = projectVerification.summary;
            console.log(`✅ Project verification complete`);
            console.log(`   Verification Rate: ${summary.verification_rate}%`);
            console.log(`   Found: ${summary.found}, Maybe: ${summary.maybe}, Not Found: ${summary.not_found}`);
          }
        }
      } catch (verifyError) {
        console.warn('⚠️ Project verification failed:', verifyError.message);
        // Non-blocking: continue even if verification fails
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

    // ⚡ NEW ATS SCORING FORMULA: Resume (60%) + Proof Score (40%)
    // ProofScore = 0.30×GitHub + 0.40×ProjectScore + 0.30×CP
    // Final ATS = 0.60×Resume + 0.40×ProofScore
    
    // Extract scores from profile analysis and project verification
    let githubScore = profileAnalysis.github?.overall_score;
    let cpScore = profileAnalysis.competitiveProgramming?.overall_score;
    let projectScore = 0;
    
    // Calculate project score from verification results
    if (projectVerification && projectVerification.summary) {
      const T = projectVerification.summary.total_projects;
      const F = projectVerification.summary.found;
      const M = projectVerification.summary.maybe;
      const N = projectVerification.summary.not_found;
      
      // Calculate average project quality
      let totalWeightedQuality = 0;
      let totalWeight = 0;
      
      if (projectVerification.results) {
        projectVerification.results.forEach(result => {
          if (result.quality && result.quality.score) {
            const quality = result.quality.score;
            let weight = 0;
            if (result.present === 'FOUND') weight = 1;
            else if (result.present === 'MAYBE') weight = 0.5;
            
            if (weight > 0) {
              totalWeightedQuality += quality * weight;
              totalWeight += weight;
            }
          }
        });
      }
      
      const avgProjectQuality = totalWeight > 0 ? totalWeightedQuality / totalWeight : 0;
      const verificationScore = ((F + 0.5 * M) / Math.max(1, T)) * 100;
      const baseProjectScore = 0.70 * verificationScore + 0.30 * avgProjectQuality;
      
      // Apply credibility penalty
      const alpha = 1.2;
      const missingRatio = T > 0 ? N / T : 0;
      const penaltyFactor = Math.exp(-alpha * missingRatio);
      
      projectScore = baseProjectScore * penaltyFactor;
    }
    
    // Step 1: Normalize missing scores to 0
    if (githubScore == null || githubScore === undefined) githubScore = 0;
    if (cpScore == null || cpScore === undefined) cpScore = 0;
    
    // Step 2: Calculate proof score (30% GitHub + 40% Projects + 30% CP)
    const proofScore = (0.30 * githubScore) + (0.40 * projectScore) + (0.30 * cpScore);
    
    // Step 3: Calculate final ATS score (60% resume + 40% proof)
    let finalScore = (0.60 * resumeScore) + (0.40 * proofScore);
    
    // Step 4: Round and clamp between 0-100
    finalScore = Math.round(finalScore);
    finalScore = Math.max(0, Math.min(100, finalScore));
    
    // Add scoring metadata to breakdown
    scoreBreakdown.scoring_formula = {
      resume_score: resumeScore,
      github_score: githubScore,
      project_score: Math.round(projectScore),
      cp_score: cpScore,
      proof_score: Math.round(proofScore),
      final_score: finalScore,
      weights: {
        resume: 0.60,
        proof: 0.40,
        proof_breakdown: {
          github: 0.30,
          projects: 0.40,
          competitive_programming: 0.30
        }
      },
      missing_profiles: {
        github: githubScore === 0,
        projects: projectScore === 0,
        competitive_programming: cpScore === 0
      }
    };
    
    console.log('📊 Final ATS Scoring:');
    console.log(`  Resume Score: ${resumeScore}`);
    console.log(`  GitHub Score: ${githubScore}`);
    console.log(`  Project Score: ${Math.round(projectScore)}`);
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
      resume_text: parsedData.raw_text, // Include raw resume text for client-side processing
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

    // Add extracted projects from AI (Gemini)
    response.extracted_projects = extractedProjects;

    // Add project verification results
    if (projectVerification) {
      response.project_verification = projectVerification;
    }

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
