CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  login_provider TEXT NOT NULL CHECK (login_provider IN ('line', 'email')),
  line_user_id TEXT,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'model', 'ambassador', 'merchant_admin', 'admin')),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS avatar_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  face_id TEXT NOT NULL,
  body_type TEXT NOT NULL DEFAULT 'normal',
  skin_tone TEXT NOT NULL,
  hair_style TEXT NOT NULL,
  shoulder_width REAL,
  waist_line REAL,
  leg_length REAL,
  photo_front_url TEXT,
  photo_left_45_url TEXT,
  photo_right_45_url TEXT,
  photo_full_body_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'blocked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  merchant_id TEXT REFERENCES merchants(id),
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL,
  color TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_review', 'rejected')),
  tryon_count INTEGER NOT NULL DEFAULT 0,
  collection_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tryon_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  avatar_id TEXT NOT NULL REFERENCES avatar_profiles(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  provider TEXT NOT NULL DEFAULT 'stub',
  provider_job_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'rejected')),
  result_image_url TEXT,
  face_similarity_score REAL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  policy_version TEXT NOT NULL DEFAULT 'face-lock-v1',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outfits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tryon_job_id TEXT REFERENCES tryon_jobs(id),
  image_url TEXT NOT NULL,
  style TEXT,
  description TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  ai_review_status TEXT NOT NULL DEFAULT 'pending' CHECK (ai_review_status IN ('pending', 'passed', 'failed')),
  like_count INTEGER NOT NULL DEFAULT 0,
  collection_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS social_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('outfit', 'user', 'product')),
  target_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('like', 'collect', 'share', 'follow', 'conversion')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, target_type, target_id, action)
);

CREATE TABLE IF NOT EXISTS point_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usage_counters (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  period TEXT NOT NULL,
  product_count INTEGER NOT NULL DEFAULT 0,
  tryon_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (merchant_id, period)
);

CREATE TABLE IF NOT EXISTS line_webhook_events (
  id TEXT PRIMARY KEY,
  line_event_type TEXT NOT NULL,
  line_user_id TEXT,
  reply_token TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_user ON tryon_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_outfits_review_status ON outfits(review_status);
CREATE INDEX IF NOT EXISTS idx_social_actions_target ON social_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_line_webhook_events_user ON line_webhook_events(line_user_id);
