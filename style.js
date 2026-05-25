const cssContent = `:root {
    --primary: #2563eb;
    --primary-hover: #1d4ed8;
    --secondary: #0f172a;
    --accent: #38bdf8;
    --bg-color: #f8fafc;
    --surface: #ffffff;
    --text-main: #334155;
    --text-dark: #0f172a;
    --text-light: #64748b;
    --border: #e2e8f0;
    --danger: #ef4444;
    --success: #10b981;
    --radius-lg: 20px;
    --radius-md: 12px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
    --shadow-md: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01);
}

* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }

body { background-color: var(--bg-color); color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }

/* Header */
header { background-color: var(--surface); padding: 15px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; box-shadow: var(--shadow-sm); }
.logo { font-size: 1.4rem; font-weight: 800; color: var(--text-dark); display: flex; align-items: center; gap: 8px; letter-spacing: -0.5px; }
.logo-icon { color: var(--primary); }
.nav-links button { background: transparent; color: var(--text-light); border: none; padding: 8px 16px; cursor: pointer; font-size: 0.95rem; border-radius: var(--radius-md); font-weight: 600; transition: all 0.2s; }
.nav-links button:hover { color: var(--primary); background-color: #eff6ff; }
.nav-links button.active { color: var(--primary); }

main { flex: 1; display: flex; flex-direction: column; width: 100%; max-width: 1200px; margin: 0 auto; padding: 40px 20px; }

/* Views & Animations */
.view-section { display: none; }
.view-section.active { display: block; }
.fade-in { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); filter: blur(4px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }

/* Centered Auth Layout */
.auth-wrapper { display: flex; justify-content: center; align-items: center; width: 100%; min-height: 60vh; }

/* Glass Modern Cards */
.glass-card { background: var(--surface); border-radius: var(--radius-lg); padding: 40px; width: 100%; max-width: 440px; margin: 0 auto; box-shadow: var(--shadow-md); border: 1px solid rgba(255,255,255,0.8); }
h1, h2 { color: var(--text-dark); margin-bottom: 8px; font-weight: 800; letter-spacing: -0.5px; }
.glass-card h2 { text-align: center; font-size: 1.8rem; }
.subtitle { color: var(--text-light); font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px; }
.glass-card .subtitle { text-align: center; }

/* Dashboard Layout */
.dashboard-layout { display: flex !important; gap: 30px; align-items: flex-start; }
.dashboard-layout:not(.active) { display: none !important; }
.sidebar { width: 260px; background: var(--surface); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--border); flex-shrink: 0; }
.dashboard-content { flex: 1; min-width: 0; }

/* Sidebar Menu */
.user-info-mini { display: flex; align-items: center; gap: 15px; padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
.avatar-mini { font-size: 1.5rem; background: #e0e7ff; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
#sidebar-name { font-weight: 700; color: var(--text-dark); font-size: 1.1rem; }
.sidebar-menu { list-style: none; }
.sidebar-menu li { padding: 12px 15px; margin-bottom: 5px; border-radius: var(--radius-md); cursor: pointer; font-weight: 600; color: var(--text-light); transition: 0.2s; display: flex; align-items: center; gap: 10px; }
.sidebar-menu li:hover:not(.disabled) { background: #f1f5f9; color: var(--text-dark); }
.sidebar-menu li.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
.sidebar-menu li.disabled { opacity: 0.5; cursor: not-allowed; }

/* Forms & Inputs */
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px; }
.input-modern { width: 100%; padding: 14px 16px; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 1rem; color: var(--text-dark); transition: all 0.2s; background: #f8fafc; }
.input-modern:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
.readonly-input { background-color: #f1f5f9 !important; color: #94a3b8 !important; cursor: not-allowed; border-color: var(--border) !important; }
.ltr-input { direction: ltr; text-align: left; }
.center-text { text-align: center; font-size: 1.1rem; font-weight: 600; letter-spacing: 1px; }

/* Buttons */
.btn-primary { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; border: none; border-radius: var(--radius-md); font-size: 1.05rem; font-weight: 700; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(37, 99, 235, 0.3); filter: brightness(1.05); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
.btn-admin { width: 100%; padding: 14px; background: var(--secondary); color: white; border: none; border-radius: var(--radius-md); font-size: 1.05rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-admin:hover { background: #1e293b; transform: translateY(-2px); }
.btn-text { background: none; border: none; color: var(--text-light); font-weight: 600; cursor: pointer; padding: 10px; transition: 0.2s; }
.btn-text:hover { color: var(--text-dark); }
.small-btn { padding: 10px 20px; width: auto; font-size: 0.9rem; }

/* Dashboard Cards */
.status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 30px; }
.status-card { background: var(--surface); border: 1px solid var(--border); padding: 25px; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); transition: 0.3s; position: relative; overflow: hidden; }
.status-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: #cbd5e1; }
.status-icon { position: absolute; top: 20px; left: 20px; font-size: 2rem; opacity: 0.1; }
.status-card .label { font-size: 0.85rem; color: var(--text-light); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
.status-card .value { font-size: 1.5rem; font-weight: 800; color: var(--text-dark); }
.badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; margin-top: 5px; }
.badge.success { background-color: #d1fae5; color: #065f46; }
.badge.error { background-color: #fee2e2; color: #991b1b; }

/* Admin Specific */
.admin-card { border-top: 4px solid var(--secondary); }
.admin-shield { font-size: 3rem; text-align: center; margin-bottom: 10px; }
.admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
.table-wrapper { overflow-x: auto; background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border); }
.modern-table { width: 100%; border-collapse: collapse; text-align: right; }
.modern-table th, .modern-table td { padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modern-table th { background-color: #f8fafc; font-weight: 700; color: var(--text-light); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
.modern-table tr:last-child td { border-bottom: none; }
.modern-table tr:hover { background-color: #f1f5f9; }
.actions-btn { background: #e2e8f0; color: var(--text-dark); border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
.actions-btn:hover { background: var(--primary); color: white; }

/* Utilities */
.locked-input-container { display: flex; align-items: center; justify-content: space-between; background-color: #f1f5f9; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 25px; }
.locked-input-container span { font-weight: 700; color: var(--text-dark); font-size: 1.1rem; direction: ltr; }
.locked-input-container button { background: none; border: none; color: var(--primary); cursor: pointer; font-weight: 700; font-size: 0.9rem; }
.verification-box { background-color: #fffbeb; padding: 20px; border-radius: var(--radius-md); border: 1px solid #fcd34d; margin-top: 10px; }
.verification-box label { color: #b45309; }
.alert-box { padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px; font-weight: 600; font-size: 0.95rem; display: none; animation: fadeIn 0.3s ease; }
.alert-box.error { background-color: #fef2f2; color: var(--danger); border-left: 4px solid var(--danger); }
.alert-box.success { background-color: #ecfdf5; color: var(--success); border-left: 4px solid var(--success); }
.alert-box.info { background-color: #eff6ff; color: var(--primary); border-left: 4px solid var(--primary); }

/* Modals */
.modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.7); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
.modal-overlay.active { display: flex; }
.modal-content { max-width: 400px; animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

@media (max-width: 768px) {
    .dashboard-layout { flex-direction: column; }
    .sidebar { width: 100%; }
    header { padding: 15px 20px; }
}
`;

export default cssContent;
