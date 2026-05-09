const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Super User: Manage users
router.get('/', authenticateToken, authorizeRoles('super_user', 'project_manager'), async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, name, email, role, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticateToken, authorizeRoles('super_user'), async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, 10);
    await db.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, role]
    );
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  const { name, email, password } = req.body;
  const userId = req.user.id;
  try {
    let query = 'UPDATE users SET name = ?, email = ?';
    let params = [name, email];
    
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      query += ', password_hash = ?';
      params.push(password_hash);
    }
    
    query += ' WHERE id = ?';
    params.push(userId);
    
    await db.execute(query, params);
    res.json({ message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('super_user'), async (req, res) => {
  const { name, email, role, password } = req.body;
  try {
    let query = 'UPDATE users SET name = ?, email = ?, role = ?';
    let params = [name, email, role];
    
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      query += ', password_hash = ?';
      params.push(password_hash);
    }
    
    query += ' WHERE id = ?';
    params.push(req.params.id);
    
    await db.execute(query, params);
    res.json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, authorizeRoles('super_user'), async (req, res) => {
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
