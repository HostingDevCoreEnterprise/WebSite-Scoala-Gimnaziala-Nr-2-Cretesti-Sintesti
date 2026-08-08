-- =============================================
-- SCHEMA: Scoala Gimnaziala Nr. 2 Cretesti-Sintesti
-- =============================================

-- Users (admin portal)
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100),
  created_at  TIMESTAMP DEFAULT NOW(),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert default admin user if none exists (Password: admin123)
INSERT INTO users (username, password_hash, display_name)
VALUES ('admin', crypt('admin123', gen_salt('bf', 12)), 'Administrator')
ON CONFLICT (username) DO NOTHING;

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  content      TEXT         NOT NULL,
  category     VARCHAR(80)  DEFAULT 'General',
  priority     VARCHAR(20)  DEFAULT 'normal' CHECK (priority IN ('normal','important','urgent')),
  is_visible   BOOLEAN      DEFAULT TRUE,
  published_at TIMESTAMP    DEFAULT NOW(),
  expires_at   TIMESTAMP,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Curriculum commissions
CREATE TABLE IF NOT EXISTS commissions (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Teachers (per commission)
CREATE TABLE IF NOT EXISTS teachers (
  id            SERIAL PRIMARY KEY,
  commission_id INTEGER REFERENCES commissions(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  subject       VARCHAR(255),
  photo_url     VARCHAR(500),
  bio           TEXT,
  display_order INTEGER DEFAULT 0
);



-- Site-wide settings
CREATE TABLE IF NOT EXISTS site_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  subject VARCHAR(200),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_visible ON announcements(is_visible, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_teachers_commission   ON teachers(commission_id, display_order);

-- Evaluation Calendar
CREATE TABLE IF NOT EXISTS evaluation_calendar (
  id SERIAL PRIMARY KEY,
  grade_level INTEGER NOT NULL CHECK (grade_level IN (2, 4, 6, 8)),
  date_text VARCHAR(100) NOT NULL,
  event_description TEXT NOT NULL,
  is_highlighted BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_evaluation_calendar_grade ON evaluation_calendar(grade_level, display_order);

-- Public Documents Sections
CREATE TABLE IF NOT EXISTS public_document_sections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Public Documents
CREATE TABLE IF NOT EXISTS public_documents (
  id SERIAL PRIMARY KEY,
  section_id INTEGER REFERENCES public_document_sections(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Articles / Blog
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image VARCHAR(500),
  category VARCHAR(100),
  meta_title VARCHAR(255),
  meta_description TEXT,
  published_at TIMESTAMP DEFAULT NOW(),
  is_visible BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_visible, published_at DESC);
