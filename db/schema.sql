CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255) UNIQUE,
  subscription_status VARCHAR(50) DEFAULT 'none',
  subscription_tier VARCHAR(50) DEFAULT 'free',
  stripe_subscription_id VARCHAR(255),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  industry VARCHAR(100),
  reset_date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_logs(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_daily ON usage_logs(user_id, reset_date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);