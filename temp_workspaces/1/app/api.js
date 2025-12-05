const express = require('express');
const Task = require('./db/models/task');
const User = require('./db/models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeUserOrAdmin } = require('./auth');
const crypto = require('crypto');

const app = express();
app.use(express.json());
const SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// Password Reset Request
app.post('/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour
    await User.setResetToken(email, token, expires);
    // In production, send email. For now, return token in response for testing.
    res.json({ message: 'Password reset link sent.', token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Password Reset
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findByResetToken(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    const password_hash = await bcrypt.hash(password, 10);
    await User.update(user.id, { password_hash });
    await User.clearResetToken(user.id);
    res.json({ message: 'Password has been reset.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Auth Endpoints
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password_hash, role });
    res.status(201).json({ id: user.id, username: user.username, email: user.email, role: user.role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// User Endpoints
app.post('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { username, email, password, role } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password_hash, role });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/users/:id', authenticateToken, authorizeUserOrAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/users/:id', authenticateToken, authorizeUserOrAdmin, async (req, res) => {
  try {
    if (req.body.password) {
      req.body.password_hash = await bcrypt.hash(req.body.password, 10);
      delete req.body.password;
    }
    const user = await User.update(req.params.id, req.body);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/users/:id', authenticateToken, authorizeUserOrAdmin, async (req, res) => {
  try {
    await User.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Task Endpoints
app.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, user_id: req.user.id });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.user_id != req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/users/:user_id/tasks', authenticateToken, authorizeUserOrAdmin, async (req, res) => {
  try {
    const tasks = await Task.findByUserId(req.params.user_id);
    res.json(tasks);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.user_id != req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const updated = await Task.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.user_id != req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    await Task.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});
