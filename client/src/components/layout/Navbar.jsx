import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { User, LogOut, LogIn, Menu, X, Sparkles, ChevronDown, Play } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const scrollToSection = (id) => {
    // If not on landing page, navigate there first
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const isOnLandingPage = location.pathname === '/';

  return (
    <>
      <nav className={scrolled ? 'dark-nav' : 'hero-nav bg-gradient-to-br from-cyan-50 to-blue-50'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              className="logo flex items-center gap-3 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              {/* Enhanced Logo with gradient and animation */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-20 blur-xl rounded-full group-hover:opacity-30 transition-opacity duration-300"></div>
                <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 group-hover:scale-110 transition-transform duration-300">
                  <path d="M8 16C8 13.7909 9.79086 12 12 12C14.2091 12 16 13.7909 16 16C16 18.2091 17.7909 20 20 20C22.2091 20 24 18.2091 24 16C24 13.7909 22.2091 12 20 12C17.7909 12 16 13.7909 16 16C16 18.2091 14.2091 20 12 20C9.79086 20 8 18.2091 8 16Z"
                    stroke="url(#logo-gradient)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    className="group-hover:stroke-[3.2] transition-all duration-300" />
                  <defs>
                    <linearGradient id="logo-gradient" x1="8" y1="12" x2="24" y2="20">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <span className="text-xl font-black bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-cyan-500 group-hover:via-blue-500 group-hover:to-purple-500 transition-all duration-300">
                  ATSMaster
                </span>
                <div className="text-xs font-semibold text-gray-500 -mt-1">Resume Optimizer</div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="navbar-toggle"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>

            {/* Desktop Navigation */}
            <ul className={mobileMenuOpen ? 'open' : ''}>
              <li>
                <a onClick={() => { scrollToSection('features'); setMobileMenuOpen(false); }}>
                  Features
                </a>
              </li>

              <li>
                <a onClick={() => { scrollToSection('how-it-works'); setMobileMenuOpen(false); }}>
                  How It Works
                </a>
              </li>

              <li>
                <a onClick={() => { scrollToSection('faq'); setMobileMenuOpen(false); }}>
                  FAQ
                </a>
              </li>

              <li>
                <a href="https://drive.google.com/file/d/1uHXCcIivdMlcJG-iVCFQRe5uftH68cST/view" target="_blank" rel="noopener noreferrer" className="demo-link flex items-center gap-2">
                  <Play size={16} />
                  Demo
                </a>
              </li>

              {isAuthenticated ? (
                <li className="relative user-menu-container">
                  <div className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-all">
                      <span className="text-sm font-bold text-white">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 py-2 z-50 animate-slide-down">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setShowUserMenu(false);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 font-semibold flex items-center gap-3 transition-all group"
                      >
                        <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span>My Profile</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 font-semibold flex items-center gap-3 transition-all group"
                      >
                        <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <LogOut className="w-4 h-4 text-white" />
                        </div>
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </li>
              ) : (
                <li>
                  <a onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>
                    Log In
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16"></div>
    </>
  );
}
