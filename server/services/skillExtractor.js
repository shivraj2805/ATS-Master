class SkillExtractor {
  constructor() {
    this.PROGRAMMING_LANGUAGES = new Set([
      'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'c',
      'ruby', 'go', 'golang', 'rust', 'swift', 'kotlin', 'scala', 'php',
      'perl', 'r', 'matlab', 'julia', 'dart', 'lua', 'haskell',
      'sql', 'html', 'css', 'sass', 'scss'
    ]);

    this.FRAMEWORKS = new Set([
      'react', 'reactjs', 'react.js', 'angular', 'vue', 'vuejs',
      'next.js', 'nextjs', 'nuxt', 'gatsby', 'svelte',
      'node.js', 'nodejs', 'express', 'fastapi', 'django', 'flask',
      'spring', 'spring boot', '.net', 'asp.net', 'rails',
      'laravel', 'symfony', 'fastify', 'nest', 'nestjs',
      'react native', 'flutter', 'ionic',
      'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas',
      'numpy', 'opencv', 'jest', 'mocha', 'pytest'
    ]);

    this.TOOLS = new Set([
      'docker', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp',
      'heroku', 'vercel', 'netlify', 'terraform', 'ansible',
      'jenkins', 'circleci', 'github actions', 'gitlab ci',
      'git', 'github', 'gitlab', 'bitbucket',
      'vscode', 'intellij', 'pycharm', 'eclipse',
      'jira', 'confluence', 'trello', 'asana', 'notion',
      'figma', 'sketch', 'adobe xd',
      'postman', 'insomnia', 'swagger', 'graphql', 'rest',
      'webpack', 'vite', 'babel', 'eslint', 'prettier',
      'nginx', 'apache', 'redis', 'kafka', 'elasticsearch',
      'tableau', 'power bi', 'looker'
    ]);

    this.DATABASES = new Set([
      'mysql', 'postgresql', 'postgres', 'mongodb', 'sqlite', 'oracle',
      'sql server', 'mariadb', 'cassandra', 'dynamodb', 'firebase',
      'redis', 'elasticsearch', 'neo4j', 'couchdb'
    ]);

    this.SOFT_SKILLS = new Set([
      'leadership', 'communication', 'teamwork', 'problem solving',
      'critical thinking', 'time management', 'project management',
      'agile', 'scrum', 'collaboration', 'mentoring', 'presentation',
      'analytical', 'creative', 'detail-oriented', 'self-motivated'
    ]);
  }

  extract(text) {
    const textLower = text.toLowerCase();
    
    const programmingLanguages = this._findSkills(textLower, this.PROGRAMMING_LANGUAGES);
    const frameworks = this._findSkills(textLower, this.FRAMEWORKS);
    const tools = this._findSkills(textLower, this.TOOLS);
    const databases = this._findSkills(textLower, this.DATABASES);
    const softSkills = this._findSkills(textLower, this.SOFT_SKILLS);

    const allSkills = [
      ...programmingLanguages,
      ...frameworks,
      ...tools,
      ...databases,
      ...softSkills
    ];

    // Categorize skills by strength
    const skillCategories = this._categorizeSkills({
      programmingLanguages,
      frameworks,
      tools,
      databases
    });

    return {
      programming_languages: programmingLanguages,
      frameworks,
      tools,
      databases,
      soft_skills: softSkills,
      other: [],
      total_count: allSkills.length,
      skill_categories: skillCategories
    };
  }

  _findSkills(text, skillSet) {
    const found = [];
    for (const skill of skillSet) {
      // Use word boundaries to match whole words
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        found.push(skill);
      }
    }
    return found;
  }

  _categorizeSkills(skills) {
    const categories = [];

    if (skills.programmingLanguages.length > 0) {
      categories.push({
        name: 'Programming Languages',
        skills: skills.programmingLanguages,
        strength: skills.programmingLanguages.length >= 3 ? 'Strong' : 
                 skills.programmingLanguages.length >= 1 ? 'Moderate' : 'Weak'
      });
    }

    if (skills.frameworks.length > 0) {
      categories.push({
        name: 'Frameworks & Libraries',
        skills: skills.frameworks,
        strength: skills.frameworks.length >= 4 ? 'Strong' : 
                 skills.frameworks.length >= 2 ? 'Moderate' : 'Weak'
      });
    }

    if (skills.tools.length > 0) {
      categories.push({
        name: 'Tools & Technologies',
        skills: skills.tools,
        strength: skills.tools.length >= 5 ? 'Strong' : 
                 skills.tools.length >= 2 ? 'Moderate' : 'Weak'
      });
    }

    if (skills.databases.length > 0) {
      categories.push({
        name: 'Databases',
        skills: skills.databases,
        strength: skills.databases.length >= 3 ? 'Strong' : 
                 skills.databases.length >= 1 ? 'Moderate' : 'Weak'
      });
    }

    return categories;
  }
}

module.exports = SkillExtractor;
