// client-smart-admin.js

document.addEventListener('DOMContentLoaded', () => {
    injectSmartAdminStyles();
    injectSmartAdminModal();
    
    // משיכת רשימת ההרשאות בתחילת העבודה כדי שהמודלים יזהו אותם
    if(typeof loadAvailablePermissions === 'function') loadAvailablePermissions();
    
    if (typeof window.updateDashboardUI === 'function') {
        const originalUpdateDashboardUI = window.updateDashboardUI;
        window.updateDashboardUI = function() {
            originalUpdateDashboardUI();
            setupSmartAdminAccess();
        };
    }
});

function injectSmartAdminStyles() {
    const styles = document.createElement('style');
    styles.innerHTML = `
        .smart-admin-modal .modal-content { max-width: 1000px; width: 95%; height: 85vh; max-height: 800px; display: flex; flex-direction: row; padding: 0; background: #f8fafc; overflow: hidden; border-radius: 16px; }
        .smart-admin-sidebar { width: 250px; background: #0f172a; color: white; display: flex; flex-direction: column; flex-shrink: 0; }
        .smart-admin-header { padding: 20px; border-bottom: 1px solid #1e293b; }
        .smart-admin-header h2 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #f8fafc; }
        .smart-admin-header p { margin: 5px 0 0; font-size: 0.8rem; color: #94a3b8; }
        .smart-admin-menu { flex: 1; overflow-y: auto; padding: 15px 0; }
        .smart-admin-tab-btn { width: 100%; text-align: right; background: none; border: none; outline: none; color: #cbd5e1; padding: 12px 20px; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 12px; border-right: 4px solid transparent; }
        .smart-admin-tab-btn:hover { background: #1e293b; color: white; }
        .smart-admin-tab-btn.active { background: #1e293b; color: var(--secondary); border-right-color: var(--secondary); font-weight: bold; }
        .smart-admin-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #f8fafc; position: relative; }
        .smart-admin-top { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; background: white; border-bottom: 1px solid #e2e8f0; }
        .smart-admin-top h3 { margin: 0; font-size: 1.2rem; color: #1e293b; font-weight:800; }
        .smart-admin-content { flex: 1; overflow-y: auto; padding: 25px; }
        .smart-admin-panel { display: none; animation: fadeIn 0.3s ease; }
        .smart-admin-panel.active { display: block; }
        .placeholder-card { background: white; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 40px; text-align: center; color: #64748b; }
        .placeholder-card i { font-size: 3rem; color: #cbd5e1; margin-bottom: 15px; }
        @media (max-width: 768px) {
            .smart-admin-modal .modal-content { flex-direction: column; }
            .smart-admin-sidebar { width: 100%; height: auto; }
            .smart-admin-menu { display: flex; overflow-x: auto; padding: 0; }
            .smart-admin-tab-btn { white-space: nowrap; border-right: none; border-bottom: 3px solid transparent; justify-content: center; }
            .smart-admin-tab-btn.active { border-right: none; border-bottom-color: var(--secondary); }
        }
    `;
    document.head.appendChild(styles);
}

function injectSmartAdminModal() {
    const modalHtml = `
        <div class="modal-overlay smart-admin-modal" id="smartAdminModal">
            <div class="modal-content professional-modal">
                <div class="smart-admin-sidebar">
                    <div class="smart-admin-header"><h2><i class="fa-solid fa-bolt"></i> פאנל חכם</h2><p>מותאם אישית להרשאות שלך</p></div>
                    <div class="smart-admin-menu" id="smart-admin-menu-container"></div>
                </div>
                <div class="smart-admin-main">
                    <div class="smart-admin-top">
                        <h3 id="smart-admin-current-title">טוען...</h3>
                        <button class="close-modal-btn" onclick="closeSmartAdminModal()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="smart-admin-content" id="smart-admin-content-container"></div>
                </div>
            </div>
        </div>
    `;
    const container = document.createElement('div');
    container.innerHTML = modalHtml;
    document.body.appendChild(container.firstElementChild);
}

function setupSmartAdminAccess() {
    const user = state.currentUser;
    if (!user || !user.isAdmin) return; 

    const sidebarActions = document.querySelector('#user-dash-view .sidebar-actions');
    if (!sidebarActions) return;

    if (!document.getElementById('btn-open-smart-admin')) {
        const adminBtn = document.createElement('button');
        adminBtn.id = 'btn-open-smart-admin';
        adminBtn.title = 'פתח פאנל ניהול חכם';
        adminBtn.innerHTML = '<i class="fa-solid fa-user-shield" style="color: var(--secondary);"></i>';
        adminBtn.onclick = openSmartAdminModal;
        
        const logoutBtn = sidebarActions.querySelector('.logout-btn');
        if (logoutBtn) { sidebarActions.insertBefore(adminBtn, logoutBtn); } else { sidebarActions.appendChild(adminBtn); }
    }
}

window.submitSmartNameUpdate = async function(e) {
    e.preventDefault();
    const phone = document.getElementById('smart_name_phone').value.trim();
    const newName = document.getElementById('smart_name_value').value.trim();
    const btn = document.getElementById('btn_smart_update_name');
    
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מתעדכן מול השרת...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/update-yemot-name`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken, phone: phone, newName: newName })
        });
        const data = await res.json();
        
        btn.innerHTML = '<i class="fa-solid fa-save"></i> שמור שם במערכת';
        btn.disabled = false;

        if (res.ok && data.success) {
            showToast('השם עודכן בהצלחה במערכת!', 'success');
            document.getElementById('smart_name_phone').value = '';
            document.getElementById('smart_name_value').value = '';
        } else {
            showToast(data.error || 'שגיאה בעדכון השם', 'error');
        }
    } catch (err) {
        btn.innerHTML = '<i class="fa-solid fa-save"></i> שמור שם במערכת';
        btn.disabled = false;
        showToast('שגיאת תקשורת', 'error');
    }
};

const SMART_ADMIN_MODULES = [
    { id: 'manage_users', icon: 'fa-users', title: 'ניהול משתמשים', html: `<div class="placeholder-card"><i class="fa-solid fa-users-gear"></i><h3>טבלת משתמשים</h3><p>לחץ כדי לנהל את המשתמשים במערכת</p></div>` },
    {
        id: 'manage_names',
        icon: 'fa-address-book',
        title: 'עדכון שמות מנויים',
        html: `
            <div class="clean-settings-card" style="padding: 25px; border:none; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h3 style="margin-bottom: 15px; color:var(--text-dark); font-weight:800;"><i class="fa-solid fa-pen-nib"></i> עדכון שם בספר הטלפונים של המערכת</h3>
                
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; line-height: 1.5;">
                    <i class="fa-solid fa-circle-info" style="color: #3b82f6;"></i> <strong>שים לב:</strong> משתמשים המוגדרים כ"מוגנים" (Protected) אינם ניתנים לעריכה באמצעות פאנל זה. שינויים למשתמשים אלו יאושרו רק דרך המערכת המרכזית.
                </div>

                <form onsubmit="submitSmartNameUpdate(event)">
                    <div class="form-group" style="text-align: right;">
                        <label style="font-weight:bold;">מספר טלפון לזיהוי המנוי:</label>
                        <input type="text" id="smart_name_phone" class="input-modern ltr-input" required placeholder="למשל: 0501234567" pattern="^[0-9]{9,15}$" title="נא להזין מספר טלפון תקין המכיל ספרות בלבד">
                    </div>
                    <div class="form-group" style="text-align: right;">
                        <label style="font-weight:bold;">השם המלא והחדש למנוי זה:</label>
                        <input type="text" id="smart_name_value" class="input-modern" required placeholder="ישראל ישראלי">
                    </div>
                    <button type="submit" id="btn_smart_update_name" class="btn-pro-primary" style="width:100%; margin-top:10px;"><i class="fa-solid fa-save"></i> שמור שם במערכת</button>
                </form>
            </div>
        `
    },
    { id: 'manage_chat', icon: 'fa-headset', title: 'צ\'אט והודעות', html: `<div class="placeholder-card"><i class="fa-solid fa-comments"></i><h3>אזור הודעות לקוחות</h3></div>` },
    { id: 'manage_ads', icon: 'fa-bullhorn', title: 'מודעות וקמפיינים', html: `<div class="placeholder-card"><i class="fa-solid fa-rectangle-ad"></i><h3>סטודיו המודעות</h3></div>` },
    { id: 'manage_system', icon: 'fa-database', title: 'מסד נתונים ולוגים', html: `<div class="placeholder-card"><i class="fa-solid fa-terminal"></i><h3>מסוף נתונים מתקדם</h3></div>` }
];

function openSmartAdminModal() {
    const user = state.currentUser;
    if (!user) return;
    const permsArray = (user.adminPermissions || '').split(',').map(p => p.trim());
    const hasAll = permsArray.includes('all');

    const allowedModules = SMART_ADMIN_MODULES.filter(module => hasAll || permsArray.includes(module.id));

    if (allowedModules.length === 0) {
        showToast('יש לך הרשאת ניהול, אך לא הוקצו לך מודולים. פנה למנהל הראשי.', 'error');
        return;
    }

    renderSmartAdminMenu(allowedModules);
    document.getElementById('smartAdminModal').classList.add('active');
    switchSmartAdminTab(allowedModules[0].id, allowedModules[0].title);
}

function renderSmartAdminMenu(allowedModules) {
    const menuContainer = document.getElementById('smart-admin-menu-container');
    const contentContainer = document.getElementById('smart-admin-content-container');
    menuContainer.innerHTML = ''; contentContainer.innerHTML = '';

    allowedModules.forEach(module => {
        const btn = document.createElement('button');
        btn.className = 'smart-admin-tab-btn'; btn.id = `smart-tab-btn-${module.id}`;
        btn.innerHTML = `<i class="fa-solid ${module.icon}"></i> ${module.title}`;
        btn.onclick = () => switchSmartAdminTab(module.id, module.title);
        menuContainer.appendChild(btn);

        const panel = document.createElement('div');
        panel.className = 'smart-admin-panel'; panel.id = `smart-panel-${module.id}`;
        panel.innerHTML = module.html;
        contentContainer.appendChild(panel);
    });
}

function switchSmartAdminTab(moduleId, moduleTitle) {
    document.querySelectorAll('.smart-admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`smart-tab-btn-${moduleId}`);
    if (activeBtn) activeBtn.classList.add('active');

    document.querySelectorAll('.smart-admin-panel').forEach(panel => panel.classList.remove('active'));
    const activePanel = document.getElementById(`smart-panel-${moduleId}`);
    if (activePanel) activePanel.classList.add('active');

    document.getElementById('smart-admin-current-title').innerText = moduleTitle;
}

function closeSmartAdminModal() { document.getElementById('smartAdminModal').classList.remove('active'); }
