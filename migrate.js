require('dotenv').config();
const pool = require('./db/pool');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollment_stats (
        id SERIAL PRIMARY KEY,
        year VARCHAR(20) NOT NULL,
        total_seats INTEGER DEFAULT 0,
        occupied_seats INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Insert default values if empty
    const res = await pool.query('SELECT COUNT(*) FROM enrollment_stats');
    if (parseInt(res.rows[0].count) === 0) {
      await pool.query(`INSERT INTO enrollment_stats (year, total_seats, occupied_seats) VALUES ('2025-2026', 150, 45)`);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public_document_sections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Insert default section
    const sectionRes = await pool.query(`SELECT COUNT(*) FROM public_document_sections`);
    if (parseInt(sectionRes.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO public_document_sections (name, slug, description, display_order)
        VALUES ('Documente Generale', 'documente-generale', 'Documente de interes general', 0)
      `);
    }

    const defaultSectionRes = await pool.query(`SELECT id FROM public_document_sections WHERE slug = 'documente-generale' LIMIT 1`);
    const defaultSectionId = defaultSectionRes.rows.length ? defaultSectionRes.rows[0].id : 1;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public_documents (
        id SERIAL PRIMARY KEY,
        section_id INTEGER REFERENCES public_document_sections(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Insert some defaults
    const docs = await pool.query('SELECT COUNT(*) FROM public_documents');
    if (parseInt(docs.rows[0].count) === 0) {
      await pool.query(`INSERT INTO public_documents (section_id, title, url) VALUES 
        ($1, 'Regulament de Ordine Interioara', '#'),
        ($1, 'Cerere de Inscriere tip', '#')
      `, [defaultSectionId]);
    }

    await pool.query(`
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
    `);
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_visible, published_at DESC);`);

    console.log('Migration successful');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
