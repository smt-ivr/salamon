const cssContent = `:root {
    --primary: #0f172a;
    --secondary: #3b82f6;
    --chat-bg: #efeae2;
    --header-bg: #f0f2f5;
    --surface: #ffffff;
    --text-main: #111b21;
    --text-dark: #000000;
    --text-light: #54656f;
    --border-color: #d1d7db;
    
    --bubble-in: #ffffff;
    --bubble-out: #dcf8c6;
    --play-in: #0284c7; 
    --play-out: #16a34a;
    --player-track: #cbd5e1;
    --link-color: #027eb5;
    --name-color: #0f766e;
    
    --danger: #ef4444;
    --success: #10b981;
}

* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }

body { 
    height: 100vh; width: 100vw; overflow: hidden; 
    background-color: var(--border-color); color: var(--text-main); 
}

.app-wrapper { display: flex; width: 100%; height: 100%; background: var(--surface); }
.view-section { display: none; width: 100%; height: 100%; }
.view-section.active { display: flex; }

/* ================== מניעת זיהוי התמונה בעכבר (הגנה) ================== */
.protected-logo {
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
}

/* ================== מסכי התחברות ================== */
#auth-layout { background: var(--header-bg); justify-content: center; align-items: center; }
.auth-container { width: 100%; max-width: 420px; padding: 20px; }

.auth-card { display: none; background: var(--surface); border-radius: 12px; padding: 40px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid var(--border-color); text-align: center; animation: fadeIn 0.3s ease; }
.auth-card.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.auth-icon { font-size: 2.5rem; color: var(--play-out); margin-bottom: 15px; }

/* עיצוב הלוגו הגדול בחלון ההתחברות */
.auth-logo {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin: 0 auto 15px auto;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    overflow: hidden;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
}
.auth-logo img { width: 100%; height: 100%; object-fit: cover; }

.auth-card h2 { font-size: 1.6rem; margin-bottom: 8px; font-weight: 800; color: var(--text-dark); }
.subtitle { font-size: 0.95rem; color: var(--text-light); margin-bottom: 25px; }

.form-group { margin-bottom: 18px; text-align: right; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem; }
.input-modern { width: 100%; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 1rem; color: var(--text-main); transition: 0.2s; background: #fafafa; }
.input-modern:focus { outline: none; border-color: var(--play-out); background: white; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1); }
.ltr-input { direction: ltr; text-align: left; }
.center-text { text-align: center; font-size: 1.1rem; font-weight: 600; letter-spacing: 1px; }

.btn-primary { width: 100%; padding: 12px; background-color: var(--play-out); color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-primary:hover { background-color: #15803d; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-text { background: none; border: none; color: var(--text-light); font-weight: 600; cursor: pointer; padding: 10px; width: 100%; margin-top: 10px; transition: 0.2s; }
.btn-text:hover { color: var(--text-main); }

.locked-input-container { display: flex; align-items: center; justify-content: space-between; background-color: #fafafa; border: 1px solid var(--border-color); border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; }
.locked-input-container span { font-weight: 600; font-size: 1.05rem; }
.locked-input-container button { background: none; border: none; color: var(--link-color); cursor: pointer; font-weight: 600; font-size: 0.9rem; }

.warning-box { background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 0.9rem; line-height: 1.5; text-align: right; }
.alert-box { padding: 14px; border-radius: 6px; margin-bottom: 20px; font-weight: 600; font-size: 0.9rem; display: none; text-align: right; }
.alert-box.error { background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.alert-box.success { background-color: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }

/* ================== אזור האפליקציה ================== */
.app-layout { flex-direction: row; }
.app-sidebar { width: 320px; background: var(--surface); display: flex; flex-direction: column; border-left: 1px solid var(--border-color); z-index: 20; flex-shrink: 0; }
.sidebar-header { height: 65px; padding: 0 15px; background: var(--header-bg); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); }

.user-profile-wrap { display: flex; align-items: center; gap: 12px; overflow: hidden; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--play-out); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
.user-details h2 { font-size: 0.95rem; font-weight: 700; margin-bottom: 2px; white-space: nowrap; }
.user-details p { font-size: 0.75rem; color: var(--text-light); direction: ltr; text-align: right;}

.sidebar-actions { display: flex; gap: 5px; }
.sidebar-actions button { background: none; border: none; color: var(--text-light); font-size: 1.2rem; cursor: pointer; padding: 8px; border-radius: 50%; transition: 0.2s; }
.sidebar-actions button:hover { background: rgba(0,0,0,0.05); color: var(--text-main); }
.logout-btn { color: var(--danger) !important; }

.tzintuk-status { padding: 10px 15px; background: var(--surface); border-bottom: 1px solid var(--border-color); font-size: 0.85rem; display: flex; align-items: center; gap: 8px; font-weight: 600; }
.status-ok { color: #15803d; background: #dcfce7; padding: 4px 10px; border-radius: 20px;}
.status-bad { color: #b91c1c; background: #fee2e2; padding: 4px 10px; border-radius: 20px;}

.nav-menu { display: flex; flex-direction: column; padding-top: 10px; flex: 1; overflow-y: auto; }
.nav-item { padding: 15px 20px; display: flex; align-items: center; gap: 15px; cursor: pointer; font-weight: 600; transition: 0.2s; border-right: 4px solid transparent; color: var(--text-main); }
.nav-item:hover { background: var(--header-bg); }
.nav-item.active { background: var(--header-bg); border-right-color: var(--play-out); color: var(--play-out); }
.admin-sidebar-menu .nav-item.active { border-right-color: var(--secondary); color: var(--secondary); }
.nav-item i { font-size: 1.2rem; width: 25px; text-align: center; }

.app-main-area { flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; }
.app-tab { display: none; flex: 1; flex-direction: column; overflow: hidden; }
.app-tab.active { display: flex; }
.scrollable-tab { overflow-y: auto !important; padding: 30px; }

/* ================== מסך הגדרות וניהול ================== */
.settings-wrapper { display: flex; flex-direction: column; align-items: center; width: 100%; }
.settings-wrapper h2 { margin-bottom: 25px; color: var(--text-main); }
.settings-card { width: 100%; max-width: 500px; background: var(--surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }

.admin-top-bar { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; }
.table-wrapper { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 8px; }
.modern-table { width: 100%; border-collapse: collapse; text-align: right; white-space: nowrap; }
.modern-table th, .modern-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
.modern-table th { background: var(--header-bg); font-weight: 600; color: var(--text-light); font-size: 0.85rem; }
.modern-table tr:hover { background: #fafafa; }
.actions-btn { background: var(--header-bg); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
.actions-btn:hover { background: var(--secondary); color: white; border-color: var(--secondary); }

/* ================== דשבורד סטטיסטיקות אבטחה ================== */
.dashboard-stats { display: flex; gap: 15px; margin-bottom: 30px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 200px; background: #fff; border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
.stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
.stat-info h3 { font-size: 1.8rem; margin: 0; color: var(--text-dark); line-height: 1; }
.stat-info p { margin: 5px 0 0; font-size: 0.85rem; color: var(--text-light); font-weight: 600; }

.badge-level { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 5px; }
.badge-level.info { background: #e0f2fe; color: #0284c7; }
.badge-level.warn { background: #fef3c7; color: #d97706; }
.badge-level.blocked { background: #fee2e2; color: #dc2626; }

.badge-action { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; display: inline-block; white-space: nowrap; }
.badge-action.success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.badge-action.info { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.badge-action.warn { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
.badge-action.danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.badge-action.neutral { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }

/* ================== עיצוב צ'אט ================== */
.chat-header-fixed { height: 65px; background: var(--header-bg); padding: 0 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); z-index: 10; flex-shrink: 0; }
.header-title-group { display: flex; align-items: center; gap: 15px; }

/* עיצוב הלוגו בתוך הצ'אט עצמו */
.header-icon { width: 40px; height: 40px; border-radius: 50%; background: #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #fff; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.header-icon img { width: 100%; height: 100%; object-fit: cover; }

.header-title h3 { font-size: 1.05rem; font-weight: bold; }
.header-title p { font-size: 0.8rem; color: var(--text-light); }
.icon-btn { background: none; border: none; color: var(--text-light); cursor: pointer; font-size: 1.2rem; padding: 10px; transition: 0.2s; }
.icon-btn:hover { color: var(--text-main); }
#messages-container { flex: 1; padding: 20px 6%; overflow-y: auto; display: flex; flex-direction: column-reverse; gap: 10px; background-image: url('https://www.transparenttextures.com/patterns/cubes.png'); background-color: var(--chat-bg); }
.bubble { max-width: 75%; min-width: 260px; padding: 8px 10px; border-radius: 8px; box-shadow: 0 1px 1px rgba(0,0,0,0.1); position: relative; display: flex; flex-direction: column; gap: 4px; }
.bubble-in { align-self: flex-start; background-color: var(--bubble-in); border-top-right-radius: 0; }
.bubble-out { align-self: flex-end; background-color: var(--bubble-out); border-top-left-radius: 0; }
.bubble-in::before { content: ''; position: absolute; top: 0; right: -8px; border: 8px solid transparent; border-top-color: var(--bubble-in); border-right: 0; border-left-width: 8px; }
.bubble-out::before { content: ''; position: absolute; top: 0; left: -8px; border: 8px solid transparent; border-top-color: var(--bubble-out); border-left: 0; border-right-width: 8px; }
.msg-top { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px; margin-bottom: 2px;}
.sender-name { font-weight: 700; font-size: 0.9rem; color: var(--name-color); }
.bubble-out .sender-name { color: var(--link-color); }
.file-id { font-size: 0.75rem; color: #8696a0; direction: ltr; font-family: monospace; font-weight: 600;}
.audio-player { display: flex; align-items: center; gap: 12px; padding: 4px 0; direction: ltr; }
.play-btn-circle { width: 44px; height: 44px; flex-shrink: 0; border-radius: 50%; color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.3rem; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.15);}
.bubble-in .play-btn-circle { background: var(--play-in); }
.bubble-out .play-btn-circle { background: var(--play-out); }
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
.date-divider span { background: var(--header-bg); padding: 6px 14px; border-radius: 8px; font-size: 0.8rem; color: var(--text-light); box-shadow: 0 1px 1px rgba(0,0,0,0.06); font-weight: 600; }
.loading-state { text-align: center; padding: 40px; color: var(--text-light); font-weight: 600; font-size: 1.1rem; width: 100%;}
.chat-upload-area { height: auto; min-height: 70px; background: var(--chat-bg); padding: 10px 15px; display: flex; align-items: flex-end; gap: 10px; flex-shrink: 0; transition: 0.3s ease; }
.chat-upload-area.disabled { background: #9ca3af; pointer-events: none; filter: grayscale(100%); opacity: 0.8; }
.chat-upload-area.disabled .chat-input-wrapper { background: #e5e7eb; }
.chat-upload-area.disabled .upload-status { color: #374151; font-weight: 700; }
.chat-input-wrapper { flex: 1; background: #ffffff; border-radius: 24px; min-height: 48px; padding: 5px 10px 5px 15px; display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.08); transition: 0.3s ease; }
.upload-status { flex: 1; font-size: 0.95rem; color: var(--text-light); padding-right: 10px; user-select: none; }
.upload-btn { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; transition: 0.2s; flex-shrink: 0; border: none; background: transparent; color: var(--text-light); }
.upload-btn:hover:not(.disabled) { color: var(--text-dark); }
.record-btn { background: var(--play-out); color: white; width: 48px; height: 48px; font-size: 1.3rem; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.record-btn:hover:not(.disabled) { background: #15803d; color: white; transform: scale(1.05); }
.upload-btn.disabled, .record-btn.disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; box-shadow: none; transform: none !important; }
.modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
.modal-overlay.active { display: flex; }
.modal-content { background: var(--surface); padding: 30px; border-radius: 12px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
.text-center { text-align: center; }

/* מודל הקלטה */
.professional-modal { max-width: 420px; padding: 0; overflow: hidden; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
.modal-header { padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { margin: 0; font-size: 1.15rem; color: var(--text-dark); display: flex; align-items: center; gap: 10px; font-weight: 700; }
.close-modal-btn { background: none; border: none; font-size: 1.25rem; color: var(--text-light); cursor: pointer; transition: 0.2s; padding: 5px; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.close-modal-btn:hover { color: var(--danger); background: #fee2e2; }
#recording-ui, #preview-ui { padding: 30px 24px; text-align: center; }
.recording-visualizer { display: flex; align-items: center; justify-content: center; gap: 4px; height: 60px; margin: 10px 0 20px; }
.recording-visualizer .bar { width: 6px; background: var(--danger); border-radius: 3px; animation: bounceBar 0.5s infinite alternate; }
.recording-visualizer .bar:nth-child(1) { height: 20%; animation-delay: 0.1s; }
.recording-visualizer .bar:nth-child(2) { height: 50%; animation-delay: 0.2s; }
.recording-visualizer .bar:nth-child(3) { height: 80%; animation-delay: 0.3s; }
.recording-visualizer .bar:nth-child(4) { height: 40%; animation-delay: 0.4s; }
.recording-visualizer .bar:nth-child(5) { height: 100%; animation-delay: 0.5s; background: #dc2626; }
.recording-visualizer .bar:nth-child(6) { height: 60%; animation-delay: 0.4s; }
.recording-visualizer .bar:nth-child(7) { height: 90%; animation-delay: 0.3s; }
.recording-visualizer .bar:nth-child(8) { height: 30%; animation-delay: 0.2s; }
.recording-visualizer .bar:nth-child(9) { height: 50%; animation-delay: 0.1s; }
.recording-visualizer.paused .bar { animation-play-state: paused; opacity: 0.5; height: 10% !important; transition: height 0.3s ease; }
@keyframes bounceBar { from { height: 20%; } to { height: 100%; } }
.recording-timer-pro { font-size: 3rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--text-dark); margin-bottom: 30px; letter-spacing: 2px; }
.recording-actions-pro, .preview-actions-pro { display: flex; gap: 12px; justify-content: center; }
.btn-pro-secondary, .btn-pro-danger, .btn-pro-outline, .btn-pro-primary { flex: 1; padding: 12px; border-radius: 10px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; }
.btn-pro-secondary { background: #f1f5f9; color: var(--text-dark); }
.btn-pro-secondary:hover { background: #e2e8f0; }
.btn-pro-danger { background: #fee2e2; color: var(--danger); }
.btn-pro-danger:hover { background: var(--danger); color: white; }
.btn-pro-outline { background: white; border: 1px solid #ef4444; color: #ef4444; }
.btn-pro-outline:hover { background: #fef2f2; }
.btn-pro-primary { background: var(--play-out); color: white; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2); }
.btn-pro-primary:hover { background: #15803d; transform: translateY(-1px); box-shadow: 0 6px 8px -1px rgba(22, 163, 74, 0.3); }
.preview-card { background: #f8fafc; border: 1px dashed var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 25px; }
.file-icon-large { font-size: 2.5rem; color: var(--secondary); margin-bottom: 10px; }
.file-info-text { font-size: 0.9rem; font-weight: 600; color: var(--text-light); margin-bottom: 15px; direction: ltr; word-break: break-all; }
.preview-audio-modern { width: 100%; height: 40px; border-radius: 8px; outline: none; }

@media (max-width: 768px) {
    .app-layout { flex-direction: column; }
    .app-sidebar { width: 100%; height: auto; border-left: none; border-bottom: 1px solid var(--border-color); flex-shrink: 0; }
    .nav-menu { position: fixed; bottom: 0; left: 0; right: 0; flex-direction: row; justify-content: space-around; align-items: center; background: var(--header-bg); padding: 0; border-top: 1px solid var(--border-color); z-index: 100; height: calc(65px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); }
    .nav-item { flex: 1; justify-content: center; border-right: none; border-top: 3px solid transparent; flex-direction: column; gap: 4px; font-size: 0.8rem; padding: 5px 0;}
    .nav-item.active { border-top-color: var(--play-out); background: none; }
    .admin-sidebar-menu .nav-item.active { border-top-color: var(--secondary); }
    .app-main-area { height: calc(100vh - 65px); height: calc(100dvh - 65px); padding-bottom: calc(65px + env(safe-area-inset-bottom)); }
    .scrollable-tab { padding: 20px 15px; } 
    #messages-container { padding: 15px 10px; } 
    .bubble { max-width: 90%; min-width: 240px; }
    .chat-upload-area { padding: 8px 10px; gap: 8px; min-height: 60px; }
    .chat-input-wrapper { padding: 4px 10px; gap: 6px; }
    .upload-status { font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .upload-btn { width: 36px; height: 36px; font-size: 1.1rem; }
    .record-btn { width: 44px; height: 44px; font-size: 1.1rem; }
    .professional-modal { max-width: 90%; border-radius: 12px; }
    .recording-timer-pro { font-size: 2.5rem; }
}
`;

export default cssContent;
