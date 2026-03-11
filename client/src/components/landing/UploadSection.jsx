import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import TermsModal from '../ui/TermsModal';

export default function UploadSection() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    setValidationError(null);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!termsAccepted) {
        setPendingFile(droppedFile);
        setShowTermsModal(true);
      } else {
        validateAndSetFile(droppedFile);
      }
    }
  }, [termsAccepted]);

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!termsAccepted) {
        setPendingFile(selectedFile);
        setShowTermsModal(true);
      } else {
        validateAndSetFile(selectedFile);
      }
    }
  };

  const validateAndSetFile = (file) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      setValidationError('Invalid file type. Please upload PDF or DOCX');
      return;
    }

    if (file.size > maxSize) {
      setValidationError('File size exceeds 5MB limit');
      return;
    }

    setFile(file);
    setValidationError(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setValidationError(null);
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    if (pendingFile) {
      validateAndSetFile(pendingFile);
      setPendingFile(null);
    }
  };

  const handleTermsClose = () => {
    setShowTermsModal(false);
    setPendingFile(null);
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setValidationError('Job description is required for accurate analysis');
      return;
    }

    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setValidationError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobDescription', jobDescription);
    if (jobTitle) formData.append('jobTitle', jobTitle);
    if (company) formData.append('company', company);

    try {
      const response = await fetch('http://localhost:3001/api/resume/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze resume');
      }

      const data = await response.json();

      // Clear old profile analysis reports from previous resumes to prevent username conflicts
      sessionStorage.removeItem('githubReport');
      sessionStorage.removeItem('cpReport');
      console.log('🧹 Cleared old profile reports from sessionStorage');

      // Store results in sessionStorage
      sessionStorage.setItem('analysisResults', JSON.stringify(data));

      // Use profile analysis from backend (already computed during the 57s wait)
      let githubReport = null;
      let cpReport = null;

      console.log('\n📊 Using Backend Profile Analysis:');
      
      // Extract profile analysis from backend response
      if (data.profile_analysis) {
        if (data.profile_analysis.github && !data.profile_analysis.github.error) {
          githubReport = data.profile_analysis.github;
          console.log(`  • GitHub: ✅ ${githubReport.overall_score}/100 (${githubReport.grade})`);
        } else if (data.profile_analysis.github?.error) {
          console.log(`  • GitHub: ❌ ${data.profile_analysis.github.error}`);
        } else {
          console.log('  • GitHub: ➖ Not found');
        }
        
        if (data.profile_analysis.competitive_programming && !data.profile_analysis.competitive_programming.error) {
          cpReport = data.profile_analysis.competitive_programming;
          console.log(`  • CP: ✅ ${cpReport.overall_score}/100 (${cpReport.grade})`);
        } else if (data.profile_analysis.competitive_programming?.error) {
          console.log(`  • CP: ❌ ${data.profile_analysis.competitive_programming.error}`);
        } else {
          console.log('  • CP: ➖ Not found');
        }
      } else {
        console.log('  • No profile analysis available from backend');
      }

      // Store reports in sessionStorage
      if (githubReport) {
        sessionStorage.setItem('githubReport', JSON.stringify(githubReport));
        console.log('💾 GitHub report stored');
      }
      if (cpReport) {
        sessionStorage.setItem('cpReport', JSON.stringify(cpReport));
        console.log('💾 CP report stored');
      }

      // All analyses complete - navigate to results
      console.log('\n🎯 Navigating to results page...\n');
      navigate('/analyze-report');
    } catch (err) {
      setError(err.message || 'An error occurred');
      setValidationError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayError = error || validationError;

  return (
    <>
      {/* Terms and Conditions Modal - Rendered at top level */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={handleTermsClose}
        onAccept={handleTermsAccept}
      />

      <section id="upload" className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-gray-900 via-primary-900 to-secondary-900 bg-clip-text text-transparent mb-4">
              Upload Your Resume
            </h2>
            <p className="text-lg text-gray-600 font-medium">
              Drop your resume file and let our <span className="text-primary-600 font-bold">AI analyze</span> it for ATS compatibility
            </p>
          </div>

          <div>
            {/* Loading Overlay */}
          {isAnalyzing && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="glass rounded-3xl p-10 max-w-md mx-4 text-center shadow-hard animate-scale-in">
                <Loader2 className="w-20 h-20 text-primary-600 animate-spin mx-auto mb-6" />
                <h3 className="text-2xl font-black bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-3">Analyzing Your Resume</h3>
                <p className="text-gray-700 font-medium mb-2">Our AI is evaluating your resume for skills, experience, structure, and job relevance.</p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {displayError && (
            <div className="mb-6 animate-shake">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-2xl text-red-700 shadow-soft">
                <AlertCircle className="w-6 h-6 flex-shrink-0 animate-pulse" />
                <span className="text-sm font-bold">{displayError}</span>
              </div>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !file && document.getElementById('file-input').click()}
            className={`
              relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer 
              transition-all duration-500 hover-lift
              ${isDragging
                ? 'border-primary-500 bg-primary-50 scale-105 shadow-glow'
                : file
                  ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-colored'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gradient-to-br hover:from-primary-50 hover:to-secondary-50 shadow-soft'
              }
            `}
          >
            <input
              type="file"
              id="file-input"
              accept=".pdf,.docx"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />

            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-900">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  {isDragging ? 'Drop your resume here' : 'Drag & drop your resume'}
                </p>
                <p className="text-gray-500 mb-4">or click to browse</p>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="px-3 py-1 bg-gray-100 rounded-full">PDF</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full">DOCX</span>
                  <span className="text-gray-300">•</span>
                  <span>Max 5MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Job Description Section - Required */}
          {file && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Job Description <span className="text-red-500">*</span>
                </h3>
                <span className="text-sm text-gray-500">Required for analysis</span>
              </div>

              <div className="space-y-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Google"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description
                  </label>
                  <textarea
                    id="jobDescription"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here to compare your resume against specific requirements..."
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Provide job description for accurate semantic analysis and skill matching
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Analyze Button */}
          {file && (
            <div className="mt-6 text-center animate-slide-in-scale">
              <button
                onClick={handleAnalyze}
                className="group relative px-12 py-5 text-lg bg-gradient-to-r from-primary-600 via-secondary-600 to-accent-600 text-white rounded-2xl shadow-colored hover:shadow-glow-lg transition-all duration-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-black flex items-center gap-3 mx-auto overflow-hidden"
                disabled={!jobDescription.trim() || isAnalyzing}
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                <span className="relative z-10">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Resume with AI'
                  )}
                </span>
              </button>
              <p className="mt-4 text-sm text-gray-600 font-medium">
                ✨ AI-powered semantic analysis and optimization suggestions
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
    </>
  );
}
