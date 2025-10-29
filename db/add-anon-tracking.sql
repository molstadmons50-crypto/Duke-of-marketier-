-- Legg til kolonner for anonym tracking
ALTER TABLE usage_logs 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS anon_user_id VARCHAR(255);

-- Fjern NOT NULL constraint på user_id (må tillate NULL for anonyme)
ALTER TABLE usage_logs 
ALTER COLUMN user_id DROP NOT NULL;

-- Legg til index for rask søk
CREATE INDEX IF NOT EXISTS idx_anon_ip ON usage_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_anon_cookie ON usage_logs(anon_user_id);