const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

/**
 * Optional authentication middleware
 * Sjekker om bruker er innlogget, men tillater fortsatt request hvis ikke
 */
async function optionalAuth(req, res, next) {
  try {
    // Hent token fra Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    if (token) {
      try {
        // Verifiser token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Hent brukerdata fra database
        const result = await pool.query(
          `SELECT id, email, created_at FROM users WHERE id = $1`,
          [decoded.userId]
        );
        
        if (result.rows.length > 0) {
          req.user = result.rows[0]; // Bruker er innlogget
          console.log(`✅ Authenticated user: ${req.user.email}`);
        }
      } catch (tokenError) {
        // Token ugyldig, men tillat fortsatt som anonym
        console.log('⚠️  Invalid token, treating as anonymous');
      }
    }
    
    // Fortsett uansett (authenticated eller anonymous)
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(); // Fortsett selv ved feil
  }
}

/**
 * Required authentication middleware
 * Brukes for endpoints som KUN innloggede kan bruke
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this feature'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query(
      `SELECT id, email, created_at FROM users WHERE id = $1`,
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'User not found' 
      });
    }
    
    req.user = result.rows[0];
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired, please log in again' });
    }
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = { optionalAuth, requireAuth };