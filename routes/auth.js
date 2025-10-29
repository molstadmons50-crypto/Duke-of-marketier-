const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Registrer ny bruker (gratis)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validering
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password required' 
      });
    }
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }
    
    // Sjekk om email allerede finnes
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Email already registered',
        message: 'Please log in instead'
      });
    }
    
    // Hash passord (12 rounds = veldig sikkert)
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Lagre bruker
    const result = await pool.query(
      `INSERT INTO users (email, password_hash) 
       VALUES ($1, $2) 
       RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash]
    );
    
    const user = result.rows[0];
    
    // Generer JWT token (expires om 30 dager)
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    console.log(`✅ New user registered: ${email}`);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        tier: 'registered'
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: 'Please try again'
    });
  }
});

/**
 * POST /api/auth/login
 * Logg inn eksisterende bruker
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password required' 
      });
    }
    
    // Finn bruker
    const result = await pool.query(
      `SELECT id, email, password_hash, created_at FROM users 
       WHERE email = $1`,
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }
    
    const user = result.rows[0];
    
    // Sjekk passord
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }
    
    // Generer JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    console.log(`✅ User logged in: ${email}`);
    
    res.json({
      success: true,
      message: 'Logged in successfully!',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        tier: 'registered'
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'Please try again'
    });
  }
});

/**
 * GET /api/auth/me
 * Hent innlogget brukers info + quota status
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Hent daily usage
    const usage = await pool.query(
      `SELECT COUNT(*) as count FROM usage_logs 
       WHERE user_id = $1 AND reset_date = $2`,
      [req.user.id, today]
    );
    
    const used = parseInt(usage.rows[0].count);
    const limit = 3;
    
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        tier: 'registered'
      },
      quota: {
        used: used,
        limit: limit,
        remaining: limit - used
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user info' 
    });
  }
});

module.exports = router;