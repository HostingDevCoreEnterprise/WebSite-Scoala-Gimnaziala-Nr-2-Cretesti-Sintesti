const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const pool     = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const flash = (req, type, message) => { req.session.flash = { type, message }; };

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin');
  res.render('admin/login', { title: 'Autentificare Admin' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query(`SELECT * FROM users WHERE username=$1`, [username]);
    if (!rows.length) { flash(req,'error','Utilizator sau parolă incorectă.'); return res.redirect('/admin/login'); }
    const user = rows[0];
    const ok   = await bcrypt.compare(password, user.password_hash);
    if (!ok)   { flash(req,'error','Utilizator sau parolă incorectă.'); return res.redirect('/admin/login'); }
    req.session.user = { id: user.id, username: user.username, display_name: user.display_name };
    res.redirect('/admin');
  } catch (err) { console.error(err); flash(req,'error','Eroare internă.'); res.redirect('/admin/login'); }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const [ann, comm, teach, users] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM announcements WHERE is_visible=TRUE`),
      pool.query(`SELECT COUNT(*) FROM commissions`),
      pool.query(`SELECT COUNT(*) FROM teachers`),
      pool.query(`SELECT COUNT(*) FROM users`),
    ]);
    const recent = await pool.query(`SELECT id,title,priority,published_at FROM announcements ORDER BY published_at DESC LIMIT 5`);
    res.render('admin/dashboard', {
      title: 'Dashboard Admin',
      stats: {
        announcements: ann.rows[0].count,
        commissions:   comm.rows[0].count,
        teachers:      teach.rows[0].count,
        users:         users.rows[0].count,
      },
      recentAnn: recent.rows,
    });
  } catch (err) { console.error(err); res.redirect('/admin/login'); }
});

// ── ANUNȚURI ──────────────────────────────────────────────────────────────────
router.get('/anunturi', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM announcements ORDER BY published_at DESC`);
  res.render('admin/anunturi', { title: 'Gestionare Anunțuri', announcements: rows, editing: null });
});

router.get('/anunturi/:id/edit', requireAuth, async (req, res) => {
  const { rows: all } = await pool.query(`SELECT * FROM announcements ORDER BY published_at DESC`);
  const { rows }      = await pool.query(`SELECT * FROM announcements WHERE id=$1`, [req.params.id]);
  if (!rows.length) return res.redirect('/admin/anunturi');
  res.render('admin/anunturi', { title: 'Editare Anunț', announcements: all, editing: rows[0] });
});

router.post('/anunturi', requireAuth, async (req, res) => {
  const { title, content, category, priority, expires_at, photo_url } = req.body;
  await pool.query(
    `INSERT INTO announcements (title,content,category,priority,expires_at,created_by,photo_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [title, content, category||'General', priority||'normal', expires_at||null, req.session.user.id, photo_url||null]
  );
  flash(req,'success','Anunț adăugat cu succes!');
  res.redirect('/admin/anunturi');
});

router.post('/anunturi/:id/update', requireAuth, async (req, res) => {
  const { title, content, category, priority, expires_at, is_visible, photo_url } = req.body;
  await pool.query(
    `UPDATE announcements SET title=$1,content=$2,category=$3,priority=$4,expires_at=$5,is_visible=$6,photo_url=$7 WHERE id=$8`,
    [title, content, category||'General', priority||'normal', expires_at||null, !!is_visible, photo_url||null, req.params.id]
  );
  flash(req,'success','Anunț actualizat!');
  res.redirect('/admin/anunturi');
});

router.post('/anunturi/:id/delete', requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM announcements WHERE id=$1`, [req.params.id]);
  flash(req,'success','Anunț șters.');
  res.redirect('/admin/anunturi');
});

router.post('/anunturi/:id/toggle', requireAuth, async (req, res) => {
  await pool.query(`UPDATE announcements SET is_visible = NOT is_visible WHERE id=$1`, [req.params.id]);
  res.redirect('/admin/anunturi');
});

// ── ARTICOLE ──────────────────────────────────────────────────────────────────
router.get('/articole', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT id, title, category, published_at, is_visible FROM articles ORDER BY published_at DESC`);
  res.render('admin/articole', { title: 'Gestionare Articole', articles: rows, editing: null });
});

router.get('/articole/:id/edit', requireAuth, async (req, res) => {
  const { rows: all } = await pool.query(`SELECT id, title, category, published_at, is_visible FROM articles ORDER BY published_at DESC`);
  const { rows } = await pool.query(`SELECT * FROM articles WHERE id=$1`, [req.params.id]);
  if (!rows.length) return res.redirect('/admin/articole');
  res.render('admin/articole', { title: 'Editare Articol', articles: all, editing: rows[0] });
});

router.post('/articole', requireAuth, async (req, res) => {
  const { title, slug, category, excerpt, content, featured_image } = req.body;
  const genSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  try {
    await pool.query(
      `INSERT INTO articles (title, slug, category, excerpt, content, featured_image, meta_title, meta_description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [title, genSlug, category || 'General', excerpt || '', content || '', featured_image || '', title, excerpt || '', req.session.user.id]
    );
    flash(req, 'success', 'Articol adăugat cu succes!');
  } catch(err) {
    console.error(err);
    flash(req, 'error', 'Eroare la adăugarea articolului (posibil slug duplicat).');
  }
  res.redirect('/admin/articole');
});

router.post('/articole/:id/update', requireAuth, async (req, res) => {
  const { title, slug, category, excerpt, content, featured_image, is_visible, meta_title, meta_description } = req.body;
  const genSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  try {
    await pool.query(
      `UPDATE articles SET title=$1, slug=$2, category=$3, excerpt=$4, content=$5, featured_image=$6, is_visible=$7, meta_title=$8, meta_description=$9 WHERE id=$10`,
      [title, genSlug, category || 'General', excerpt || '', content || '', featured_image || '', !!is_visible, meta_title || title, meta_description || excerpt, req.params.id]
    );
    flash(req, 'success', 'Articol actualizat!');
  } catch(err) {
    console.error(err);
    flash(req, 'error', 'Eroare la actualizarea articolului.');
  }
  res.redirect('/admin/articole');
});

router.post('/articole/:id/delete', requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM articles WHERE id=$1`, [req.params.id]);
  flash(req, 'success', 'Articol șters.');
  res.redirect('/admin/articole');
});

router.post('/articole/:id/toggle', requireAuth, async (req, res) => {
  await pool.query(`UPDATE articles SET is_visible = NOT is_visible WHERE id=$1`, [req.params.id]);
  res.redirect('/admin/articole');
});

// ── COMISII + PROFESORI ───────────────────────────────────────────────────────
router.get('/comisii', requireAuth, async (req, res) => {
  const { rows: commissions } = await pool.query(`SELECT * FROM commissions ORDER BY display_order,id`);
  const { rows: teachers }    = await pool.query(`SELECT * FROM teachers ORDER BY commission_id,display_order,id`);
  const editComm = req.query.editComm ? commissions.find(c=>c.id==req.query.editComm) : null;
  const editTeach = req.query.editTeach ? teachers.find(t=>t.id==req.query.editTeach) : null;
  res.render('admin/comisii', { title: 'Comisii & Profesori', commissions, teachers, editComm, editTeach });
});

router.post('/comisii', requireAuth, async (req, res) => {
  const { name, description, display_order } = req.body;
  await pool.query(`INSERT INTO commissions (name,description,display_order) VALUES ($1,$2,$3)`, [name,description||null,display_order||0]);
  flash(req,'success','Comisie adăugată!');
  res.redirect('/admin/comisii');
});

router.post('/comisii/:id/update', requireAuth, async (req, res) => {
  const { name, description, display_order } = req.body;
  await pool.query(`UPDATE commissions SET name=$1,description=$2,display_order=$3 WHERE id=$4`, [name,description||null,display_order||0,req.params.id]);
  flash(req,'success','Comisie actualizată!');
  res.redirect('/admin/comisii');
});

router.post('/comisii/:id/delete', requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM commissions WHERE id=$1`, [req.params.id]);
  flash(req,'success','Comisie și profesorii ei au fost șterși.');
  res.redirect('/admin/comisii');
});

router.post('/profesori', requireAuth, async (req, res) => {
  const { commission_id, name, subject, photo_url, bio, display_order } = req.body;
  await pool.query(
    `INSERT INTO teachers (commission_id,name,subject,photo_url,bio,display_order) VALUES ($1,$2,$3,$4,$5,$6)`,
    [commission_id, name, subject||null, photo_url||null, bio||null, display_order||0]
  );
  flash(req,'success','Profesor adăugat!');
  res.redirect('/admin/comisii');
});

router.post('/profesori/:id/update', requireAuth, async (req, res) => {
  const { name, subject, photo_url, bio, display_order } = req.body;
  await pool.query(
    `UPDATE teachers SET name=$1,subject=$2,photo_url=$3,bio=$4,display_order=$5 WHERE id=$6`,
    [name, subject||null, photo_url||null, bio||null, display_order||0, req.params.id]
  );
  flash(req,'success','Profesor actualizat!');
  res.redirect('/admin/comisii');
});

router.post('/profesori/:id/delete', requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM teachers WHERE id=$1`, [req.params.id]);
  flash(req,'success','Profesor șters.');
  res.redirect('/admin/comisii');
});


// ── SETĂRI SITE ───────────────────────────────────────────────────────────────
router.get('/setari', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT key,value FROM site_settings ORDER BY key`);
  const settings = Object.fromEntries(rows.map(r=>[r.key,r.value]));
  res.render('admin/setari', { title: 'Setări Site', settings });
});

router.post('/setari', requireAuth, async (req, res) => {
  const allowed = ['school_name','school_address','school_phone','school_email','school_schedule','footer_extra'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      await pool.query(
        `INSERT INTO site_settings (key,value,updated_at) VALUES ($1,$2,NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, req.body[key]]
      );
    }
  }
  flash(req,'success','Setări salvate!');
  res.redirect('/admin/setari');
});

// ── UTILIZATORI ───────────────────────────────────────────────────────────────
router.get('/utilizatori', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.created_at, c.username AS created_by_name
     FROM users u LEFT JOIN users c ON c.id=u.created_by ORDER BY u.created_at`
  );
  res.render('admin/utilizatori', { title: 'Gestionare Utilizatori', users: rows });
});

router.post('/utilizatori', requireAuth, async (req, res) => {
  const { username, display_name, password } = req.body;
  if (!username || !password) { flash(req,'error','Completează utilizatorul și parola.'); return res.redirect('/admin/utilizatori'); }
  try {
    const exists = await pool.query(`SELECT id FROM users WHERE username=$1`,[username]);
    if (exists.rows.length) { flash(req,'error','Utilizatorul există deja.'); return res.redirect('/admin/utilizatori'); }
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (username,password_hash,display_name,created_by) VALUES ($1,$2,$3,$4)`,
      [username, hash, display_name||username, req.session.user.id]
    );
    flash(req,'success',`Cont creat pentru ${username}.`);
  } catch (err) { console.error(err); flash(req,'error','Eroare la creare cont.'); }
  res.redirect('/admin/utilizatori');
});

router.post('/utilizatori/:id/delete', requireAuth, async (req, res) => {
  if (parseInt(req.params.id) === req.session.user.id) {
    flash(req,'error','Nu îți poți șterge propriul cont!');
    return res.redirect('/admin/utilizatori');
  }
  await pool.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
  flash(req,'success','Cont șters.');
  res.redirect('/admin/utilizatori');
});

router.post('/utilizatori/:id/parola', requireAuth, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    flash(req,'error','Parola trebuie să aibă minim 6 caractere.'); return res.redirect('/admin/utilizatori');
  }
  const hash = await bcrypt.hash(new_password, 12);
  await pool.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hash, req.params.id]);
  flash(req,'success','Parolă schimbată.');
  res.redirect('/admin/utilizatori');
});

// ── ÎNSCRIERI ──────────────────────────────────────────────────────────────────
router.get('/inscrieri', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM enrollment_stats ORDER BY id DESC LIMIT 1`);
  res.render('admin/inscrieri', { title: 'Locuri Înscrieri', stats: rows[0] || { year: '', total_seats: 0, occupied_seats: 0 } });
});

router.post('/inscrieri', requireAuth, async (req, res) => {
  const { year, total_seats, occupied_seats } = req.body;
  await pool.query(
    `INSERT INTO enrollment_stats (year, total_seats, occupied_seats, updated_at) 
     VALUES ($1, $2, $3, NOW())`,
    [year, parseInt(total_seats) || 0, parseInt(occupied_seats) || 0]
  );
  flash(req, 'success', 'Datele despre înscrieri au fost salvate!');
  res.redirect('/admin/inscrieri');
});

// ── INFORMAȚII PUBLICE ───────────────────────────────────────────────────────
router.get('/informatii-publice', requireAuth, async (req, res) => {
  const { rows: sections } = await pool.query(`SELECT * FROM public_document_sections ORDER BY display_order, id`);
  const { rows: documents } = await pool.query(`SELECT * FROM public_documents ORDER BY section_id, display_order, id`);
  
  const editSec = req.query.editSec ? sections.find(r => r.id == req.query.editSec) : null;
  const editDoc = req.query.editDoc ? documents.find(r => r.id == req.query.editDoc) : null;

  res.render('admin/informatii-publice', { 
    title: 'Informații Publice', 
    sections, 
    documents,
    editSec,
    editDoc
  });
});

// Sections CRUD
router.post('/informatii-publice/sections', requireAuth, async (req, res) => {
  const { name, slug, description, display_order } = req.body;
  await pool.query(
    `INSERT INTO public_document_sections (name, slug, description, display_order) VALUES ($1, $2, $3, $4)`,
    [name, slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), description || '', parseInt(display_order) || 0]
  );
  flash(req, 'success', 'Secțiune adăugată!');
  res.redirect('/admin/informatii-publice');
});

router.post('/informatii-publice/sections/:id/update', requireAuth, async (req, res) => {
  const { name, slug, description, display_order } = req.body;
  await pool.query(
    `UPDATE public_document_sections SET name=$1, slug=$2, description=$3, display_order=$4 WHERE id=$5`,
    [name, slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), description || '', parseInt(display_order) || 0, req.params.id]
  );
  flash(req, 'success', 'Secțiune actualizată!');
  res.redirect('/admin/informatii-publice');
});

router.post('/informatii-publice/sections/:id/delete', requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM public_document_sections WHERE id=$1`, [req.params.id]);
  flash(req, 'success', 'Secțiune ștearsă!');
  res.redirect('/admin/informatii-publice');
});

// Documents CRUD
router.post('/informatii-publice/documents', requireAuth, async (req, res) => {
  const { section_id, title, url, display_order } = req.body;
  await pool.query(
    `INSERT INTO public_documents (section_id, title, url, display_order) VALUES ($1, $2, $3, $4)`,
    [section_id, title, url, parseInt(display_order) || 0]
  );
  flash(req, 'success', 'Document adăugat!');
  res.redirect('/admin/informatii-publice');
});

router.post('/informatii-publice/documents/:id/update', requireAuth, async (req, res) => {
  const { section_id, title, url, display_order } = req.body;
  await pool.query(
    `UPDATE public_documents SET section_id=$1, title=$2, url=$3, display_order=$4 WHERE id=$5`,
    [section_id, title, url, parseInt(display_order) || 0, req.params.id]
  );
  flash(req, 'success', 'Document actualizat!');
  res.redirect('/admin/informatii-publice');
});

router.post('/informatii-publice/documents/:id/delete', requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM public_documents WHERE id=$1`, [req.params.id]);
  flash(req, 'success', 'Document șters!');
  res.redirect('/admin/informatii-publice');
});


// ―― MESAJE CONTACT ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
router.get('/mesaje', requireAuth, async (req, res) => {
  try {
    const { rows: messages } = await pool.query(`SELECT * FROM contact_messages ORDER BY created_at DESC`);
    res.render('admin/mesaje', { title: 'Mesaje Contact', messages, currentSection: 'mesaje' });
  } catch (err) {
    console.error(err);
    flash(req, 'error', 'Eroare la încărcarea mesajelor.');
    res.redirect('/admin');
  }
});

router.post('/mesaje/delete/:id', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM contact_messages WHERE id=$1`, [req.params.id]);
    flash(req, 'success', 'Mesajul a fost șters cu succes.');
    res.redirect('/admin/mesaje');
  } catch (err) {
    console.error(err);
    flash(req, 'error', 'Eroare la ștergerea mesajului.');
    res.redirect('/admin/mesaje');
  }
});

// ―― EVALUARE NAȚIONALĂ ――――――――――――――――――――――――――――――――――――――――――――――――――――――
router.get('/evaluare', requireAuth, async (req, res) => {
  try {
    const { rows: events } = await pool.query(`SELECT * FROM evaluation_calendar ORDER BY grade_level, display_order, id`);
    const editEvent = req.query.edit ? events.find(e => e.id == req.query.edit) : null;
    res.render('admin/evaluare', { title: 'Evaluare Națională', events, editEvent, currentSection: 'evaluare' });
  } catch (err) {
    console.error(err);
    flash(req, 'error', 'Eroare la încărcarea datelor.');
    res.redirect('/admin');
  }
});

router.post('/evaluare', requireAuth, async (req, res) => {
  const { grade_level, date_text, event_description, is_highlighted, display_order } = req.body;
  try {
    await pool.query(
      `INSERT INTO evaluation_calendar (grade_level, date_text, event_description, is_highlighted, display_order) 
       VALUES ($1, $2, $3, $4, $5)`,
      [parseInt(grade_level) || 8, date_text, event_description, !!is_highlighted, parseInt(display_order) || 0]
    );
    flash(req, 'success', 'Eveniment adăugat cu succes!');
  } catch (err) {
    console.error(err);
    flash(req, 'error', 'Eroare la adăugarea evenimentului.');
  }
  res.redirect('/admin/evaluare');
});

router.post('/evaluare/:id/update', requireAuth, async (req, res) => {
  const { grade_level, date_text, event_description, is_highlighted, display_order } = req.body;
  try {
    await pool.query(
      `UPDATE evaluation_calendar 
       SET grade_level=$1, date_text=$2, event_description=$3, is_highlighted=$4, display_order=$5 
       WHERE id=$6`,
      [parseInt(grade_level) || 8, date_text, event_description, !!is_highlighted, parseInt(display_order) || 0, req.params.id]
    );
    flash(req, 'success', 'Eveniment actualizat!');
  } catch (err) {
    console.error(err);
    flash(req, 'error', 'Eroare la actualizarea evenimentului.');
  }
  res.redirect('/admin/evaluare');
});

router.post('/evaluare/:id/delete', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM evaluation_calendar WHERE id=$1`, [req.params.id]);
    flash(req, 'success', 'Eveniment șters.');
  } catch (err) {
    console.error(err);
    flash(req, 'error', 'Eroare la ștergerea evenimentului.');
  }
  res.redirect('/admin/evaluare');
});

module.exports = router;
