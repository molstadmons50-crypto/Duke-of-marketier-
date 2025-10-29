const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate viral marketing strategy using OpenAI
 * (Updated according to Delplan 5 – supports FREE and PREMIUM users)
 * @param {string} industry - The target industry
 * @param {string} description - Product/service description
 * @param {Array} patterns - Industry-specific viral patterns
 * @param {boolean} isPremium - Whether user has premium access
 * @returns {Promise<string>} Generated marketing strategy
 */
async function generateViralText(industry, description, patterns, isPremium = false) {
  try {
    console.log(`🤖 Calling OpenAI (${isPremium ? 'PREMIUM' : 'FREE'} tier)...`);

    // Different prompt logic depending on user tier
    const systemPrompt = isPremium
      ? `You are a senior marketing strategist with 15+ years of experience in the ${industry} industry.
         
         Analyze THOROUGHLY:
         - Target audience and their psychology
         - Competitive landscape in ${industry}
         - Viral triggers and emotional hooks
         - Best-performing distribution channels
         
         Deliver a DETAILED strategy with:
         1. **Hook (first 3 seconds)**: What stops them from scrolling?
         2. **Emotional trigger**: Which emotion do we activate? (FOMO, curiosity, pride, surprise)
         3. **Storytelling structure**: How do we build an engaging narrative?
         4. **Call-to-action**: Specific action we want the audience to take
         5. **3 distribution tactics**: Where and how we publish (specific platforms, timing, format)
         
         Use concrete examples and data when relevant.
         Write as if you're advising a client directly.`
      : `You are a marketing assistant. Generate a short, catchy viral strategy for ${industry}.
         
         Include:
         - A strong hook that captures attention
         - Which emotion we want to trigger in the audience
         - A clear call-to-action
         
         Keep it short and concise (100-150 words).`;
    const userPrompt = isPremium
      ? `Business/product: ${description}
         
         Viral patterns that work in this industry:
         ${JSON.stringify(patterns, null, 2)}
         
         Give me a CONCRETE, actionable strategy (300-500 words) that I can implement today.`
      : `Product: ${description}
         
         Create a short viral strategy (100-150 words) based on these patterns:
         ${patterns.map(p => p.pattern).join(', ')}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: isPremium ? 0.8 : 0.7,
      max_tokens: isPremium ? 600 : 200,
    });

    const generatedText = response.choices[0].message.content.trim();
    console.log(`✅ OpenAI response: ${generatedText.substring(0, 100)}...`);

    return generatedText;
  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    throw new Error(`OpenAI generation failed: ${error.message}`);
  }
}

/**
 * Select best matching GIF template based on generated text
 * (unchanged from your previous implementation)
 * @param {string} viralText - The generated viral text
 * @param {Array} templates - Available GIF templates
 * @param {string} description - Original product description
 * @returns {Promise<Object>} Best matching template
 */
async function selectBestTemplate(viralText, templates, description) {
  try {
    console.log('   🔄 Selecting GIF with weighted randomization...');

    // Weighted random selection based on viral scores
    const totalWeight = templates.reduce((sum, t) => sum + t.viral_score, 0);
    let random = Math.random() * totalWeight;
    let selectedTemplate = null;

    for (const template of templates) {
      random -= template.viral_score;
      if (random <= 0) {
        selectedTemplate = template;
        break;
      }
    }

    // Fallback if none selected
    if (!selectedTemplate) {
      selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    }

    console.log('   🎯 Randomly selected template:', selectedTemplate.id);
    console.log('   ✅ Template selected:', selectedTemplate.name);
    console.log('   📊 Viral score:', selectedTemplate.viral_score + '/10');

    return selectedTemplate;
  } catch (error) {
    console.error('   ⚠️  Template selection failed, using pure random fallback:', error.message);
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }
}
/**
 * Generate SHORT meme caption for GIF overlay
 * @param {string} industry - The target industry
 * @param {string} description - Product/service description
 * @param {Object} template - Selected GIF template
 * @returns {Promise<string>} Short meme caption (1-2 lines)
 */
async function generateMemeCaption(industry, description, template) {
  try {
    console.log(`💬 Generating meme caption for template: ${template.name}`);

    const systemPrompt = `You are a viral meme creator. Generate SHORT, punchy, relatable captions for memes.

Rules:
- Maximum 10-15 words
- Use "POV:", "When...", "Me:", or "That feeling when..." format
- Match the emotion: ${template.emotion}
- Make it funny and relatable
- Use English only
- No hashtags or emojis`;

    const userPrompt = `Product: ${description}
Industry: ${industry}
Template emotion: ${template.emotion}
Template name: ${template.name}

Generate a SHORT meme caption (max 15 words) that fits this GIF and relates to the product.

Examples:
- "POV: You after using our app for the first time"
- "When you realize you've been doing it wrong all along"
- "Me: Finally trying the product everyone's talking about"

Caption:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9, // Higher for creativity
      max_tokens: 50,   // Keep it SHORT
    });

    const caption = response.choices[0].message.content.trim()
      .replace(/^["']|["']$/g, '') // Remove quotes if AI adds them
      .replace(/\n/g, ' '); // Remove line breaks

    console.log(`✅ Meme caption: "${caption}"`);

    return caption;
  } catch (error) {
    console.error('❌ Meme caption generation failed:', error.message);
    // Fallback caption
    return `POV: Discovering ${description.split(' ').slice(0, 3).join(' ')}`;
  }
}

module.exports = {
  generateViralText,
  selectBestTemplate,
  generateMemeCaption,  // ← NY
};

