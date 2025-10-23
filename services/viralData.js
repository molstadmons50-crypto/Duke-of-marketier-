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
    try {
      const filePath = path.join(__dirname, '../data/templates.json');
      console.log('📂 ATTEMPTING TO LOAD:', filePath);
      
      if (!fs.existsSync(filePath)) {
        console.error('❌ FILE DOES NOT EXIST:', filePath);
        throw new Error('templates.json not found');
      }
      
      const rawData = fs.readFileSync(filePath, 'utf8');
      console.log('📄 FILE READ SUCCESS - Size:', rawData.length, 'bytes');
      
      templatesData = JSON.parse(rawData);
      console.log('✅ JSON PARSED - Industries:', templatesData.industries?.length || 0);
      console.log('📚 Templates loaded');
      
    } catch (error) {
      console.error('❌ LOAD TEMPLATES ERROR:', error.message);
      console.error('❌ FULL ERROR:', error);
      throw error;
    }
  }
  return templatesData;
}

/**
 * Get viral patterns for specific industry
 * @param {string} industry - Industry name
 * @returns {Array} Viral patterns
 */
function getViralPatterns(industry) {
  console.log('🔍 getViralPatterns CALLED with:', industry);
  
  try {
    console.log('🔍 Calling loadViralPatterns()...');
    const data = loadViralPatterns();
    console.log('🔍 loadViralPatterns returned:', typeof data);
    
    if (!data) {
      throw new Error('loadViralPatterns returned null/undefined');
    }
    
    if (!data.industries) {
      throw new Error('data.industries is undefined in viralPatterns.json');
    }
    
    console.log('🔍 Available industries:', data.industries.length);
    console.log('🔍 Looking for industry:', industry);
    
    // Find industry (case-insensitive)
    const industryData = data.industries.find(
      ind => ind.industry.toLowerCase() === industry.toLowerCase()
    );

    if (!industryData) {
      console.log(`⚠️  Industry "${industry}" not found, using generic patterns`);
      return data.industries[0].patterns.slice(0, 5);
    }

    console.log('✅ Found industry, returning patterns');
    return industryData.patterns;
    
  } catch (error) {
    console.error('❌ getViralPatterns ERROR:', error.message);
    throw error;
  }
}

/**
 * Get GIF templates for specific industry
 * @param {string} industry - Industry name
 * @returns {Array} GIF templates
 */
function getTemplates(industry) {
  console.log('🔍 getTemplates CALLED with:', industry);
  
  try {
    console.log('🔍 Calling loadTemplates()...');
    const data = loadTemplates();
    console.log('🔍 loadTemplates returned:', typeof data, data ? 'NOT NULL' : 'NULL');
    
    if (!data) {
      throw new Error('loadTemplates returned null/undefined');
    }
    
    if (!data.industries) {
      throw new Error('data.industries is undefined');
    }
    
    console.log('🔍 Looking for industry:', industry);
    const industryData = data.industries.find(
      ind => ind.industry.toLowerCase() === industry.toLowerCase()
    );

    if (!industryData) {
      console.log(`⚠️  No templates found for industry: ${industry}`);
      return [];
    }

    return industryData.templates;
    
  } catch (error) {
    console.error('❌ getTemplates ERROR:', error.message);
    throw error;
  }
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
