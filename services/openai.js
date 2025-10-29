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
      ? `Du er en senior marketing strategist med 15+ års erfaring i ${industry}-industrien.
         
         Analyser GRUNDIG:
         - Målgruppen og deres psykologi
         - Konkurranselandskapet i ${industry}
         - Virale triggers og emosjonelle hooks
         - Distribusjonskanaler som fungerer best
         
         Lever en DETALJERT strategi med:
         1. **Hook (første 3 sekunder)**: Hva stopper dem fra å scrolle?
         2. **Emosjonell trigger**: Hvilken følelse aktiverer vi? (FOMO, nysgjerrighet, stolthet, overraskelse)
         3. **Storytelling-struktur**: Hvordan bygger vi et engasjerende narrativ?
         4. **Call-to-action**: Konkret handling vi vil at målgruppen skal ta
         5. **3 distribusjonstaktikker**: Hvor og hvordan vi publiserer (spesifikke plattformer, timing, format)
         
         Bruk konkrete eksempler og data når det er relevant.
         Skriv som om du rådgir en klient direkte.`
      : `Du er en marketing assistent. Generer en kort, catchy viral strategi for ${industry}.
         
         Inkluder:
         - En sterk hook som fanger oppmerksomhet
         - Hvilken følelse vi vil trigge hos målgruppen
         - En tydelig call-to-action
         
         Hold det kort og konsist (100-150 ord).`;

    const userPrompt = isPremium
      ? `Bedrift/produkt: ${description}
         
         Virale mønstre som fungerer i denne industrien:
         ${JSON.stringify(patterns, null, 2)}
         
         Gi meg en KONKRET, handlingsbar strategi (300-500 ord) som jeg kan implementere i dag.`
      : `Produkt: ${description}
         
         Lag en kort viral strategi (100-150 ord) basert på disse mønstrene:
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

module.exports = {
  generateViralText,
  selectBestTemplate,
};

