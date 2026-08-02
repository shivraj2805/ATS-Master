import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Download, Code, Trophy, Target, Lightbulb, Award, TrendingUp, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const CPResultPage = () => {
  const navigate = useNavigate();
  const [cpReport, setCpReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    // Get CP report from sessionStorage
    const storedReport = sessionStorage.getItem('cpReport');
    
    if (!storedReport) {
      // No report found, redirect back
      navigate('/analyze-report');
      return;
    }

    try {
      const parsedReport = JSON.parse(storedReport);
      setCpReport(parsedReport);
    } catch (error) {
      console.error('Failed to parse CP report:', error);
      navigate('/analyze-report');
    }
  }, [navigate]);

  const handleCopy = () => {
    if (cpReport) {
      navigator.clipboard.writeText(JSON.stringify(cpReport, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (cpReport) {
      const dataStr = JSON.stringify(cpReport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cp-report-${cpReport.platform_data?.leetcode?.username || 'analysis'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleBack = () => {
    navigate('/analyze-report');
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A+': 'from-green-500 to-emerald-600',
      'A': 'from-green-500 to-green-600',
      'B': 'from-blue-500 to-blue-600',
      'C': 'from-yellow-500 to-orange-500',
      'D': 'from-orange-500 to-red-500',
      'F': 'from-red-500 to-red-700'
    };
    return colors[grade] || 'from-gray-500 to-gray-600';
  };

  if (!cpReport) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-red-50/30">
      <Navbar />
      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-in flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-3 hover:bg-white/80 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 bg-white/60 backdrop-blur-sm border border-gray-200"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
                  Competitive Programming Analysis
                </h1>
                <p className="text-gray-600 mt-1">
                  {cpReport.platform_data?.leetcode?.username && `@${cpReport.platform_data.leetcode.username} • `}
                  Comprehensive Profile Report
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg transition-all duration-300 hover:shadow-md border border-gray-200 font-medium text-sm"
              >
                <Download className="w-4 h-4 text-gray-700" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Overall Score Banner */}
          <div className={`bg-gradient-to-r ${getGradeColor(cpReport.grade)} rounded-2xl p-8 text-white shadow-2xl mb-8 animate-slide-up`}>
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                  <Trophy className="w-16 h-16" />
                </div>
                <div>
                  <p className="text-sm opacity-90 uppercase tracking-wider mb-1">Overall Performance</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black">{cpReport.overall_score}</span>
                    <span className="text-3xl font-bold opacity-80">/100</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    <span className="text-xl font-bold">Grade {cpReport.grade}</span>
                  </div>
                </div>
              </div>
              {cpReport.resume_cp_insights && (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm opacity-90 mb-1">Resume Impact Score</p>
                  <p className="text-3xl font-bold">{cpReport.resume_cp_insights.resume_score_from_cp}/100</p>
                </div>
              )}
            </div>
          </div>

          {/* Platform Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <Code className="w-8 h-8 text-orange-600" />
                <span className="text-xs font-semibold px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
                  Total
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900 mb-1">
                {cpReport.platform_data?.leetcode?.stats?.solved_total || 0}
              </p>
              <p className="text-sm text-gray-600">Problems Solved</p>
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <Target className="w-8 h-8 text-green-600" />
                <span className="text-xs font-semibold px-3 py-1 bg-green-100 text-green-700 rounded-full">
                  Easy
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900 mb-1">
                {cpReport.platform_data?.leetcode?.stats?.easy || 0}
              </p>
              <p className="text-sm text-gray-600">Easy Problems</p>
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-yellow-200 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-8 h-8 text-yellow-600" />
                <span className="text-xs font-semibold px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                  Medium
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900 mb-1">
                {cpReport.platform_data?.leetcode?.stats?.medium || 0}
              </p>
              <p className="text-sm text-gray-600">Medium Problems</p>
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-red-200 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <Award className="w-8 h-8 text-red-600" />
                <span className="text-xs font-semibold px-3 py-1 bg-red-100 text-red-700 rounded-full">
                  Hard
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900 mb-1">
                {cpReport.platform_data?.leetcode?.stats?.hard || 0}
              </p>
              <p className="text-sm text-gray-600">Hard Problems</p>
            </div>
          </div>

          {/* Platform Scores */}
          {cpReport.platform_scores && Object.keys(cpReport.platform_scores).length > 0 && (
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-orange-600" />
                Platform Performance Breakdown
              </h3>
              <div className="space-y-4">
                {Object.entries(cpReport.platform_scores).map(([platform, score]) => (
                  <div key={platform} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700 capitalize">{platform}</span>
                      <span className="text-lg font-bold text-gray-900">{score}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          score >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          score >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          score >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-orange-500 to-red-500'
                        }`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resume-Ready Summary */}
          {cpReport.resume_cp_insights?.ats_cp_summary && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200 shadow-lg mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-purple-600" />
                Resume-Ready Summary
              </h3>
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {cpReport.resume_cp_insights.ats_cp_summary}
                </p>
              </div>
              {cpReport.resume_cp_insights.resume_score_breakdown && 
               Object.keys(cpReport.resume_cp_insights.resume_score_breakdown).length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(cpReport.resume_cp_insights.resume_score_breakdown).map(([key, value]) => (
                    <div key={key} className="bg-white rounded-lg p-3 border border-purple-100">
                      <p className="text-xs text-gray-600 mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xl font-bold text-purple-600">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Skills Inferred */}
          {cpReport.skills_inferred && cpReport.skills_inferred.length > 0 && (
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Code className="w-6 h-6 text-blue-600" />
                Skills & Technologies Detected
              </h3>
              <div className="flex flex-wrap gap-2">
                {cpReport.skills_inferred.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Strengths */}
            {cpReport.strengths && cpReport.strengths.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Key Strengths
                </h3>
                <ul className="space-y-3">
                  {cpReport.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-green-100">
                      <span className="text-green-600 mt-1 flex-shrink-0">✓</span>
                      <span className="text-gray-700 text-sm leading-relaxed">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gaps */}
            {cpReport.gaps && cpReport.gaps.length > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border-2 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Areas for Improvement
                </h3>
                <ul className="space-y-3">
                  {cpReport.gaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-red-100">
                      <span className="text-red-600 mt-1 flex-shrink-0">!</span>
                      <span className="text-gray-700 text-sm leading-relaxed">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Plan */}
          {cpReport.action_items && cpReport.action_items.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-blue-600" />
                Personalized Action Plan
              </h3>
              <div className="space-y-4">
                {cpReport.action_items.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-4 bg-white rounded-lg p-4 border border-blue-100 hover:shadow-md transition-all duration-300">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-gray-700 leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resume Improvement Bullets */}
          {cpReport.resume_cp_insights?.improvement_bullets && 
           cpReport.resume_cp_insights.improvement_bullets.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border-2 border-amber-200 shadow-lg mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-amber-600" />
                Resume Enhancement Suggestions
              </h3>
              <div className="space-y-3">
                {cpReport.resume_cp_insights.improvement_bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-white rounded-lg p-4 border border-amber-100">
                    <span className="text-amber-600 font-bold flex-shrink-0">→</span>
                    <span className="text-gray-700 leading-relaxed">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LLM Analysis (if available) */}
          {cpReport.llm_analysis && (
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-purple-600" />
                AI-Powered Deep Analysis
              </h3>
              
              {cpReport.llm_analysis.resume_ready_summary && (
                <div className="mb-6 bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Professional Summary</p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {cpReport.llm_analysis.resume_ready_summary}
                  </p>
                </div>
              )}

              {cpReport.llm_analysis.action_plan_2_weeks && 
               cpReport.llm_analysis.action_plan_2_weeks.length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">2-Week Action Plan</p>
                  <ol className="space-y-2">
                    {cpReport.llm_analysis.action_plan_2_weeks.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">{idx + 1}.</span>
                        <span className="text-gray-700 text-sm">{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

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
                  <span className="text-gray-300 font-mono text-sm">cp-report.json</span>
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
                    {JSON.stringify(cpReport, null, 2)}
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

export default CPResultPage;
