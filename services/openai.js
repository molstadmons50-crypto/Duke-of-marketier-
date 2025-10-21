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

    // Format viral patterns for the prompt
    const patternsText = viralPatterns
      .slice(0, 5) // Use top 5 patterns
      .map(p => `- ${p.pattern} (Hook: "${p.hook}")`)
      .join('\n');

    const systemPrompt = `Du er en ekspert i viral TikTok og sosiale medier markedsføring. 
Din oppgave er å lage korte, fengende tekster som får folk til å stoppe scrollingen.

Viral prinsipper du MÅ følge:
- Skape umiddelbar FOMO eller wow-moment
- Bruke proven formater (When you..., POV:, Nobody talks about...)
- Være emotional og relatable
- Passe til casual TikTok/Instagram-tone
- ALDRI være salesy eller corporate

Du må ALLTID returnere KUN teksten, ingen forklaringer eller ekstra innhold.`;

    const userPrompt = `Lag en kort, fengende viral tekst (maks 15 ord) for å markedsføre dette produktet:

Bransje: ${industry}
Produkt/tjeneste: ${description}

Viral patterns for denne bransjen:
${patternsText}

Husk:
- Maks 15 ord
- Skape nysgjerrighet eller FOMO
- Casual tone
- Ingen emojis
- KUN teksten, ingen forklaring

Eksempler på gode formater:
- "When you finally find [benefit]..."
- "POV: You discovered [solution]..."
- "Nobody talks about how [insight]..."
- "The [product] that changed everything"

Returner KUN den virale teksten:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.9, // High creativity
      max_tokens: 100,
      top_p: 0.95,
    });

    let viralText = completion.choices[0].message.content.trim();
    
    // Clean up the response (remove quotes if present)
    viralText = viralText.replace(/^["']|["']$/g, '');
    
    console.log('   ✅ OpenAI response received');
    
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

    const systemPrompt = `Du er en ekspert på å matche viral markedsføringstekst med GIF-er.
Din jobb er å analysere teksten og velge den GIF-en som best forsterker budskapet.

Du må returnere KUN ID-en til den beste GIF-en, ingen forklaring.`;

    const templatesDescription = templates.map(t => 
      `ID: ${t.id} | Name: ${t.name} | Emotion: ${t.emotion} | Use: ${t.use_case} | Score: ${t.viral_score}/10`
    ).join('\n');

    const userPrompt = `Viral tekst: "${viralText}"
Produkt: "${description}"

Tilgjengelige GIF templates:
${templatesDescription}

Velg den GIF-en som:
1. Best matcher følelsen i teksten
2. Forsterker budskapet visuelt
3. Har høyest viral potential
4. Passer til produktets tone

Returner KUN id-en til den beste GIF-en (f.eks. "mind-blown-explosion"):`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent selection
      max_tokens: 50,
    });

    let selectedId = completion.choices[0].message.content.trim();
    selectedId = selectedId.replace(/^["']|["']$/g, ''); // Remove quotes
    
    console.log('   🎯 AI selected template ID:', selectedId);

    // Find the template by ID
    let selectedTemplate = templates.find(t => t.id === selectedId);
    
    // Fallback: If AI returns invalid ID, use highest viral score template
    if (!selectedTemplate) {
      console.log('   ⚠️  Invalid template ID, using highest viral score');
      selectedTemplate = templates.reduce((best, current) => 
        current.viral_score > best.viral_score ? current : best
      );
    }

    console.log('   ✅ Template selected');
    
    return selectedTemplate;

  } catch (error) {
    console.error('   ⚠️  Template selection failed, using fallback:', error.message);
    
    // Fallback: Return template with highest viral score
    return templates.reduce((best, current) => 
      current.viral_score > best.viral_score ? current : best
    );
  }
}

module.exports = {
  generateViralText,
  selectBestTemplate
};

