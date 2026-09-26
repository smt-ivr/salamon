// client-smart-admin.js

document.addEventListener('DOMContentLoaded', () => {
    injectSmartAdminStyles();
    injectSmartAdminModal();
    
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
        /* Smart Admin Base Styles */
        .smart-admin-modal { z-index: 2000 !important; }
        .smart-admin-modal .modal-content { max-width: 1200px; width: 98%; height: 90vh; max-height: 900px; display: flex; flex-direction: row; padding: 0; background: #f8fafc; overflow: hidden; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .smart-admin-sidebar { width: 260px; background: #0f172a; color: white; display: flex; flex-direction: column; flex-shrink: 0; }
        .smart-admin-header { padding: 25px 20px; border-bottom: 1px solid #1e293b; background: #0b1120; }
        .smart-admin-header h2 { margin: 0; font-size: 1.3rem; font-weight: 800; color: #f8fafc; display: flex; align-items: center; gap: 10px; }
        .smart-admin-header p { margin: 8px 0 0; font-size: 0.85rem; color: #94a3b8; }
        
        .smart-admin-menu { flex: 1; overflow-y: auto; padding: 15px 0; }
        .smart-admin-tab-btn { width: 100%; text-align: right; background: none; border: none; outline: none; color: #cbd5e1; padding: 14px 25px; font-size: 1rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 15px; border-right: 4px solid transparent; }
        .smart-admin-tab-btn i { width: 20px; text-align: center; font-size: 1.1rem; }
        .smart-admin-tab-btn:hover { background: #1e293b; color: white; }
        .smart-admin-tab-btn.active { background: #1e293b; color: var(--secondary); border-right-color: var(--secondary); font-weight: bold; }
        
        .smart-admin-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #f1f5f9; position: relative; }
        .smart-admin-top { display: flex; justify-content: space-between; align-items: center; padding: 20px 30px; background: white; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.02);}
        .smart-admin-top h3 { margin: 0; font-size: 1.4rem; color: #0f172a; font-weight:800; }
        .smart-admin-content { flex: 1; overflow: hidden; padding: 25px 30px; display: flex; flex-direction: column; }
        
        .smart-admin-panel { display: none; height: 100%; animation: fadeIn 0.3s ease; flex-direction: column; }
        .smart-admin-panel.active { display: flex; }
        
        .smart-card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        .smart-card-header { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        
        .compact-table th { background: #f8fafc; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; }
        .compact-table th, .compact-table td { padding: 12px 16px !important; }
        .compact-input { padding: 8px 12px !important; font-size: 0.95rem !important; border-radius: 8px; }

        /* תתי-חלונות - מודלים שנפתחים מעל הניהול החכם */
        .sub-modal-elevated { z-index: 3000 !important; }

        @media (max-width: 768px) {
            .smart-admin-modal .modal-content { flex-direction: column; }
            .smart-admin-sidebar { width: 100%; height: auto; }
            .smart-admin-menu { display: flex; overflow-x: auto; padding: 0; }
            .smart-admin-tab-btn { white-space: nowrap; border-right: none; border-bottom: 3px solid transparent; justify-content: center; padding: 12px 15px;}
            .smart-admin-tab-btn.active { border-right: none; border-bottom-color: var(--secondary); }
            .smart-admin-content { padding: 15px; }
        }
    `;
    document.head.appendChild(styles);
}

function injectSmartAdminModal() {
    const modalHtml = `
        <div class="modal-overlay smart-admin-modal" id="smartAdminModal">
            <div class="modal-content professional-modal">
                <div class="smart-admin-sidebar">
                    <div class="smart-admin-header">
                        <h2><i class="fa-solid fa-bolt"></i> מערכת ניהול Pro</h2>
                        <p>סביבת עבודה מתקדמת למנהלים</p>
                    </div>
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

// פונקציית עזר להרמת מודלים (z-index גבוה יותר לחלונות משניים)
function elevateSubModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active', 'sub-modal-elevated');
    }
}

// ==========================================
// מודול צ'אט והודעות מותאם (Smart Chat Module)
// ==========================================
window.smartAllConversations = [];

window.loadSmartChatConversations = async function() {
    const listContainer = document.getElementById('smart-chat-conv-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<div class="empty-state" style="padding: 40px; grid-column: 1 / -1;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; color:var(--secondary); margin-bottom:15px;"></i><br>טוען נתוני צ\'אט...</div>';
    
    try {
        // שימוש ב-userToken במקום adminToken כדי לפתור את שגיאת ה-403
        const payload = { userToken: state.userToken, adminToken: state.userToken }; // שולח את שניהם לגיבוי תאימות שרת
        const res = await fetch(`${API_BASE_URL}/admin/chat/conversations`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            window.smartAllConversations = data.conversations;
            renderSmartConversationList();
        } else {
            listContainer.innerHTML = `<div class="empty-state" style="color:var(--danger); grid-column: 1 / -1;">${data.error || 'שגיאה בשליפת שיחות'}</div>`;
        }
    } catch(e) { 
        listContainer.innerHTML = '<div class="empty-state" style="color:var(--danger); grid-column: 1 / -1;">שגיאת תקשורת מול השרת</div>'; 
    }
};

window.renderSmartConversationList = function() {
    const listContainer = document.getElementById('smart-chat-conv-list');
    if (!listContainer) return;

    const searchInput = document.getElementById('smart-chat-search');
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    
    const filtered = window.smartAllConversations.filter(c => c.user_phone.includes(searchVal) || (c.user_name && c.user_name.toLowerCase().includes(searchVal)));
    
    listContainer.innerHTML = '';
    if (filtered.length === 0) { 
        listContainer.innerHTML = '<div class="empty-state" style="padding: 20px; grid-column: 1 / -1;">לא נמצאו שיחות.</div>'; 
        return; 
    }
    
    filtered.forEach(conv => {
        let dateStr = conv.last_message_time;
        try { dateStr = new Date(conv.last_message_time.replace(' ', 'T')).toLocaleString('he-IL', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'}); } catch(e){}
        
        const item = document.createElement('div');
        item.className = 'conv-card';
        item.style.cssText = 'background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; cursor: pointer; transition: 0.2s; display: flex; justify-content: space-between; align-items: center;';
        item.onmouseover = () => { item.style.borderColor = 'var(--secondary)'; item.style.transform = 'translateY(-2px)'; item.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; };
        item.onmouseout = () => { item.style.borderColor = '#e2e8f0'; item.style.transform = 'none'; item.style.boxShadow = 'none'; };
        item.onclick = () => {
            // פתיחת חלון הצ'אט האקטיבי מעל הניהול החכם
            if (typeof openAdminChatModal === 'function') {
                openAdminChatModal(conv.user_phone);
                elevateSubModal('adminChatActiveModal');
            }
        };
        
        let badgeHtml = conv.unread_count > 0 ? `<div style="background:var(--danger); color:white; padding:4px 10px; border-radius:20px; font-size:0.85rem; font-weight:bold;">${conv.unread_count} חדשות</div>` : '';
        
        item.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-weight: 800; font-size: 1.05rem; color: #0f172a;">${conv.user_name || 'אורח'} <span dir="ltr" style="font-family: monospace; color: var(--text-light); font-size:0.9rem;">(${conv.user_phone})</span></span>
                <span style="font-size: 0.8rem; color: #64748b;"><i class="fa-solid fa-clock"></i> הודעה אחרונה: ${dateStr}</span>
            </div>
            ${badgeHtml}
        `;
        listContainer.appendChild(item);
    });
};

// ==========================================
// תפריט ומודולים (Smart Admin Modules)
// ==========================================
const SMART_ADMIN_MODULES = [
    { 
        id: 'manage_users', 
        icon: 'fa-users', 
        title: 'ניהול משתמשים', 
        html: `
            <div class="smart-card">
                <div class="smart-card-header">
                    <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem; color: var(--text-dark);">
                        <input type="checkbox" id="filter_web_users" checked onchange="if(typeof renderAdminUsersTable === 'function') renderAdminUsersTable()" style="width: 18px; height: 18px; accent-color: var(--secondary);">
                        הצג משתמשים רשומים באתר בלבד
                    </label>
                    <button onclick="if(typeof loadAdminUsers === 'function') loadAdminUsers()" class="btn-pro-secondary" style="padding: 8px 15px;"><i class="fa-solid fa-rotate-right"></i> סנכרן</button>
                </div>
                <div class="table-wrapper" style="flex: 1; overflow-y: auto; margin: 0; border: none; border-radius: 0;">
                    <table class="modern-table compact-table">
                        <thead style="position: sticky; top: 0; z-index: 10;">
                            <tr><th>תמונה</th><th>טלפון / מזהה</th><th>שם משתמש</th><th>סטטוס בימות</th><th>חשבון באתר</th><th>הצטרפות</th><th style="text-align: center;">הרשאות כתיבה מהירות</th><th>פעולות</th></tr>
                        </thead>
                        <tbody id="admin-users-table-body">
                            <tr><td colspan="8" class="empty-state">טוען נתונים...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        ` 
    },
    {
        id: 'manage_names',
        icon: 'fa-address-book',
        title: 'ספר טלפונים',
        html: `
            <div class="smart-card">
                <div class="smart-card-header">
                    <input type="text" id="smart_names_search" class="input-modern compact-input" placeholder="חיפוש חכם (שם או טלפון)..." onkeyup="filterSmartYemotNames()" style="max-width: 350px; background: white;">
                    <div id="smart_names_stats" style="font-size: 0.9rem; display: flex; gap: 15px; align-items: center;"></div>
                    <button onclick="loadSmartYemotNames()" id="btn_refresh_yemot_names" class="btn-pro-secondary" style="padding: 8px 15px;"><i class="fa-solid fa-rotate-right"></i> רענן</button>
                </div>
                <div class="table-wrapper" style="flex: 1; overflow-y: auto; margin: 0; border: none; border-radius: 0;">
                    <table class="modern-table compact-table">
                        <thead style="position: sticky; top: 0; z-index: 10;">
                            <tr><th style="width: 140px;">טלפון מנוי</th><th style="width: 80px;">סטטוס</th><th>שם המנוי (לחץ לעריכה)</th><th style="width: 100px;">פעולה</th></tr>
                        </thead>
                        <tbody id="smart_yemot_names_tbody">
                            <tr><td colspan="4" class="empty-state">טוען נתונים...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `
    },
    { 
        id: 'manage_chat', 
        icon: 'fa-comments', 
        title: 'צ\'אט שירות לקוחות', 
        html: `
            <div class="smart-card">
                <div class="smart-card-header" style="background: #fff;">
                    <div style="display:flex; gap:10px;">
                        <button onclick="if(typeof openCustomEmailModal === 'function'){ openCustomEmailModal(); elevateSubModal('adminCustomEmailModal'); }" class="btn-pro-secondary" style="padding: 8px 15px; background:#f1f5f9; color:#0f172a;"><i class="fa-solid fa-envelope"></i> מייל חופשי</button>
                        <button onclick="if(typeof promptNewChat === 'function') promptNewChat()" class="btn-pro-primary" style="padding: 8px 15px;"><i class="fa-solid fa-plus"></i> התחל שיחה</button>
                    </div>
                    <input type="text" id="smart-chat-search" class="input-modern compact-input" placeholder="חיפוש בשיחות..." onkeyup="renderSmartConversationList()" style="max-width: 250px;">
                </div>
                <div id="smart-chat-conv-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 15px; padding: 20px; flex: 1; overflow-y: auto; background: #f8fafc;">
                    <div class="empty-state" style="grid-column: 1 / -1;">טוען שיחות...</div>
                </div>
            </div>
        ` 
    },
    { 
        id: 'manage_ads', 
        icon: 'fa-bullhorn', 
        title: 'מערכת פרסום', 
        html: `
            <div class="smart-card">
                <div class="smart-card-header">
                    <span style="font-weight:bold; color:var(--text-dark);">ניהול קמפיינים ופופאפים</span>
                    <button onclick="if(typeof openEditAdModal === 'function') { openEditAdModal(); elevateSubModal('adEditModal'); }" class="btn-pro-primary" style="padding: 8px 15px;"><i class="fa-solid fa-plus"></i> יצירת מודעה</button>
                </div>
                <div class="table-wrapper" style="flex: 1; overflow-y: auto; margin: 0; border: none; border-radius: 0;">
                    <table class="modern-table compact-table">
                        <thead style="position: sticky; top: 0; z-index: 10;">
                            <tr><th>כותרת המודעה</th><th>סוג</th><th>חשיפות</th><th>יוניקים</th><th>סטטוס</th><th>פעולות</th></tr>
                        </thead>
                        <tbody id="admin-ads-table-body">
                            <tr><td colspan="6" class="empty-state">טוען קמפיינים...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        ` 
    },
    { 
        id: 'manage_system', 
        icon: 'fa-terminal', 
        title: 'מסוף Database', 
        html: `
            <div class="smart-card" style="background: #f1f5f9; border: none;">
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <select id="sql_table_select" class="input-modern compact-input" style="flex:1; max-width:300px; background:white;"><option value="">טוען טבלאות...</option></select>
                    <button type="button" class="btn-pro-secondary" style="padding: 8px 20px;" onclick="if(typeof executeQuickTableQuery === 'function') executeQuickTableQuery()">שלוף נתונים</button>
                </div>
                <div class="sql-terminal" style="margin-bottom: 15px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <form onsubmit="if(typeof executeSqlQuery === 'function') executeSqlQuery(event)">
                        <textarea id="sql_query_input" rows="4" placeholder="הזן פקודת SQL כאן (לדוגמה: SELECT * FROM users)" style="border:none; border-radius:0;"></textarea>
                        <div style="background: #0f172a; padding: 10px 15px; display: flex; justify-content: flex-end; border-top: 1px solid #1e293b;">
                            <button type="submit" id="btn-run-sql" class="btn-pro-primary" style="padding: 8px 25px; background: #10b981; box-shadow: none;"><i class="fa-solid fa-play"></i> הרץ שאילתה</button>
                        </div>
                    </form>
                </div>
                <div id="sql_error_container" class="alert-box error" style="display: none; direction: ltr; text-align: left;"></div>
                <div id="sql_meta_container" style="margin-bottom: 15px; font-size: 0.9rem;"></div>
                <div class="table-wrapper smart-card" style="overflow: visible; flex:1;" id="sql_results_container">
                    <div class="empty-state" style="padding: 40px;">תוצאות המסד יוצגו כאן.</div>
                </div>
            </div>
        ` 
    }
];

function openSmartAdminModal() {
    const user = state.currentUser;
    if (!user) return;
    const permsArray = (user.adminPermissions || '').split(',').map(p => p.trim());
    const hasAll = permsArray.includes('all');

    const allowedModules = SMART_ADMIN_MODULES.filter(module => hasAll || permsArray.includes(module.id));

    if (allowedModules.length === 0) {
        showToast('הגישה נדחתה: אין לך הרשאות למודולים בפאנל החכם.', 'error');
        return;
    }

    renderSmartAdminMenu(allowedModules);
    document.getElementById('smartAdminModal').classList.add('active');
    
    // פתיחת המודול הראשון כברירת מחדל
    const firstModule = allowedModules[0];
    switchSmartAdminTab(firstModule.id, firstModule.title);
}

function renderSmartAdminMenu(allowedModules) {
    const menuContainer = document.getElementById('smart-admin-menu-container');
    const contentContainer = document.getElementById('smart-admin-content-container');
    menuContainer.innerHTML = ''; contentContainer.innerHTML = '';

    allowedModules.forEach(module => {
        const btn = document.createElement('button');
        btn.className = 'smart-admin-tab-btn'; btn.id = `smart-tab-btn-${module.id}`;
        btn.innerHTML = `<i class="fa-solid ${module.icon}"></i> <span>${module.title}</span>`;
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

    // חיווט חכם להפעלת הלוגיקה של כל טאב בנפרד תוך עקיפת בעיית הטוקן
    if (moduleId === 'manage_users' && typeof window.loadAdminUsers === 'function') {
        // עקיפה זמנית עבור loadAdminUsers - הגדרת adminToken שווה ל-userToken
        const originalToken = state.adminToken;
        state.adminToken = state.userToken;
        window.loadAdminUsers().finally(() => { state.adminToken = originalToken; });
    } 
    else if (moduleId === 'manage_names' && window.smartYemotNamesList.length === 0) {
        window.loadSmartYemotNames();
    } 
    else if (moduleId === 'manage_chat') {
        window.loadSmartChatConversations();
    } 
    else if (moduleId === 'manage_ads' && typeof window.loadAdminAds === 'function') {
        const originalToken = state.adminToken;
        state.adminToken = state.userToken;
        window.loadAdminAds().finally(() => { state.adminToken = originalToken; });
    } 
    else if (moduleId === 'manage_system' && typeof window.loadSqlTables === 'function') {
        const originalToken = state.adminToken;
        state.adminToken = state.userToken;
        window.loadSqlTables().finally(() => { state.adminToken = originalToken; });
    }
}

// דריסה (Override) לפונקציות קיימות שיפתחו מעל הפאנל החכם
const originalOpenUserProfile = window.openUserProfile;
if (originalOpenUserProfile) {
    window.openUserProfile = async function(phone) {
        const originalToken = state.adminToken;
        state.adminToken = state.userToken; // מעביר את הטוקן למשיכת הפרופיל
        await originalOpenUserProfile(phone);
        state.adminToken = originalToken;
        elevateSubModal('adminUserProfileModal');
    };
}

const originalOpenAdminCreateUserModal = window.openAdminCreateUserModal;
if (originalOpenAdminCreateUserModal) {
    window.openAdminCreateUserModal = function(phone) {
        originalOpenAdminCreateUserModal(phone);
        elevateSubModal('adminCreateUserModal');
    };
}

function closeSmartAdminModal() { 
    document.getElementById('smartAdminModal').classList.remove('active'); 
}
