import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/landing/Hero';
import UploadSection from '../components/landing/UploadSection';
import ScoringSystem from '../components/landing/ScoringSystem';
import ContentInterpretation from '../components/landing/ContentInterpretation';
import Features from '../components/landing/Features';
import Checklist from '../components/landing/Checklist';
import SecondaryUpload from '../components/landing/SecondaryUpload';
import HowItWorks from '../components/landing/HowItWorks';
import Testimonials from '../components/landing/Testimonials';
import FAQ from '../components/landing/FAQ';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <UploadSection />
      <ScoringSystem />
      <ContentInterpretation />
      <Features />
      <Checklist />
      <SecondaryUpload />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
};

export default LandingPage;
