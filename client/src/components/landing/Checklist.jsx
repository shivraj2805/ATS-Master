import { Check, Brain, Target, Code, FileSearch, Sparkles, Shield, TrendingUp, Award } from 'lucide-react';

const Checklist = () => {
  const categories = [
    {
      title: 'Semantic Analysis',
      icon: Brain,
      gradient: 'from-purple-500 to-pink-500',
      description: 'AI-powered contextual understanding beyond simple keywords',
      badge: 'AI-Powered',
      items: [
        { 
          text: 'Contextual Matching', 
          tip: 'Understands "React" includes "ReactJS", "React.js"',
          metric: '60% Weight'
        },
        { 
          text: 'Skill Synonyms', 
          tip: 'Recognizes "ML" = "Machine Learning" = "AI"',
          metric: 'Smart Match'
        },
        { 
          text: 'Role Alignment', 
          tip: 'Matches your experience to job requirements',
          metric: '0-100 Score'
        },
        { 
          text: 'Experience Relevance', 
          tip: 'Evaluates how your background fits the role',
          metric: 'Deep Analysis'
        }
      ]
    },
    {
      title: 'Keyword Optimization',
      icon: Target,
      gradient: 'from-blue-500 to-cyan-500',
      description: 'Exact keyword matching with job description requirements',
      badge: 'Precision',
      items: [
        { 
          text: 'Required Skills', 
          tip: 'Checks all mandatory technical skills',
          metric: '40% Weight'
        },
        { 
          text: 'Industry Terms', 
          tip: 'Domain-specific terminology and jargon',
          metric: 'TF-IDF'
        },
        { 
          text: 'Certification Keywords', 
          tip: 'AWS, PMP, Scrum Master, etc.',
          metric: 'Exact Match'
        },
        { 
          text: 'Tool Proficiency', 
          tip: 'Software, frameworks, and technologies',
          metric: 'Frequency Analysis'
        }
      ]
    },
    {
      title: 'Resume Parsing',
      icon: FileSearch,
      gradient: 'from-green-500 to-emerald-500',
      description: 'Intelligent extraction of structured data from your resume',
      badge: 'Smart Extract',
      items: [
        { 
          text: 'Contact Information', 
          tip: 'Email, phone, location, GitHub, LinkedIn',
          metric: 'Auto-Detect'
        },
        { 
          text: 'Work Experience', 
          tip: 'Companies, roles, dates, achievements',
          metric: 'Structured Data'
        },
        { 
          text: 'Education & Certs', 
          tip: 'Degrees, institutions, certifications',
          metric: 'Categorized'
        },
        { 
          text: 'Skills Inventory', 
          tip: 'Technical, soft skills, tools, languages',
          metric: 'Comprehensive'
        }
      ]
    },
    {
      title: 'AI Optimization',
      icon: Sparkles,
      gradient: 'from-yellow-500 to-orange-500',
      description: 'Google Gemini-powered suggestions to enhance your resume',
      badge: 'Gemini AI',
      items: [
        { 
          text: 'Summary Rewrite', 
          tip: 'Professional summary optimized for ATS',
          metric: 'AI-Generated'
        },
        { 
          text: 'Action Verb Enhancement', 
          tip: 'Stronger verbs: "Led" → "Spearheaded"',
          metric: 'Impact Boost'
        },
        { 
          text: 'Keyword Placement', 
          tip: 'Where to add missing critical keywords',
          metric: 'Strategic'
        },
        { 
          text: 'Bullet Point Polish', 
          tip: 'Quantified achievements with measurable impact',
          metric: 'Results-Focused'
        }
      ]
    },
    {
      title: 'Credential Verification',
      icon: Shield,
      gradient: 'from-red-500 to-rose-500',
      description: 'Autonomous verification of your online profiles and projects',
      badge: 'Agent-Based',
      items: [
        { 
          text: 'GitHub Portfolio', 
          tip: 'Repos, stars, commits, code quality analysis',
          metric: '25% Weight'
        },
        { 
          text: 'LinkedIn Profile', 
          tip: 'Employment history, endorsements, authenticity',
          metric: '20% Weight'
        },
        { 
          text: 'Live Projects', 
          tip: 'Portfolio URLs, deployment status, functionality',
          metric: '15% Weight'
        },
        { 
          text: 'Open Source Impact', 
          tip: 'Contributions, merged PRs, community recognition',
          metric: '10% Weight'
        }
      ]
    },
    {
      title: 'Format & Structure',
      icon: Award,
      gradient: 'from-indigo-500 to-purple-500',
      description: 'ATS-friendly formatting and professional presentation',
      badge: 'ATS-Ready',
      items: [
        { 
          text: 'File Format Check', 
          tip: 'PDF & DOCX supported with proper encoding',
          metric: 'Compatible'
        },
        { 
          text: 'Section Organization', 
          tip: 'Proper headers: Experience, Skills, Education',
          metric: 'Structured'
        },
        { 
          text: 'Font & Spacing', 
          tip: 'Consistent style, readable fonts, white space',
          metric: 'Professional'
        },
        { 
          text: 'Length Optimization', 
          tip: '1-2 pages recommended, concise content',
          metric: 'Balanced'
        }
      ]
    },
    {
      title: 'Gap Analysis',
      icon: TrendingUp,
      gradient: 'from-teal-500 to-green-500',
      description: 'Identify missing skills and improvement opportunities',
      badge: 'Insights',
      items: [
        { 
          text: 'Missing Keywords', 
          tip: 'Critical skills not found in your resume',
          metric: 'Priority Ranked'
        },
        { 
          text: 'Partially Matched', 
          tip: 'Skills with semantic match but no exact keyword',
          metric: 'Yellow Flag'
        },
        { 
          text: 'Strength Areas', 
          tip: 'Top 5 competencies that match perfectly',
          metric: 'Green Light'
        },
        { 
          text: 'Quick Wins', 
          tip: 'Easy improvements for immediate score boost',
          metric: 'Action Items'
        }
      ]
    },
    {
      title: 'Scoring Breakdown',
      icon: Code,
      gradient: 'from-pink-500 to-red-500',
      description: 'Transparent scoring algorithm with detailed metrics',
      badge: 'Data-Driven',
      items: [
        { 
          text: 'Final ATS Score', 
          tip: 'Overall score: 0-100 with grade (Elite/Strong/Good)',
          metric: 'Composite'
        },
        { 
          text: 'Semantic Score', 
          tip: 'Cosine similarity on embeddings (60% weight)',
          metric: '0-100'
        },
        { 
          text: 'Keyword Score', 
          tip: 'Exact match frequency (40% weight)',
          metric: '0-100'
        },
        { 
          text: 'Credibility Score', 
          tip: 'GitHub, LinkedIn, Portfolio verification combined',
          metric: '0-100'
        }
      ]
    }
  ];

  return (
    <section className="checklist-section">
      <div className="checklist-container">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-purple-900">32+ Analysis Points</span>
          </div>
          <h2 className="section-title">What We Check in Your Resume</h2>
          <p className="section-subtitle max-w-3xl mx-auto">
            Our AI-powered platform analyzes your resume across 8 critical dimensions using <span className="font-bold text-purple-600">Google Gemini AI</span>, 
            <span className="font-bold text-blue-600"> semantic embeddings</span>, and <span className="font-bold text-green-600">autonomous verification agents</span> 
            to maximize your chances of passing ATS screening
          </p>
        </div>
        
        <div className="checklist-grid">
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <div 
                key={index} 
                className="checklist-card group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                {/* Gradient Background Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                <div className="checklist-category-header relative z-10">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${category.gradient} text-white shadow-lg mb-3`}>
                    <IconComponent size={28} />
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="checklist-title">{category.title}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${category.gradient} text-white whitespace-nowrap ml-2`}>
                      {category.badge}
                    </span>
                  </div>
                  <p className="category-description">{category.description}</p>
                </div>
                
                <ul className="checklist-items mt-4">
                  {category.items.map((item, idx) => (
                    <li key={idx} className="checklist-item group/item hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-all duration-200">
                      <div className="item-main">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${category.gradient} flex items-center justify-center`}>
                          <Check size={14} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="item-text font-semibold text-gray-800">{item.text}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${category.gradient} text-white opacity-70 whitespace-nowrap`}>
                              {item.metric}
                            </span>
                          </div>
                          <span className="item-tip text-xs">{item.tip}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Card Footer with Count */}
                <div className={`mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs`}>
                  <span className="text-gray-500 font-medium">{category.items.length} Checks</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${category.gradient} animate-pulse`}></div>
                    <span className="text-gray-400">Active</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Checklist;
