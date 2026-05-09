// State Management
const state = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    theme: localStorage.getItem('theme') || 'light',
    tasks: [],
    history: [],
    sortConfig: { column: null, direction: 'asc' }
};

// UI Helpers
const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = type === 'success' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    toast.className = `${colors} text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce-in`;
    toast.innerHTML = `<i class="fas ${icon} text-xl"></i> <span class="font-medium">${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

const showLoading = (btn) => {
    btn.dataset.original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Processing...`;
    btn.classList.add('opacity-70', 'cursor-not-allowed');
};

const hideLoading = (btn) => {
    btn.innerHTML = btn.dataset.original;
    btn.disabled = false;
    btn.classList.remove('opacity-70', 'cursor-not-allowed');
};

// API Base URL
const apiFetch = async (url, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...(state.token && { 'Authorization': `Bearer ${state.token}` }),
        ...options.headers
    };

    try {
        const res = await fetch(`/api${url}`, { ...options, headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Something went wrong');
        return data;
    } catch (err) {
        showToast(err.message, 'error');
        if (err.message === 'Unauthorized') logout();
        throw err;
    }
};

// DOM Elements
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const dashboardContent = document.getElementById('dashboard-content');
const navLinks = document.getElementById('nav-links');
const loginForm = document.getElementById('login-form');
const modalOverlay = document.getElementById('modal-overlay');

// --- Initialization ---

const initApp = () => {
    // Apply theme
    if (state.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    updateThemeIcon();

    if (state.token && state.user) {
        authView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        renderNav();
        renderDashboard();
    } else {
        authView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
    }
};

const renderNav = () => {
    let links = '';
    const linkClass = "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ";
    const activeClass = "bg-primary-600 text-white shadow-lg shadow-primary-600/30";
    const inactiveClass = "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700";

    const getLink = (icon, label, onClick) => `
        <a href="#" class="${linkClass} ${inactiveClass}" onclick="${onClick}; if(window.innerWidth < 768) toggleSidebar();">
            <i class="fas ${icon} w-5"></i> <span>${label}</span>
        </a>
    `;

    if (state.user.role === 'super_user') {
        links = getLink('fa-users', 'Users', 'renderSuperUserDashboard()');
    } else if (state.user.role === 'project_manager') {
        links = `
            ${getLink('fa-chart-pie', 'Insights', 'renderPMDashboard()')}
            ${getLink('fa-folder', 'Projects', 'renderProjectsList()')}
            ${getLink('fa-tasks', 'Tasks', 'renderPMTasks()')}
            ${getLink('fa-history', 'Project History', 'renderPMHistory()')}
            ${getLink('fa-clipboard-check', 'Task History', 'renderPMTaskHistory()')}
        `;
    } else {
        links = `
            ${getLink('fa-chart-line', 'Dashboard', 'renderEmployeeDashboard()')}
            ${getLink('fa-list-check', 'My Tasks', 'renderEmployeeTasks()')}
            ${getLink('fa-history', 'My History', 'renderEmployeeHistory()')}
        `;
    }
    
    links += getLink('fa-user-circle', 'Profile', 'renderProfile()');
    navLinks.innerHTML = links;
    document.getElementById('user-info').textContent = `${state.user.name} • ${state.user.role.replace('_', ' ')}`;
};

// --- Super User Dashboard ---

const renderSuperUserDashboard = async () => {
    document.getElementById('page-title').textContent = 'User Management';
    document.getElementById('action-header').innerHTML = `
        <button class="bg-primary-600 text-white px-6 py-2 rounded-xl shadow-lg font-bold text-sm hover:bg-primary-700 transition-all active:scale-95" onclick="showAddUserModal()">+ Add User</button>
    `;
    const users = await apiFetch('/users');
    
    dashboardContent.innerHTML = `
        <div class="glass overflow-hidden rounded-2xl shadow-sm">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Name</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Email</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Role</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                        ${users.map(u => `
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td class="px-6 py-4 font-medium">${u.name}</td>
                                <td class="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">${u.email}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                        ${u.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <button class="text-primary-600 hover:text-primary-700 font-bold text-sm" onclick="showEditUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">Edit</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

const showEditUserModal = (user) => {
    openModal(`
        <h2 class="text-2xl font-bold mb-6">Edit User</h2>
        <form onsubmit="updateUser(event, ${user.id})" class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" id="edit-name" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" value="${user.name}" required>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Email</label>
                <input type="email" id="edit-email" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" value="${user.email}" required>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Role</label>
                <select id="edit-role" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                    <option value="employee" ${user.role === 'employee' ? 'selected' : ''}>Employee</option>
                    <option value="project_manager" ${user.role === 'project_manager' ? 'selected' : ''}>Project Manager</option>
                    <option value="super_user" ${user.role === 'super_user' ? 'selected' : ''}>Super User</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">New Password (optional)</label>
                <input type="password" id="edit-password" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" placeholder="••••••••">
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" class="flex-1 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all" onclick="closeModal()">Cancel</button>
                <button type="submit" class="flex-1 bg-primary-600 text-white font-bold py-2 rounded-xl shadow-lg hover:bg-primary-700 transition-all" id="edit-user-btn">Save Changes</button>
            </div>
        </form>
    `);
};

const showAddUserModal = () => {
    openModal(`
        <h2 class="text-2xl font-bold mb-6">Create New User</h2>
        <form onsubmit="addUser(event)" class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" id="add-name" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 transition-all outline-none" placeholder="e.g. John Doe" required>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Email Address</label>
                <input type="email" id="add-email" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 transition-all outline-none" placeholder="john@example.com" required>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Role</label>
                <select id="add-role" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 transition-all outline-none">
                    <option value="employee">Employee</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="super_user">Super User</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Password</label>
                <input type="password" id="add-password" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 transition-all outline-none" placeholder="••••••••" required>
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" class="flex-1 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all" onclick="closeModal()">Cancel</button>
                <button type="submit" class="flex-1 bg-primary-600 text-white font-bold py-2 rounded-xl shadow-lg hover:bg-primary-700 transition-all" id="add-user-btn">Create User</button>
            </div>
        </form>
    `);
};

const addUser = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('add-user-btn');
    showLoading(btn);
    try {
        const body = {
            name: document.getElementById('add-name').value,
            email: document.getElementById('add-email').value,
            role: document.getElementById('add-role').value,
            password: document.getElementById('add-password').value
        };
        await apiFetch('/users', { method: 'POST', body: JSON.stringify(body) });
        showToast('User account created successfully');
        closeModal();
        renderSuperUserDashboard();
    } finally {
        hideLoading(btn);
    }
};

const updateUser = async (e, userId) => {
    e.preventDefault();
    const btn = document.getElementById('edit-user-btn');
    showLoading(btn);
    try {
        const body = {
            name: document.getElementById('edit-name').value,
            email: document.getElementById('edit-email').value,
            role: document.getElementById('edit-role').value,
            password: document.getElementById('edit-password').value
        };
        await apiFetch(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast('User updated successfully');
        closeModal();
        renderSuperUserDashboard();
    } finally {
        hideLoading(btn);
    }
};

// --- Profile ---

const renderProfile = () => {
    document.getElementById('page-title').textContent = 'My Profile';
    document.getElementById('action-header').innerHTML = '';
    
    dashboardContent.innerHTML = `
        <div class="glass max-w-xl mx-auto p-8 rounded-2xl shadow-sm">
            <h2 class="text-2xl font-bold mb-6">Profile Settings</h2>
            <form onsubmit="updateProfile(event)" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Full Name</label>
                    <input type="text" id="profile-name" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" value="${state.user.name}" required>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Email Address</label>
                    <input type="email" id="profile-email" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" value="${state.user.email}" required>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Change Password</label>
                    <input type="password" id="profile-password" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" placeholder="••••••••">
                    <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Leave blank to keep current password</p>
                </div>
                <button type="submit" class="w-full bg-primary-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-primary-700 transition-all mt-4" id="profile-btn">Update Profile</button>
            </form>
        </div>
    `;
};

const updateProfile = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('profile-btn');
    showLoading(btn);
    try {
        const body = {
            name: document.getElementById('profile-name').value,
            email: document.getElementById('profile-email').value,
            password: document.getElementById('profile-password').value
        };
        await apiFetch('/users/profile', { method: 'PUT', body: JSON.stringify(body) });
        state.user.name = body.name;
        state.user.email = body.email;
        localStorage.setItem('user', JSON.stringify(state.user));
        showToast('Profile updated successfully');
        renderNav();
    } finally {
        hideLoading(btn);
    }
};

// --- Components ---

const renderTaskCard = (t) => {
    const initials = (t.assigned_to_name || '??').split(' ').map(n => n[0]).join('').toUpperCase();
    const statusColors = {
        initiated: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
        on_progress: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        check: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        revise: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
        finished: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    };

    return `
        <div class="glass p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 group border border-transparent hover:border-primary-500/30">
            <div class="flex justify-between items-start mb-4">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-primary-500 transition-colors">${t.project_name}</span>
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter ${statusColors[t.status]}">
                    ${t.status.replace('_', ' ')}
                </span>
            </div>
            <h3 class="text-lg font-bold mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">${t.title}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">${t.description || 'No description provided.'}</p>
            
            <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold dark:bg-primary-900/30 dark:text-primary-400">
                        ${initials}
                    </div>
                    <span class="text-xs font-medium text-slate-500 dark:text-slate-400">${t.assigned_to_name || 'Unassigned'}</span>
                </div>
                <div class="flex gap-2">
                    ${renderTaskActions(t)}
                </div>
            </div>
        </div>
    `;
};

const renderTaskActions = (t) => {
    if (state.user.role === 'employee' && t.status !== 'finished') {
        return `<button class="p-2 hover:bg-primary-50 rounded-lg text-primary-600 transition-all dark:hover:bg-slate-700" onclick="showEmployeeWorkflow(${t.id}, '${t.status}')">
            <i class="fas fa-arrow-right"></i>
        </button>`;
    }
    if (state.user.role === 'project_manager' && t.status === 'check') {
        return `<button class="px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-primary-700" onclick="showPMReviewModal(${t.id})">Review</button>`;
    }
    return `<button class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all dark:hover:bg-slate-700" onclick="viewTaskLogs(${t.id})">
        <i class="fas fa-history"></i>
    </button>`;
};

// --- Employee Workflow (Stepper) ---

const showEmployeeWorkflow = (taskId, currentStatus) => {
    const steps = [
        { id: 'initiated', label: 'Start', icon: 'fa-play' },
        { id: 'on_progress', label: 'In Progress', icon: 'fa-spinner' },
        { id: 'check', label: 'Submit', icon: 'fa-paper-plane' }
    ];

    const currentIdx = steps.findIndex(s => s.id === currentStatus);
    const nextIdx = currentIdx + 1;
    const nextStep = steps[nextIdx];

    openModal(`
        <div class="text-center p-4">
            <h2 class="text-2xl font-bold mb-6">Task Progress</h2>
            <div class="flex items-center justify-center mb-8">
                ${steps.map((s, i) => `
                    <div class="flex items-center">
                        <div class="flex flex-col items-center">
                            <div class="w-12 h-12 rounded-full flex items-center justify-center ${i <= currentIdx ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'} shadow-lg transition-all duration-500">
                                <i class="fas ${s.icon}"></i>
                            </div>
                            <span class="text-xs font-bold mt-2 uppercase tracking-widest ${i <= currentIdx ? 'text-primary-600' : 'text-slate-400'}">${s.label}</span>
                        </div>
                        ${i < steps.length - 1 ? `<div class="w-16 h-1 bg-slate-100 dark:bg-slate-700 mx-2 rounded-full overflow-hidden">
                            <div class="h-full bg-primary-600 transition-all duration-500" style="width: ${i < currentIdx ? '100%' : '0%'}"></div>
                        </div>` : ''}
                    </div>
                `).join('')}
            </div>
            
            ${nextStep ? `
                <div class="bg-primary-50 dark:bg-primary-900/20 p-6 rounded-2xl mb-6">
                    <p class="text-slate-700 dark:text-slate-300 font-medium mb-4">Ready to move to <strong>${nextStep.label}</strong>?</p>
                    ${nextStep.id === 'check' ? `
                        <textarea id="status-note" class="w-full p-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 mb-4" placeholder="Add a note for the PM... (Optional)"></textarea>
                    ` : ''}
                    <button class="w-full bg-primary-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-primary-700 active:scale-95 transition-all" id="update-btn" onclick="updateTaskStatus(${taskId}, '${nextStep.id}')">
                        Move to ${nextStep.label}
                    </button>
                </div>
            ` : '<p class="text-emerald-500 font-bold"><i class="fas fa-check-circle mr-2"></i> Task is currently in review.</p>'}
            
            <button class="text-slate-400 hover:text-slate-600 font-medium text-sm transition-all" onclick="closeModal()">Cancel</button>
        </div>
    `);
};

// --- PM Review Modal ---

const showPMReviewModal = (taskId) => {
    openModal(`
        <div class="p-2 text-center">
            <h2 class="text-2xl font-bold mb-4">Task Review</h2>
            <p class="text-slate-500 mb-8">Please review the employee's work and provide feedback.</p>
            
            <div class="flex flex-col gap-3">
                <button class="bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2" id="approve-btn" onclick="updateTaskStatus(${taskId}, 'finished')">
                    <i class="fas fa-check-circle"></i> Accept & Finish
                </button>
                <div class="h-px bg-slate-100 dark:bg-slate-700 my-4"></div>
                <div class="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-2xl">
                    <textarea id="revise-note" class="w-full p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-white dark:bg-slate-800 mb-4" placeholder="Reason for revision..."></textarea>
                    <button class="w-full bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-rose-600 transition-all" id="revise-btn" onclick="handlePMRevise(${taskId})">
                        <i class="fas fa-undo mr-2"></i> Request Revision
                    </button>
                </div>
                <button class="text-slate-400 hover:text-slate-600 font-medium text-sm mt-4 transition-all" onclick="closeModal()">Close</button>
            </div>
        </div>
    `);
};

const handlePMRevise = async (taskId) => {
    const note = document.getElementById('revise-note').value;
    if (!note) return showToast('Please provide a reason for revision', 'error');
    await updateTaskStatus(taskId, 'revise', note);
};

// --- Projects ---

const renderProjectsList = async () => {
    document.getElementById('page-title').textContent = 'Projects';
    document.getElementById('action-header').innerHTML = `
        <button class="bg-primary-600 text-white px-6 py-2 rounded-xl shadow-lg font-bold text-sm hover:bg-primary-700" onclick="showAddProjectModal()">+ New Project</button>
    `;
    const projects = await apiFetch('/projects?status=active');
    
    dashboardContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${projects.map(p => `
                <div class="glass p-6 rounded-2xl shadow-sm flex flex-col">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-lg font-bold">${p.name}</h3>
                        <span class="px-2 py-1 rounded text-[10px] font-black uppercase bg-primary-50 text-primary-600 dark:bg-primary-900/30">Active</span>
                    </div>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-grow">${p.description || 'No description'}</p>
                    <div class="space-y-4">
                        <div class="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-wider">
                            <i class="fas fa-calendar-day"></i>
                            <span>Deadline: ${p.deadline ? new Date(p.deadline).toLocaleDateString() : 'None'}</span>
                        </div>
                        <div class="flex gap-2">
                            <button class="flex-1 bg-primary-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-primary-700" onclick="renderPMTasks(${p.id})">Tasks</button>
                            <button class="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all" title="Mark as Done" onclick="completeProject(${p.id})">
                                <i class="fas fa-check-double"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
            ${projects.length === 0 ? '<div class="col-span-full text-center py-20 text-slate-400 font-medium">There is no active project</div>' : ''}
        </div>
    `;
};

const showAddProjectModal = () => {
    openModal(`
        <h2 class="text-2xl font-bold mb-6">Start New Project</h2>
        <form onsubmit="addProject(event)" class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1">Project Name</label>
                <input type="text" id="proj-name" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" required>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Description</label>
                <textarea id="proj-desc" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" rows="3"></textarea>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Deadline</label>
                <input type="date" id="proj-deadline" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" required>
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" class="flex-1 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all" onclick="closeModal()">Cancel</button>
                <button type="submit" class="flex-1 bg-primary-600 text-white font-bold py-2 rounded-xl shadow-lg hover:bg-primary-700 transition-all" id="add-proj-btn">Create Project</button>
            </div>
        </form>
    `);
};

const addProject = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('add-proj-btn');
    showLoading(btn);
    try {
        const body = {
            name: document.getElementById('proj-name').value,
            description: document.getElementById('proj-desc').value,
            deadline: document.getElementById('proj-deadline').value
        };
        await apiFetch('/projects', { method: 'POST', body: JSON.stringify(body) });
        showToast('Project launched successfully');
        closeModal();
        renderProjectsList();
    } finally {
        hideLoading(btn);
    }
};

const completeProject = async (id) => {
    if (!confirm('Move this project to history?')) return;
    await apiFetch(`/projects/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' })
    });
    showToast('Project completed and archived');
    renderProjectsList();
};

const renderPMHistory = async () => {
    document.getElementById('page-title').textContent = 'Project History';
    document.getElementById('action-header').innerHTML = '';
    state.history = await apiFetch('/history/projects');
    
    dashboardContent.innerHTML = `
        <div class="mb-6 relative">
            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" id="history-search" class="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 transition-all outline-none" placeholder="Search by project name or description..." onkeyup="filterPMHistory(this.value)">
        </div>
        <div id="history-list" class="space-y-4">
            ${renderHistoryCards(state.history)}
        </div>
    `;
};

const filterPMHistory = (query) => {
    const q = query.toLowerCase();
    const filtered = state.history.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
    );
    document.getElementById('history-list').innerHTML = renderHistoryCards(filtered);
};

const renderPMTaskHistory = async () => {
    document.getElementById('page-title').textContent = 'Task History';
    document.getElementById('action-header').innerHTML = '';
    
    // Fetch all tasks and filter for finished ones
    const allTasks = await apiFetch('/tasks');
    state.tasks = allTasks.filter(t => t.status === 'finished');

    dashboardContent.innerHTML = `
        <div class="mb-6 relative">
            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" id="task-history-search" class="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 transition-all outline-none" placeholder="Search finished tasks by title, project, or employee..." onkeyup="filterPMTaskHistory(this.value)">
        </div>
        <div class="glass overflow-hidden rounded-2xl shadow-sm">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Task Title</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Project</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Employee</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Completed</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="task-history-list" class="divide-y divide-slate-100 dark:divide-slate-700">
                        ${renderTaskHistoryRows(state.tasks)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

const filterPMTaskHistory = (query) => {
    const q = query.toLowerCase();
    const filtered = state.tasks.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.project_name.toLowerCase().includes(q) || 
        (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q))
    );
    document.getElementById('task-history-list').innerHTML = renderTaskHistoryRows(filtered);
};

const renderTaskHistoryRows = (tasks) => {
    if (tasks.length === 0) return '<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400 italic text-sm">No finished tasks found.</td></tr>';
    return tasks.map(t => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
            <td class="px-6 py-4 font-bold text-sm text-slate-800 dark:text-slate-200">${t.title}</td>
            <td class="px-6 py-4 text-slate-500 text-sm">${t.project_name}</td>
            <td class="px-6 py-4 text-slate-500 text-sm">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-black">
                        ${(t.assigned_to_name || '??').split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <span>${t.assigned_to_name || 'System'}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-slate-400 text-xs font-medium uppercase tracking-tighter">${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'N/A'}</td>
            <td class="px-6 py-4 text-right">
                <button class="text-slate-300 hover:text-primary-600 transition-colors" onclick="viewTaskLogs(${t.id})">
                    <i class="fas fa-history text-lg"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

const renderHistoryCards = (projects) => {
    if (projects.length === 0) return '<p class="text-center py-12 text-slate-400">No matching projects found.</p>';
    return projects.map(p => `
        <div class="glass rounded-2xl overflow-hidden shadow-sm">
            <div class="p-6 cursor-pointer flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all" onclick="document.getElementById('hist-body-${p.id}').classList.toggle('hidden')">
                <div>
                    <h3 class="text-lg font-bold">${p.name}</h3>
                    <p class="text-xs text-slate-400 font-medium uppercase mt-1">Closed ${new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <i class="fas fa-chevron-down text-slate-300"></i>
            </div>
            <div id="hist-body-${p.id}" class="hidden p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                <p class="text-sm text-slate-500 mb-6">${p.description || 'No description'}</p>
                <h4 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Task Archive</h4>
                <div class="space-y-3">
                    ${p.tasks.map(t => `
                        <div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex justify-between items-center border border-slate-100 dark:border-slate-700">
                            <div>
                                <p class="font-bold text-sm">${t.title}</p>
                                <p class="text-[10px] text-slate-400 uppercase font-bold">${t.employee_name || 'System'}</p>
                            </div>
                            <span class="px-2 py-1 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">${t.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
};

// --- Dashboard Logic ---

const renderPMDashboard = async () => {
    document.getElementById('page-title').textContent = 'Insights';
    document.getElementById('action-header').innerHTML = '';
    
    const tasks = await apiFetch('/tasks');
    const projects = await apiFetch('/projects?status=active');
    const allUsers = await apiFetch('/users');
    const employees = allUsers.filter(u => u.role === 'employee');

    // Calculate Stats
    const statusCounts = tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {});

    const projectProgress = projects.map(p => {
        const projTasks = tasks.filter(t => t.project_id === p.id);
        const finished = projTasks.filter(t => t.status === 'finished').length;
        return {
            name: p.name,
            percent: projTasks.length > 0 ? Math.round((finished / projTasks.length) * 100) : 0
        };
    });

    const avgProgress = projectProgress.length > 0 
        ? Math.round(projectProgress.reduce((sum, p) => sum + p.percent, 0) / projectProgress.length) 
        : 0;

    dashboardContent.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <!-- Overall Health Radial -->
            <div class="glass p-8 rounded-3xl shadow-sm flex flex-col items-center justify-center">
                <div id="health-chart" class="w-full max-w-[240px]"></div>
                <div class="text-center mt-2">
                    <h3 class="text-2xl font-black text-primary-600">${avgProgress}%</h3>
                    <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Average Project Completion</p>
                </div>
            </div>

            <!-- Task Distribution Donut -->
            <div class="glass p-8 rounded-3xl shadow-sm lg:col-span-2">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-slate-800 dark:text-slate-200">Task Lifecycle</h3>
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">${tasks.length} Total Tasks</span>
                </div>
                <div id="status-donut-chart"></div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <!-- Employee Workload -->
            <div class="glass p-8 rounded-3xl shadow-sm">
                <h3 class="font-bold mb-6">Employee Workload</h3>
                <div id="workload-chart"></div>
            </div>

            <!-- Active Projects Feed -->
            <div class="glass p-8 rounded-3xl shadow-sm">
                <h3 class="font-bold mb-6">Live Projects</h3>
                <div class="space-y-6">
                    ${projectProgress.map(p => `
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-sm font-bold text-slate-600 dark:text-slate-300">${p.name}</span>
                                <span class="text-xs font-black text-primary-600">${p.percent}%</span>
                            </div>
                            <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div class="h-full bg-primary-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(139,92,246,0.5)]" style="width: ${p.percent}%"></div>
                            </div>
                        </div>
                    `).join('')}
                    ${projects.length === 0 ? '<p class="text-slate-400 text-sm">No active projects to track.</p>' : ''}
                </div>
            </div>
        </div>
    `;

    // Render ApexCharts
    setTimeout(() => {
        const isDark = document.documentElement.classList.contains('dark');
        const themeColor = isDark ? '#f8fafc' : '#1e293b';

        // Health Radial
        new ApexCharts(document.querySelector("#health-chart"), {
            series: [avgProgress],
            chart: { height: 280, type: 'radialBar' },
            plotOptions: {
                radialBar: {
                    hollow: { size: '70%' },
                    track: { background: isDark ? '#334155' : '#f1f5f9' },
                    dataLabels: { show: false }
                }
            },
            colors: ['#8b5cf6'],
            stroke: { lineCap: 'round' }
        }).render();

        // Status Donut
        new ApexCharts(document.querySelector("#status-donut-chart"), {
            series: Object.values(statusCounts).length > 0 ? Object.values(statusCounts) : [0],
            chart: { type: 'donut', height: 250 },
            labels: Object.keys(statusCounts).length > 0 ? Object.keys(statusCounts).map(s => s.replace('_', ' ').toUpperCase()) : ['EMPTY'],
            colors: ['#64748b', '#3b82f6', '#f59e0b', '#f43f5e', '#10b981'],
            legend: { position: 'right', labels: { colors: themeColor } },
            stroke: { show: false },
            dataLabels: { enabled: false }
        }).render();

        // Workload Bar
        const workloads = employees.map(e => tasks.filter(t => t.assigned_to === e.id).length);
        new ApexCharts(document.querySelector("#workload-chart"), {
            series: [{ name: 'Tasks', data: workloads }],
            chart: { type: 'bar', height: 250, toolbar: { show: false } },
            plotOptions: { bar: { borderRadius: 8, columnWidth: '40%', distributed: true } },
            colors: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e'],
            xaxis: {
                categories: employees.map(e => e.name.split(' ')[0]),
                labels: { style: { colors: themeColor, fontWeight: 600 } }
            },
            yaxis: { labels: { style: { colors: themeColor } } },
            grid: { borderColor: isDark ? '#334155' : '#f1f5f9' },
            legend: { show: false }
        }).render();
    }, 100);
};

const renderEmployeeDashboard = async () => {
    document.getElementById('page-title').textContent = 'My Stats';
    const tasks = await apiFetch('/tasks');
    const myTasks = tasks.filter(t => t.assigned_to === state.user.id);
    
    dashboardContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div class="glass p-6 rounded-2xl shadow-sm text-center">
                <h3 class="text-4xl font-black text-primary-600">${myTasks.length}</h3>
                <p class="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Assigned Tasks</p>
            </div>
            <div class="glass p-6 rounded-2xl shadow-sm text-center">
                <h3 class="text-4xl font-black text-amber-500">${myTasks.filter(t => t.status !== 'finished').length}</h3>
                <p class="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Active</p>
            </div>
            <div class="glass p-6 rounded-2xl shadow-sm text-center">
                <h3 class="text-4xl font-black text-emerald-500">${myTasks.filter(t => t.status === 'finished').length}</h3>
                <p class="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Finished</p>
            </div>
        </div>
        <h2 class="text-xl font-bold mb-6 italic text-slate-400">Keep going, you're doing great! ✨</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${myTasks.filter(t => t.status !== 'finished').map(t => renderTaskCard(t)).join('')}
        </div>
    `;
};

const renderPMTasks = async (projectId = null) => {
    document.getElementById('page-title').textContent = 'Tasks';
    document.getElementById('action-header').innerHTML = `
        <button class="bg-primary-600 text-white px-6 py-2 rounded-xl shadow-lg font-bold text-sm hover:bg-primary-700" onclick="showAddTaskModal(${projectId})">+ Add Task</button>
    `;
    const tasks = await apiFetch('/tasks');
    let filtered = tasks.filter(t => t.status !== 'finished');
    if (projectId) filtered = filtered.filter(t => t.project_id === projectId);
    
    dashboardContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${filtered.map(t => renderTaskCard(t)).join('')}
            ${filtered.length === 0 ? '<div class="col-span-full text-center py-20 text-slate-400 font-medium">There is no active tasks</div>' : ''}
        </div>
    `;
};

const showAddTaskModal = async (defaultProjectId) => {
    const projects = await apiFetch('/projects?status=active');
    const employees = await apiFetch('/users?role=employee');

    openModal(`
        <h2 class="text-2xl font-bold mb-6">Create New Task</h2>
        <form onsubmit="addTask(event)" class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1">Project</label>
                <select id="task-project" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" required>
                    ${projects.map(p => `<option value="${p.id}" ${p.id == defaultProjectId ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Task Title</label>
                <input type="text" id="task-title" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" placeholder="e.g. Design homepage" required>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Description</label>
                <textarea id="task-desc" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" rows="2"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Assign To</label>
                    <select id="task-assign" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" required>
                        ${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Deadline</label>
                    <input type="date" id="task-deadline" class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700" required>
                </div>
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" class="flex-1 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all" onclick="closeModal()">Cancel</button>
                <button type="submit" class="flex-1 bg-primary-600 text-white font-bold py-2 rounded-xl shadow-lg hover:bg-primary-700 transition-all" id="add-task-btn">Create Task</button>
            </div>
        </form>
    `);
};

const addTask = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('add-task-btn');
    showLoading(btn);
    try {
        const body = {
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-desc').value,
            project_id: document.getElementById('task-project').value,
            assigned_to: document.getElementById('task-assign').value,
            deadline: document.getElementById('task-deadline').value
        };
        await apiFetch('/tasks', { method: 'POST', body: JSON.stringify(body) });
        showToast('Task created successfully');
        closeModal();
        renderPMTasks();
    } finally {
        hideLoading(btn);
    }
};

const renderEmployeeTasks = async () => {
    document.getElementById('page-title').textContent = 'My Active Tasks';
    document.getElementById('action-header').innerHTML = '';
    const tasks = await apiFetch('/tasks');
    const myTasks = tasks.filter(t => t.assigned_to === state.user.id && t.status !== 'finished');
    
    dashboardContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${myTasks.map(t => renderTaskCard(t)).join('')}
            ${myTasks.length === 0 ? '<div class="col-span-full text-center py-20 text-slate-400"><i class="fas fa-check-circle text-4xl mb-4 block text-emerald-500"></i><p class="font-bold text-xl">All caught up!</p></div>' : ''}
        </div>
    `;
};

const renderEmployeeHistory = async () => {
    document.getElementById('page-title').textContent = 'My History';
    document.getElementById('action-header').innerHTML = '';
    const tasks = await apiFetch('/history/tasks');
    
    dashboardContent.innerHTML = `
        <div class="glass rounded-2xl overflow-hidden shadow-sm">
            <table class="w-full text-left">
                <thead class="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                        <th class="px-6 py-4 text-xs font-bold uppercase text-slate-400">Task Title</th>
                        <th class="px-6 py-4 text-xs font-bold uppercase text-slate-400">Project</th>
                        <th class="px-6 py-4 text-xs font-bold uppercase text-slate-400">Closed</th>
                        <th class="px-6 py-4 text-xs font-bold uppercase text-slate-400 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                    ${tasks.map(t => `
                        <tr>
                            <td class="px-6 py-4 font-bold text-sm">${t.title}</td>
                            <td class="px-6 py-4 text-slate-500 text-sm">${t.project_name}</td>
                            <td class="px-6 py-4 text-slate-400 text-xs">${new Date(t.created_at).toLocaleDateString()}</td>
                            <td class="px-6 py-4 text-right">
                                <button class="text-slate-300 hover:text-primary-600 transition-colors" onclick="viewTaskLogs(${t.id})">
                                    <i class="fas fa-history"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
};

const viewTaskLogs = async (taskId) => {
    const logs = await apiFetch(`/tasks/${taskId}/logs`);
    openModal(`
        <h2 class="text-2xl font-bold mb-6">Task Journey</h2>
        <div class="space-y-6 relative before:content-[''] before:absolute before:left-6 before:top-0 before:bottom-0 before:w-px before:bg-slate-100 dark:before:bg-slate-700">
            ${logs.map(l => `
                <div class="relative pl-12">
                    <div class="absolute left-4 top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-primary-600 shadow-sm"></div>
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-sm">${l.user_name}</span>
                        <span class="text-[10px] text-slate-400 uppercase font-bold">${new Date(l.changed_at).toLocaleString()}</span>
                    </div>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-500 dark:bg-slate-700">${l.old_status || 'START'}</span>
                        <i class="fas fa-arrow-right text-[10px] text-slate-300"></i>
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-primary-100 text-primary-600 dark:bg-primary-900/30">${l.new_status}</span>
                    </div>
                    ${l.note ? `<p class="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">"${l.note}"</p>` : ''}
                </div>
            `).join('')}
        </div>
        <button class="w-full mt-8 py-3 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl hover:bg-slate-200 transition-all" onclick="closeModal()">Close</button>
    `);
};

// --- Shared Actions ---

const updateTaskStatus = async (taskId, new_status, note = null) => {
    const btn = document.getElementById('update-btn');
    if (btn) showLoading(btn);
    
    try {
        if (!note && new_status === 'check') {
            const noteEl = document.getElementById('status-note');
            note = noteEl ? noteEl.value : '';
        }

        await apiFetch(`/tasks/${taskId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ new_status, note })
        });
        
        showToast(`Task moved to ${new_status.replace('_', ' ')}!`, 'success');
        closeModal();
        renderDashboard();
    } finally {
        if (btn) hideLoading(btn);
    }
};

// --- Core Auth Logic ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button');
    const errorEl = document.getElementById('login-error');

    showLoading(btn);
    try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        state.user = data.user;
        state.token = data.token;
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        
        showToast(`Welcome back, ${data.user.name}!`, 'success');
        initApp();
    } catch (err) {
        errorEl.textContent = 'Invalid email or password';
        errorEl.classList.remove('hidden');
    } finally {
        hideLoading(btn);
    }
});

const logout = () => {
    state.user = null;
    state.token = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    showToast('Signed out successfully');
    initApp();
};

const renderDashboard = () => {
    if (state.user.role === 'super_user') renderSuperUserDashboard();
    else if (state.user.role === 'project_manager') renderPMDashboard();
    else renderEmployeeDashboard();
};

const openModal = (content) => {
    const inner = document.getElementById('modal-inner');
    const box = document.getElementById('modal-box');
    inner.innerHTML = content;
    modalOverlay.classList.remove('hidden');
    setTimeout(() => {
        box.classList.remove('scale-95', 'opacity-0');
        box.classList.add('scale-100', 'opacity-100');
    }, 10);
};

const closeModal = () => {
    const box = document.getElementById('modal-box');
    box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modalOverlay.classList.add('hidden');
    }, 300);
};

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const updateThemeIcon = () => {
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    if (state.theme === 'dark') {
        icon.className = 'fas fa-sun w-5';
        text.textContent = 'Light Mode';
    } else {
        icon.className = 'fas fa-moon w-5';
        text.textContent = 'Dark Mode';
    }
};

themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    initApp();
});

// Sidebar Toggle Logic
const sidebar = document.getElementById('sidebar');
const toggleSidebar = () => sidebar.classList.toggle('-translate-x-full');

document.getElementById('mobile-toggle')?.addEventListener('click', toggleSidebar);
document.getElementById('toggle-sidebar')?.addEventListener('click', toggleSidebar);

// Initial load
initApp();

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', logout);

modalOverlay.addEventListener('click', (e) => { 
    if (e.target === modalOverlay) closeModal(); 
});
