const express = require('express');
const router = express.Router();
const { generateViralText, selectBestTemplate } = require('../services/openai');
const { getGifBySearchTerm, getGifById } = require('../services/giphy');
const { getViralPatterns, getTemplates } = require('../services/viralData');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { optionalAuth } = require('../middleware/auth');
const { checkQuota, logUsage } = require('../middleware/quota');

/**
 * POST /api/generate
 * Generate viral marketing content with GIF
 * 
 * Body: {
 *   industry: string,
 *   description: string
 * }
 */
router.post('/', optionalAuth, checkQuota, async (req, res) => {
  console.log('🚨 GENERATE ENDPOINT HIT');
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('📥 NEW GENERATION REQUEST');
  console.log('='.repeat(60));

  try {
    // 1. Validate input
    const { industry, description } = req.body;
    
    if (!industry || !description) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json(
        errorResponse('Missing required fields: industry and description')
      );
    }

    if (typeof industry !== 'string' || typeof description !== 'string') {
      console.log('❌ Validation failed: Invalid field types');
      return res.status(400).json(
        errorResponse('Industry and description must be strings')
      );
    }

    if (description.length < 10) {
      console.log('❌ Validation failed: Description too short');
      return res.status(400).json(
        errorResponse('Description must be at least 10 characters long')
      );
    }

    if (description.length > 500) {
      console.log('❌ Validation failed: Description too long');
      return res.status(400).json(
        errorResponse('Description must be less than 500 characters')
      );
    }

    console.log(`✅ Input validated`);
    console.log(`   Industry: ${industry}`);
    console.log(`   Description: ${description.substring(0, 50)}...`);

    // 2. Load industry-specific data
    console.log('\n📚 Loading industry data...');
    const viralPatterns = getViralPatterns(industry);
    const templates = getTemplates(industry);
    
    if (!viralPatterns || viralPatterns.length === 0) {
      console.log('⚠️  No viral patterns found for industry, using generic patterns');
    }
    
    if (!templates || templates.length === 0) {
      console.log('⚠️  No templates found for industry');
      return res.status(400).json(
        errorResponse(`Industry "${industry}" not supported or has no templates`)
      );
    }

    console.log(`   ✓ Loaded ${viralPatterns.length} viral patterns`);
    console.log(`   ✓ Loaded ${templates.length} GIF templates`);

   // 3. Generate viral text with OpenAI
    console.log('\n🤖 Generating viral text with OpenAI...');
    const isPremium = !!req.user; // true hvis innlogget
    const viralText = await generateViralText(industry, description, viralPatterns, isPremium);

    // 4. Select best matching GIF template
    console.log('\n🎯 Selecting best GIF template...');
    const selectedTemplate = await selectBestTemplate(viralText, templates, description);
    console.log(`   ✓ Selected template: ${selectedTemplate.name}`);
    console.log(`   ✓ Emotion: ${selectedTemplate.emotion}`);
    console.log(`   ✓ Viral score: ${selectedTemplate.viral_score}/10`);

    // 5. Fetch GIF from Giphy
    console.log('\n🎬 Fetching GIF from Giphy...');
    let gifUrl;
    
    // Try getting by Giphy ID first, fallback to search term
    try {
      if (selectedTemplate.giphyId) {
        console.log(`   Trying Giphy ID: ${selectedTemplate.giphyId}`);
        gifUrl = await getGifById(selectedTemplate.giphyId);
      }
    } catch (error) {
      console.log(`   ⚠️  Giphy ID failed, falling back to search term`);
    }

    // Fallback to search if ID didn't work
    if (!gifUrl && selectedTemplate.searchTerm) {
      console.log(`   Trying search term: ${selectedTemplate.searchTerm}`);
      gifUrl = await getGifBySearchTerm(selectedTemplate.searchTerm);
    }

    if (!gifUrl) {
      throw new Error('Failed to fetch GIF from Giphy');
    }

    console.log(`   ✓ GIF URL retrieved: ${gifUrl.substring(0, 60)}...`);

    // 6. Format and return response
    const duration = Date.now() - startTime;
    console.log('\n' + '='.repeat(60));
    console.log(`✅ GENERATION SUCCESSFUL (${duration}ms)`);
    console.log('='.repeat(60) + '\n');
    
    // Log usage
    await logUsage(
      req.user?.id, 
      req.anonUserId, 
      req.ip || req.headers['x-forwarded-for'], 
      industry
    );

    return res.status(200).json(
      successResponse({
        viralText,
        gifUrl,
        template: {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          emotion: selectedTemplate.emotion,
          viralScore: selectedTemplate.viral_score
        },
        metadata: {
          industry,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          tier: req.user ? 'registered' : 'anonymous',
          quota: req.quotaInfo
        }
      })
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('\n' + '='.repeat(60));
    console.error(`❌ GENERATION FAILED (${duration}ms)`);
    console.error('Error:', error.message);
    console.error('='.repeat(60) + '\n');

    // Handle specific error types
    if (error.message.includes('OpenAI')) {
      return res.status(503).json(
        errorResponse('AI service temporarily unavailable. Please try again.', 503)
      );
    }

    if (error.message.includes('Giphy')) {
      return res.status(503).json(
        errorResponse('GIF service temporarily unavailable. Please try again.', 503)
      );
    }

    // Generic error
    return res.status(500).json(
      errorResponse(
        process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message
      )
    );
  }
});

module.exports = router;