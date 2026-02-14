import { Loader2 } from 'lucide-react';

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Analyzing Your Resume
        </h3>
        <p className="text-gray-600">
          Our AI is parsing your resume and extracting insights...
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span>Extracting text and structure...</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse delay-200"></div>
            <span>Analyzing skills and experience...</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse delay-400"></div>
            <span>Calculating ATS score...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
