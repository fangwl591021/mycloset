INSERT OR IGNORE INTO users (
  id, login_provider, email, display_name, role
) VALUES (
  'demo-user-001', 'email', 'demo@mycloset.ai', 'Demo Member', 'member'
);

INSERT OR IGNORE INTO merchants (
  id, name, plan
) VALUES (
  'demo-merchant-001', 'Demo Fashion Store', 'pro'
);

INSERT OR IGNORE INTO avatar_profiles (
  id, user_id, face_id, body_type, skin_tone, hair_style,
  shoulder_width, waist_line, leg_length, status
) VALUES (
  'demo-avatar-001', 'demo-user-001', 'demo-face-001', 'normal', 'warm', 'short',
  42, 72, 96, 'ready'
);

INSERT OR IGNORE INTO products (
  id, merchant_id, name, brand, category, color, price, image_url, status
) VALUES (
  'cloth001', 'demo-merchant-001', '商務西裝外套', 'BrandA', 'jacket', 'navy', 3990,
  '/demo/cloth001.jpg', 'active'
);
