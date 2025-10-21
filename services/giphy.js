const axios = require('axios');

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';

/**
 * Get GIF by Giphy ID
 * @param {string} giphyId - The Giphy GIF ID
 * @returns {Promise<string>} GIF URL
 */
async function getGifById(giphyId) {
  try {
    console.log(`   🔄 Fetching GIF by ID: ${giphyId}`);
    
    const response = await axios.get(`${GIPHY_BASE_URL}/${giphyId}`, {
      params: {
        api_key: GIPHY_API_KEY
      },
      timeout: 5000
    });

    if (response.data && response.data.data && response.data.data.images) {
      const gifUrl = response.data.data.images.original.url;
      console.log('   ✅ GIF fetched by ID');
      return gifUrl;
    }

    throw new Error('Invalid Giphy response format');

  } catch (error) {
    console.error('   ❌ Giphy ID fetch failed:', error.message);
    throw new Error(`Giphy ID fetch error: ${error.message}`);
  }
}

/**
 * Search for GIF by search term
 * @param {string} searchTerm - Search query
 * @returns {Promise<string>} GIF URL
 */
async function getGifBySearchTerm(searchTerm) {
  try {
    console.log(`   🔄 Searching Giphy for: "${searchTerm}"`);
    
    const response = await axios.get(`${GIPHY_BASE_URL}/search`, {
      params: {
        api_key: GIPHY_API_KEY,
        q: searchTerm,
        limit: 10,
        rating: 'g', // Family-friendly content
        lang: 'en'
      },
      timeout: 5000
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      // Return the first (most relevant) result
      const gifUrl = response.data.data[0].images.original.url;
      console.log('   ✅ GIF found via search');
      return gifUrl;
    }

    throw new Error('No GIFs found for search term');

  } catch (error) {
    console.error('   ❌ Giphy search failed:', error.message);
    throw new Error(`Giphy search error: ${error.message}`);
  }
}

/**
 * Get random trending GIF (fallback)
 * @returns {Promise<string>} GIF URL
 */
async function getRandomTrendingGif() {
  try {
    console.log('   🔄 Fetching random trending GIF...');
    
    const response = await axios.get(`${GIPHY_BASE_URL}/trending`, {
      params: {
        api_key: GIPHY_API_KEY,
        limit: 25,
        rating: 'g'
      },
      timeout: 5000
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      // Get random GIF from trending
      const randomIndex = Math.floor(Math.random() * response.data.data.length);
      const gifUrl = response.data.data[randomIndex].images.original.url;
      console.log('   ✅ Random trending GIF fetched');
      return gifUrl;
    }

    throw new Error('No trending GIFs available');

  } catch (error) {
    console.error('   ❌ Trending GIF fetch failed:', error.message);
    throw new Error(`Giphy trending error: ${error.message}`);
  }
}

module.exports = {
  getGifById,
  getGifBySearchTerm,
  getRandomTrendingGif
};