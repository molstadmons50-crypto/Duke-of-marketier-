require('dotenv').config();
const pool = require('./pool');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  try {
    console.log('🔧 Setting up database tables...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Database ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

initDatabase();