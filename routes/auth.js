const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// REGISTER - Lag ny bruker
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Sjekk at vi har email og passord
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Sjekk at email er riktig format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Sjekk at passord er langt nok
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Sjekk om email allerede finnes
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Krypter passord (så vi ikke lagrer det i klartekst)
    const passwordHash = await bcrypt.hash(password, 12);

    // Lagre bruker i database
    const result = await pool.query(
      `INSERT INTO users (email, password_hash) 
       VALUES ($1, $2) 
       RETURNING id, email, subscription_tier, created_at`,
      [email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    // Lag login-token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ New user registered: ${email}`);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscription_tier
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN - Logg inn eksisterende bruker
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Finn bruker
    const result = await pool.query(
      `SELECT id, email, password_hash, subscription_status, subscription_tier, current_period_end 
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Sjekk passord
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Lag login-token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ User logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
        subscriptionTier: user.subscription_tier,
        currentPeriodEnd: user.current_period_end
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET ME - Hent innlogget brukers info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        subscriptionStatus: req.user.subscription_status,
        subscriptionTier: req.user.subscription_tier,
        currentPeriodEnd: req.user.current_period_end
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

module.exports = router;