const pdf = require('pdf-parse');
const fs = require('fs');
const mammoth = require('mammoth');

class ResumeParser {
  constructor() {
    this.EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    this.PHONE_PATTERN = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{6,14}/;
    this.LINKEDIN_PATTERN = /(?:linkedin\.com\/in\/|linkedin:?\s*)([a-zA-Z0-9-]+)/i;
    this.GITHUB_PATTERN = /(?:github\.com\/|github:?\s*)([a-zA-Z0-9-]+)/i;
    this.URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;

    this.SECTION_HEADERS = {
      experience: ['experience', 'work experience', 'employment', 'work history', 'professional experience'],
      education: ['education', 'academic', 'qualification', 'academics'],
      skills: ['skills', 'technical skills', 'competencies', 'technologies', 'tech stack'],
      projects: ['projects', 'personal projects', 'academic projects', 'key projects'],
      certifications: ['certifications', 'certificates', 'credentials'],
      summary: ['summary', 'profile', 'objective', 'about', 'professional summary']
    };

    this.ACTION_VERBS = [
      'achieved', 'administered', 'analyzed', 'architected', 'automated',
      'built', 'collaborated', 'configured', 'created', 'delivered',
      'designed', 'developed', 'drove', 'enhanced', 'established',
      'executed', 'implemented', 'improved', 'increased', 'integrated',
      'launched', 'led', 'managed', 'mentored', 'migrated',
      'optimized', 'orchestrated', 'oversaw', 'pioneered', 'planned',
      'reduced', 'refactored', 'resolved', 'scaled', 'secured'
    ];
  }

  async parse(filePath, fileExt) {
    let raw_text = '';
    let parsing_method = 'standard';
    let ocr_confidence = null;

    try {
      if (fileExt === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        raw_text = pdfData.text;
      } else if (fileExt === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        raw_text = result.value;
      }
    } catch (error) {
      console.error('Parsing error:', error);
      throw new Error(`Failed to parse ${fileExt} file: ${error.message}`);
    }

    // Identify sections
    const sections = this._identifySections(raw_text);

    // Extract structured data
    const candidate = this._extractCandidateInfo(raw_text);
    const experience = this._extractExperience(raw_text, sections.experience || '');
    const projects = this._extractProjects(raw_text, sections.projects || '');
    const education = this._extractEducation(raw_text, sections.education || '');

    return {
      raw_text,
      candidate,
      experience,
      projects,
      education,
      sections,
      formatting: {
        has_tables: false, // Simplified for Node.js version
        has_images: false,
        word_count: raw_text.split(/\s+/).length,
        line_count: raw_text.split('\n').length
      },
      parsing_method,
      ocr_confidence
    };
  }

  _identifySections(text) {
    const sections = {};
    const lines = text.split('\n');
    let currentSection = null;
    let sectionContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineLower = line.toLowerCase();

      // Check if line is a section header
      let foundSection = null;
      for (const [sectionKey, keywords] of Object.entries(this.SECTION_HEADERS)) {
        if (keywords.some(kw => lineLower.includes(kw) && line.length < 50)) {
          foundSection = sectionKey;
          break;
        }
      }

      if (foundSection) {
        // Save previous section
        if (currentSection && sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = foundSection;
        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    }

    // Save last section
    if (currentSection && sectionContent.length > 0) {
      sections[currentSection] = sectionContent.join('\n');
    }

    return sections;
  }

  _extractCandidateInfo(text) {
    const lines = text.split('\n').slice(0, 20); // Check first 20 lines
    const topText = lines.join('\n');

    const emailMatch = topText.match(this.EMAIL_PATTERN);
    const phoneMatch = topText.match(this.PHONE_PATTERN);
    const linkedinMatch = topText.match(this.LINKEDIN_PATTERN);
    const githubMatch = topText.match(this.GITHUB_PATTERN);

    // Try to extract name (usually first non-empty line)
    let name = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < 50 && !trimmed.includes('@')) {
        name = trimmed;
        break;
      }
    }

    return {
      name,
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0] : null,
      location: null, // Simplified for now
      linkedin: linkedinMatch ? linkedinMatch[1] : null,
      github: githubMatch ? githubMatch[1] : null
    };
  }

  _extractExperience(text, experienceSection) {
    const positions = [];
    const textToAnalyze = experienceSection || text;

    // Simplified experience extraction
    const lines = textToAnalyze.split('\n');
    let currentPosition = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 100) {
        // Potential company/role
        if (currentPosition && currentPosition.description) {
          positions.push(currentPosition);
        }
        currentPosition = {
          company: null,
          role: trimmed,
          duration: null,
          description: '',
          bullet_quality: 0,
          has_metrics: false,
          action_verbs_count: 0
        };
      } else if (currentPosition && trimmed.startsWith('•') || trimmed.startsWith('-')) {
        currentPosition.description += trimmed + '\n';
        // Check for action verbs
        const lower = trimmed.toLowerCase();
        for (const verb of this.ACTION_VERBS) {
          if (lower.includes(verb)) {
            currentPosition.action_verbs_count++;
          }
        }
        // Check for metrics
        if (/\d+%|\d+x|\$\d+|increased|decreased|improved|reduced/i.test(trimmed)) {
          currentPosition.has_metrics = true;
        }
      }
    }

    if (currentPosition && currentPosition.description) {
      positions.push(currentPosition);
    }

    return {
      total_years: 0, // Simplified
      total_months: 0,
      positions,
      overall_quality: positions.length > 0 ? 70 : 0
    };
  }

  _extractProjects(text, projectsSection) {
    const projects = [];
    const textToAnalyze = projectsSection || '';
    
    // Simplified project extraction
    const lines = textToAnalyze.split('\n');
    let currentProject = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 5 && trimmed.length < 100 && !trimmed.startsWith('•')) {
        if (currentProject) {
          projects.push(currentProject);
        }
        currentProject = {
          title: trimmed,
          technologies: [],
          description: '',
          impact: null,
          score: 70
        };
      } else if (currentProject && trimmed) {
        currentProject.description += trimmed + ' ';
      }
    }

    if (currentProject) {
      projects.push(currentProject);
    }

    return projects;
  }

  _extractEducation(text, educationSection) {
    const education = [];
    const textToAnalyze = educationSection || text;
    const lines = textToAnalyze.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && /degree|bachelor|master|phd|b\.s\.|m\.s\.|university|college/i.test(trimmed)) {
        education.push({
          degree: trimmed,
          institution: null,
          year: null,
          gpa: null
        });
      }
    }

    return education;
  }
}

module.exports = ResumeParser;
