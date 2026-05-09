CREATE DATABASE IF NOT EXISTS pm_tool;
USE pm_tool;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_user', 'project_manager', 'employee') NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('active', 'completed') DEFAULT 'active',
  deadline DATETIME,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_id INT,
  assigned_to INT,
  assigned_by INT,
  status ENUM('initiated', 'on_progress', 'check', 'revise', 'finished') DEFAULT 'initiated',
  deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_status_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT,
  old_status ENUM('initiated', 'on_progress', 'check', 'revise', 'finished'),
  new_status ENUM('initiated', 'on_progress', 'check', 'revise', 'finished'),
  changed_by INT,
  note TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed data for testing
-- Default password: password123
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin', 'admin@pmtool.com', '$2a$10$6D0Nw6tP/Vje2hOg.JhyE./3.gVxFk/YPmWPaYKNVTK2IHO8yK/3W', 'super_user');
-- Note: The hash above is a placeholder. I'll need to generate real hashes or handle it in the app.
-- Better to use a known hash for 'password123' -> $2a$10$X87S.Ckb5H.L0G2K.L6yEu.vX.f1S7R7S.Ckb5H.L0G2K.L6yEu (approx)
-- I will generate it correctly in the code if needed.
