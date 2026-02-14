import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileCheck, Sparkles } from 'lucide-react';

const ResultsHeader = ({ fileName }) => {
  const navigate = useNavigate();
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-blue-200/50 p-8 mb-8 shadow-xl hover:shadow-2xl transition-all duration-500 animate-slide-down overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400 to-purple-500 opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-400 to-purple-500 opacity-10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        {/* Back Button */}
        <button 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 mb-6 border border-gray-200 group"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-gray-700 group-hover:text-blue-600">Check Another Resume</span>
        </button>
        
        {/* Main Header Content */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-20 blur-2xl rounded-full animate-pulse"></div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg relative z-10">
                <FileCheck className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 flex items-center gap-2">
                Your Resume Analysis
                <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
              </h1>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-semibold">Analyzed on: {currentDate}</span>
                </div>
                {fileName && (
                  <div className="flex items-center gap-2 bg-blue-100/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-blue-200">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">{fileName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="bg-green-100 border-2 border-green-300 px-6 py-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold text-green-800">Analysis Complete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsHeader;
