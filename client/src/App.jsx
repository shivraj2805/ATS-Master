import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import ResultsPage from './pages/ResultsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import CPResultPage from './pages/CPResultPage';
import GitHubResultPage from './pages/GitHubResultPage';
import AllReviewsPage from './pages/AllReviewsPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analyze-report" element={<ResultsPage />} />
          <Route path="/cp-result" element={<CPResultPage />} />
          <Route path="/github-result" element={<GitHubResultPage />} />
          <Route path="/reviews" element={<AllReviewsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
