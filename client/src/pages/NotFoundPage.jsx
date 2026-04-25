import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full text-center">
        {/* Large 404 */}
        <div className="mb-8">
          <div className="text-9xl font-black text-gray-300 mb-4">404</div>
          <div className="flex justify-center mb-6">
            <AlertCircle size={80} className="text-red-500" />
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-4xl font-black text-gray-900 mb-4">
          Page Not Found
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4 flex-col sm:flex-row justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home size={20} />
            Go Home
          </button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 p-6 bg-white rounded-xl border-2 border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Need help?</h3>
          <p className="text-gray-600 text-sm">
            If you believe this is an error, please contact support at{' '}
            <a href="mailto:support@atsmaster.com" className="text-blue-600 font-semibold hover:underline">
              support@atsmaster.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
