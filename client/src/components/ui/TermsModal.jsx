import { useState } from 'react';
import { X, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';

export default function TermsModal({ isOpen, onClose, onAccept }) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (agreed) {
      onAccept();
      onClose();
    }
  };

  const handleClose = () => {
    setAgreed(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 animate-fade-in" 
      style={{ margin: 0, animation: 'fadeIn 0.2s ease-out' }}
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl w-full sm:w-[90%] md:w-[80%] lg:w-[700px] xl:w-[750px] max-w-2xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden shadow-2xl animate-scale-in flex flex-col mx-auto my-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white p-4 sm:p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertTriangle className="w-5 h-5 sm:w-7 sm:h-7 flex-shrink-0" />
            <h2 className="text-lg sm:text-2xl font-black leading-tight">Terms and Conditions</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-1" />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-amber-900 mb-1.5 sm:mb-2">
                  Important Notice
                </h3>
                <p className="text-sm sm:text-base text-amber-800 font-medium leading-relaxed">
                  Please read these terms carefully before uploading your resume. 
                  Compliance with these requirements is essential for accurate analysis 
                  and maximum ATS score.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="border-l-4 border-primary-500 pl-4 sm:pl-6 py-2">
              <h4 className="font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-primary-100 rounded-full text-primary-600 text-xs sm:text-sm font-black flex-shrink-0">1</span>
                <span className="text-sm sm:text-base">Make Your Profile Links Public</span>
              </h4>
              <p className="text-xs sm:text-base text-gray-700 leading-relaxed">
                All professional profile links included in your resume (LinkedIn, GitHub, 
                Portfolio, etc.) must be publicly accessible. Private or restricted profiles 
                cannot be verified and may result in a <strong className="text-red-600">reduced score</strong>.
              </p>
            </div>

            <div className="border-l-4 border-secondary-500 pl-4 sm:pl-6 py-2">
              <h4 className="font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-secondary-100 rounded-full text-secondary-600 text-xs sm:text-sm font-black flex-shrink-0">2</span>
                <span className="text-sm sm:text-base">Make Code URLs Public</span>
              </h4>
              <p className="text-xs sm:text-base text-gray-700 leading-relaxed">
                Any code repositories, GitHub projects, or technical portfolios referenced in 
                your resume must have <strong>public visibility</strong>. Private repositories 
                cannot be analyzed by our system or verified by recruiters.
              </p>
            </div>

            <div className="border-l-4 border-accent-500 pl-4 sm:pl-6 py-2">
              <h4 className="font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-accent-100 rounded-full text-accent-600 text-xs sm:text-sm font-black flex-shrink-0">3</span>
                <span className="text-sm sm:text-base">Include Public URLs for Projects</span>
              </h4>
              <p className="text-xs sm:text-base text-gray-700 leading-relaxed mb-2 sm:mb-3">
                <strong>This is critical:</strong> Every project listed in your resume should 
                include a public URL (GitHub repo, live demo, documentation, etc.). Projects 
                without verifiable links <strong className="text-red-600">will decrease your score</strong>.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                <p className="text-xs sm:text-sm text-blue-800 font-medium flex items-start gap-2">
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Examples:</strong> GitHub repository link, deployed website URL, 
                    Heroku/Vercel/Netlify deployment, documentation site, demo video, etc.
                  </span>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4 sm:pl-6 py-2">
              <h4 className="font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-green-100 rounded-full text-green-600 text-xs sm:text-sm font-black flex-shrink-0">4</span>
                <span className="text-sm sm:text-base">Showcase Your Work with Credibility</span>
              </h4>
              <p className="text-xs sm:text-base text-gray-700 leading-relaxed">
                Whatever you have accomplished in the form of projects, contributions, certifications, 
                or any work—include its <strong>public URL</strong> in your resume. This allows us to 
                verify your claims and helps recruiters see your credibility and technical capabilities.
              </p>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-red-900 mb-1.5 sm:mb-2 text-sm sm:text-base">Score Impact Warning</h4>
                <ul className="text-xs sm:text-sm text-red-800 space-y-0.5 sm:space-y-1 list-disc list-inside leading-relaxed">
                  <li>Missing project URLs will <strong>reduce your ATS score</strong></li>
                  <li>Private or inaccessible profiles cannot be verified</li>
                  <li>Unverifiable claims may be flagged by recruiters</li>
                  <li className="hidden sm:list-item">Public, accessible work demonstrates transparency and professionalism</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Checkbox Agreement */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <label className="flex items-start gap-3 sm:gap-4 cursor-pointer group touch-manipulation">
              <div className="relative flex-shrink-0 mt-0.5 sm:mt-1">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="peer sr-only"
                />
                <div className={`
                  w-6 h-6 sm:w-6 sm:h-6 border-2 rounded-md flex items-center justify-center transition-all
                  ${agreed 
                    ? 'bg-primary-600 border-primary-600' 
                    : 'border-gray-400 group-hover:border-primary-400'
                  }
                `}>
                  {agreed && <CheckCircle className="w-4 h-4 sm:w-4 sm:h-4 text-white" />}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm sm:text-base text-gray-900 font-semibold leading-relaxed">
                  I confirm that all profile links, code repositories, and project URLs 
                  included in my resume are <strong className="text-primary-600">publicly accessible</strong>. 
                  I understand that private or missing links may result in a reduced ATS score.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-4 sm:px-8 py-4 sm:py-6 border-t-2 border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-4 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 sm:px-6 py-3 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!agreed}
            className={`
              px-5 sm:px-8 py-3 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all duration-300 touch-manipulation
              ${agreed
                ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:shadow-lg active:scale-95 sm:hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
