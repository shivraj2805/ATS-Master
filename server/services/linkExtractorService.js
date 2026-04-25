const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class LinkExtractorService {
  constructor() {
    // Python AI service URL (same service for consistency)
    this.baseURL = process.env.AI_SERVICE_URL || process.env.PYTHON_SERVICE_URL;

    if (!this.baseURL) {
      throw new Error('AI_SERVICE_URL is required');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Extract links from resume PDF using the Python link extractor agent
   * @param {string} filePath - Path to the PDF file
   * @param {string} originalFilename - Original filename (optional, for proper Content-Type)
   * @returns {Promise<Object>} - Extracted and classified links
   */
  async extractLinks(filePath, originalFilename = null) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
      }

      // Create form data for file upload
      const formData = new FormData();
      
      // Append file with original filename to preserve extension and content type
      const filename = originalFilename || 'resume.pdf';
      formData.append('file', fs.createReadStream(filePath), {
        filename: filename,
        contentType: 'application/pdf'
      });
      
      // Call Python service endpoint
      const response = await this.client.post('/api/extract-links', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
      
      return this.formatLinkData(response.data);
    } catch (error) {
      console.error('❌ Link extraction failed:', error.message);
      if (error.request && !error.response) {
        console.error('⚠️ Python service not responding. Is it running on', this.baseURL + '?');
      }
      
      // Return empty structure if extraction fails
      return {
        success: false,
        error: error.message,
        links: {
          github: [],
          linkedin: [],
          leetcode: [],
          portfolio: [],
          email: [],
          other: []
        },
        total: 0
      };
    }
  }

  /**
   * Format the link extraction response
   * @param {Object} data - Raw response from Python service
   * @returns {Object} - Formatted link data
   */
  formatLinkData(data) {
    if (!data || !data.buckets) {
      return {
        success: false,
        links: {
          github: [],
          linkedin: [],
          leetcode: [],
          portfolio: [],
          email: [],
          other: []
        },
        links_with_text: {},
        total: 0
      };
    }

    const buckets = data.buckets || {};
    const total = Object.values(buckets).reduce((sum, arr) => sum + arr.length, 0);

    return {
      success: true,
      links: {
        github: buckets.github || [],
        linkedin: buckets.linkedin || [],
        leetcode: buckets.leetcode || [],
        portfolio: buckets.portfolio || [],
        email: buckets.email || [],
        other: buckets.other || []
      },
      links_with_text: data.links_with_text || {},
      total,
      raw: data.extracted || null
    };
  }

  /**
   * Validate if a URL is accessible
   * @param {string} url - URL to validate
   * @returns {Promise<boolean>} - True if accessible
   */
  async validateUrl(url) {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        maxRedirects: 3
      });
      return response.status >= 200 && response.status < 400;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate all extracted links
   * @param {Object} links - Links object from formatLinkData
   * @returns {Promise<Object>} - Links with validation status
   */
  async validateLinks(links) {
    const validated = {};

    for (const [category, urls] of Object.entries(links)) {
      if (category === 'email') {
        // Skip validation for email links
        validated[category] = urls.map(url => ({ url, valid: true }));
        continue;
      }

      validated[category] = await Promise.all(
        urls.map(async (url) => ({
          url,
          valid: await this.validateUrl(url)
        }))
      );
    }

    return validated;
  }
}

module.exports = LinkExtractorService;
