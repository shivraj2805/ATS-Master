const FinalCTA = () => {
  const scrollToUpload = () => {
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="final-cta-section">
      <div className="final-cta-container">
        <h2>Ready to Boost Your ATS Score?</h2>
        <p>Join 1000s who improved their resumes with ATSMaster</p>
        
        <button className="cta-button" onClick={scrollToUpload}>
          Check My Resume Now
        </button>
      </div>
    </section>
  );
};

export default FinalCTA;
