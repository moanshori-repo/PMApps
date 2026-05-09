# 🚀 ProjectFlow | Premium SaaS PM Tool

A modern, high-performance Project Management application built with a focus on premium UI/UX, role-based workflows, and real-time data visualization.

---

## ✨ Features

### 🎨 Design & Experience
- **Premium SaaS Interface**: A sleek, modern dashboard using **TailwindCSS** with a glassmorphism aesthetic.
- **Dark & Light Mode**: Persistent theme selection with smooth transitions.
- **Fully Responsive**: Optimized for desktop, tablet, and mobile with a collapsible sidebar and mobile header.
- **Animated Interactions**: Utilizes micro-animations, hover effects, and skeleton-like loading states.

### 📊 Data Visualization (PM Role)
- **Advanced Insights**: Integrated **ApexCharts** to track project health and team productivity.
- **Overall Health Radial**: Average completion percentage across all active projects.
- **Task Lifecycle Donut**: Visual breakdown of task statuses (Initiated, Progress, Check, etc.).
- **Workload Bar Chart**: Real-time task distribution analysis per employee.
- **Live Project Progress**: Dynamic progress bars for every active project.

### 🔐 Role-Based Access Control (RBAC)
- **Super User (SU)**: 
  - Centralized user management (Create, Edit, Delete).
  - Role assignment and password resets.
- **Project Manager (PM)**:
  - Project lifecycle management (Create, Update, Archive).
  - Task delegation and deadline tracking.
  - **Review System**: Approve or revise tasks with notes.
  - **Task & Project History**: Searchable archives for auditing.
- **Employee**:
  - Personal stats dashboard.
  - **Status Stepper**: A structured workflow (Initiated -> On Progress -> Check).
  - Task journey history.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), TailwindCSS (CDN), ApexCharts, FontAwesome.
- **Backend**: Node.js, Express.js.
- **Database**: MySQL.
- **Authentication**: JWT (JSON Web Tokens) with Bearer strategy.

---

## 🚀 Setup Instructions

### 1. Prerequisites
- Node.js (v14 or higher)
- MySQL Server

### 2. Database Installation
1. Create a database named `pm_tool`.
2. Import the base schema and seed data:
   ```bash
   mysql -u root -p pm_tool < schema.sql
   ```
3. Run the migration script to ensure all modern features are enabled:
   ```bash
   npm run migrate
   ```

### 3. Environment Configuration
Create a `.env` file in the root directory and configure your credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pm_tool
JWT_SECRET=your_secret_key
PORT=3000
```

### 4. Install & Run
```bash
# Install dependencies
npm install

# Start the server
npm start
```
The application will be live at `http://localhost:3000`.

---

## 👤 Default Accounts
- **Super User**: `admin@pmtool.com` / `password123`
- **Project Manager**: `pm@pmtool.com` / `password123`
- **Employee**: `dev@pmtool.com` / `password123`

---

## 📖 Key Workflows

### The Task Lifecycle
1. **Initiated**: PM creates a task and assigns it.
2. **On Progress**: Employee starts working.
3. **Check**: Employee submits for review with an optional note.
4. **Revise**: PM sends back with feedback if changes are needed.
5. **Finished**: PM accepts the task, moving it to history.

### Project Archiving
When a project is marked as "Completed" by a PM, the project and all its finished tasks are moved to the **Project History** archive to keep the active workspace clean.
