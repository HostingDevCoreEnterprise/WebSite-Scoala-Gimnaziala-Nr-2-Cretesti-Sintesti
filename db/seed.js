require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const fs = require('fs');
const path = require('path');

async function seed() {
  const client = await pool.connect();
  try {
    console.log(' Applying schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);

    // ── Admin user ──────────────────────────────────────────────
    const adminExists = await client.query(`SELECT id FROM users WHERE username = 'admin'`);
    if (adminExists.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 12);
      await client.query(
        `INSERT INTO users (username, password_hash, display_name) VALUES ($1,$2,$3)`,
        ['admin', hash, 'Administrator']
      );
      console.log(' Admin user created (admin / admin123) — schimbă parola după primul login!');
    } else {
      console.log('ℹ️  Admin user already exists.');
    }

    // ── Site settings ────────────────────────────────────────────
    const settings = [
      ['school_name',     'Școala Gimnazială Nr. 2 Creței-Sintești'],
      ['school_address',  'Sat Creței, Comuna Sintești, Ilfov'],
      ['school_phone',    ''],
      ['school_email',    ''],
      ['school_schedule', 'Luni – Vineri: 08:00 – 14:00'],
      ['footer_extra',    ''],
    ];
    for (const [key, value] of settings) {
      await client.query(
        `INSERT INTO site_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING`,
        [key, value]
      );
    }
    console.log(' Site settings seeded.');



    // ── Sample commission ────────────────────────────────────────
    const commExists = await client.query(`SELECT id FROM commissions LIMIT 1`);
    if (commExists.rows.length === 0) {
      await client.query(
        `INSERT INTO commissions (name, description, display_order)
         VALUES ($1,$2,$3)`,
        ['Comisia de Limbă și Comunicare', 'Coordonează disciplinele de Limbă Română, Limbi Moderne și Comunicare.', 1]
      );
      console.log(' Sample commission added.');
    }

    console.log('\n Seed complet! Pornește serverul cu: npm run dev');
  } catch (err) {
    console.error(' Seed error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
