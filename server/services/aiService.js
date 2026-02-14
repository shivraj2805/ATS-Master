const axios = require('axios');

class AIService {
  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:5000';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check if AI service is available
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('AI Service health check failed:', error.message);
      return false;
    }
  }

  /**
   * Generate optimized professional summary
   */
  async optimizeSummary(resumeText, jobDescription, currentSummary = '') {
    try {
      const response = await this.client.post('/api/ai/optimize-summary', {
        resumeText,
        jobDescription,
        currentSummary
      });
      return response.data;
    } catch (error) {
      console.error('Optimize summary error:', error.message);
      throw new Error('Failed to generate optimized summary');
    }
  }

  /**
   * Enhance bullet points with action verbs and metrics
   */
  async enhanceBullets(bullets, jobDescription) {
    try {
      const response = await this.client.post('/api/ai/enhance-bullets', {
        bullets,
        jobDescription
      });
      return response.data;
    } catch (error) {
      console.error('Enhance bullets error:', error.message);
      throw new Error('Failed to enhance bullet points');
    }
  }

  /**
   * Get keyword placement suggestions
   */
  async getKeywordSuggestions(resumeText, jobDescription, missingSkills = []) {
    try {
      const response = await this.client.post('/api/ai/keyword-suggestions', {
        resumeText,
        jobDescription,
        missingSkills
      });
      return response.data;
    } catch (error) {
      console.error('Keyword suggestions error:', error.message);
      throw new Error('Failed to generate keyword suggestions');
    }
  }

  /**
   * Get ATS compatibility tips
   */
  async getATSTips(resumeText, issues = []) {
    try {
      const response = await this.client.post('/api/ai/ats-tips', {
        resumeText,
        issues
      });
      return response.data;
    } catch (error) {
      console.error('ATS tips error:', error.message);
      throw new Error('Failed to generate ATS tips');
    }
  }

  /**
   * Generate tailored cover letter
   */
  async generateCoverLetter(resumeText, jobDescription, company, jobTitle) {
    try {
      const response = await this.client.post('/api/ai/generate-cover-letter', {
        resumeText,
        jobDescription,
        company,
        jobTitle
      });
      return response.data;
    } catch (error) {
      console.error('Cover letter generation error:', error.message);
      throw new Error('Failed to generate cover letter');
    }
  }

  /**
   * Generate comprehensive optimization suggestions
   */
  async generateOptimizationSuggestions(resumeText, jobDescription, analysisData) {
    try {
      // Run multiple AI operations in parallel
      const [summaryResult, keywordResult, tipsResult] = await Promise.allSettled([
        this.optimizeSummary(
          resumeText,
          jobDescription,
          analysisData.parsedData?.sections?.summary || ''
        ),
        this.getKeywordSuggestions(
          resumeText,
          jobDescription,
          analysisData.semantic_analysis?.missing_skills || []
        ),
        this.getATSTips(resumeText, analysisData.issues || [])
      ]);

      return {
        optimizedSummary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
        keywordSuggestions: keywordResult.status === 'fulfilled' ? keywordResult.value : null,
        atsTips: tipsResult.status === 'fulfilled' ? tipsResult.value : null
      };
    } catch (error) {
      console.error('Optimization suggestions error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze GitHub profile with resume context
   */
  async analyzeGitHub(githubUsername, jobDescription = '', keywords = [], resumeText = '', resumeSkills = []) {
    try {
      const response = await this.client.post('/api/analyze-github', {
        githubUsername,
        jobDescription,
        keywords,
        resumeText,
        resumeSkills
      });
      return response.data;
    } catch (error) {
      console.error('GitHub analysis error:', error.message);
      if (error.response?.status === 404) {
        throw new Error('GitHub user not found');
      }
      throw new Error('Failed to analyze GitHub profile');
    }
  }

  /**
   * Analyze Competitive Programming profile (LeetCode, etc.) with resume context
   */
  async analyzeCompetitiveProfile(leetcodeUrl, useLLM = true, resumeText = '') {
    try {
      const response = await this.client.post('/api/analyze-competitive-profile', {
        leetcodeUrl,
        useLLM,
        debugLLM: false,
        resumeText
      });
      return response.data;
    } catch (error) {
      console.error('Competitive profile analysis error:', error.message);
      throw new Error('Failed to analyze competitive programming profile');
    }
  }

  /**
   * Batch analyze both GitHub and Competitive Programming profiles with resume context
   */
  async batchAnalyzeProfiles(githubUsername = '', leetcodeUrl = '', jobDescription = '', keywords = [], resumeText = '', resumeSkills = []) {
    try {
      const response = await this.client.post('/api/batch-analyze-profiles', {
        githubUsername,
        leetcodeUrl,
        jobDescription,
        keywords,
        resumeText,
        resumeSkills
      });
      return response.data;
    } catch (error) {
      console.error('Batch profile analysis error:', error.message);
      throw new Error('Failed to analyze profiles');
    }
  }
}

// Create singleton instance
const aiService = new AIService();

module.exports = aiService;
