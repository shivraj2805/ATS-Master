import { CheckCircle, XCircle, AlertCircle, Github, Star, GitFork, ExternalLink, Clock, Code2 } from 'lucide-react';

export default function ProjectVerification({ verification }) {
  // Debug logging
  console.log('ProjectVerification received:', verification);
  
  // Check if verification exists and has results
  if (!verification || !verification.results || verification.results.length === 0) {
    console.log('No verification data provided');
    return null;
  }

  const { results, summary, github_username } = verification;

  // Calculate Average Project Quality Score
  const calculateProjectScores = () => {
    const T = summary.total_projects;
    const F = summary.found;
    const M = summary.maybe;
    const N = summary.not_found;

    // 1. Verification Score (already in summary.verification_rate)
    const verificationScore = summary.verification_rate;

    // 2. Average Project Quality Score
    let totalWeightedQuality = 0;
    let totalWeight = 0;

    results.forEach(result => {
      if (result.quality && result.quality.score) {
        const quality = result.quality.score;
        let weight = 0;

        if (result.present === 'FOUND') {
          weight = 1;
        } else if (result.present === 'MAYBE') {
          weight = 0.5;
        }

        if (weight > 0) {
          totalWeightedQuality += quality * weight;
          totalWeight += weight;
        }
      }
    });

    const avgProjectQuality = totalWeight > 0 ? totalWeightedQuality / totalWeight : 0;

    // 3. Base Project Score (don't round intermediate values)
    const baseProjectScore = 0.70 * verificationScore + 0.30 * avgProjectQuality;

    // 4. Missing-Project Penalty Factor
    const alpha = 1.2;
    const missingRatio = T > 0 ? N / T : 0;
    const penaltyFactor = Math.exp(-alpha * missingRatio);

    // 5. Final Project Section Score (round only at the end)
    const finalProjectScore = baseProjectScore * penaltyFactor;

    console.log('🔍 Project Score Calculation:', {
      verificationScore,
      avgProjectQuality: avgProjectQuality.toFixed(2),
      baseProjectScore: baseProjectScore.toFixed(2),
      penaltyFactor: penaltyFactor.toFixed(2),
      finalProjectScore: Math.round(finalProjectScore)
    });

    return {
      avgProjectQuality: Math.round(avgProjectQuality),
      baseProjectScore: Math.round(baseProjectScore),
      finalProjectScore: Math.round(finalProjectScore),
      penaltyFactor: penaltyFactor.toFixed(2)
    };
  };

  const projectScores = calculateProjectScores();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'FOUND':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'MAYBE':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'NOT_FOUND':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'FOUND':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'MAYBE':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'NOT_FOUND':
        return 'bg-red-50 border-red-200 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getQualityColor = (score) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVerificationRateColor = (rate) => {
    if (rate >= 75) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 p-6 hover:shadow-xl transition-all duration-500 animate-slide-up animation-delay-500">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Github className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900">GitHub Project Verification</h3>
            <p className="text-sm text-gray-600">
              Verified against @{github_username}'s repositories
            </p>
          </div>
        </div>

        {/* Verification Summary */}
        <div className="flex items-center gap-3">
          {/* Final Project Score - Most Important */}
          <div className="text-center px-5 py-3 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border-2 border-green-300 shadow-md">
            <div className={`text-3xl font-black ${getQualityColor(projectScores.finalProjectScore)}`}>
              {projectScores.finalProjectScore}
            </div>
            <div className="text-xs text-gray-700 font-bold mt-1">Project Score</div>
          </div>

          {/* Supporting Metrics */}
          <div className="flex flex-col gap-2">
            <div className="text-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <span className={`text-lg font-bold ${getVerificationRateColor(summary.verification_rate)}`}>
                {summary.verification_rate}%
              </span>
              <span className="text-sm text-gray-600 ml-2">Verified</span>
            </div>
            <div className="text-xs text-gray-700">
              <span className="text-green-600 font-semibold">{summary.found} Found</span> · 
              <span className="text-yellow-600 font-semibold ml-1">{summary.maybe} Maybe</span> · 
              <span className="text-red-600 font-semibold ml-1">{summary.not_found} Not Found</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Scoring Breakdown */}
      <div className="mt-5 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border-2 border-cyan-200">
        <h4 className="text-sm font-bold text-cyan-900 mb-3 flex items-center gap-2">
          <Star className="w-4 h-4" />
          How Your Project Score is Calculated
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
            <div className="text-xs text-gray-600 mb-1">① Verification Rate</div>
            <div className="text-lg font-black text-blue-700">{summary.verification_rate}%</div>
            <div className="text-xs text-gray-500 mt-1">
              Projects found on GitHub
            </div>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-orange-100">
            <div className="text-xs text-gray-600 mb-1">② Credibility Factor</div>
            <div className="text-lg font-black text-orange-700">×{projectScores.penaltyFactor}</div>
            <div className="text-xs text-gray-500 mt-1">
              {summary.not_found === 0 ? 'No missing projects' : `Penalty for ${summary.not_found} missing`}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg p-3 border-2 border-green-300">
            <div className="text-xs text-gray-700 mb-1 font-bold">③ Final Score</div>
            <div className={`text-xl font-black ${getQualityColor(projectScores.finalProjectScore)}`}>
              {projectScores.finalProjectScore}/100
            </div>
            <div className="text-xs text-gray-600 mt-1 font-semibold">
              Your project rating
            </div>
          </div>
        </div>
        <div className="mt-3 p-3 bg-white/70 rounded-lg border border-indigo-200">
          <div className="text-xs text-indigo-900 font-semibold mb-1">📐 Formula:</div>
          <div className="text-xs text-indigo-700">
            Final Score = (70% × <span className="font-bold">Verification</span> + 30% × <span className="font-bold">Quality</span>) × <span className="font-bold">Credibility</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Quality is automatically calculated from project stars, activity, documentation, and tech stack.
          </div>
        </div>
      </div>

      {/* Verification Results */}
      <div className="space-y-4 mt-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-md ${getStatusColor(result.present)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(result.present)}
                <div className="flex-1">
                  <h4 className="text-lg font-bold mb-1">{result.resume_project.name}</h4>
                  <p className="text-sm text-gray-700 mb-2">{result.resume_project.description}</p>
                  
                  {/* Match Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      result.present === 'FOUND' ? 'bg-green-100 text-green-800' :
                      result.present === 'MAYBE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.present}
                    </span>
                    <span className="text-xs text-gray-600">
                      Confidence: {Math.round(result.match_confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Matched Repository Details */}
            {result.matched_repo && (
              <div className="mt-4 p-4 bg-white/70 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Code2 className="w-4 h-4 text-blue-600" />
                      <a
                        href={result.matched_repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm hover:underline"
                      >
                        {result.matched_repo.full_name}
                        <ExternalLink className="w-3 h-3 inline ml-1" />
                      </a>
                      <span className="text-xs text-gray-500">
                        Match: {result.matched_repo.score}/100
                      </span>
                    </div>

                    {/* Quality Score */}
                    {result.quality && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span>{result.quality.breakdown.stars} stars</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <GitFork className="w-3 h-3 text-gray-500" />
                            <span>{result.quality.breakdown.forks} forks</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>{result.quality.breakdown.last_push_days} days ago</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">Quality Score:</span>
                          <span className={`text-sm font-black ${getQualityColor(result.quality.score)}`}>
                            {result.quality.score}/100
                          </span>
                        </div>

                        {/* Quality Signals */}
                        {result.quality.signals && result.quality.signals.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-600 space-y-1">
                              {result.quality.signals.slice(0, 3).map((signal, idx) => (
                                <div key={idx} className="flex items-start gap-1">
                                  <span className="text-blue-500">•</span>
                                  <span>{signal}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Top Candidates (for MAYBE/NOT_FOUND) */}
            {result.present !== 'FOUND' && result.top_candidates && result.top_candidates.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <p className="text-xs font-semibold text-gray-700 mb-2">Top Matching Repositories:</p>
                <div className="space-y-1">
                  {result.top_candidates.slice(0, 3).map((candidate, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <a
                        href={candidate.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {candidate.full_name}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-gray-500">Score: {candidate.score}/100</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="mt-5 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
        <h4 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Why Verification Matters
        </h4>
        <p className="text-sm text-blue-800">
          Verifying your resume projects against actual GitHub repositories demonstrates credibility and validates 
          your practical experience. High-quality, well-maintained repositories strengthen your profile.
        </p>
      </div>
    </div>
  );
}
