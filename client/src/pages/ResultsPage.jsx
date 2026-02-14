import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ResultsDashboard from '../components/results/ResultsDashboard';
import LoadingOverlay from '../components/LoadingOverlay';

const ResultsPage = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get results from sessionStorage
    const storedResults = sessionStorage.getItem('analysisResults');
    
    if (!storedResults) {
      // No results found, redirect to home
      navigate('/');
      return;
    }

    try {
      const parsedResults = JSON.parse(storedResults);
      setResults(parsedResults);
    } catch (error) {
      console.error('Failed to parse results:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleReset = () => {
    sessionStorage.removeItem('analysisResults');
    navigate('/');
  };

  if (loading || !results) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ResultsDashboard results={results} onReset={handleReset} />
      <Footer />
    </div>
  );
};

export default ResultsPage;
