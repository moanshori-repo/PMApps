const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// PM: Get history (completed projects and their tasks)
router.get('/projects', authenticateToken, authorizeRoles('super_user', 'project_manager'), async (req, res) => {
  try {
    const [projects] = await db.execute('SELECT * FROM projects WHERE status = "completed"');
    
    // For each project, fetch completed tasks
    const history = await Promise.all(projects.map(async (p) => {
      const [tasks] = await db.execute(`
        SELECT t.*, u.name as employee_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.project_id = ? AND t.status = "finished"
      `, [p.id]);
      return { ...p, tasks };
    }));

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Employee: Get their task history
router.get('/tasks', authenticateToken, authorizeRoles('employee'), async (req, res) => {
  try {
    const [tasks] = await db.execute(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.assigned_to = ? AND t.status = "finished"
    `, [req.user.id]);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
