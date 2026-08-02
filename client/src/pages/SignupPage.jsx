import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Fingerprint, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'candidate',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Name validation
    if (formData.name.length < 2) {
      setError('Name must be at least 2 characters long');
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

    // Password validation
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const result = await signup(formData.name, formData.email, formData.password, formData.role);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  const passwordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength: 2, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength: 3, label: 'Good', color: 'bg-green-500' };
    return { strength: 4, label: 'Strong', color: 'bg-green-600' };
  };

  const strength = passwordStrength(formData.password);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-cyan-50/50 to-blue-50/50 px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">ATS Master</span>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h1 className="text-5xl font-black text-gray-900 mb-3 leading-tight">
              Create Account
            </h1>
            <p className="text-gray-600 text-base">Let's get you started with ATS Master</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-slide-down shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm placeholder:text-gray-400 shadow-sm hover:border-gray-300"
                placeholder="Full Name"
              />
            </div>

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
                placeholder="Email Address"
              />
            </div>

            {/* Role Selection */}
            <div>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm appearance-none cursor-pointer shadow-sm hover:border-gray-300"
              >
                <option value="candidate">I am a Job Candidate</option>
                <option value="recruiter">I am a Recruiter</option>
              </select>
            </div>

            {/* Password Field */}
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm placeholder:text-gray-400 shadow-sm hover:border-gray-300"
                placeholder="Password"
              />
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${(strength.strength / 4) * 100}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm placeholder:text-gray-400 shadow-sm hover:border-gray-300"
                placeholder="Confirm Password"
              />
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] transform"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-cyan-600 hover:text-cyan-700 transition-colors">
                Sign In
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
          <div className="relative mx-auto w-64 h-96 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl shadow-2xl transform -rotate-6 hover:rotate-0 transition-transform duration-500">
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
          <div className="absolute -top-8 -right-8 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl animate-bounce">
            <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Tagline */}
          <div className="mt-12 text-white">
            <p className="text-sm font-light italic opacity-80">Join thousands of professionals</p>
            <p className="text-sm font-light italic opacity-80">optimizing their career journey</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
