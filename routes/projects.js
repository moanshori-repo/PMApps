const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// PM & SU: View projects (with optional status filter)
router.get('/', authenticateToken, authorizeRoles('super_user', 'project_manager'), async (req, res) => {
  const { status } = req.query;
  try {
    let query = 'SELECT * FROM projects';
    let params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    const [projects] = await db.execute(query, params);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PM & SU: Create project
router.post('/', authenticateToken, authorizeRoles('super_user', 'project_manager'), async (req, res) => {
  const { name, description, deadline } = req.body;
  try {
    await db.execute(
      'INSERT INTO projects (name, description, created_by, status, deadline) VALUES (?, ?, ?, "active", ?)',
      [name, description, req.user.id, deadline || null]
    );
    res.status(201).json({ message: 'Project created' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PM: Update project status (e.g., mark as completed)
router.put('/:id/status', authenticateToken, authorizeRoles('super_user', 'project_manager'), async (req, res) => {
  const { status } = req.body;
  try {
    await db.execute('UPDATE projects SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Project status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
