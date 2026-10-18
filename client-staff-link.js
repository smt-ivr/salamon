// client-staff-link.js — shows staff members a shortcut to the admin console (Salamon Control)

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.updateDashboardUI !== 'function') return;
    const originalUpdateDashboardUI = window.updateDashboardUI;
    window.updateDashboardUI = function() {
        originalUpdateDashboardUI();
        setupStaffConsoleLink();
    };
});

function setupStaffConsoleLink() {
    const user = state.currentUser;
    if (!user || !(user.isAdmin || user.isSuperAdmin)) return;

    const sidebarActions = document.querySelector('#user-dash-view .sidebar-actions');
    if (!sidebarActions || document.getElementById('btn-open-control')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-open-control';
    btn.title = 'מרכז השליטה';
    btn.innerHTML = '<i class="fa-solid fa-user-shield" style="color: var(--secondary);"></i>';
    btn.onclick = () => window.open('/salamon/admin', '_blank', 'noopener');

    const logoutBtn = sidebarActions.querySelector('.logout-btn');
    if (logoutBtn) sidebarActions.insertBefore(btn, logoutBtn); else sidebarActions.appendChild(btn);
}
