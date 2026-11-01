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
    
    // 1. Rename any existing 'Management' section to 'Management și Calitate'
    await pool.query(`
      UPDATE public_document_sections 
      SET name = 'Management și Calitate', 
          slug = 'management-si-calitate' 
      WHERE name = 'Management' OR slug = 'management'
    `);

    // Remove obsolete 'Documente Generale' section
    await pool.query(`
      DELETE FROM public_document_sections 
      WHERE slug = 'documente-generale' OR name ILIKE '%documente generale%'
    `);

    // 2. Ensure 'Management și Calitate' exists
    const mngCheck = await pool.query(`SELECT id FROM public_document_sections WHERE name = 'Management și Calitate' OR slug = 'management-si-calitate' LIMIT 1`);
    if (mngCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO public_document_sections (name, slug, description, display_order)
        VALUES ('Management și Calitate', 'management-si-calitate', 'Documente de management instituțional, strategii și asigurarea calității', 1)
      `);
    }

    // 3. Ensure 'Regulamente' exists
    const regCheck = await pool.query(`SELECT id FROM public_document_sections WHERE name = 'Regulamente' OR slug = 'regulamente' LIMIT 1`);
    let regulamenteId;
    if (regCheck.rows.length === 0) {
      const regInsert = await pool.query(`
        INSERT INTO public_document_sections (name, slug, description, display_order)
        VALUES ('Regulamente', 'regulamente', 'Regulamentul de Organizare și Funcționare (ROFUIP) și Regulamentul de Ordine Interioară (ROI)', 2)
        RETURNING id
      `);
      regulamenteId = regInsert.rows[0].id;
    } else {
      regulamenteId = regCheck.rows[0].id;
    }

    // 4. Ensure 'Transparență Instituțională' exists
    const transCheck = await pool.query(`SELECT id FROM public_document_sections WHERE name = 'Transparență Instituțională' OR slug = 'transparenta-institutionala' LIMIT 1`);
    if (transCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO public_document_sections (name, slug, description, display_order)
        VALUES ('Transparență Instituțională', 'transparenta-institutionala', 'Rapoarte anuale de activitate, buget, achiziții publice și documente de interes public', 3)
      `);
    }

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
    
    // Insert some defaults if completely empty
    const docs = await pool.query('SELECT COUNT(*) FROM public_documents');
    if (parseInt(docs.rows[0].count) === 0 && regulamenteId) {
      await pool.query(`INSERT INTO public_documents (section_id, title, url) VALUES 
        ($1, 'Regulament de Ordine Interioară (ROI)', '#'),
        ($1, 'Regulament de Organizare și Funcționare (ROFUIP)', '#')
      `, [regulamenteId]);
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
