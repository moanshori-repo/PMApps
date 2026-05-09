const db = require('./db');

async function migrate() {
    console.log('Starting database migration...');
    try {
        // 1. Add status to projects
        const [projectsCols] = await db.execute('SHOW COLUMNS FROM projects LIKE "status"');
        if (projectsCols.length === 0) {
            console.log('Adding "status" column to projects table...');
            await db.execute('ALTER TABLE projects ADD COLUMN status ENUM("active", "completed") DEFAULT "active" AFTER description');
        } else {
            console.log('"status" column already exists in projects table.');
        }

        // 1b. Add deadline to projects
        const [projDeadlineCols] = await db.execute('SHOW COLUMNS FROM projects LIKE "deadline"');
        if (projDeadlineCols.length === 0) {
            console.log('Adding "deadline" column to projects table...');
            await db.execute('ALTER TABLE projects ADD COLUMN deadline DATETIME AFTER status');
        } else {
            console.log('"deadline" column already exists in projects table.');
        }

        // 2. Add deadline to tasks
        const [tasksCols] = await db.execute('SHOW COLUMNS FROM tasks LIKE "deadline"');
        if (tasksCols.length === 0) {
            console.log('Adding "deadline" column to tasks table...');
            await db.execute('ALTER TABLE tasks ADD COLUMN deadline DATETIME AFTER status');
        } else {
            console.log('"deadline" column already exists in tasks table.');
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
