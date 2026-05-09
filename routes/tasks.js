const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get all tasks (PM/SU) or assigned tasks (EMP)
router.get('/', authenticateToken, async (req, res) => {
  const { status, project_id } = req.query;
  try {
    let query = `
      SELECT t.*, p.name as project_name, u.name as assigned_to_name, ub.name as assigned_by_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users ub ON t.assigned_by = ub.id
      WHERE 1=1
    `;
    let params = [];

    if (req.user.role === 'employee') {
      query += ' AND t.assigned_to = ?';
      params.push(req.user.id);
    }

    if (status) {
      if (status === 'active') {
        query += ' AND t.status != "finished"';
      } else {
        query += ' AND t.status = ?';
        params.push(status);
      }
    }

    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }

    const [tasks] = await db.execute(query, params);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create task (PM/SU)
router.post('/', authenticateToken, authorizeRoles('super_user', 'project_manager'), async (req, res) => {
  const { title, description, project_id, assigned_to, deadline } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO tasks (title, description, project_id, assigned_to, assigned_by, status, deadline) VALUES (?, ?, ?, ?, ?, "initiated", ?)',
      [title, description, project_id, assigned_to, req.user.id, deadline || null]
    );
    
    // Log initial status
    await db.execute(
      'INSERT INTO task_status_logs (task_id, new_status, changed_by, note) VALUES (?, "initiated", ?, "Task created")',
      [result.insertId, req.user.id]
    );

    res.status(201).json({ message: 'Task created' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status (Strict logic)
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { new_status, note } = req.body;
  const taskId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const [tasks] = await db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) return res.status(404).json({ message: 'Task not found' });
    
    const task = tasks[0];
    const old_status = task.status;

    // Check if task is already finished
    if (old_status === 'finished') {
      return res.status(400).json({ message: 'Task is already finished and locked' });
    }

    // Role-based status transition validation
    let isValid = false;

    if (userRole === 'employee') {
      if (task.assigned_to !== userId) return res.status(403).json({ message: 'Not assigned to you' });

      if (old_status === 'initiated' && new_status === 'on_progress') isValid = true;
      if (old_status === 'on_progress' && new_status === 'check') {
        if (!note) return res.status(400).json({ message: 'Progress note is required' });
        isValid = true;
      }
      if (old_status === 'revise' && new_status === 'on_progress') isValid = true;
    } else if (userRole === 'project_manager' || userRole === 'super_user') {
      // PM can move to initiated (reassign?), revise, or finished
      if (old_status === 'check' && (new_status === 'finished' || new_status === 'revise')) {
        if (new_status === 'revise' && !note) return res.status(400).json({ message: 'Revision note is required' });
        isValid = true;
      }
      // PM can also move to initiated if they want to reset it? 
      // The prompt says PM can change status to initiated, revise, finished.
      if (new_status === 'initiated') isValid = true;
    }

    if (!isValid) {
      return res.status(400).json({ message: `Invalid status transition from ${old_status} to ${new_status} for your role` });
    }

    // Update status and log
    await db.execute('UPDATE tasks SET status = ? WHERE id = ?', [new_status, taskId]);
    await db.execute(
      'INSERT INTO task_status_logs (task_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
      [taskId, old_status, new_status, userId, note || null]
    );

    res.json({ message: 'Status updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task logs
router.get('/:id/logs', authenticateToken, async (req, res) => {
  try {
    const [logs] = await db.execute(`
      SELECT l.*, u.name as user_name 
      FROM task_status_logs l
      JOIN users u ON l.changed_by = u.id
      WHERE l.task_id = ?
      ORDER BY l.changed_at DESC
    `, [req.params.id]);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
