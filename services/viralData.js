const fs = require('fs');
const path = require('path');

// Load JSON data files
let viralPatternsData = null;
let templatesData = null;

/**
 * Load viral patterns from JSON file
 */
function loadViralPatterns() {
  if (!viralPatternsData) {
    const filePath = path.join(__dirname, '../data/viralPatterns.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    viralPatternsData = JSON.parse(rawData);
    console.log('📚 Viral patterns loaded');
  }
  return viralPatternsData;
}

/**
 * Load templates from JSON file
 */
function loadTemplates() {
  if (!templatesData) {
    const filePath = path.join(__dirname, '../data/templates.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    templatesData = JSON.parse(rawData);
    console.log('📚 Templates loaded');
  }
  return templatesData;
}

/**
 * Get viral patterns for specific industry
 * @param {string} industry - Industry name
 * @returns {Array} Viral patterns
 */
function getViralPatterns(industry) {
  const data = loadViralPatterns();
  
  // Find industry (case-insensitive)
  const industryData = data.industries.find(
    ind => ind.industry.toLowerCase() === industry.toLowerCase()
  );

  if (!industryData) {
    console.log(`⚠️  Industry "${industry}" not found, using generic patterns`);
    // Return first industry as fallback (or implement generic patterns)
    return data.industries[0].patterns.slice(0, 5);
  }

  return industryData.patterns;
}

/**
 * Get GIF templates for specific industry
 * @param {string} industry - Industry name
 * @returns {Array} GIF templates
 */
function getTemplates(industry) {
  const data = loadTemplates();
  
  // Find industry (case-insensitive)
  const industryData = data.industries.find(
    ind => ind.industry.toLowerCase() === industry.toLowerCase()
  );

  if (!industryData) {
    console.log(`⚠️  No templates found for industry: ${industry}`);
    return [];
  }

  return industryData.templates;
}

/**
 * Get all available industries
 * @returns {Array} List of industry names
 */
function getAllIndustries() {
  const patterns = loadViralPatterns();
  const templates = loadTemplates();
  
  // Get industries that have both patterns and templates
  const patternIndustries = patterns.industries.map(i => i.industry);
  const templateIndustries = templates.industries.map(i => i.industry);
  
  return patternIndustries.filter(ind => templateIndustries.includes(ind));
}

module.exports = {
  getViralPatterns,
  getTemplates,
  getAllIndustries
};
