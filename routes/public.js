const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

// Helper: get site settings as flat object
async function getSettings() {
  const { rows } = await pool.query(`SELECT key, value FROM site_settings`);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}



// ── HOME ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const settings     = await getSettings();

    const { rows: announcements } = await pool.query(
      `SELECT id, title, content, category, priority, published_at, photo_url
       FROM announcements
       WHERE is_visible = TRUE AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY published_at DESC LIMIT 3`
    );

    res.render('public/home', {
      title: settings.school_name || 'Scoala Gimnaziala Nr. 2',
      settings, announcements,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('public/error', { statusCode: 500, title: 'Eroare', message: 'A aparut o eroare pe server.' });
  }
});

// ―― CONTACT ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
router.get('/contact', async (req, res) => {
  try {
    const settings = await getSettings();
    res.render('public/contact', {
      title: 'Contact - ' + (settings.school_name || 'Scoala Gimnaziala Nr. 2'),
      settings
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('public/error', { statusCode: 500, title: 'Eroare', message: 'A aparut o eroare pe server.' });
  }
});

router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    if (!name || !email || !message) {
      req.session.flash = { type: 'error', message: 'Vă rugăm să completați toate câmpurile obligatorii.' };
      return res.redirect('/contact');
    }
    await pool.query(
      `INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4)`,
      [name, email, subject || '', message]
    );
    req.session.flash = { type: 'success', message: 'Mesajul a fost trimis cu succes! Vă vom contacta în curând.' };
    res.redirect('/contact');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: 'A apărut o eroare la trimiterea mesajului. Încercați din nou.' };
    res.redirect('/contact');
  }
});

// ―― MODERNIZARE ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
router.get('/modernizare', async (req, res) => {
  try {
    const settings = await getSettings();
    res.render('public/modernizare', {
      title: 'Proiect de Modernizare — ' + (settings.school_name || ''),
      settings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('public/error', { statusCode: 500, title: 'Eroare', message: 'A aparut o eroare pe server.' });
  }
});

// ── ANUNȘšURI ─────────────────────────────────────────────────────────────────
router.get('/anunturi', async (req, res) => {
  try {
    const settings = await getSettings();
    const { category } = req.query;

    let query = `SELECT id, title, content, category, priority, published_at, photo_url
                 FROM announcements
                 WHERE is_visible = TRUE AND (expires_at IS NULL OR expires_at > NOW())`;
    const params = [];
    if (category) { params.push(category); query += ` AND category = $${params.length}`; }
    query += ` ORDER BY priority DESC, published_at DESC`;

    const { rows: announcements } = await pool.query(query, params);
    const { rows: cats }          = await pool.query(
      `SELECT DISTINCT category FROM announcements WHERE is_visible=TRUE ORDER BY category`
    );

    res.render('public/anunturi', {
      title: 'Anunțuri — ' + (settings.school_name || ''),
      settings, announcements, categories: cats.map(r => r.category), activeCategory: category || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('public/error', { statusCode: 500, title: 'Eroare', message: 'A aparut o eroare pe server.' });
  }
});

// ── ARTICOLE (BLOG) ──────────────────────────────────────────────────────────
router.get('/articole', async (req, res, next) => {
  try {
    const settings = await getSettings();
    const { category } = req.query;

    let query = `SELECT id, title, slug, excerpt, featured_image, category, published_at
                 FROM articles
                 WHERE is_visible = TRUE`;
    const params = [];
    
    if (category) { 
      params.push(category); 
      query += ` AND category = $${params.length}`; 
    }
    query += ` ORDER BY published_at DESC`;

    const { rows: articles } = await pool.query(query, params);
    const { rows: cats } = await pool.query(
      `SELECT DISTINCT category FROM articles WHERE is_visible=TRUE AND category IS NOT NULL ORDER BY category`
    );

    res.render('public/articles-list', {
      title: 'Articole — ' + (settings.school_name || ''),
      settings,
      articles,
      categories: cats.map(r => r.category),
      activeCategory: category || '',
      currentPage: 'articole'
    });
  } catch (err) { next(err); }
});

router.get('/articole/:slug', async (req, res, next) => {
  try {
    const settings = await getSettings();
    const { slug } = req.params;

    const { rows } = await pool.query(`SELECT * FROM articles WHERE slug = $1 AND is_visible = TRUE`, [slug]);
    
    if (rows.length === 0) {
      return res.status(404).render('public/error', { 
        statusCode: 404, 
        title: 'Articolul nu a fost găsit', 
        message: 'Articolul pe care îl căutați nu mai există sau a fost mutat.',
        image: 'error_404_1782736760773.png'
      });
    }

    const article = rows[0];

    res.render('public/article-single', {
      title: (article.meta_title || article.title) + ' — ' + (settings.school_name || ''),
      metaDesc: article.meta_description || article.excerpt,
      settings,
      article,
      currentPage: 'articole'
    });
  } catch (err) { next(err); }
});

// ── ELEVI ──────────────────────────────────────────────────────────────────────
router.get('/elevi', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.render('public/elevi', { title: 'Elevi — ' + (settings.school_name || ''), settings });
  } catch (err) { next(err); }
});

router.get('/inscrieri', async (req, res, next) => {
  try {
    const settings = await getSettings();
    const { rows } = await pool.query(`SELECT * FROM enrollment_stats ORDER BY id DESC LIMIT 1`);
    res.render('public/inscrieri', { title: 'Înscrieri — ' + (settings.school_name || ''), settings, stats: rows[0] || null });
  } catch (err) { next(err); }
});

router.get('/activitati-extra', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.render('public/activitati-extra', { title: 'Activități Extra — ' + (settings.school_name || ''), settings });
  } catch (err) { next(err); }
});

router.get('/absolvire', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.render('public/absolvire', { title: 'Absolvire — ' + (settings.school_name || ''), settings });
  } catch (err) { next(err); }
});

router.get('/evaluare-nationala', async (req, res, next) => {
  try {
    const settings = await getSettings();
    const tab = req.query.tab || '8';
    
    // Fetch from evaluation_calendar
    const { rows: calendarEvents } = await pool.query(
      `SELECT date_text, event_description, is_highlighted 
       FROM evaluation_calendar 
       WHERE grade_level = $1 
       ORDER BY display_order`,
      [parseInt(tab)]
    );

    res.render('public/evaluare-nationala', { 
      title: 'Evaluare Națională — ' + (settings.school_name || ''), 
      settings, 
      tab,
      calendarEvents 
    });
  } catch (err) { next(err); }
});

// ── DESPRE ȘCOALÄ‚ ──────────────────────────────────────────────────────────────
router.get('/despre-scoala', async (req, res) => {
  try {
    const settings = await getSettings();

    res.render('public/despre-scoala', {
      title: 'Despre Școală — ' + (settings.school_name || ''),
      settings
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('public/error', { statusCode: 500, title: 'Eroare', message: 'A aparut o eroare pe server.' });
  }
});

// ── PROFESORI ────────────────────────────────────────────────────────────────
router.get('/profesori', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.render('public/profesori', { title: 'Profesori — ' + (settings.school_name || ''), settings });
  } catch (err) { next(err); }
});

// ── CONDUCERE ────────────────────────────────────────────────────────────────
router.get('/conducere', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.render('public/conducere', { title: 'Conducere — ' + (settings.school_name || ''), settings });
  } catch (err) { next(err); }
});

// ── CREDITE ──────────────────────────────────────────────────────────────────
router.get('/credite', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.render('public/credite', { title: 'Credite & Parteneri — ' + (settings.school_name || ''), settings });
  } catch (err) { next(err); }
});
// ── INFORMAȚII PUBLICE ───────────────────────────────────────────────────────
router.get('/informatii-publice', async (req, res, next) => {
  try {
    const settings = await getSettings();
    
    // Fetch sections
    const { rows: sections } = await pool.query(`SELECT * FROM public_document_sections ORDER BY display_order, id`);
    
    // Fetch documents
    const { rows: documents } = await pool.query(`SELECT * FROM public_documents ORDER BY section_id, display_order, id`);
    
    // Group documents by section
    const groupedDocuments = {};
    for (const sec of sections) {
      groupedDocuments[sec.id] = [];
    }
    for (const doc of documents) {
      if (!groupedDocuments[doc.section_id]) groupedDocuments[doc.section_id] = [];
      groupedDocuments[doc.section_id].push(doc);
    }
    
    res.render('public/informatii-publice', { 
      title: 'Informații Publice — ' + (settings.school_name || ''), 
      settings, 
      sections,
      groupedDocuments 
    });
  } catch (err) { next(err); }
});

router.get('/documente', (req, res) => {
  res.redirect(301, '/informatii-publice');
});

// ── COMISII CURRICULUM ───────────────────────────────────────────────────────
router.get('/comisii', async (req, res) => {
  try {
    const settings = await getSettings();
    const { rows: commissions } = await pool.query(
      `SELECT id, name, description FROM commissions ORDER BY display_order, id`
    );

    const tab = req.query.tab || (commissions[0] ? String(commissions[0].id) : '');

    let teachers = [];
    let activeCommission = null;
    if (tab) {
      const commId = parseInt(tab);
      activeCommission = commissions.find(c => c.id === commId) || null;
      const res2 = await pool.query(
        `SELECT name, subject, photo_url, bio FROM teachers WHERE commission_id=$1 ORDER BY display_order, id`,
        [commId]
      );
      teachers = res2.rows;
    }

    res.render('public/comisii', {
      title: 'Comisii Curriculum — ' + (settings.school_name || ''),
      settings, commissions, tab, teachers, activeCommission
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('public/error', { statusCode: 500, title: 'Eroare', message: 'A aparut o eroare pe server.' });
  }
});

module.exports = router;
