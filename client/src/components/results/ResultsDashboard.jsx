import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  User,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Target,
  Loader2,
  Sparkles,
  Zap,
  FileText,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import ExtractedLinks from './ExtractedLinks';
import ResumeProjects from './ResumeProjects';
import ProjectVerification from './ProjectVerification';

export default function ResultsDashboard({ results, onReset }) {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [optimizations, setOptimizations] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState(null);
  
  // Load reports from sessionStorage if available (from UploadSection pre-analysis)
  // IMPORTANT: Validate cached report matches current resume's GitHub username
  const [githubReport, setGithubReport] = useState(() => {
    const stored = sessionStorage.getItem('githubReport');
    if (!stored) return null;
    
    try {
      const cachedReport = JSON.parse(stored);
      const cachedUsername = cachedReport?.username;
      
      // Extract current resume's GitHub username
      let currentUsername = null;
      if (results?.extracted_links?.github?.length > 0) {
        const githubLink = results.extracted_links.github[0];
        const match = githubLink?.match(/github\.com\/([a-zA-Z0-9][a-zA-Z0-9_-]*)/i);
        if (match) currentUsername = match[1];
      }
      
      // If usernames don't match, clear the cache and return null to force re-analysis
      if (cachedUsername && currentUsername && cachedUsername !== currentUsername) {
        console.warn(`⚠️ Cached GitHub report username mismatch: "${cachedUsername}" vs current "${currentUsername}" - Clearing cache`);
        sessionStorage.removeItem('githubReport');
        return null;
      }
      
      console.log(`✓ Using cached GitHub report for: ${cachedUsername}`);
      return cachedReport;
    } catch (e) {
      console.error('Failed to parse cached GitHub report:', e);
      sessionStorage.removeItem('githubReport');
      return null;
    }
  });
  const [isAnalyzingGithub, setIsAnalyzingGithub] = useState(false);
  const [githubError, setGithubError] = useState(null);
  
  const [cpReport, setCpReport] = useState(() => {
    const stored = sessionStorage.getItem('cpReport');
    if (!stored) return results.profile_analysis?.competitive_programming || null;
    
    try {
      const cachedReport = JSON.parse(stored);
      const cachedLeetCodeUrl = cachedReport?.platform_info?.leetcode_url;
      const currentLeetCodeUrl = results?.extracted_links?.leetcode?.[0];
      
      // If LeetCode URLs don't match, clear the cache and return null
      if (cachedLeetCodeUrl && currentLeetCodeUrl && cachedLeetCodeUrl !== currentLeetCodeUrl) {
        console.warn(`⚠️ Cached CP report URL mismatch: "${cachedLeetCodeUrl}" vs current "${currentLeetCodeUrl}" - Clearing cache`);
        sessionStorage.removeItem('cpReport');
        return results.profile_analysis?.competitive_programming || null;
      }
      
      console.log(`✓ Using cached CP report for: ${cachedLeetCodeUrl || 'LeetCode'}`);
      return cachedReport;
    } catch (e) {
      console.error('Failed to parse cached CP report:', e);
      sessionStorage.removeItem('cpReport');
      return results.profile_analysis?.competitive_programming || null;
    }
  });
  const [isAnalyzingCP, setIsAnalyzingCP] = useState(false);
  const [cpError, setCpError] = useState(null);

  // Debug: Log extracted links and profile analysis
  console.log('ResultsDashboard - extracted_links:', results.extracted_links);
  console.log('ResultsDashboard - profile_analysis:', results.profile_analysis);
  console.log('ResultsDashboard - extracted_projects:', results.extracted_projects);
  console.log('ResultsDashboard - project_verification:', results.project_verification);

  // ⚡ Recalculate Final ATS Score when GitHub/CP reports are available
  const calculateFinalAtsScore = () => {
    // Get resume score from breakdown or fallback to ats_score
    const resumeScore = results.score_breakdown?.scoring_formula?.resume_score || results.ats_score;
    
    // Get GitHub and CP scores (from reports if available, otherwise from backend, otherwise 0)
    const githubScore = githubReport?.overall_score ?? 
                       results.profile_analysis?.github?.overall_score ?? 0;
    const cpScore = cpReport?.overall_score ?? 
                   results.profile_analysis?.competitive_programming?.overall_score ?? 0;
    
    // Get Project Score - use backend-calculated score if available, otherwise calculate
    let projectScore = results.score_breakdown?.scoring_formula?.project_score ?? 0;
    
    // Fallback: Calculate Project Score from verification results if not in backend
    if (projectScore === 0 && results.project_verification && results.project_verification.summary) {
      const summary = results.project_verification.summary;
      const T = summary.total_projects;
      const F = summary.found;
      const M = summary.maybe;
      const N = summary.not_found;
      
      // Calculate average project quality
      let totalWeightedQuality = 0;
      let totalWeight = 0;
      
      if (results.project_verification.results) {
        results.project_verification.results.forEach(result => {
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
      // Use backend-calculated verification_rate for consistency
      const verificationScore = summary.verification_rate || ((F + 0.5 * M) / Math.max(1, T)) * 100;
      const baseProjectScore = 0.70 * verificationScore + 0.30 * avgProjectQuality;
      
      // Apply credibility penalty
      const alpha = 1.2;
      const missingRatio = T > 0 ? N / T : 0;
      const penaltyFactor = Math.exp(-alpha * missingRatio);
      
      projectScore = Math.round(baseProjectScore * penaltyFactor);
      
      console.log('🔍 ResultsDashboard Project Score (fallback calculation):', {
        verificationScore,
        avgProjectQuality: avgProjectQuality.toFixed(2),
        baseProjectScore: baseProjectScore.toFixed(2),
        penaltyFactor: penaltyFactor.toFixed(2),
        finalProjectScore: projectScore
      });
    } else {
      console.log('✅ Using backend-calculated project score:', projectScore);
    }
    
    // Calculate proof score: 30% GitHub + 40% Projects + 30% CP
    const proofScore = (0.30 * githubScore) + (0.40 * projectScore) + (0.30 * cpScore);
    
    // Calculate final ATS: 60% Resume + 40% Proof
    const finalAtsScore = Math.round((0.60 * resumeScore) + (0.40 * proofScore));
    
    return {
      final: Math.max(0, Math.min(100, finalAtsScore)),
      resume: resumeScore,
      github: githubScore,
      project: Math.round(projectScore),
      cp: cpScore,
      proof: Math.round(proofScore),
      missingGithub: githubScore === 0,
      missingProjects: projectScore === 0,
      missingCp: cpScore === 0
    };
  };

  const liveScoring = calculateFinalAtsScore();

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      // Prepare enhanced report data with live scoring
      const reportData = {
        ...results,
        ats_score: liveScoring.final, // Use live calculated score
        live_scoring: liveScoring, // Include full live scoring breakdown
        github_report: githubReport,
        cp_report: cpReport,
        generation_date: new Date().toISOString()
      };
      
      const response = await fetch('http://localhost:3001/api/download-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ats-resume-report-${results.candidate.name?.replace(/\s+/g, '-') || 'analysis'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-orange-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getCategoryBadge = (category) => {
    const badges = {
      'Excellent': 'bg-green-100 text-green-700',
      'Good': 'bg-blue-100 text-blue-700',
      'Needs Improvement': 'bg-yellow-100 text-yellow-700',
      'Poor': 'bg-red-100 text-red-700'
    };
    return badges[category] || badges['Poor'];
  };

  const handleGenerateOptimizations = async () => {
    if (!results.analysisId) {
      alert('Analysis ID not found. Please re-analyze your resume.');
      return;
    }

    setIsOptimizing(true);
    setOptimizationError(null);

    try {
      const response = await fetch('http://localhost:3001/api/optimization/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId: results.analysisId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate optimizations');
      }

      const data = await response.json();
      console.log('Suggestions received:', data); // Debug log
      setOptimizations(data.suggestions);
      
      // Scroll to optimizations section
      setTimeout(() => {
        const optimizationSection = document.getElementById('ai-optimizations');
        if (optimizationSection) {
          optimizationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error('Optimization error:', error);
      setOptimizationError(error.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAnalyzeGithub = async (shouldScroll = true) => {
    // Debug: log available data
    console.log('=== GitHub Analysis Debug ===');
    console.log('Full results object:', results);
    console.log('Candidate github field:', results.candidate?.github);
    console.log('Extracted links structure:', results.extracted_links);
    console.log('GitHub links:', results.extracted_links?.github);
    console.log('Links with text:', results.extracted_links?.links_with_text);
    
    // Extract GitHub username from various sources
    let githubUsername = null;
    let sourceUsed = null;
    
    // FIRST: Try from extracted_links (most reliable)
    if (results.extracted_links?.github?.length > 0) {
      const githubLinks = results.extracted_links.github;
      console.log('Found GitHub links in buckets:', githubLinks);
      
      // Try each link
      for (const link of githubLinks) {
        console.log('Processing GitHub link:', link);
        
        if (!link || typeof link !== 'string') continue;
        
        // Extract ONLY the username (first segment after github.com/)
        // Match: github.com/USERNAME (and stop there)
        const usernameMatch = link.match(/github\.com\/([a-zA-Z0-9][a-zA-Z0-9_-]*)/i);
        
        if (usernameMatch && usernameMatch[1]) {
          const extractedName = usernameMatch[1];
          console.log('Regex matched, extracted:', extractedName);
          
          // Make sure it's not a path segment (like repos, orgs, etc.)
          const githubPaths = ['repos', 'orgs', 'organizations', 'explore', 'topics', 'collections', 'events', 'marketplace', 'pricing', 'nonprofit', 'customer-stories', 'security', 'features', 'enterprise', 'education'];
          
          if (!githubPaths.includes(extractedName.toLowerCase())) {
            githubUsername = extractedName;
            sourceUsed = 'extracted_links.github';
            console.log('✓ Valid username found from extracted links:', githubUsername);
            break;
          } else {
            console.log('✗ Skipped (GitHub system path):', extractedName);
          }
        }
      }
    }
    
    // SECOND: Try from candidate.github field
    if (!githubUsername && results.candidate?.github) {
      const candidateGithub = results.candidate.github;
      console.log('Trying candidate.github field:', candidateGithub);
      
      // If it's a full URL, extract username
      if (candidateGithub.includes('github.com')) {
        const match = candidateGithub.match(/github\.com\/([a-zA-Z0-9][a-zA-Z0-9_-]*)/i);
        if (match && match[1]) {
          githubUsername = match[1];
          sourceUsed = 'candidate.github (URL)';
          console.log('✓ Extracted from candidate URL:', githubUsername);
        }
      } else {
        // It's just a username
        githubUsername = candidateGithub.replace(/^[@/]+/, '').trim();
        sourceUsed = 'candidate.github (username)';
        console.log('✓ Username from candidate field:', githubUsername);
      }
    }
    
    // Validate username exists
    if (!githubUsername || githubUsername.length < 1) {
      setGithubError('No valid GitHub profile found in resume');
      console.error('❌ No GitHub username found after extraction');
      console.log('=================================');
      return;
    }
    
    // Clean username
    githubUsername = githubUsername.trim();
    
    console.log('Username after cleaning:', githubUsername);
    console.log('Source:', sourceUsed);
    
    // Validate it's not a common section heading
    const invalidUsernames = ['education', 'experience', 'skills', 'profile', 'projects', 'about', 'contact', 'summary', 'certifications', 'achievements'];
    const lowerUsername = githubUsername.toLowerCase();
    
    if (invalidUsernames.includes(lowerUsername)) {
      setGithubError(`Invalid GitHub username detected: "${githubUsername}". This appears to be a section heading, not a username.`);
      console.error('❌ Invalid GitHub username (section heading):', githubUsername);
      console.log('=================================');
      return;
    }
    
    // Validate username format (GitHub usernames: alphanumeric, hyphens, max 39 chars)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(githubUsername) || githubUsername.length > 39) {
      setGithubError(`Invalid GitHub username format: "${githubUsername}". Please check your resume.`);
      console.error('❌ Invalid GitHub username format:', githubUsername);
      console.log('=================================');
      return;
    }
    
    console.log('✅ Final validated GitHub username:', githubUsername);
    console.log('✅ Source:', sourceUsed);
    console.log('✅ Sending to API: http://localhost:5000/api/analyze-github');
    console.log('✅ This username is DYNAMICALLY extracted - NOT hardcoded');
    console.log('=================================');

    setIsAnalyzingGithub(true);
    setGithubError(null);

    try {
      // Extract keywords from the analysis results
      const keywords = [];
      
      // 1. Get job requirements keywords if semantic analysis available
      if (results.semantic_analysis?.job_requirements) {
        const jobReq = results.semantic_analysis.job_requirements;
        if (jobReq.requiredSkills) keywords.push(...jobReq.requiredSkills);
        if (jobReq.preferredSkills) keywords.push(...jobReq.preferredSkills);
        if (jobReq.tools) keywords.push(...jobReq.tools);
        if (jobReq.technologies) keywords.push(...jobReq.technologies);
      }
      
      // 2. Get keywords from keywords_analysis
      if (results.keywords_analysis?.job_keywords) {
        keywords.push(...results.keywords_analysis.job_keywords);
      }
      
      // 3. Get matched skills as keywords
      if (results.skills?.technical_skills) {
        keywords.push(...results.skills.technical_skills);
      }
      if (results.skills?.frameworks) {
        keywords.push(...results.skills.frameworks);
      }
      if (results.skills?.tools) {
        keywords.push(...results.skills.tools);
      }
      
      // Remove duplicates and clean
      const uniqueKeywords = [...new Set(keywords.map(k => String(k).toLowerCase().trim()))].filter(k => k.length > 1);
      
      console.log('📋 Sending keywords to GitHub analysis:', uniqueKeywords.slice(0, 20));
      
      const response = await fetch('http://localhost:5000/api/analyze-github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          githubUsername: githubUsername,
          jobDescription: results.job_description || '',
          keywords: uniqueKeywords.slice(0, 30) // Send top 30 keywords
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze GitHub profile');
      }

      const data = await response.json();
      console.log('✅ GitHub analysis received for username:', data.report?.username);
      console.log('✅ Overall score:', data.report?.overall_score);
      setGithubReport(data.report);
      
      // Store in sessionStorage for viewing full report
      sessionStorage.setItem('githubReport', JSON.stringify(data.report));
      
      // Scroll to GitHub report section only if requested (manual trigger)
      if (shouldScroll) {
        setTimeout(() => {
          const githubSection = document.getElementById('github-analysis');
          if (githubSection) {
            githubSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch (error) {
      console.error('GitHub analysis error:', error);
      setGithubError(error.message);
    } finally {
      setIsAnalyzingGithub(false);
    }
  };

  const handleAnalyzeCP = async (shouldScroll = true) => {
    console.log('=== CP Analysis Debug ===');
    console.log('Full results object:', results);
    console.log('Extracted links structure:', results.extracted_links);
    console.log('LeetCode links:', results.extracted_links?.leetcode);
    
    // Check if already analyzed from backend
    if (results.profile_analysis?.competitive_programming && !results.profile_analysis.competitive_programming.error) {
      console.log('CP analysis already available from backend');
      setCpReport(results.profile_analysis.competitive_programming);
      setTimeout(() => {
        const cpSection = document.getElementById('cp-analysis');
        if (cpSection) {
          cpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return;
    }

    // Extract LeetCode URL
    let leetcodeUrl = null;
    
    if (results.extracted_links?.leetcode?.length > 0) {
      leetcodeUrl = results.extracted_links.leetcode[0];
      console.log('Found LeetCode URL:', leetcodeUrl);
    }

    if (!leetcodeUrl) {
      setCpError('No LeetCode profile found in your resume. Add a LeetCode link to get competitive programming insights.');
      return;
    }

    setIsAnalyzingCP(true);
    setCpError(null);

    try {
      console.log('Analyzing LeetCode profile:', leetcodeUrl);
      
      const response = await fetch('http://localhost:5000/api/analyze-competitive-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leetcodeUrl: leetcodeUrl,
          useLLM: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze competitive programming profile');
      }

      const data = await response.json();
      console.log('✅ CP analysis received for:', leetcodeUrl);
      console.log('✅ Overall score:', data.report?.overall_score);
      setCpReport(data.report);
      
      // Store in sessionStorage for viewing full report
      sessionStorage.setItem('cpReport', JSON.stringify(data.report));
      
      // Scroll to CP report section only if requested (manual trigger)
      if (shouldScroll) {
        setTimeout(() => {
          const cpSection = document.getElementById('cp-analysis');
          if (cpSection) {
            cpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch (error) {
      console.error('CP analysis error:', error);
      setCpError(error.message);
    } finally {
      setIsAnalyzingCP(false);
    }
  };

  const handleViewFullCPReport = () => {
    if (cpReport) {
      // Store CP report in sessionStorage
      sessionStorage.setItem('cpReport', JSON.stringify(cpReport));
      // Navigate to CP result page
      navigate('/cp-result');
    }
  };

  const handleViewFullGitHubReport = () => {
    if (githubReport) {
      // Store GitHub report in sessionStorage
      sessionStorage.setItem('githubReport', JSON.stringify(githubReport));
      // Navigate to GitHub result page
      navigate('/github-result');
    }
  };

  // Auto-trigger GitHub and CP analyses on component mount
  useEffect(() => {
    const autoAnalyze = async () => {
      // Auto-analyze GitHub if profile exists and not already analyzed
      if ((results.candidate?.github || results.extracted_links?.github?.length > 0) && !githubReport) {
        await handleAnalyzeGithub(false); // Don't scroll for auto-trigger
      }

      // Auto-analyze CP if LeetCode link exists and not already analyzed
      if (results.extracted_links?.leetcode?.length > 0 && !cpReport) {
        await handleAnalyzeCP(false); // Don't scroll for auto-trigger
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      autoAnalyze();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = run once on mount

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 pt-8 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={onReset}
              className="p-3 hover:bg-white/80 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 bg-white/60 backdrop-blur-sm border border-gray-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Resume Analysis Results
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <span className="font-semibold">{results.candidate.name || 'Your Resume'}</span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Analyzed just now
                </span>
              </p>
            </div>
          </div>
          <button 
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 font-medium"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isDownloading ? 'Generating...' : 'Download Report'}
          </button>
        </div>

        {/* Main Score Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Score Card */}
          <div className="rounded-3xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50/80 to-orange-50/50 p-8 hover:shadow-xl transition-all duration-300 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Target className="w-6 h-6 text-gray-700" />
                  ATS Score
                </h2>
                <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${getCategoryBadge(results.score_category)}`}>
                  {results.score_category}
                </span>
              </div>
              <div className={`text-7xl font-black ${getScoreColor(liveScoring.final)} animate-scale-in`}>
                {liveScoring.final}
              </div>
            </div>
            <p className="text-base text-gray-700 leading-relaxed mb-4">
              {liveScoring.final >= 80
                ? '🎉 Excellent! Your resume is well-optimized for ATS systems.'
                : liveScoring.final >= 60
                ? '👍 Good start, but there\'s room for improvement.'
                : '⚠️ Your resume needs significant optimization for ATS.'}
            </p>

            {/* Warning for Missing Profiles */}
            {(liveScoring.missingGithub || liveScoring.missingProjects || liveScoring.missingCp) && (
              <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-xl animate-pulse">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-orange-800 mb-1">Profile Scores Missing</p>
                    <p className="text-xs text-orange-700 leading-relaxed">
                      ⚠️ {[
                        liveScoring.missingGithub && 'GitHub',
                        liveScoring.missingProjects && 'Projects', 
                        liveScoring.missingCp && 'Competitive Programming'
                      ].filter(Boolean).join(', ')} {[liveScoring.missingGithub, liveScoring.missingProjects, liveScoring.missingCp].filter(Boolean).length > 1 ? 'scores are' : 'score is'} missing and counted as 0, which significantly lowers your ATS score.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Score Breakdown Details */}
            <div className="mt-4 p-3 bg-white/60 rounded-lg border border-gray-200">
              <p className="text-xs font-bold text-gray-600 mb-2">Score Composition</p>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Resume (60%):</span>
                  <span className="font-bold">{liveScoring.resume}</span>
                </div>
                <div className="flex justify-between">
                  <span>GitHub :</span>
                  <span className={`font-bold ${liveScoring.github === 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {liveScoring.github}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CP/LeetCode:</span>
                  <span className={`font-bold ${liveScoring.cp === 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {liveScoring.cp}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Projects:</span>
                  <span className={`font-bold ${liveScoring.project === 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {liveScoring.project}
                  </span>
                </div>
                
                <div className="flex justify-between pt-1 border-t border-gray-300">
                  <span>Proof Score (40%):</span>
                  <span className="font-bold">{liveScoring.proof}</span>
                </div>
              </div>
            </div>


            {/* OCR Indicator */}
            {results.parsing_method === 'ocr' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-medium">Scanned Document Detected</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  OCR was used to extract text. Confidence: {results.ocr_confidence || 'unknown'}
                </p>
              </div>
            )}
          </div>

          {/* Candidate Profile */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 p-6 hover:shadow-xl transition-all duration-500 hover:scale-[1.02] animate-slide-up animation-delay-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                Candidate Profile
              </h2>
            </div>
            <div className="space-y-3">
              {results.candidate.name && (
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 group">
                  <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                    <User className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <span className="font-semibold text-gray-900">{results.candidate.name}</span>
                </div>
              )}
              {results.candidate.email && (
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 group">
                  <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                    <Mail className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">{results.candidate.email}</span>
                </div>
              )}
              {results.candidate.phone && (
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 group">
                  <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                    <Phone className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">{results.candidate.phone}</span>
                </div>
              )}
              {results.candidate.location && (
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 group">
                  <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                    <MapPin className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">{results.candidate.location}</span>
                </div>
              )}
              {results.candidate.linkedin && (
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 group">
                  <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                    <Linkedin className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">/{results.candidate.linkedin}</span>
                </div>
              )}
              {results.candidate.github && (
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 group">
                  <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                    <Github className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">/{results.candidate.github}</span>
                </div>
              )}
            </div>
          </div>

          {/* Domain Card */}
          {results.domain ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-purple-200/50 p-6 hover:shadow-xl transition-all duration-500 hover:scale-[1.02] animate-slide-up animation-delay-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Domain Classification
                </h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Primary Domain</p>
                  <p className="text-lg font-bold text-gray-900">{results.domain.primary || 'Not classified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Confidence</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${results.domain.confidence || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{results.domain.confidence || 0}%</span>
                  </div>
                </div>
                {results.domain.secondary && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Secondary Domain</p>
                    <p className="text-sm font-medium text-gray-700">{results.domain.secondary}</p>
                  </div>
                )}
                {results.domain.keywords_matched && results.domain.keywords_matched.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Matched Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {results.domain.keywords_matched.slice(0, 6).map((keyword, index) => (
                        <span key={index} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Domain Classification
                </h2>
              </div>
              <div className="text-center py-4">
                <p className="text-gray-600">Domain data not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Profile Analysis Grid - GitHub & CP Side by Side (2nd Row) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* GitHub Analysis Section */}
          <div id="github-analysis" className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg animate-slide-up">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">GitHub Portfolio</h3>
                  <p className="text-gray-600 text-xs">Repository & Activity Analysis</p>
                </div>
              </div>
              {(results.candidate?.github || results.extracted_links?.github?.length > 0) && (
                <a
                  href={results.candidate?.github || results.extracted_links?.github?.[0] || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-all duration-300 font-medium text-xs flex items-center gap-2"
                >
                  View Profile
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

          {/* Check if GitHub profile exists */}
          {!(results.candidate?.github || results.extracted_links?.github?.length > 0) ? (
            <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 border-2 border-yellow-700 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <svg className="w-8 h-8 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl font-bold text-yellow-100">No GitHub Profile Detected</p>
              </div>
              <p className="text-yellow-200 mb-4">
                We couldn't find a GitHub profile link in your resume. Add your GitHub URL to unlock portfolio analysis.
              </p>
              <div className="bg-yellow-950 rounded-lg p-4 text-left">
                <p className="text-yellow-100 font-semibold mb-2">💡 To enable GitHub analysis:</p>
                <ul className="text-yellow-200 text-sm space-y-1 list-disc list-inside">
                  <li>Include your GitHub URL in your resume (e.g., https://github.com/yourusername)</li>
                  <li>Add it to the contact section or header</li>
                  <li>Re-upload your resume to analyze your GitHub portfolio</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              {/* GitHub Button */}
              {!githubReport && (
                <div className="text-center mb-4">
                  <button
                    onClick={handleAnalyzeGithub}
                    disabled={isAnalyzingGithub}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm w-full sm:w-auto"
                  >
                    {isAnalyzingGithub ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Github className="w-4 h-4" />
                        <span>Analyze Profile</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* GitHub Error Display */}
              {githubError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-red-800 mb-1">⚠️ Analysis Failed</p>
                      <p className="text-xs text-red-700">{githubError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* GitHub Report Display - Compact Summary */}
              {githubReport && (
                <div className="bg-white rounded-xl p-5 border border-gray-200 animate-fade-in">
                  <div className="space-y-4">
                    {/* Score Section */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Overall Score</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-black text-slate-700">
                            {githubReport.overall_score}
                          </span>
                          <span className="text-2xl font-bold text-gray-400">/100</span>
                        </div>
                      </div>
                      
                      <div className={`px-4 py-2 rounded-lg font-bold text-xs ${
                        githubReport.overall_score >= 80 ? 'bg-green-100 text-green-700' :
                        githubReport.overall_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {githubReport.grade || 'N/A'}
                      </div>
                    </div>

                    {/* View Complete Report Button */}
                    <button
                      onClick={handleViewFullGitHubReport}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-semibold text-sm group"
                    >
                      <FileText className="w-4 h-4" />
                      View Complete Report
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          </div>

          {/* Competitive Programming Analysis Section */}
          <div id="cp-analysis" className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-200 shadow-lg animate-slide-up">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Competitive Programming</h3>
                  <p className="text-gray-600 text-xs">LeetCode & DSA Analysis</p>
                </div>
              </div>
            {results.extracted_links?.leetcode?.length > 0 && (
              <a
                href={results.extracted_links.leetcode[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all duration-300 font-medium text-xs flex items-center gap-2"
              >
                View Profile
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {/* No CP Profile Detected */}
          {(!results.extracted_links?.leetcode || results.extracted_links.leetcode.length === 0) && (
            <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 rounded-2xl p-6 border-2 border-orange-700 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <svg className="w-8 h-8 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl font-bold text-orange-100">No LeetCode Profile</p>
              </div>
              <p className="text-orange-200 text-sm">
                Add your LeetCode link to unlock competitive programming analysis.
              </p>
            </div>
          )}

          {/* Analyze Button */}
          {!cpReport && results.extracted_links?.leetcode?.length > 0 && (
            <div className="text-center mb-4">
              <button
                onClick={handleAnalyzeCP}
                disabled={isAnalyzingCP}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm w-full sm:w-auto"
              >
                {isAnalyzingCP ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Analyze Profile</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* CP Error Display */}
          {cpError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-red-800 mb-1">⚠️ Analysis Failed</p>
                  <p className="text-xs text-red-700">{cpError}</p>
                </div>
              </div>
            </div>
          )}

          {/* CP Report Display - Compact Summary */}
          {cpReport && !cpReport.error && (
            <div className="bg-white rounded-xl p-5 border border-gray-200 animate-fade-in">
              <div className="space-y-4">
                {/* Score Section */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs mb-1">Overall Score</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-orange-600">
                        {cpReport.overall_score}
                      </span>
                      <span className="text-2xl font-bold text-gray-400">/100</span>
                    </div>
                  </div>
                  
                </div>

                {/* Summary Text */}
                {cpReport.resume_cp_insights?.ats_cp_summary && (
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <p className="text-gray-700 text-xs leading-relaxed">
                      {cpReport.resume_cp_insights.ats_cp_summary}
                    </p>
                  </div>
                )}

                {/* View Complete Report Button */}
                <button
                  onClick={handleViewFullCPReport}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-semibold text-sm group"
                >
                  <FileText className="w-4 h-4" />
                  View Complete Report
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
        {/* End Profile Analysis Grid */}

       

        {/* Score Breakdown */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 p-8 mb-8 hover:shadow-xl transition-all duration-500 animate-slide-up animation-delay-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Score Breakdown</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(results.score_breakdown)
              .filter(([key, value]) => key !== 'scoring_formula' && typeof value === 'number')
              .map(([key, value], index) => (
              <div key={key} className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group animate-slide-up" style={{animationDelay: `${(index + 4) * 100}ms`}}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-800 capitalize flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 group-hover:scale-150 transition-transform"></span>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className={`font-black text-lg ${getScoreColor(value)}`}>{value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                  <div 
                    className={`h-3 rounded-full transition-all duration-1000 ease-out ${value >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' : value >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Semantic Analysis Section - Phase 1 Feature */}
        {results.semantic_analysis && (
          <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-blue-200/50 p-8 mb-8 hover:shadow-2xl transition-all duration-500 animate-slide-up animation-delay-400">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg animate-bounce-slow">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Semantic Analysis (AI-Powered)
              </h3>
              <p className="text-gray-600 max-w-3xl mx-auto">
                Advanced AI analysis of contextual meaning and keyword matching between your resume and job requirements
              </p>
            </div>

            {/* Semantic & Keyword Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2 border-blue-200/50">
                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </span>
                  Semantic Similarity Score
                </h4>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 opacity-20 blur-2xl rounded-full animate-pulse"></div>
                    <div className="text-5xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent relative z-10">
                      {results.semantic_analysis.semantic_score}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full shadow-lg transition-all duration-1000 ease-out"
                        style={{ width: `${results.semantic_analysis.semantic_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                      🧠 Context and meaning match with job requirements
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2 border-purple-200/50">
                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                  </span>
                  Keyword Matching Score
                </h4>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 opacity-20 blur-2xl rounded-full animate-pulse"></div>
                    <div className="text-5xl font-black bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent relative z-10">
                      {results.semantic_analysis.keyword_score}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-4 rounded-full shadow-lg transition-all duration-1000 ease-out"
                        style={{ width: `${results.semantic_analysis.keyword_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                      🔑 Exact keyword frequency matching
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Skill Matching Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Matched Skills */}
              {results.semantic_analysis.matched_skills?.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2 border-green-200/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-black text-gray-900 text-lg">Matched Skills</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {results.semantic_analysis.matched_skills.map((skill, index) => (
                      <span key={index} className="px-4 py-2 bg-gradient-to-r from-green-50 to-green-100 text-green-800 rounded-xl text-sm font-bold border-2 border-green-300 hover:shadow-md transition-all hover:scale-105 cursor-default">
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 font-semibold">
                      🎉 {results.semantic_analysis.matched_skills.length} skills perfectly matched
                    </p>
                  </div>
                </div>
              )}

              {/* Partial Match Skills */}
              {results.semantic_analysis.partial_skills?.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2 border-yellow-200/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h4 className="font-black text-gray-900 text-lg">Partial Match</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {results.semantic_analysis.partial_skills.map((skill, index) => (
                      <span key={index} className="px-4 py-2 bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 rounded-xl text-sm font-bold border-2 border-yellow-300 hover:shadow-md transition-all hover:scale-105 cursor-default">
                        ⚠ {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-700 font-semibold">
                      💡 Similar skills found - consider adding exact terms
                    </p>
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {results.semantic_analysis.missing_skills?.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2 border-red-200/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h4 className="font-black text-gray-900 text-lg">Missing Skills</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {results.semantic_analysis.missing_skills.map((skill, index) => (
                      <span key={index} className="px-4 py-2 bg-gradient-to-r from-red-50 to-red-100 text-red-800 rounded-xl text-sm font-bold border-2 border-red-300 hover:shadow-md transition-all hover:scale-105 cursor-default">
                        ✗ {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 font-semibold">
                      🎯 Required skills not found - add these to improve score
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Job Requirements Summary */}
            {results.semantic_analysis.job_requirements && (
              <div className="mt-6 bg-white rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-3">Job Requirements Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.semantic_analysis.job_requirements.requiredSkills?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Required Skills ({results.semantic_analysis.job_requirements.requiredSkills.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {results.semantic_analysis.job_requirements.requiredSkills.slice(0, 10).map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                        {results.semantic_analysis.job_requirements.requiredSkills.length > 10 && (
                          <span className="px-2 py-1 text-gray-500 text-xs">
                            +{results.semantic_analysis.job_requirements.requiredSkills.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {results.semantic_analysis.job_requirements.keywords?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Key Terms ({results.semantic_analysis.job_requirements.keywords.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {results.semantic_analysis.job_requirements.keywords.slice(0, 10).map((keyword, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            {keyword}
                          </span>
                        ))}
                        {results.semantic_analysis.job_requirements.keywords.length > 10 && (
                          <span className="px-2 py-1 text-gray-500 text-xs">
                            +{results.semantic_analysis.job_requirements.keywords.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Skills Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 p-8 mb-8 hover:shadow-xl transition-all duration-500 animate-slide-up animation-delay-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Skills Analysis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.skills.programming_languages?.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200 hover:shadow-lg transition-all">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-blue-600">💻</span>
                  Programming Languages
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.skills.programming_languages.map((skill, index) => (
                    <span key={index} className="px-3 py-1.5 bg-white text-blue-700 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {results.skills.frameworks?.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border-2 border-purple-200 hover:shadow-lg transition-all">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-purple-600">⚙️</span>
                  Frameworks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.skills.frameworks.map((skill, index) => (
                    <span key={index} className="px-3 py-1.5 bg-white text-purple-700 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {results.skills.tools?.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200 hover:shadow-lg transition-all">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-green-600">🛠️</span>
                  Tools
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.skills.tools.map((skill, index) => (
                    <span key={index} className="px-3 py-1.5 bg-white text-green-700 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {results.skills.databases?.length > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border-2 border-orange-200 hover:shadow-lg transition-all">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-orange-600">📊</span>
                  Databases
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.skills.databases.map((skill, index) => (
                    <span key={index} className="px-3 py-1.5 bg-white text-orange-700 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 p-5 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl border-2 border-gray-300">
            <p className="text-sm text-gray-700 font-bold">
              🎯 Total Skills Found: <span className="text-2xl text-gray-900">{results.skills.total_count}</span>
            </p>
          </div>
        </div>

         {/* Extracted Links Section */}
        <ExtractedLinks links={results.extracted_links} />

        {/* Resume Projects Section - AI-Extracted from Backend */}
        <ResumeProjects projects={results.extracted_projects || []} />

        {/* Project Verification Section - GitHub Verification */}
        <ProjectVerification verification={results.project_verification} />

        {/* Issues & Suggestions - Real Data from Backend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Issues - Real Data */}
          {results.issues && results.issues.length > 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-red-200/50 p-6 hover:shadow-xl transition-all duration-500 animate-slide-up animation-delay-600">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900">Issues Detected</h3>
              </div>
              <div className="space-y-4">
                {results.issues.map((issue, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-red-50 to-red-100/50 border-2 border-red-200 rounded-xl hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex items-start gap-3">
                      <div className={`px-3 py-1 rounded-lg text-xs font-black shadow-sm ${
                        issue.severity === 'high' || issue.severity === 'High' ? 'bg-red-500 text-white' :
                        issue.severity === 'medium' || issue.severity === 'Medium' ? 'bg-yellow-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {issue.severity}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 mb-1">{issue.type || issue.description}</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{issue.description || issue.suggestion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-green-200/50 p-6 hover:shadow-xl transition-all duration-500 animate-slide-up animation-delay-600">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900">Issues Detected</h3>
              </div>
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce-slow">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-700 font-bold text-lg">🎉 No critical issues detected!</p>
                  <p className="text-gray-600 text-sm mt-2">Your resume looks great!</p>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions - Real Data */}
          {results.suggestions && results.suggestions.length > 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 p-6 hover:shadow-xl transition-all duration-500 animate-slide-up animation-delay-700">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900">Improvement Suggestions</h3>
              </div>
              <div className="space-y-4">
                {results.suggestions.map((suggestion, index) => {
                  // Handle both object and string suggestions
                  const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.suggestion;
                  const priority = typeof suggestion === 'object' ? suggestion.priority : 'medium';
                  const category = typeof suggestion === 'object' ? suggestion.category : 'general';
                  
                  return (
                    <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-xl hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                      <div className="flex items-start gap-3">
                        <div className={`px-3 py-1 rounded-lg text-xs font-black shadow-sm ${
                          priority === 'high' || priority === 'High' ? 'bg-green-500 text-white' :
                          priority === 'medium' || priority === 'Medium' ? 'bg-blue-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {priority}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 mb-1 capitalize">{category}</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{suggestionText}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 p-6 hover:shadow-xl transition-all duration-500 animate-slide-up animation-delay-700">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900">Improvement Suggestions</h3>
              </div>
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-600 font-semibold">No suggestions available</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Optimization Section - Phase 1 Step 5 */}
        <div id="ai-optimizations" className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-indigo-300/50 p-8 mb-8 hover:shadow-2xl transition-all duration-500 animate-slide-up animation-delay-800">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur-2xl rounded-full animate-pulse"></div>
                <Sparkles className="w-10 h-10 text-indigo-600 relative z-10 animate-bounce-slow" />
              </div>
              <h3 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Resume Quality Improvement Suggestions
              </h3>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 opacity-20 blur-2xl rounded-full animate-pulse"></div>
                <Zap className="w-10 h-10 text-purple-600 relative z-10 animate-bounce-slow" style={{animationDelay: '0.5s'}} />
              </div>
            </div>
            <p className="text-gray-700 max-w-3xl mx-auto text-lg leading-relaxed mb-3">
              Get personalized, actionable suggestions to improve your resume quality, fix formatting issues, add missing skills, and enhance your content for better ATS scores.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full border-2 border-indigo-300">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <p className="text-sm text-gray-800 font-bold">
                Comprehensive Analysis • Instant Results • Actionable Improvements
              </p>
            </div>
          </div>

          {/* Optimization Button */}
          {!optimizations && (
            <div className="text-center space-y-4">
              <button
                onClick={handleGenerateOptimizations}
                disabled={isOptimizing}
                className="relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-bold text-lg overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-3">
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Analyzing Resume Quality...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-6 h-6" />
                      <span>Get Improvement Suggestions</span>
                      <Sparkles className="w-5 h-5" />
                    </>
                  )}
                </div>
              </button>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-indigo-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-gray-700 font-semibold">
                  Smart Analysis • Instant Results • Rule-Based
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {optimizationError && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-2xl p-6 mb-6 animate-slide-down shadow-lg">
              <div className="flex items-start gap-4 text-red-700">
                <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-black text-lg mb-2">⚠️ Optimization Failed</p>
                  <p className="text-sm font-semibold mb-2">{optimizationError}</p>
                  <p className="text-xs mt-2 bg-red-200 rounded-lg px-3 py-2 inline-block">
                    💡 Make sure the Python AI service is running on port 5000
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions Display */}
          {optimizations && (
            <div className="space-y-6 animate-fade-in">
              {/* Quick Summary Card */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 shadow-lg border-2 border-indigo-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">Analysis Complete</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {[
                          (optimizations.summary_improvements?.length || 0),
                          (optimizations.keyword_recommendations?.length || 0),
                          (optimizations.content_enhancements?.length || 0),
                          (optimizations.formatting_tips?.length || 0)
                        ].reduce((a, b) => a + b, 0)} suggestions generated across all categories
                      </p>
                    </div>
                  </div>
                  
                  {optimizations.overall_quality_score !== undefined && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Quality Score</div>
                      <div className={`text-5xl font-black ${getScoreColor(optimizations.overall_quality_score)}`}>
                        {optimizations.overall_quality_score}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            

              {/* Summary Improvements */}
              {optimizations.summary_improvements && optimizations.summary_improvements.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-blue-200/50 hover:scale-[1.01] group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-gray-900">Professional Summary Improvements</h4>
                      <p className="text-xs text-gray-600 mt-1">{optimizations.summary_improvements.length} recommendations to enhance your summary</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {optimizations.summary_improvements.map((item, index) => (
                      <div key={index} className={`flex items-start gap-4 rounded-xl p-5 border-2 transition-all ${
                        item.type === 'critical' ? 'bg-red-50 border-red-300 hover:shadow-lg hover:border-red-400' :
                        item.type === 'improvement' ? 'bg-yellow-50 border-yellow-300 hover:shadow-lg hover:border-yellow-400' :
                        'bg-green-50 border-green-300 hover:shadow-lg hover:border-green-400'
                      }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold ${
                          item.type === 'critical' ? 'bg-red-500' :
                          item.type === 'improvement' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}>
                          {item.type === 'critical' ? '!' : item.type === 'improvement' ? '→' : '✓'}
                        </div>
                        <div className="flex-1">
                          {item.issue && <p className="font-bold text-gray-900 mb-2 text-base">{item.issue}</p>}
                          <p className="text-sm text-gray-700 leading-relaxed">{item.suggestion}</p>
                          {item.impact && (
                            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              item.impact === 'high' ? 'bg-red-100 text-red-700 border border-red-300' :
                              item.impact === 'medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                              'bg-blue-100 text-blue-700 border border-blue-300'
                            }`}>
                              {item.impact.toUpperCase()} IMPACT
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keyword Recommendations */}
              {optimizations.keyword_recommendations && optimizations.keyword_recommendations.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-purple-200/50 hover:scale-[1.01] group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-gray-900">Keyword & Skills Recommendations</h4>
                      <p className="text-xs text-gray-600 mt-1">{optimizations.keyword_recommendations.length} strategic recommendations to boost ATS matching</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {optimizations.keyword_recommendations.map((item, index) => (
                      <div key={index} className={`rounded-xl p-5 border-2 transition-all ${
                        item.type === 'critical' ? 'bg-red-50 border-red-300 hover:shadow-lg hover:border-red-400' :
                        item.type === 'positive' ? 'bg-green-50 border-green-300 hover:shadow-lg hover:border-green-400' :
                        'bg-purple-50 border-purple-300 hover:shadow-lg hover:border-purple-400'
                      }`}>
                        {item.issue && <p className="font-bold text-gray-900 mb-2 text-base">{item.issue}</p>}
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">{item.suggestion}</p>
                        {item.keywords && item.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {item.keywords.map((keyword, idx) => (
                              <span key={idx} className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border ${
                                item.type === 'positive' 
                                  ? 'bg-green-100 text-green-700 border-green-300' 
                                  : 'bg-purple-100 text-purple-700 border-purple-300'
                              }`}>
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.impact && (
                          <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                            item.impact === 'high' ? 'bg-red-100 text-red-700 border border-red-300' :
                            item.impact === 'positive' ? 'bg-green-100 text-green-700 border border-green-300' :
                            'bg-yellow-100 text-yellow-700 border border-yellow-300'
                          }`}>
                            {item.impact === 'positive' ? '✓ EXCELLENT MATCH' : `${item.impact.toUpperCase()} IMPACT`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Enhancements */}
              {optimizations.content_enhancements && optimizations.content_enhancements.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-orange-200/50 hover:scale-[1.01] group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-gray-900">Content Enhancement Tips</h4>
                      <p className="text-xs text-gray-600 mt-1">{optimizations.content_enhancements.length} ways to strengthen your work experience</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {optimizations.content_enhancements.map((item, index) => (
                      <div key={index} className={`flex items-start gap-4 rounded-xl p-5 border-2 transition-all ${
                        item.type === 'critical' ? 'bg-red-50 border-red-300 hover:shadow-lg hover:border-red-400' :
                        item.type === 'positive' ? 'bg-green-50 border-green-300 hover:shadow-lg hover:border-green-400' :
                        'bg-orange-50 border-orange-300 hover:shadow-lg hover:border-orange-400'
                      }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold ${
                          item.type === 'critical' ? 'bg-red-500' :
                          item.type === 'positive' ? 'bg-green-500' :
                          'bg-orange-500'
                        }`}>
                          {item.type === 'positive' ? '✓' : index + 1}
                        </div>
                        <div className="flex-1">
                          {item.issue && <p className="font-bold text-gray-900 mb-2 text-base">{item.issue}</p>}
                          <p className="text-sm text-gray-700 leading-relaxed">{item.suggestion}</p>
                          {item.impact && (
                            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              item.impact === 'high' ? 'bg-red-100 text-red-700 border border-red-300' :
                              item.impact === 'positive' ? 'bg-green-100 text-green-700 border border-green-300' :
                              'bg-yellow-100 text-yellow-700 border border-yellow-300'
                            }`}>
                              {item.impact === 'positive' ? '✓ GREAT JOB' : `${item.impact.toUpperCase()} IMPACT`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formatting Tips */}
              {optimizations.formatting_tips && optimizations.formatting_tips.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-green-200/50 hover:scale-[1.01] group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-gray-900">Formatting & Structure Tips</h4>
                      <p className="text-xs text-gray-600 mt-1">{optimizations.formatting_tips.length} improvements for ATS compatibility</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {optimizations.formatting_tips.map((item, index) => (
                      <div key={index} className={`flex items-start gap-4 rounded-xl p-5 border-2 transition-all ${
                        item.type === 'critical' ? 'bg-red-50 border-red-300 hover:shadow-lg hover:border-red-400' :
                        'bg-green-50 border-green-300 hover:shadow-lg hover:border-green-400'
                      }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          item.type === 'critical' ? 'bg-red-500' : 'bg-green-500'
                        }`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {item.type === 'critical' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            )}
                          </svg>
                        </div>
                        <div className="flex-1">
                          {item.issue && <p className="font-bold text-gray-900 mb-2 text-base">{item.issue}</p>}
                          <p className="text-sm text-gray-700 leading-relaxed">{item.suggestion}</p>
                          {item.impact && (
                            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              item.impact === 'high' ? 'bg-red-100 text-red-700 border border-red-300' :
                              'bg-yellow-100 text-yellow-700 border border-yellow-300'
                            }`}>
                              {item.impact.toUpperCase()} IMPACT
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill Development */}
              {optimizations.skill_development && optimizations.skill_development.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-indigo-200/50 hover:scale-[1.01] group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-gray-900">Skill Development Recommendations</h4>
                      <p className="text-xs text-gray-600 mt-1">Long-term growth paths to close skill gaps</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {optimizations.skill_development.map((item, index) => (
                      <div key={index} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-300">
                        {item.issue && <p className="font-bold text-indigo-900 mb-2 text-lg">{item.issue}</p>}
                        <p className="text-sm text-gray-700 leading-relaxed mb-4">{item.suggestion}</p>
                        {item.skills && item.skills.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-indigo-700 mb-2">Recommended Skills:</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {item.skills.map((skill, idx) => (
                                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.resources && item.resources.length > 0 && (
                          <div className="mt-4 p-4 bg-white/70 rounded-lg border border-indigo-200">
                            <p className="text-xs font-bold text-indigo-700 mb-2">📚 Learning Resources:</p>
                            <ul className="space-y-1">
                              {item.resources.map((resource, idx) => (
                                <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                                  <span className="text-indigo-500">•</span>
                                  <span>{resource}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Summary */}
              <div className="bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 rounded-2xl p-8 border-2 border-indigo-300 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-xl text-indigo-900 mb-3 flex items-center gap-2">
                      <span>Next Steps</span>
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-800 leading-relaxed flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">1.</span>
                        <span>Review each suggestion carefully and prioritize items marked as <strong>"HIGH IMPACT"</strong></span>
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">2.</span>
                        <span>Start with <span className="text-red-600 font-semibold">critical issues</span>, then move to improvements</span>
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">3.</span>
                        <span>Apply changes to your resume and <strong>re-upload</strong> to see your improved score!</span>
                      </p>
                    </div>
                    <div className="mt-4 p-4 bg-white/70 rounded-lg border border-indigo-200">
                      <p className="text-xs text-indigo-700 font-semibold">
                        💡 Pro Tip: Each improvement can significantly boost your ATS score and increase your chances of landing interviews.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
