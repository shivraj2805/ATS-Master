import { ArrowRight, CheckCircle2, Shield, Zap, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-24 pb-24 overflow-hidden bg-gradient-to-br from-cyan-50 to-blue-50">
      {/* Soft Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-cyan-200/30 to-blue-300/30 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/30 to-blue-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-gradient-to-br from-blue-200/25 to-blue-300/25 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-cyan-200 mb-6 shadow-sm">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-gray-700">
              RESUME CHECKER
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-5 leading-tight">
            Is your resume good
            <br />
            enough?
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-gray-700 max-w-2xl mb-8 leading-relaxed">
            A free and fast AI resume checker doing 16 crucial checks to ensure your resume
            is ready to perform and get you interview callbacks.
          </p>

          {/* Upload Box */}
          <div className="max-w-md">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-cyan-300 p-6 text-center hover:border-cyan-400 transition-all cursor-pointer shadow-lg">
              <p className="text-gray-700 mb-4 font-medium">
                Drop your resume here or choose a file.
                <br />
                <span className="text-sm text-gray-500">PDF & DOCX only. Max 2MB file size.</span>
              </p>
              <button
                onClick={() => {
                  const uploadSection = document.getElementById('upload');
                  if (uploadSection) {
                    uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Upload Your Resume
              </button>
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-600">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Privacy guaranteed</span>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center gap-6 mt-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="font-medium">Blazingly Fast ⚡</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="font-medium">Zero Data Stored 🔒</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              <span className="font-medium">100% Open Source</span>
            </div>
          </div>
        </div>

        {/* Resume Preview Mockup - Right Side */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-[450px]">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
            {/* Resume Score Circle */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-semibold text-gray-600">Resume Score</span>
              <div className="relative w-20 h-20">
                <svg className="transform -rotate-90 w-20 h-20">
                  <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                  <circle cx="40" cy="40" r="36" stroke="url(#gradient)" strokeWidth="8" fill="none" strokeDasharray="226" strokeDashoffset="56" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black text-gray-900">75</span>
                </div>
              </div>
            </div>

            {/* Content Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <span className="text-xs font-bold text-gray-700">CONTENT</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">ATS PARSE RATE</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
