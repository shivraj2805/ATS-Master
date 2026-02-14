const { pipeline } = require('@xenova/transformers');
const natural = require('natural');

class SemanticAnalyzer {
  constructor() {
    this.embedder = null;
    this.TfIdf = natural.TfIdf;
    this.tokenizer = new natural.WordTokenizer();
    this.initialized = false;
  }

  /**
   * Initialize the embedding model (call once at startup)
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('Initializing semantic embedding model...');
      // Use a lightweight sentence transformer model
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      this.initialized = true;
      console.log('Semantic analyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize semantic analyzer:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   */
  async getEmbedding(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const output = await this.embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    
    if (magnitude === 0) return 0;
    
    return dotProduct / magnitude;
  }

  /**
   * Calculate semantic similarity between resume and job description
   * Returns a score from 0-100
   * Uses dynamic weighting based on JD length to handle short/long JDs
   */
  calculateSemanticSimilarity(resumeText, jobDescriptionText, parsedData = {}) {
    try {
      // Determine JD length for dynamic weighting
      const jdWordCount = jobDescriptionText.trim().split(/\s+/).length;
      let skillWeight, textWeight;
      
      // Dynamic weighting: short JDs rely more on skill coverage
      if (jdWordCount < 80) {
        skillWeight = 0.80;
        textWeight = 0.20;
      } else if (jdWordCount < 200) {
        skillWeight = 0.70;
        textWeight = 0.30;
      } else {
        skillWeight = 0.60;
        textWeight = 0.40;
      }

      // Part 1: Enhanced Skill Coverage Score with 3-level matching
      const skillCoverageResult = this.calculateEnhancedSkillCoverage(
        resumeText, 
        jobDescriptionText,
        parsedData
      );
      
      // Part 2: Text Similarity Score using TF-IDF cosine
      const textSimilarityScore = this.calculateTfIdfSimilarity(resumeText, jobDescriptionText);

      // Weighted combination with dynamic weights
      const finalScore = Math.round(
        (skillCoverageResult.score * skillWeight) + (textSimilarityScore * textWeight)
      );

      console.log(`📊 Semantic Similarity Breakdown (JD: ${jdWordCount} words):
        • Skill Coverage: ${skillCoverageResult.score}/100 (${Math.round(skillWeight*100)}% weight)
          - Must-haves: ${skillCoverageResult.mustHaveMatched}/${skillCoverageResult.mustHaveTotal}
          - Nice-to-haves: ${skillCoverageResult.niceToHaveMatched}/${skillCoverageResult.niceToHaveTotal}
        • Text Similarity: ${textSimilarityScore}/100 (${Math.round(textWeight*100)}% weight)
        • Final Score: ${finalScore}/100`);

      return {
        score: Math.min(100, Math.max(0, finalScore)),
        breakdown: {
          skillCoverage: skillCoverageResult.score,
          textSimilarity: textSimilarityScore,
          mustHaveMatched: skillCoverageResult.mustHaveMatched,
          mustHaveTotal: skillCoverageResult.mustHaveTotal,
          niceToHaveMatched: skillCoverageResult.niceToHaveMatched,
          niceToHaveTotal: skillCoverageResult.niceToHaveTotal,
          jdLength: jdWordCount,
          skillWeight: Math.round(skillWeight * 100),
          textWeight: Math.round(textWeight * 100)
        }
      };
    } catch (error) {
      console.error('Error calculating semantic similarity:', error);
      return { score: 0, breakdown: {} };
    }
  }

  /**
   * Enhanced skill coverage with 3-level matching and must-have detection
   */
  calculateEnhancedSkillCoverage(resumeText, jobDescriptionText, parsedData = {}) {
    try {
      const resumeLower = resumeText.toLowerCase();
      const jobLower = jobDescriptionText.toLowerCase();

      // Detect must-have vs nice-to-have keywords
      const { mustHaves, niceToHaves } = this.extractKeywordsWithPriority(jobDescriptionText);
      
      // Prepare resume sections for 3-level matching
      const resumeSections = {
        skills: this.extractSkillsSection(resumeText),
        experience: this.extractExperienceSection(resumeText),
        fullText: resumeLower
      };

      // Match must-haves (weighted heavily)
      let mustHaveScore = 0;
      let mustHaveMatched = 0;
      
      for (const keyword of mustHaves) {
        const matchLevel = this.getSkillMatchLevel(keyword, resumeSections);
        mustHaveMatched += matchLevel > 0 ? 1 : 0;
        mustHaveScore += matchLevel;
      }

      // Match nice-to-haves
      let niceToHaveScore = 0;
      let niceToHaveMatched = 0;
      
      for (const keyword of niceToHaves) {
        const matchLevel = this.getSkillMatchLevel(keyword, resumeSections);
        niceToHaveMatched += matchLevel > 0 ? 1 : 0;
        niceToHaveScore += matchLevel;
      }

      // Calculate weighted coverage
      // Must-haves: 70% weight, Nice-to-haves: 30% weight
      let finalScore = 0;
      
      if (mustHaves.length > 0) {
        const mustHavePercentage = (mustHaveScore / mustHaves.length) * 100;
        finalScore += mustHavePercentage * 0.70;
        
        // Cap at 70 if missing any must-haves
        if (mustHaveMatched < mustHaves.length) {
          finalScore = Math.min(finalScore, 70);
        }
      }
      
      if (niceToHaves.length > 0) {
        const niceToHavePercentage = (niceToHaveScore / niceToHaves.length) * 100;
        finalScore += niceToHavePercentage * 0.30;
      }
      
      // If no must-haves detected, treat all as equal priority
      if (mustHaves.length === 0 && niceToHaves.length > 0) {
        finalScore = (niceToHaveScore / niceToHaves.length) * 100;
      }

      return {
        score: Math.min(100, Math.round(finalScore)),
        mustHaveMatched,
        mustHaveTotal: mustHaves.length,
        niceToHaveMatched,
        niceToHaveTotal: niceToHaves.length
      };
    } catch (error) {
      console.error('Error calculating enhanced skill coverage:', error);
      return { score: 0, mustHaveMatched: 0, mustHaveTotal: 0, niceToHaveMatched: 0, niceToHaveTotal: 0 };
    }
  }

  /**
   * 3-level skill matching: Skills section (1.0) > Experience (0.8) > Anywhere (0.5)
   */
  getSkillMatchLevel(keyword, resumeSections) {
    const keywordLower = keyword.toLowerCase();
    
    // Level 3: Exact match in skills section
    if (resumeSections.skills.includes(keywordLower)) {
      return 1.0;
    }
    
    // Level 2: In experience/project tech stack
    if (resumeSections.experience.includes(keywordLower)) {
      return 0.8;
    }
    
    // Level 1: Mentioned anywhere (but check for keyword stuffing)
    const occurrences = this.countOccurrences(resumeSections.fullText, keywordLower);
    if (occurrences >= 1) {
      // Saturation: max credit for 3 occurrences
      return 0.5 * Math.min(1.0, occurrences / 3);
    }
    
    return 0;
  }

  /**
   * Extract keywords with priority (must-have vs nice-to-have)
   */
  extractKeywordsWithPriority(jobDescriptionText) {
    const lines = jobDescriptionText.split('\n');
    const mustHaveIndicators = ['must', 'required', 'minimum', 'essential', 'mandatory', 'need to'];
    const niceToHaveIndicators = ['nice to have', 'plus', 'preferred', 'bonus', 'good to have', 'ideal'];
    
    const mustHaves = [];
    const niceToHaves = [];
    
    // Extract keywords using TF-IDF
    const tfidf = new this.TfIdf();
    tfidf.addDocument(this.cleanText(jobDescriptionText));
    
    const allKeywords = [];
    tfidf.listTerms(0).slice(0, 50).forEach(item => {
      if (item.term.length >= 2) {
        allKeywords.push(item.term);
      }
    });
    
    // Classify keywords based on context
    const textLower = jobDescriptionText.toLowerCase();
    
    for (const keyword of allKeywords) {
      const keywordContext = this.getKeywordContext(textLower, keyword);
      
      if (mustHaveIndicators.some(indicator => keywordContext.includes(indicator))) {
        mustHaves.push(keyword);
      } else if (niceToHaveIndicators.some(indicator => keywordContext.includes(indicator))) {
        niceToHaves.push(keyword);
      } else {
        // Default: treat as nice-to-have unless in first 20% of keywords (likely important)
        if (allKeywords.indexOf(keyword) < allKeywords.length * 0.3) {
          mustHaves.push(keyword);
        } else {
          niceToHaves.push(keyword);
        }
      }
    }
    
    return { mustHaves, niceToHaves };
  }

  /**
   * Get context around keyword for priority detection
   */
  getKeywordContext(text, keyword, contextWindow = 100) {
    const index = text.indexOf(keyword);
    if (index === -1) return '';
    
    const start = Math.max(0, index - contextWindow);
    const end = Math.min(text.length, index + keyword.length + contextWindow);
    
    return text.substring(start, end);
  }

  /**
   * Count occurrences of keyword (for saturation detection)
   */
  countOccurrences(text, keyword) {
    const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Extract skills section from resume
   */
  extractSkillsSection(resumeText) {
    const lines = resumeText.split('\n');
    let inSkillsSection = false;
    let skillsText = '';
    
    for (const line of lines) {
      const lineLower = line.toLowerCase().trim();
      
      if (lineLower.match(/^(skills|technical skills|technologies|competencies)/)) {
        inSkillsSection = true;
        continue;
      }
      
      // Stop at next section
      if (inSkillsSection && lineLower.match(/^(experience|education|projects|certifications)/)) {
        break;
      }
      
      if (inSkillsSection) {
        skillsText += line.toLowerCase() + ' ';
      }
    }
    
    return skillsText;
  }

  /**
   * Extract experience section from resume
   */
  extractExperienceSection(resumeText) {
    const lines = resumeText.split('\n');
    let inExpSection = false;
    let expText = '';
    
    for (const line of lines) {
      const lineLower = line.toLowerCase().trim();
      
      if (lineLower.match(/^(experience|work experience|employment|projects)/)) {
        inExpSection = true;
        continue;
      }
      
      // Stop at education section
      if (inExpSection && lineLower.match(/^(education|certifications)/)) {
        break;
      }
      
      if (inExpSection) {
        expText += line.toLowerCase() + ' ';
      }
    }
    
    return expText;
  }

  /**
   * Calculate TF-IDF cosine similarity between resume and job description
   * Returns score from 0-100
   */
  calculateTfIdfSimilarity(resumeText, jobDescriptionText) {
    try {
      const tfidf = new this.TfIdf();
      
      // Add documents
      const jobDoc = this.cleanText(jobDescriptionText);
      const resumeDoc = this.cleanText(resumeText);
      
      tfidf.addDocument(jobDoc);
      tfidf.addDocument(resumeDoc);

      // Build TF-IDF vectors
      const allTerms = new Set();
      
      tfidf.listTerms(0).forEach(item => allTerms.add(item.term));
      tfidf.listTerms(1).forEach(item => allTerms.add(item.term));

      const terms = Array.from(allTerms);
      
      if (terms.length === 0) {
        return 0;
      }

      // Create vectors
      const jobVector = [];
      const resumeVector = [];

      terms.forEach(term => {
        jobVector.push(tfidf.tfidf(term, 0));
        resumeVector.push(tfidf.tfidf(term, 1));
      });

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(jobVector, resumeVector);
      
      // Count words in job description for scaling
      const jobWordCount = jobDoc.split(/\s+/).length;
      
      // Scale based on document length
      // For very short JDs (< 20 words), use conservative scaling
      // For longer JDs, use more generous scaling
      let scaledScore;
      if (jobWordCount < 20) {
        // Very short JD: similarity * 100 (raw percentage)
        scaledScore = Math.round(similarity * 100);
      } else if (jobWordCount < 50) {
        // Short JD: similarity * 150
        scaledScore = Math.round(similarity * 150);
      } else {
        // Normal/long JD: similarity * 200
        scaledScore = Math.round(similarity * 200);
      }
      
      return Math.min(100, scaledScore);
    } catch (error) {
      console.error('Error calculating TF-IDF similarity:', error);
      return 0;
    }
  }

  /**
   * Calculate keyword matching score using TF-IDF
   * Returns a score from 0-100
   */
  calculateKeywordScore(resumeText, jobDescriptionText) {
    try {
      const tfidf = new this.TfIdf();
      
      // Add documents to TF-IDF
      tfidf.addDocument(this.cleanText(jobDescriptionText));
      tfidf.addDocument(this.cleanText(resumeText));

      // Extract top keywords from job description (more keywords for better coverage)
      const jobKeywords = [];
      tfidf.listTerms(0).slice(0, 60).forEach(item => {
        jobKeywords.push({
          term: item.term.toLowerCase(),
          weight: item.tfidf
        });
      });

      // Check how many keywords are in resume (with partial matching)
      const resumeText_lower = resumeText.toLowerCase();
      const resumeTokens = this.tokenizer.tokenize(resumeText_lower);
      const resumeSet = new Set(resumeTokens);

      let weightedMatchScore = 0;
      let totalWeight = 0;

      jobKeywords.forEach(keyword => {
        totalWeight += keyword.weight;
        
        // Check for exact match
        if (resumeSet.has(keyword.term)) {
          weightedMatchScore += keyword.weight;
        } 
        // Check for partial match (keyword appears in resume text)
        else if (resumeText_lower.includes(keyword.term)) {
          weightedMatchScore += keyword.weight * 0.7; // 70% credit for partial match
        }
        // Check for stem/variation match (e.g., "manage" matches "management")
        else {
          const found = resumeTokens.some(token => 
            token.startsWith(keyword.term.slice(0, -2)) || 
            keyword.term.startsWith(token.slice(0, -2))
          );
          if (found && keyword.term.length > 4) {
            weightedMatchScore += keyword.weight * 0.5; // 50% credit for stem match
          }
        }
      });

      // Calculate weighted percentage match
      const score = totalWeight > 0 
        ? Math.round((weightedMatchScore / totalWeight) * 100)
        : 0;

      return Math.min(100, Math.max(0, score));
    } catch (error) {
      console.error('Error calculating keyword score:', error);
      return 0;
    }
  }

  /**
   * Calculate final ATS score (weighted combination)
   * 60% semantic + 40% keyword matching
   */
  async calculateAtsScore(resumeText, jobDescriptionText, parsedData = {}) {
    try {
      const semanticResult = this.calculateSemanticSimilarity(
        resumeText, 
        jobDescriptionText, 
        parsedData
      );
      const keywordScore = this.calculateKeywordScore(resumeText, jobDescriptionText);

      const finalScore = Math.round(
        (semanticResult.score * 0.6) + (keywordScore * 0.4)
      );

      return {
        semanticScore: semanticResult.score,
        keywordScore,
        finalAtsScore: finalScore,
        breakdown: semanticResult.breakdown
      };
    } catch (error) {
      console.error('Error calculating ATS score:', error);
      return {
        semanticScore: 0,
        keywordScore: 0,
        finalAtsScore: 0,
        breakdown: {}
      };
    }
  }

  /**
   * Analyze skill matching between resume and job description
   */
  async analyzeSkillMatching(resumeSkills, jobSkills) {
    const matched = [];
    const partial = [];
    const missing = [];

    for (const jobSkill of jobSkills) {
      let found = false;
      let partialMatch = false;

      for (const resumeSkill of resumeSkills) {
        // Exact match (case insensitive)
        if (jobSkill.toLowerCase() === resumeSkill.toLowerCase()) {
          matched.push(jobSkill);
          found = true;
          break;
        }

        // Partial match (one contains the other)
        if (jobSkill.toLowerCase().includes(resumeSkill.toLowerCase()) ||
            resumeSkill.toLowerCase().includes(jobSkill.toLowerCase())) {
          partialMatch = true;
        }
      }

      if (!found && partialMatch) {
        partial.push(jobSkill);
      } else if (!found) {
        // Check semantic similarity for each missing skill
        try {
          const resumeSkillsText = resumeSkills.join(' ');
          const jobSkillEmbedding = await this.getEmbedding(jobSkill);
          const resumeEmbedding = await this.getEmbedding(resumeSkillsText);
          const similarity = this.cosineSimilarity(jobSkillEmbedding, resumeEmbedding);

          if (similarity > 0.7) {
            partial.push(jobSkill);
          } else {
            missing.push(jobSkill);
          }
        } catch (error) {
          missing.push(jobSkill);
        }
      }
    }

    return {
      matched,
      partial,
      missing,
    };
  }

  /**
   * Extract keywords from text using TF-IDF
   */
  extractKeywords(text, count = 20) {
    const tfidf = new this.TfIdf();
    tfidf.addDocument(this.cleanText(text));

    const keywords = [];
    tfidf.listTerms(0).slice(0, count).forEach(item => {
      keywords.push({
        term: item.term,
        score: item.tfidf,
      });
    });

    return keywords;
  }

  /**
   * Clean and normalize text
   */
  cleanText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Parse job description and extract key information
   */
  parseJobDescription(jobDescriptionText) {
    const lines = jobDescriptionText.split('\n');
    const skills = [];
    const qualifications = [];
    const responsibilities = [];

    // Common section headers
    const skillKeywords = ['skills', 'requirements', 'qualifications', 'technologies'];
    const responsibilityKeywords = ['responsibilities', 'duties', 'you will'];
    
    let currentSection = null;

    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();

      // Detect section headers
      if (skillKeywords.some(kw => lowerLine.includes(kw))) {
        currentSection = 'skills';
        continue;
      } else if (responsibilityKeywords.some(kw => lowerLine.includes(kw))) {
        currentSection = 'responsibilities';
        continue;
      }

      // Extract content based on current section
      if (line.trim().length > 0) {
        if (currentSection === 'skills') {
          const cleanLine = line.replace(/^[•\-*\d.]+\s*/, '').trim();
          if (cleanLine.length > 0) {
            skills.push(cleanLine);
          }
        } else if (currentSection === 'responsibilities') {
          const cleanLine = line.replace(/^[•\-*\d.]+\s*/, '').trim();
          if (cleanLine.length > 0) {
            responsibilities.push(cleanLine);
          }
        }
      }
    }

    // Extract keywords from full text
    const keywords = this.extractKeywords(jobDescriptionText, 30);

    return {
      requiredSkills: skills,
      responsibilities,
      keywords: keywords.map(k => k.term),
    };
  }
}

// Create a singleton instance
let analyzerInstance = null;

const getSemanticAnalyzer = async () => {
  if (!analyzerInstance) {
    analyzerInstance = new SemanticAnalyzer();
    await analyzerInstance.initialize();
  }
  return analyzerInstance;
};

module.exports = { SemanticAnalyzer, getSemanticAnalyzer };
