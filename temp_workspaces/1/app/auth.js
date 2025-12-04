const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev_secret_key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function authorizeUserOrAdmin(req, res, next) {
  if (req.user.role === 'admin' || req.user.id == req.params.id || req.user.id == req.params.user_id) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden' });
}

module.exports = { authenticateToken, authorizeUserOrAdmin };