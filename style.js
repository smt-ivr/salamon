const cssContent = `:root {
    --primary: #0f172a;
    --primary-hover: #1e293b;
    --secondary: #3b82f6;
    --bg-color: #f4f4f5;
    --surface: #ffffff;
    --text-main: #3f3f46;
    --text-dark: #09090b;
    --text-light: #71717a;
    --border: #e4e4e7;
    --danger: #ef4444;
    --success: #10b981;
    --radius-lg: 8px;
    --radius-md: 6px;
    --radius-sm: 4px;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }

body { background-color: var(--bg-color); color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }

/* Header */
header { background-color: var(--surface); padding: 15px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; box-shadow: var(--shadow-sm); }
.logo { font-size: 1.4rem; font-weight: 800; color: var(--text-dark); display: flex; align-items: center; gap: 8px; letter-spacing: -0.5px; }
.logo-icon { color: var(--secondary); }
.nav-links button { background: transparent; color: var(--text-light); border: none; padding: 8px 16px; cursor: pointer; font-size: 0.95rem; border-radius: var(--radius-sm); font-weight: 600; transition: all 0.2s; }
.nav-links button:hover { color: var(--text-dark); background-color: #f4f4f5; }
.nav-links button.active { color: var(--secondary); }

main { flex: 1; display: flex; flex-direction: column; width: 100%; max-width: 1200px; margin: 0 auto; padding: 40px 20px; }

/* Views & Animations */
.view-section { display: none; width: 100%; }
.view-section.active { display: block; }
.fade-in { animation: fadeIn 0.4s ease forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Centered Auth Sections - Fixed from pushing down */
.auth-section.active { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 180px); }

/* Clean Sharp Cards */
.clean-card { background: var(--surface); border-radius: var(--radius-lg); padding: 40px; width: 100%; max-width: 420px; box-shadow: var(--shadow-md); border: 1px solid var(--border); }
h1, h2 { color: var(--text-dark); margin-bottom: 8px; font-weight: 800; letter-spacing: -0.5px; }
.clean-card h2 { text-align: center; font-size: 1.6rem; }
.subtitle { color: var(--text-light); font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px; }
.clean-card .subtitle { text-align: center; }

/* Dashboard Layout - Side by Side */
.dashboard-layout { display: flex !important; gap: 25px; align-items: stretch; }
.dashboard-layout:not(.active) { display: none !important; }
.sidebar { width: 250px; background: var(--surface); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--border); flex-shrink: 0; display: flex; flex-direction: column; }
.dashboard-content { flex: 1; min-width: 0; background: var(--surface); border-radius: var(--radius-lg); padding: 35px; box-shadow: var(--shadow-sm); border: 1px solid var(--border); }

/* Sidebar Menu */
.user-info-mini { display: flex; align-items: center; gap: 15px; padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
.avatar-mini { font-size: 1.2rem; background: #f4f4f5; color: var(--text-dark); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
#sidebar-name { font-weight: 700; color: var(--text-dark); font-size: 1.1rem; }
.sidebar-menu { list-style: none; }
.sidebar-menu li { padding: 12px 15px; margin-bottom: 5px; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; color: var(--text-light); transition: 0.2s; display: flex; align-items: center; gap: 12px; font-size: 0.95rem; }
.sidebar-menu li i { width: 20px; text-align: center; }
.sidebar-menu li:hover:not(.disabled) { background: #f4f4f5; color: var(--text-dark); }
.sidebar-menu li.active { background: #eff6ff; color: var(--secondary); border-right: 3px solid var(--secondary); }
.sidebar-menu li.disabled { opacity: 0.5; cursor: not-allowed; }

/* Forms & Inputs */
.form-group { margin-bottom: 18px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem; color: var(--text-main); }
.input-modern { width: 100%; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 1rem; color: var(--text-dark); transition: all 0.2s; background: #fafafa; }
.input-modern:focus { outline: none; border-color: var(--secondary); background: white; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.readonly-input { background-color: #f4f4f5 !important; color: #a1a1aa !important; cursor: not-allowed; }
.ltr-input { direction: ltr; text-align: left; }
.center-text { text-align: center; font-size: 1.05rem; font-weight: 600; letter-spacing: 1px; }

/* Buttons */
.btn-primary { width: 100%; padding: 12px; background-color: var(--primary); color: white; border: none; border-radius: var(--radius-sm); font-size: 1rem; font-weight: 600; cursor: pointer; transition: 0.2s; box-shadow: var(--shadow-sm); }
.btn-primary:hover { background-color: var(--primary-hover); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-admin { width: 100%; padding: 12px; background-color: var(--secondary); color: white; border: none; border-radius: var(--radius-sm); font-size: 1rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-admin:hover { background-color: #2563eb; }
.btn-text { background: none; border: none; color: var(--text-light); font-weight: 600; cursor: pointer; padding: 10px; transition: 0.2s; }
.btn-text:hover { color: var(--text-dark); }
.small-btn { padding: 8px 16px; width: auto; font-size: 0.9rem; }

/* Dashboard Cards */
.status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-top: 20px; }
.status-card { border: 1px solid var(--border); padding: 25px; border-radius: var(--radius-md); transition: 0.2s; position: relative; overflow: hidden; background: #fafafa; }
.status-icon { position: absolute; top: 15px; left: 15px; font-size: 2.5rem; color: var(--border); opacity: 0.5; }
.status-card .label { font-size: 0.85rem; color: var(--text-light); font-weight: 600; margin-bottom: 8px; }
.status-card .value { font-size: 1.4rem; font-weight: 700; color: var(--text-dark); }
.badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; margin-top: 5px; }
.badge.success { background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.badge.error { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

/* Admin Specific */
.admin-card { border-top: 4px solid var(--secondary); }
.admin-shield { font-size: 2.5rem; text-align: center; margin-bottom: 15px; color: var(--secondary); }
.admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; border-bottom: 1px solid var(--border); padding-bottom: 15px; }
.table-wrapper { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-md); }
.modern-table { width: 100%; border-collapse: collapse; text-align: right; }
.modern-table th, .modern-table td { padding: 14px 18px; border-bottom: 1px solid var(--border); }
.modern-table th { background-color: #f8fafc; font-weight: 600; color: var(--text-light); font-size: 0.85rem; }
.modern-table tr:last-child td { border-bottom: none; }
.modern-table tr:hover { background-color: #fafafa; }
.actions-btn { background: #f4f4f5; color: var(--text-dark); border: 1px solid var(--border); padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
.actions-btn:hover { background: var(--secondary); color: white; border-color: var(--secondary); }

/* Utilities */
.locked-input-container { display: flex; align-items: center; justify-content: space-between; background-color: #fafafa; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; }
.locked-input-container span { font-weight: 600; color: var(--text-dark); font-size: 1.05rem; direction: ltr; }
.locked-input-container button { background: none; border: none; color: var(--secondary); cursor: pointer; font-weight: 600; font-size: 0.9rem; }
.verification-box { background-color: #fffbeb; padding: 15px; border-radius: var(--radius-sm); border: 1px solid #fde68a; margin-top: 15px; }
.verification-box label { color: #b45309; }
.alert-box { padding: 14px; border-radius: var(--radius-sm); margin-bottom: 20px; font-weight: 600; font-size: 0.9rem; display: none; border: 1px solid transparent; }
.alert-box.error { background-color: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.alert-box.success { background-color: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
.alert-box.info { background-color: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }

/* Modals */
.modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(9, 9, 11, 0.6); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
.modal-overlay.active { display: flex; }
.modal-content { max-width: 400px; animation: scaleIn 0.2s ease; }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }

@media (max-width: 768px) {
    .dashboard-layout { flex-direction: column; }
    .sidebar { width: 100%; }
    header { padding: 15px 20px; }
}
`;

export default cssContent;
