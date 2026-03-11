import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Fingerprint, AlertCircle, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-cyan-50/50 to-blue-50/50 px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">ATS Master</span>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h1 className="text-5xl font-black text-gray-900 mb-3 leading-tight">
              Hello,<br />Welcome Back
            </h1>
            <p className="text-gray-600 text-base">Hey, welcome back to your special place</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-slide-down shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm placeholder:text-gray-400 shadow-sm hover:border-gray-300"
                placeholder="stanley@gmail.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm placeholder:text-gray-400 shadow-sm hover:border-gray-300"
                placeholder="••••••••••••"
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-400 cursor-pointer"
                />
                <span className="ml-2.5 text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-gray-600 hover:text-cyan-600 transition-colors">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] transform"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-bold text-cyan-600 hover:text-cyan-700 transition-colors">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-400 via-blue-400 to-blue-500 items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative clouds */}
        <div className="absolute top-10 left-10 w-32 h-20 bg-white/20 rounded-full blur-2xl"></div>
        <div className="absolute top-20 right-20 w-40 h-24 bg-white/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-20 w-36 h-22 bg-white/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 right-10 w-28 h-18 bg-white/20 rounded-full blur-2xl"></div>

        {/* Main illustration container */}
        <div className="relative z-10 text-center">
          {/* Animated floating phone mockup */}
          <div className="relative mx-auto w-64 h-96 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl shadow-2xl transform rotate-6 hover:rotate-0 transition-transform duration-500">
            <div className="absolute inset-4 bg-white rounded-2xl flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center shadow-inner">
                  <Fingerprint className="w-16 h-16 text-cyan-600 animate-pulse" />
                </div>
                <div className="space-y-3 px-4">
                  <div className="h-2.5 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-full w-3/4 mx-auto"></div>
                  <div className="h-2.5 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-full w-1/2 mx-auto"></div>
                  <div className="h-2.5 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-full w-2/3 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating elements */}
          <div className="absolute -top-8 -left-8 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl animate-bounce">
            <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Tagline */}
          <div className="mt-12 text-white">
            <p className="text-sm font-light italic opacity-80">A quick play for your profile</p>
            <p className="text-sm font-light italic opacity-80">to your phone</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
