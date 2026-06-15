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

    /* משתני צ'אט חדשים */
    --chat-bg: #efeae2;
    --header-bg: #f0f2f5;
    --bubble-in: #ffffff;
    --bubble-out: #dcf8c6;
    --play-in: #0284c7; 
    --play-out: #16a34a;
    --player-track: #cbd5e1;
    --link-color: #027eb5;
    --name-color: #0f766e;
}

* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }

body { background-color: var(--bg-color); color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }

/* Header של האתר (רק לאזור התחברות/מנהל) */
header { background-color: var(--surface); padding: 15px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; box-shadow: var(--shadow-sm); }
.logo { font-size: 1.4rem; font-weight: 800; color: var(--text-dark); display: flex; align-items: center; gap: 8px; letter-spacing: -0.5px; }
.logo-icon { color: var(--secondary); }
.nav-links button { background: transparent; color: var(--text-light); border: none; padding: 8px 16px; cursor: pointer; font-size: 0.95rem; border-radius: var(--radius-sm); font-weight: 600; transition: all 0.2s; }
.nav-links button:hover { color: var(--text-dark); background-color: #f4f4f5; }
.nav-links button.active { color: var(--secondary); }

main { flex: 1; display: flex; flex-direction: column; width: 100%; max-width: 1200px; margin: 0 auto; padding: 40px 20px; }

/* מסכים ואנימציות */
.view-section { display: none; width: 100%; }
.view-section.active { display: block; }
.fade-in { animation: fadeIn 0.4s ease forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.auth-section.active { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 180px); }
.clean-card { background: var(--surface); border-radius: var(--radius-lg); padding: 40px; width: 100%; max-width: 420px; box-shadow: var(--shadow-md); border: 1px solid var(--border); }
h1, h2 { color: var(--text-dark); margin-bottom: 8px; font-weight: 800; }
.clean-card h2 { text-align: center; font-size: 1.6rem; }
.subtitle { color: var(--text-light); font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px; }
.clean-card .subtitle { text-align: center; }

/* פריסות מסך רגילות (פאנל מנהל) */
.dashboard-layout { display: flex !important; gap: 25px; align-items: stretch; }
.dashboard-layout:not(.active) { display: none !important; }
.sidebar { width: 250px; background: var(--surface); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--border); flex-shrink: 0; display: flex; flex-direction: column; }
.dashboard-content { flex: 1; min-width: 0; background: var(--surface); border-radius: var(--radius-lg); padding: 35px; box-shadow: var(--shadow-sm); border: 1px solid var(--border); }

.user-info-mini { display: flex; align-items: center; gap: 15px; padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
.avatar-mini { font-size: 1.2rem; background: #f4f4f5; color: var(--text-dark); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }

/* תפריט צד ישן למנהלים */
.sidebar-menu { list-style: none; }
.sidebar-menu li { padding: 12px 15px; margin-bottom: 5px; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; color: var(--text-light); transition: 0.2s; display: flex; align-items: center; gap: 12px; font-size: 0.95rem; }
.sidebar-menu li i { width: 20px; text-align: center; }
.sidebar-menu li:hover { background: #f4f4f5; color: var(--text-dark); }
.sidebar-menu li.active { background: #eff6ff; color: var(--secondary); border-right: 3px solid var(--secondary); }

/* טפסים */
.form-group { margin-bottom: 18px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem; color: var(--text-main); }
.input-modern { width: 100%; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 1rem; color: var(--text-dark); transition: all 0.2s; background: #fafafa; }
.input-modern:focus { outline: none; border-color: var(--secondary); background: white; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.readonly-input { background-color: #f4f4f5 !important; color: #a1a1aa !important; cursor: not-allowed; }
.ltr-input { direction: ltr; text-align: left; }
.center-text { text-align: center; font-size: 1.05rem; font-weight: 600; letter-spacing: 1px; }

/* כפתורים */
.btn-primary { width: 100%; padding: 12px; background-color: var(--primary); color: white; border: none; border-radius: var(--radius-sm); font-size: 1rem; font-weight: 600; cursor: pointer; transition: 0.2s; box-shadow: var(--shadow-sm); }
.btn-primary:hover { background-color: var(--primary-hover); transform: translateY(-1px); }
.btn-admin { width: 100%; padding: 12px; background-color: var(--secondary); color: white; border: none; border-radius: var(--radius-sm); font-size: 1rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-admin:hover { background-color: #2563eb; }
.btn-text { background: none; border: none; color: var(--text-light); font-weight: 600; cursor: pointer; padding: 10px; transition: 0.2s; }
.btn-text:hover { color: var(--text-dark); }
.small-btn { padding: 8px 16px; width: auto; font-size: 0.9rem; }

/* עיצוב פאנל מנהלים */
.admin-card { border-top: 4px solid var(--secondary); }
.admin-shield { font-size: 2.5rem; text-align: center; margin-bottom: 15px; color: var(--secondary); }
.admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; border-bottom: 1px solid var(--border); padding-bottom: 15px; }
.table-wrapper { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-md); }
.modern-table { width: 100%; border-collapse: collapse; text-align: right; }
.modern-table th, .modern-table td { padding: 14px 18px; border-bottom: 1px solid var(--border); }
.modern-table th { background-color: #f8fafc; font-weight: 600; color: var(--text-light); font-size: 0.85rem; }
.modern-table tr:hover { background-color: #fafafa; }
.actions-btn { background: #f4f4f5; border: 1px solid var(--border); padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
.actions-btn:hover { background: var(--secondary); color: white; border-color: var(--secondary); }

/* עזרים והודעות מערכת */
.locked-input-container { display: flex; align-items: center; justify-content: space-between; background-color: #fafafa; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; }
.locked-input-container span { font-weight: 600; color: var(--text-dark); font-size: 1.05rem; direction: ltr; }
.locked-input-container button { background: none; border: none; color: var(--secondary); cursor: pointer; font-weight: 600; font-size: 0.9rem; }
.verification-box { background-color: #fffbeb; padding: 15px; border-radius: var(--radius-sm); border: 1px solid #fde68a; margin-top: 15px; }
.alert-box { padding: 14px; border-radius: var(--radius-sm); margin-bottom: 20px; font-weight: 600; font-size: 0.9rem; display: none; border: 1px solid transparent; }
.alert-box.error { background-color: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.alert-box.success { background-color: #f0fdf4; color: #15803d; border-color: #bbf7d0; }

.modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(9, 9, 11, 0.6); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
.modal-overlay.active { display: flex; }
.modal-content { max-width: 400px; }

/* =======================================
   עיצוב אזור הצ'אט החדש (משתמש בלבד) - Web App Full Screen
   ======================================= */
#user-dash-view.dashboard-layout.active {
    position: fixed !important;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 999; /* מכסה את האתר לחלוטין */
    background: var(--chat-bg);
    margin: 0;
    padding: 0;
    max-width: none;
    border: none;
    border-radius: 0;
}

.app-sidebar { width: 320px; padding: 0 !important; overflow: hidden; border-radius: 0; background: #fff; height: 100vh; border-left: 1px solid var(--border); box-shadow: none;}
.app-main-area { flex: 1; height: 100vh; border: none; border-radius: 0; box-shadow: none; background: var(--chat-bg);}

/* קסם הגלילה! (column-reverse) */
.messages-chat-container {
    flex: 1; padding: 20px 6%; overflow-y: auto; display: flex; flex-direction: column-reverse; gap: 10px;
    background-image: url('https://www.transparenttextures.com/patterns/cubes.png');
}

.bubble { max-width: 75%; min-width: 250px; padding: 8px 10px; border-radius: 8px; box-shadow: 0 1px 1px rgba(0,0,0,0.1); position: relative; display: flex; flex-direction: column; gap: 4px; }
.bubble-in { align-self: flex-start; background-color: var(--bubble-in); border-top-right-radius: 0; }
.bubble-out { align-self: flex-end; background-color: var(--bubble-out); border-top-left-radius: 0; }
.bubble-in::before { content: ''; position: absolute; top: 0; right: -8px; border: 8px solid transparent; border-top-color: var(--bubble-in); border-right: 0; border-left-width: 8px; }
.bubble-out::before { content: ''; position: absolute; top: 0; left: -8px; border: 8px solid transparent; border-top-color: var(--bubble-out); border-left: 0; border-right-width: 8px; }

.msg-top { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px; margin-bottom: 2px;}
.sender-name { font-weight: 700; font-size: 0.9rem; color: var(--name-color); }
.bubble-out .sender-name { color: var(--link-color); }
.file-id { font-size: 0.75rem; color: #8696a0; direction: ltr; font-family: monospace; font-weight: 600;}

/* נגן האודיו */
.audio-player { display: flex; align-items: center; gap: 12px; padding: 4px 0; direction: ltr; }
.play-btn-circle { width: 44px; height: 44px; flex-shrink: 0; border-radius: 50%; color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.3rem; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.15);}
.bubble-in .play-btn-circle { background: var(--play-in); }
.bubble-in .play-btn-circle:hover { background: #0369a1; }
.bubble-out .play-btn-circle { background: var(--play-out); }
.bubble-out .play-btn-circle:hover { background: #15803d; }

.player-track-container { flex: 1; display: flex; flex-direction: column; gap: 4px; position: relative; }
input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; cursor: pointer; outline: none; z-index: 2; position: relative;}
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; background: var(--play-in); cursor: pointer; margin-top: -4.5px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
.bubble-out input[type=range]::-webkit-slider-thumb { background: var(--play-out); }
input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 5px; cursor: pointer; background: var(--player-track); border-radius: 3px; }
.bubble-out input[type=range]::-webkit-slider-runnable-track { background: #bbf7d0; }
.track-fill { position: absolute; left: 0; top: 6px; height: 5px; background: var(--play-in); border-radius: 3px; pointer-events: none; width: 0%; z-index: 1;}
.bubble-out .track-fill { background: var(--play-out); }

.player-times { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-light); font-weight: 600; }
.msg-bottom-time { display: flex; justify-content: flex-end; align-items: center; gap: 5px; font-size: 0.75rem; color: #667781; padding: 0 4px; margin-top: 2px; }

.date-divider { text-align: center; margin: 15px 0; }
.date-divider span { background: var(--header-bg); padding: 6px 14px; border-radius: 8px; font-size: 0.8rem; color: var(--text-muted); box-shadow: 0 1px 1px rgba(0,0,0,0.06); font-weight: 600; }

.loading-state { text-align: center; padding: 40px; color: var(--text-muted); font-weight: 600; font-size: 1.1rem; width: 100%;}
.status-ok { color: #15803d; background: #dcfce7; padding: 4px 10px; border-radius: 20px;}
.status-bad { color: #b91c1c; background: #fee2e2; padding: 4px 10px; border-radius: 20px;}

/* מובייל (עבור המסך החדש של המשתמש) */
@media (max-width: 768px) {
    #user-dash-view.dashboard-layout.active { flex-direction: column; background: #fff;}
    .app-sidebar { width: 100%; height: auto; border-radius: 0; border-bottom: 1px solid var(--border); border-left: none;}
    
    /* העברת תפריט המשתמש ללמטה! */
    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--header-bg); border-top: 1px solid var(--border); z-index: 100; flex-direction: row; justify-content: space-around; padding-bottom: env(safe-area-inset-bottom); }
    .bottom-nav .nav-item { flex: 1; justify-content: center; border-right: none; border-top: 3px solid transparent; flex-direction: column; gap: 4px; padding: 12px 0;}
    .bottom-nav .nav-item.active { border-right: none; border-top-color: var(--play-out); background: none;}
    
    .app-main-area { height: calc(100vh - 200px); border-radius: 0; border: none;}
    .bubble { max-width: 90%; }
}
`;

export default cssContent;
