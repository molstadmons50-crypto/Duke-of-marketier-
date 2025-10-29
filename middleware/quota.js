const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

/**
 * Sjekker quota før generering
 * - Anonyme: Max 1 GIF totalt (IP + cookie tracking)
 * - Innlogget: Max 3 GIFs per dag
 */
async function checkQuota(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0]; // "2025-10-29"
    
    // ============================================
    // CASE 1: INNLOGGET BRUKER (3 GIFs per dag)
    // ============================================
    if (req.user) {
      const dailyUsage = await pool.query(
        `SELECT COUNT(*) as count FROM usage_logs 
         WHERE user_id = $1 AND reset_date = $2`,
        [req.user.id, today]
      );
      
      const used = parseInt(dailyUsage.rows[0].count);
      const limit = 3;
      
      if (used >= limit) {
        return res.status(403).json({
          error: 'Daily limit reached',
          message: 'You have used all 3 GIFs today. Resets at midnight UTC.',
          used: used,
          limit: limit,
          resetsIn: getTimeUntilMidnightUTC()
        });
      }
      
      // Legg til remaining count for frontend
      req.quotaInfo = {
        used: used,
        limit: limit,
        remaining: limit - used,
        tier: 'registered'
      };
      
      console.log(`✅ Quota check passed: ${req.user.email} (${used}/${limit} used today)`);
      return next();
    }
    
    // ============================================
    // CASE 2: ANONYM BRUKER (1 GIF totalt)
    // ============================================
    
    const userIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    let anonCookie = req.cookies.anon_user_id;
    
    // Generer cookie hvis ikke finnes
    if (!anonCookie) {
      anonCookie = uuidv4();
    }
    
    // Sjekk BEGGE (IP og cookie)
    const [ipCheck, cookieCheck] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as count FROM usage_logs 
         WHERE ip_address = $1 AND user_id IS NULL`,
        [userIp]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM usage_logs 
         WHERE anon_user_id = $1 AND user_id IS NULL`,
        [anonCookie]
      )
    ]);
    
    const ipUsed = parseInt(ipCheck.rows[0].count);
    const cookieUsed = parseInt(cookieCheck.rows[0].count);
    
    // Hvis ENTEN IP ELLER cookie har brukt 1 GIF
    if (ipUsed >= 1 || cookieUsed >= 1) {
      return res.status(403).json({
        error: 'Free limit reached',
        message: 'You have used your free GIF. Sign up to get 3 GIFs per day!',
        used: 1,
        limit: 1,
        ctaUrl: '/register',
        benefits: [
          '3 GIFs per day (resets daily)',
          'Advanced AI-powered strategies',
          'Answer deeper questions about your business'
        ]
      });
    }
    
    // Sett cookie (expires om 1 år)
    res.cookie('anon_user_id', anonCookie, { 
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 år
      httpOnly: true, // Ikke tilgjengelig for JavaScript (sikkerhet)
      secure: process.env.NODE_ENV === 'production', // Kun HTTPS i production
      sameSite: 'lax' // CSRF protection
    });
    
    req.anonUserId = anonCookie;
    req.quotaInfo = {
      used: 0,
      limit: 1,
      remaining: 0, // Etter dette har de 0 igjen
      tier: 'anonymous'
    };
    
    console.log(`✅ Quota check passed: Anonymous user (IP: ${userIp})`);
    next();
    
  } catch (error) {
    console.error('❌ Quota check error:', error);
    res.status(500).json({ 
      error: 'Failed to check quota',
      message: 'Please try again'
    });
  }
}

/**
 * Logger usage etter vellykket generering
 */
async function logUsage(userId, anonUserId, ipAddress, industry) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await pool.query(
      `INSERT INTO usage_logs (user_id, anon_user_id, ip_address, industry, reset_date) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, anonUserId || null, ipAddress, industry, today]
    );
    
    console.log(`📝 Usage logged: ${userId ? `User ${userId}` : `Anon ${anonUserId}`}`);
  } catch (error) {
    console.error('❌ Failed to log usage:', error);
    // Ikke krasj request selv om logging feiler
  }
}

/**
 * Hjelpefunksjon: Beregn tid til midnatt UTC
 */
function getTimeUntilMidnightUTC() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  
  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

module.exports = { checkQuota, logUsage };