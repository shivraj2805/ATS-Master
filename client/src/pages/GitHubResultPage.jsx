import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Github, Star, GitFork, Code, TrendingUp, Award, Target, Lightbulb, ChevronDown, ChevronUp, Copy, Check, Activity, Zap, Shield, Sparkles, BarChart, GitBranch } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const GitHubResultPage = () => {
  const navigate = useNavigate();
  const [githubReport, setGithubReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    // Get GitHub report from sessionStorage
    const storedReport = sessionStorage.getItem('githubReport');
    
    if (!storedReport) {
      // No report found, redirect back
      navigate('/analyze-report');
      return;
    }

    try {
      const parsedReport = JSON.parse(storedReport);
      setGithubReport(parsedReport);
    } catch (error) {
      console.error('Failed to parse GitHub report:', error);
      navigate('/analyze-report');
    }
  }, [navigate]);

  const handleCopy = () => {
    if (githubReport) {
      navigator.clipboard.writeText(JSON.stringify(githubReport, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (githubReport) {
      const dataStr = JSON.stringify(githubReport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `github-report-${githubReport.username || 'analysis'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleBack = () => {
    navigate('/analyze-report');
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-blue-500 to-blue-600';
    if (score >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-orange-500 to-red-500';
  };

  if (!githubReport) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      <Navbar />
      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-in flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-3 hover:bg-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 bg-white/60 backdrop-blur-sm border border-gray-300"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-700 via-gray-900 to-black bg-clip-text text-transparent">
                  GitHub Portfolio Analysis
                </h1>
                <p className="text-gray-600 mt-1">
                  {githubReport.username && `@${githubReport.username} • `}
                  Comprehensive Repository Report
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg transition-all duration-300 hover:shadow-md border border-gray-300 font-medium text-sm"
              >
                <Download className="w-4 h-4 text-gray-700" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Overall Score Banner */}
          <div className={`bg-gradient-to-r ${getScoreColor(githubReport.overall_score)} rounded-2xl p-8 text-white shadow-2xl mb-8 animate-slide-up`}>
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                  <Github className="w-16 h-16" />
                </div>
                <div>
                  <p className="text-sm opacity-90 uppercase tracking-wider mb-1">Overall Portfolio Score</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black">{githubReport.overall_score}</span>
                    <span className="text-3xl font-bold opacity-80">/100</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    <span className="text-xl font-bold">{githubReport.grade || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm opacity-90 mb-1">Username</p>
                  <p className="text-2xl font-bold">@{githubReport.username || 'N/A'}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm opacity-90 mb-1">Good Repos</p>
                  <p className="text-3xl font-bold">{githubReport.good_repos?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          {githubReport.final_summary && (
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-indigo-200 shadow-xl mb-8 animate-slide-up">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-3">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    AI-Powered Summary
                    <span className="text-xs px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full font-semibold">
                      Gemini Analysis
                    </span>
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {githubReport.final_summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* GitHub Strength Metrics */}
          {githubReport.github_strength && (
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-xl mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Zap className="w-8 h-8 text-yellow-500" />
                GitHub Strength Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Profile Score */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <Github className="w-10 h-10 text-blue-600" />
                    <span className="text-4xl font-black text-blue-600">
                      {githubReport.github_strength.profile_score || 0}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">Profile Score</h4>
                  <p className="text-sm text-gray-600">GitHub profile completeness</p>
                </div>

                {/* Repository Score */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <GitBranch className="w-10 h-10 text-green-600" />
                    <span className="text-4xl font-black text-green-600">
                      {Math.round(githubReport.github_strength.repo_score) || 0}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">Avg. Repo Score</h4>
                  <p className="text-sm text-gray-600">Repository quality metric</p>
                </div>

                {/* Activity Level */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="w-10 h-10 text-purple-600" />
                    <span className={`text-2xl font-black ${
                      githubReport.github_strength.activity_level === 'High' ? 'text-green-600' :
                      githubReport.github_strength.activity_level === 'Medium' ? 'text-yellow-600' :
                      'text-orange-600'
                    }`}>
                      {githubReport.github_strength.activity_level || 'N/A'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">Activity Level</h4>
                  <p className="text-sm text-gray-600">Contribution frequency</p>
                </div>

                {/* Engineering Maturity */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <Shield className="w-10 h-10 text-orange-600" />
                    <span className={`text-2xl font-black ${
                      githubReport.github_strength.engineering_maturity === 'Strong' ? 'text-green-600' :
                      githubReport.github_strength.engineering_maturity === 'Good' ? 'text-blue-600' :
                      'text-yellow-600'
                    }`}>
                      {githubReport.github_strength.engineering_maturity || 'N/A'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">Eng. Maturity</h4>
                  <p className="text-sm text-gray-600">Code quality standards</p>
                </div>

                {/* Project Hygiene */}
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border-2 border-teal-200 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <BarChart className="w-10 h-10 text-teal-600" />
                    <span className={`text-2xl font-black ${
                      githubReport.github_strength.project_hygiene === 'Good' ? 'text-green-600' :
                      githubReport.github_strength.project_hygiene === 'Fair' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {githubReport.github_strength.project_hygiene || 'N/A'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">Project Hygiene</h4>
                  <p className="text-sm text-gray-600">Documentation & standards</p>
                </div>
              </div>
            </div>
          )}

          {/* Top Projects */}
          {githubReport.top_projects && githubReport.top_projects.length > 0 && (
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-xl mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-500" />
                Top Projects
                <span className="text-sm px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold">
                  {githubReport.top_projects.length} Featured
                </span>
              </h3>
              <div className="space-y-4">
                {githubReport.top_projects.map((project, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm">
                            #{idx + 1}
                          </div>
                          <h4 className="text-xl font-bold text-gray-900">{project.name}</h4>
                          {project.url && (
                            <a 
                              href={project.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-gray-600 mb-3 leading-relaxed">{project.description}</p>
                        )}
                      </div>
                      <div className={`px-6 py-3 rounded-xl font-black text-lg shadow-md ${
                        project.score >= 80 ? 'bg-green-500 text-white' :
                        project.score >= 60 ? 'bg-blue-500 text-white' :
                        project.score >= 40 ? 'bg-yellow-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                        {project.score}/100
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <span className="font-bold text-gray-700">{project.stars || 0} stars</span>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-300">
                        <GitFork className="w-5 h-5 text-gray-600" />
                        <span className="font-bold text-gray-700">{project.forks || 0} forks</span>
                      </div>
                      {project.language && (
                        <span className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-bold shadow-md">
                          {project.language}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Good Repositories Showcase */}
          {githubReport.good_repos && githubReport.good_repos.length > 0 && (
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-xl mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Code className="w-8 h-8 text-green-600" />
                Quality Repositories
                <span className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                  {githubReport.good_repos.length} Repos
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {githubReport.good_repos.slice(0, 6).map((repo, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border-2 border-green-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-bold text-gray-900 flex-1">{repo.name}</h4>
                      <span className="text-green-600 font-bold text-sm">
                        {repo.score || 'N/A'}/100
                      </span>
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {repo.stars || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-4 h-4" />
                        {repo.forks || 0}
                      </span>
                      {repo.language && (
                        <span className="px-2 py-1 bg-white rounded border border-gray-300 font-semibold">
                          {repo.language}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {githubReport.good_repos.length > 6 && (
                <p className="text-center text-gray-500 mt-4 text-sm">
                  + {githubReport.good_repos.length - 6} more quality repositories
                </p>
              )}
            </div>
          )}

          {/* ATS Signals */}
          {githubReport.ats_signals && (
            <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-8 border-2 border-purple-200 shadow-xl mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Target className="w-8 h-8 text-purple-600" />
                ATS Signals & Job Alignment
                <span className="text-xs px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full font-semibold">
                  Recruiter View
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-md hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      githubReport.ats_signals.keyword_alignment?.includes('High') ? 'bg-green-100 text-green-700' :
                      githubReport.ats_signals.keyword_alignment?.includes('Medium') ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {githubReport.ats_signals.keyword_alignment?.split(' ')[0] || 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 font-semibold">Keyword Alignment</p>
                  <p className="text-2xl font-bold text-purple-600">{githubReport.ats_signals.keyword_alignment || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-xl p-6 border-2 border-yellow-200 shadow-md hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      githubReport.ats_signals.opensource_impact === 'Strong' ? 'bg-green-100 text-green-700' :
                      githubReport.ats_signals.opensource_impact === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {githubReport.ats_signals.opensource_impact || 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 font-semibold">Open Source Impact</p>
                  <p className="text-2xl font-bold text-yellow-600">{githubReport.ats_signals.opensource_impact || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-md hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      githubReport.ats_signals.consistency === 'Active' || githubReport.ats_signals.consistency === 'High' ? 'bg-green-100 text-green-700' :
                      githubReport.ats_signals.consistency === 'Regular' || githubReport.ats_signals.consistency === 'Medium' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {githubReport.ats_signals.consistency || 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 font-semibold">Consistency</p>
                  <p className="text-2xl font-bold text-green-600">{githubReport.ats_signals.consistency || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations & Risks Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Recommendations */}
            {githubReport.recommendations && githubReport.recommendations.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-300 shadow-xl hover:shadow-2xl transition-all duration-300">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Lightbulb className="w-8 h-8 text-green-600" />
                  Actionable Improvements
                </h3>
                <ul className="space-y-4">
                  {githubReport.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-4 bg-white rounded-xl p-4 border-2 border-green-200 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                      <span className="text-gray-700 leading-relaxed flex-1">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {githubReport.risks && githubReport.risks.length > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-8 border-2 border-red-300 shadow-xl hover:shadow-2xl transition-all duration-300">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Areas Needing Attention
                </h3>
                <ul className="space-y-4">
                  {githubReport.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-4 bg-white rounded-xl p-4 border-2 border-red-200 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold text-xl">
                        !
                      </div>
                      <span className="text-gray-700 leading-relaxed flex-1">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Raw JSON (Collapsible) */}
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden mb-8">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-900">Raw JSON Data</span>
                <span className="text-xs text-gray-500">(for developers)</span>
              </div>
              {showRawJson ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
            
            {showRawJson && (
              <div className="border-t-2 border-gray-200">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-3 flex items-center justify-between">
                  <span className="text-gray-300 font-mono text-sm">github-report.json</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors duration-200"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-gray-300" />
                        <span className="text-gray-300">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-6 bg-gray-50 overflow-x-auto max-h-96">
                  <pre className="text-xs font-mono text-gray-800 leading-relaxed">
                    {JSON.stringify(githubReport, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default GitHubResultPage;
