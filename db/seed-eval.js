require('dotenv').config();
const pool = require('./pool');
const fs = require('fs');
const path = require('path');

const data = [
  // Class 2
  { grade: 2, date: '12 mai 2026', desc: 'Limbă şi comunicare – scris – Limba română', hl: false },
  { grade: 2, date: '12 mai 2026', desc: 'Limbă şi comunicare – scris – Limba maternă', hl: false },
  { grade: 2, date: '13 mai 2026', desc: 'Limbă şi comunicare – citit – Limba română', hl: false },
  { grade: 2, date: '13 mai 2026', desc: 'Limbă şi comunicare – citit – Limba maternă', hl: false },
  { grade: 2, date: '14 mai 2026', desc: 'Matematică şi Explorarea mediului', hl: false },
  { grade: 2, date: '15 mai 2026', desc: 'Limbă şi comunicare – scris – citit – Limba română pentru minorităţile naţionale', hl: false },
  
  // Class 4
  { grade: 4, date: '19 mai 2026', desc: 'Limbă şi comunicare – Limba română/Limba română pentru minorităţile naţionale', hl: false },
  { grade: 4, date: '20 mai 2026', desc: 'Matematică şi Ştiinţe ale naturii', hl: false },
  { grade: 4, date: '21 mai 2026', desc: 'Limbă şi comunicare – Limba maternă', hl: false },
  
  // Class 6
  { grade: 6, date: '26 mai 2026', desc: 'Limbă şi comunicare – Limba română/Limba română pentru minorităţile naţionale', hl: false },
  { grade: 6, date: '27 mai 2026', desc: 'Matematică şi Ştiinţe ale naturii', hl: false },
  { grade: 6, date: '28 mai 2026', desc: 'Limbă şi comunicare – Limba maternă', hl: false },
  
  // Class 8
  { grade: 8, date: '8-12 iunie 2026', desc: 'Înscrierea la evaluarea națională', hl: false },
  { grade: 8, date: '12 iunie 2026', desc: 'Încheierea cursurilor pentru clasa a VIII-a', hl: false },
  { grade: 8, date: '22 iunie 2026', desc: 'Limba și literatura română — probă scrisă', hl: true },
  { grade: 8, date: '24 iunie 2026', desc: 'Matematică — probă scrisă', hl: true },
  { grade: 8, date: '26 iunie 2026', desc: 'Limba și literatura maternă — probă scrisă', hl: true },
  { grade: 8, date: '1 iulie 2026', desc: 'Afișarea rezultatelor inițiale (până la ora 12:00), vizualizarea lucrărilor scrise și depunerea contestațiilor (în intervalul orar 14:00-18:00)', hl: false },
  { grade: 8, date: '2-3 iulie 2026', desc: 'Vizualizarea lucrărilor scrise și depunerea contestațiilor', hl: false },
  { grade: 8, date: '4-7 iulie 2026', desc: 'Soluționarea contestațiilor', hl: false },
  { grade: 8, date: '8 iulie 2026', desc: 'Afișarea rezultatelor finale după soluționarea contestațiilor', hl: true },
];

async function seed() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql')).toString();
    await pool.query(schemaSql);
    
    // Check if table is empty
    const res = await pool.query('SELECT COUNT(*) FROM evaluation_calendar');
    if (parseInt(res.rows[0].count) === 0) {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        await pool.query(
          `INSERT INTO evaluation_calendar (grade_level, date_text, event_description, is_highlighted, display_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [item.grade, item.date, item.desc, item.hl, i * 10]
        );
      }
      console.log('Seed completed successfully!');
    } else {
      console.log('Evaluation calendar already seeded.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
seed();
