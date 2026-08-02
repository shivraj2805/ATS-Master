import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const faqs = [
    {
      question: 'What is a resume checker?',
      answer: 'A resume checker is a tool or software used to evaluate and improve resumes. It checks for proper formatting, relevant keywords (important for Applicant Tracking Systems), grammar and spelling errors, and content relevance. Enhancv\'s resume checker also assesses consistency in details, suggests customization for different industries, and provides feedback for improvement. We help ensure your resume meets current professional standards and trends and increase your chances of getting noticed by employers and recruiters.'
    },
    {
      question: 'How do I check my resume score?',
      answer: 'Upload your resume to our platform, and our AI-powered system will instantly analyze it and provide you with a comprehensive ATS compatibility score along with detailed feedback on areas for improvement.'
    },
    {
      question: 'How do I improve my resume score?',
      answer: 'Follow the personalized recommendations provided in your analysis report. Focus on optimizing keywords, improving formatting, and tailoring your content to match industry standards and job requirements.'
    },
    {
      question: 'How do I know my resume is ATS compliant?',
      answer: 'Our system checks all critical ATS compatibility factors including format parsing, keyword optimization, section structure, and formatting standards. A score above 80 indicates excellent ATS compliance.'
    },
    {
      question: 'What is a good ATS score?',
      answer: 'Scores above 80 are excellent and indicate high ATS compatibility. Scores between 60-80 are good but have room for improvement. Below 60 means your resume needs significant optimization to pass ATS filters.'
    },
    {
      question: 'Can an ATS read PDFs?',
      answer: 'Yes, most modern ATS systems can read PDFs. However, we recommend using simple PDF formats without complex formatting or graphics to ensure maximum compatibility across all ATS platforms.'
    },
    {
      question: 'How do I review my resume for errors?',
      answer: 'Our comprehensive analysis highlights grammar, spelling, formatting inconsistencies, and content issues. Review the detailed feedback in your results dashboard and apply the suggested improvements systematically.'
    }
  ];

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? -1 : index);
  };

  return (
    <section id="faq" className="faq-section">
      <div className="faq-container">
        <h2 className="faq-title">Frequently asked questions</h2>
        
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className={`faq-item ${activeIndex === index ? 'active' : ''}`}>
              <div className="faq-header" onClick={() => toggleFAQ(index)}>
                <div className="faq-icon">
                  {activeIndex === index ? (
                    <Minus size={20} strokeWidth={2.5} />
                  ) : (
                    <Plus size={20} strokeWidth={2.5} />
                  )}
                </div>
                <h3>{faq.question}</h3>
              </div>
              {activeIndex === index && (
                <div className="faq-content">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
