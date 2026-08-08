require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Trust proxy (pentru Railway/Heroku/Koyeb unde aplicatia este in spatele unui load balancer, altfel cookie-urile secure sunt ignorate)
app.set('trust proxy', 1);

// Session
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db/pool');

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-CHANGE-ME',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// Inject user + flash into all views
app.use((req, res, next) => {
  res.locals.user  = req.session.user  || null;
  res.locals.flash = req.session.flash || null;
  if (req.session.flash) delete req.session.flash;
  next();
});

// Routes
app.use('/',      require('./routes/public'));
app.use('/admin', require('./routes/admin'));

// Custom Error Handlers
app.use((req, res) => {
  res.status(404).render('public/error', { 
    title: 'Pagina Nu A Fost Găsită',
    statusCode: 404,
    message: 'Se pare că această pagină a dispărut sau nu a existat niciodată. Te rugăm să verifici adresa.',
    image: 'error_404_1782736760773.png'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Custom logic based on error type/status
  const status = err.status || 500;
  
  if (status === 400) {
    return res.status(400).render('public/error', {
      title: 'Cerere Invalidă',
      statusCode: 400,
      message: 'Datele trimise nu sunt corecte sau lipsesc informații importante.',
      image: 'error_400_1782736740192.png'
    });
  }
  
  if (status === 403) {
    return res.status(403).render('public/error', {
      title: 'Acces Interzis',
      statusCode: 403,
      message: 'Nu ai permisiunile necesare pentru a accesa această resursă.',
      image: 'error_403_1782736750663.png'
    });
  }

  // Default 500
  res.status(500).render('public/error', { 
    title: 'Eroare Internă a Serverului',
    statusCode: 500,
    message: 'A apărut o problemă tehnică pe server-ul nostru. Echipa tehnică a fost notificată.',
    image: 'error_500_1782736771470.png'
  });
});

app.listen(PORT, () => {
  console.log(`  Server pornit la http://localhost:${PORT}`);
});
