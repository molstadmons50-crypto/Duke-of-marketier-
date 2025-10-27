require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const generateRoute = require('./routes/generate');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use((req, res, next) => {
  console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.path);
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.use('/api/generate', generateRoute);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;
  
  res.status(err.status || 500).json({
    success: false,
    error: errorMessage
  });
});
const server = app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  console.log('Health check: http://localhost:' + PORT + '/health');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
// GIF Download Endpoint - Legg til rett før app.listen()
app.get('/api/download-gif', async (req, res) => {
  try {
    const { gifUrl, filename } = req.query;
    
    // Validering
    if (!gifUrl) {
      return res.status(400).json({ 
        error: 'gifUrl parameter is required' 
      });
    }

    // Sjekk at URL er fra Giphy (security)
    if (!gifUrl.includes('giphy.com') && !gifUrl.includes('giphy.gif')) {
      return res.status(403).json({ 
        error: 'Only Giphy URLs are allowed' 
      });
    }

    console.log('📥 Downloading GIF from:', gifUrl);

    // Fetch GIF fra Giphy
    const response = await fetch(gifUrl);
    
    if (!response.ok) {
      throw new Error(`Giphy returned ${response.status}`);
    }

    // Konverter til buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('✅ GIF downloaded, size:', buffer.length, 'bytes');

    // Set headers for nedlasting
    const safeFilename = filename || 'viral-content.gif';
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send GIF til frontend
    res.send(buffer);

  } catch (error) {
    console.error('❌ GIF download error:', error);
    res.status(500).json({ 
      error: 'Failed to download GIF',
      details: error.message 
    });
  }
});


