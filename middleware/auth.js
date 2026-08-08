function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.flash = { type: 'error', message: 'Trebuie să te autentifici pentru a accesa această pagină.' };
  res.redirect('/admin/login');
}

module.exports = { requireAuth };
