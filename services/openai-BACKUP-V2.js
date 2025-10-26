const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate viral marketing text using OpenAI
 * @param {string} industry - The target industry
 * @param {string} description - Product/service description
 * @param {Array} viralPatterns - Industry-specific viral patterns
 * @returns {Promise<string>} Generated viral text
 */
async function generateViralText(industry, description, viralPatterns) {
  try {
    console.log('   🔄 Calling OpenAI API...');

    // Extract hooks from viral patterns (they're already in English)
    const hooks = viralPatterns
      .filter(p => p.type === 'hook')
      .slice(0, 8) // Use top 8 hooks for variety
      .map(p => p.text)
      .join('\n- ');

    // NEW: Add randomization seed to avoid repetitive outputs
    const randomSeed = Math.floor(Math.random() * 1000);

    const systemPrompt = `You are an expert in viral TikTok and social media marketing.
Your task is to create short, catchy text that makes people stop scrolling.

Viral principles you MUST follow:
- Create immediate FOMO or wow-moment
- Use proven formats (When you..., POV:, Nobody talks about...)
- Be emotional and relatable
- Match casual TikTok/Instagram tone
- NEVER be salesy or corporate
- ALWAYS write in ENGLISH

You must ALWAYS return ONLY the text, no explanations or extra content.
Be creative and vary your output - don't repeat the same patterns.`;

    const userPrompt = `Create a short, catchy viral text (max 15 words) to promote this product:

Industry: ${industry}
Product/service: ${description}

Viral hooks for inspiration (use these patterns but make them unique):
- ${hooks}

Requirements:
- Max 15 words
- Create curiosity or FOMO
- Casual tone
- No emojis
- ONLY the text, no explanation
- Write in ENGLISH
- Be creative and unique (randomization seed: ${randomSeed})

Good format examples:
- "When you finally find [benefit]..."
- "POV: You discovered [solution]..."
- "Nobody talks about how [insight]..."
- "The [product] that changed everything"
- "This is why [target audience] always [result]"
- "Stop [pain point] - here's what actually works"

Return ONLY the viral text in English:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.95, // Increased for more variety
      max_tokens: 100,
      top_p: 0.95,
      presence_penalty: 0.6, // NEW: Discourage repetition
      frequency_penalty: 0.6, // NEW: Discourage repetition
    });

    let viralText = completion.choices[0].message.content.trim();
    
    // Clean up the response (remove quotes if present)
    viralText = viralText.replace(/^["']|["']$/g, '');
    
    console.log('   ✅ OpenAI response received (English)');
    
    return viralText;

  } catch (error) {
    console.error('   ❌ OpenAI API Error:', error.message);
    
    if (error.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again in a moment.');
    }
    
    if (error.status === 401) {
      throw new Error('OpenAI API authentication failed. Check API key.');
    }
    
    throw new Error(`OpenAI error: ${error.message}`);
  }
}

/**
 * Select best matching GIF template based on generated text
 * @param {string} viralText - The generated viral text
 * @param {Array} templates - Available GIF templates
 * @param {string} description - Original product description
 * @returns {Promise<Object>} Best matching template
 */
async function selectBestTemplate(viralText, templates, description) {
  try {
    console.log('   🔄 Analyzing text to select best GIF...');

    // NEW: Add randomization to avoid always picking the same GIF
    const shuffledTemplates = [...templates].sort(() => Math.random() - 0.5);
    const topTemplates = shuffledTemplates.slice(0, Math.min(8, templates.length));

    const systemPrompt = `You are an expert at matching viral marketing text with GIFs.
Your job is to analyze the text and select the GIF that best amplifies the message.

You must return ONLY the ID of the best GIF, no explanation.
Be thoughtful and vary your selections - don't always pick the same GIF for similar content.`;

    const templatesDescription = topTemplates.map(t => 
      `ID: ${t.id} | Name: ${t.name} | Emotion: ${t.emotion} | Use: ${t.use_case} | Score: ${t.viral_score}/10`
    ).join('\n');

    const userPrompt = `Viral text: "${viralText}"
Product: "${description}"

Available GIF templates:
${templatesDescription}

Select the GIF that:
1. Best matches the feeling in the text
2. Visually amplifies the message
3. Has high viral potential
4. Matches the product's tone
5. Creates the strongest emotional impact

Return ONLY the id of the best GIF (e.g. "mind-blown-explosion"):`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4, // Slightly higher for variety
      max_tokens: 50,
      presence_penalty: 0.3, // NEW: Slight variation in selection
    });

    let selectedId = completion.choices[0].message.content.trim();
    selectedId = selectedId.replace(/^["']|["']$/g, ''); // Remove quotes
    
    console.log('   🎯 AI selected template ID:', selectedId);

    // Find the template by ID
    let selectedTemplate = templates.find(t => t.id === selectedId);
    
    // Fallback: If AI returns invalid ID, pick randomly from top scored templates
    if (!selectedTemplate) {
      console.log('   ⚠️  Invalid template ID, using random high-score template');
      const topScored = templates
        .filter(t => t.viral_score >= 7)
        .sort(() => Math.random() - 0.5); // Randomize
      
      selectedTemplate = topScored[0] || templates[0];
    }

    console.log('   ✅ Template selected:', selectedTemplate.name);
    
    return selectedTemplate;

  } catch (error) {
    console.error('   ⚠️  Template selection failed, using fallback:', error.message);
    
    // Fallback: Return random template from high viral scores
    const highScoreTemplates = templates.filter(t => t.viral_score >= 7);
    const fallbackPool = highScoreTemplates.length > 0 ? highScoreTemplates : templates;
    const randomIndex = Math.floor(Math.random() * fallbackPool.length);
    
    return fallbackPool[randomIndex];
  }
}

module.exports = {
  generateViralText,
  selectBestTemplate
};
