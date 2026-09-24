// client-smart-admin.js

document.addEventListener('DOMContentLoaded', () => {
    injectSmartAdminStyles();
    injectSmartAdminModals();
    
    // מאזין להתחברות לקוח רגיל כדי להוסיף כפתור ניהול
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
        .smart-admin-modal .modal-content { max-width: 1100px; width: 95%; height: 85vh; max-height: 850px; display: flex; flex-direction: row; padding: 0; background: #f8fafc; overflow: hidden; border-radius: 16px; }
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
        .smart-admin-content { flex: 1; overflow-y: auto; padding: 20px; }
        .smart-admin-panel { display: none; animation: fadeIn 0.3s ease; }
        .smart-admin-panel.active { display: block; }
        
        .smart-user-table-wrap { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .smart-table { width: 100%; border-collapse: collapse; text-align: right; }
        .smart-table th { background: #f1f5f9; padding: 12px 15px; font-size: 0.85rem; color: #475569; border-bottom: 2px solid #e2e8f0; }
        .smart-table td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem; vertical-align: middle; }
        .smart-table tr:hover { background: #f8fafc; }
        
        .badge-yemot { padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; display: inline-flex; align-items: center; gap: 5px; }
        .badge-yemot.active { background: #dcfce7; color: #15803d; }
        .badge-yemot.inactive { background: #fee2e2; color: #b91c1c; }
        
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

function injectSmartAdminModals() {
    const html = `
        <div class="modal-overlay smart-admin-modal" id="smartAdminModal">
            <div class="modal-content">
                <div class="smart-admin-sidebar">
                    <div class="smart-admin-header"><h2><i class="fa-solid fa-bolt"></i> פאנל ניהול חכם</h2><p>גישת מנהל משנה</p></div>
                    <div class="smart-admin-menu" id="smart-admin-menu-container"></div>
                </div>
                <div class="smart-admin-main">
                    <div class="smart-admin-top">
                        <h3 id="smart-admin-current-title">טוען...</h3>
                        <button class="close-modal-btn" onclick="closeSmartAdmin()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="smart-admin-content" id="smart-admin-content-container"></div>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="smartUserEditModal">
            <div class="modal-content professional-modal" style="max-width: 450px; display: flex; flex-direction: column; max-height: 85vh;">
                <div class="modal-header">
                    <h2 id="smart_edit_title"><i class="fa-solid fa-user-pen"></i> עריכת משתמש</h2>
                    <button class="close-modal-btn" onclick="document.getElementById('smartUserEditModal').classList.remove('active')" type="button"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div style="padding: 20px; overflow-y: auto;">
                    <div id="smart_protected_banner" style="display:none; background:#fee2e2; color:#b91c1c; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.9rem; font-weight:bold; text-align:center;">
                        <i class="fa-solid fa-lock"></i> משתמש זה מוגן. אין לך הרשאה לערוך אותו.
                    </div>
                    <form onsubmit="submitSmartUserEdit(event)" id="smart_edit_form">
                        <input type="hidden" id="smart_inp_original_phone">
                        <input type="hidden" id="smart_inp_is_new" value="0">
                        
                        <div class="form-group">
                            <label>מספר טלפון (מזהה)</label>
                            <input type="text" id="smart_inp_phone" required class="input-modern ltr-input">
                        </div>
                        <div class="form-group">
                            <label>שם המנוי (יוקרא בימות המשיח!)</label>
                            <input type="text" id="smart_inp_name" required class="input-modern" placeholder="למשל: ישראל ישראלי">
                        </div>
                        <div class="form-group">
                            <label>כתובת אימייל (אופציונלי לחשבון האתר)</label>
                            <input type="email" id="smart_inp_email" class="input-modern ltr-input">
                        </div>
                        <div class="form-group">
                            <label>סיסמה לחשבון האתר (השאר ריק ללא שינוי)</label>
                            <input type="password" id="smart_inp_password" class="input-modern center-text ltr-input" placeholder="****">
                        </div>
                        
                        <h4 style="margin:20px 0 10px; color:var(--text-dark);">הרשאות באתר</h4>
                        <div class="clean-settings-card" style="padding:15px;">
                            <label style="display:flex; justify-content:space-between; margin-bottom:10px; cursor:pointer;">
                                <span>הרשאת האזנה</span> <input type="checkbox" id="smart_inp_listen" style="width:18px;height:18px;">
                            </label>
                            <label style="display:flex; justify-content:space-between; margin-bottom:10px; cursor:pointer;">
                                <span>הרשאת הקלטה</span> <input type="checkbox" id="smart_inp_record" style="width:18px;height:18px;">
                            </label>
                            <label style="display:flex; justify-content:space-between; margin-bottom:10px; cursor:pointer;">
                                <span>הרשאת העלאה</span> <input type="checkbox" id="smart_inp_upload" style="width:18px;height:18px;">
                            </label>
                            <label style="display:flex; justify-content:space-between; margin-bottom:0; cursor:pointer;">
                                <span>הרשאת צינתוק</span> <input type="checkbox" id="smart_inp_tzintuk" style="width:18px;height:18px;">
                            </label>
                        </div>
                        
                        <div style="display:flex; gap:10px; margin-top:20px;">
                            <button type="submit" id="btn_smart_save_user" class="btn-pro-primary" style="flex:1;"><i class="fa-solid fa-save"></i> שמור משתמש</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);
}

function setupSmartAdminAccess() {
    const user = state.currentUser;
    if (!user || !user.isAdmin) return; 
    const sidebarActions = document.querySelector('#user-dash-view .sidebar-actions');
    if (!sidebarActions || document.getElementById('btn-open-smart-admin')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-open-smart-admin';
    btn.title = 'פתח פאנל ניהול חכם';
    btn.innerHTML = '<i class="fa-solid fa-user-shield" style="color: var(--secondary);"></i>';
    btn.onclick = openSmartAdmin;
    sidebarActions.insertBefore(btn, sidebarActions.querySelector('.logout-btn') || null);
}

const SMART_MODULES = [
    {
        id: 'manage_users', icon: 'fa-users', title: 'ניהול וספר טלפונים',
        html: `
            <div style="display:flex; justify-content:space-between; gap:15px; margin-bottom:20px; flex-wrap:wrap;">
                <input type="text" id="smart_users_search" class="input-modern" placeholder="חיפוש לפי שם או טלפון..." onkeyup="renderSmartUsers()" style="max-width:300px; padding:10px 15px;">
                <button class="btn-pro-primary" onclick="openSmartAddUser()" style="width:auto; padding:10px 20px;"><i class="fa-solid fa-user-plus"></i> הוסף משתמש</button>
            </div>
            <div class="smart-user-table-wrap">
                <table class="smart-table">
                    <thead><tr><th>שם המנוי</th><th>מספר טלפון</th><th>רשימת תפוצה (ימות)</th><th>חשבון באתר</th><th>פעולות</th></tr></thead>
                    <tbody id="smart_users_tbody"><tr><td colspan="5" style="text-align:center;"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען נתונים...</td></tr></tbody>
                </table>
            </div>
        `
    },
    { id: 'manage_chat', icon: 'fa-headset', title: 'תמיכה בצ\'אט', html: `<div class="placeholder-card"><i class="fa-solid fa-comments"></i><h3>מערכת פניות</h3><p>כאן יוצג ממשק הצ'אט בעתיד.</p></div>` },
    { id: 'manage_ads', icon: 'fa-bullhorn', title: 'מודעות', html: `<div class="placeholder-card"><i class="fa-solid fa-rectangle-ad"></i><h3>סטודיו המודעות</h3></div>` }
];

window.smartUsersList = [];

function openSmartAdmin() {
    const user = state.currentUser;
    const perms = (user.adminPermissions || '').split(',').map(p=>p.trim());
    const hasAll = perms.includes('all');
    
    const allowed = SMART_MODULES.filter(m => hasAll || perms.includes(m.id));
    if (allowed.length === 0) { showToast('אין לך מודולים מורשים', 'error'); return; }

    const menu = document.getElementById('smart-admin-menu-container');
    const content = document.getElementById('smart-admin-content-container');
    menu.innerHTML = ''; content.innerHTML = '';

    allowed.forEach(m => {
        const btn = document.createElement('button');
        btn.className = 'smart-admin-tab-btn'; btn.id = `smart-btn-${m.id}`;
        btn.innerHTML = `<i class="fa-solid ${m.icon}"></i> ${m.title}`;
        btn.onclick = () => {
            document.querySelectorAll('.smart-admin-tab-btn, .smart-admin-panel').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`smart-panel-${m.id}`).classList.add('active');
            document.getElementById('smart-admin-current-title').innerText = m.title;
            if (m.id === 'manage_users') loadSmartUsers();
        };
        menu.appendChild(btn);

        const panel = document.createElement('div');
        panel.className = 'smart-admin-panel'; panel.id = `smart-panel-${m.id}`;
        panel.innerHTML = m.html;
        content.appendChild(panel);
    });

    document.getElementById('smartAdminModal').classList.add('active');
    menu.firstChild.click();
}

function closeSmartAdmin() { document.getElementById('smartAdminModal').classList.remove('active'); }

async function loadSmartUsers() {
    const tbody = document.getElementById('smart_users_tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><i class="fa-solid fa-circle-notch fa-spin"></i> מושך נתונים...</td></tr>';
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userToken: state.userToken }) });
        const data = await res.json();
        if (res.ok && data.success) {
            window.smartUsersList = data.users;
            renderSmartUsers();
        } else { tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">${data.error}</td></tr>`; }
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">שגיאת תקשורת</td></tr>'; }
}

window.renderSmartUsers = function() {
    const tbody = document.getElementById('smart_users_tbody');
    const search = (document.getElementById('smart_users_search').value || '').toLowerCase();
    
    tbody.innerHTML = '';
    const filtered = window.smartUsersList.filter(u => u.phone.includes(search) || (u.name && u.name.toLowerCase().includes(search)));
    
    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">לא נמצאו משתמשים</td></tr>'; return; }

    filtered.forEach(u => {
        const yemotBadge = u.yemotActive ? `<span class="badge-yemot active"><i class="fa-solid fa-check"></i> מורשה בימות</span>` : `<span class="badge-yemot inactive"><i class="fa-solid fa-xmark"></i> לא מורשה</span>`;
        const webAcc = u.hasWebAccount ? `<i class="fa-solid fa-check-circle" style="color:var(--play-out);"></i> קיים` : `<span style="color:var(--text-light);">אין חשבון</span>`;
        
        let editBtn = `<button class="actions-btn" onclick="openSmartEditUser('${u.phone}')"><i class="fa-solid fa-pen"></i> עריכה</button>`;
        if (u.isProtected && !state.adminToken) {
            editBtn = `<button class="actions-btn" disabled style="opacity:0.5; cursor:not-allowed;" title="משתמש מוגן"><i class="fa-solid fa-lock"></i> מוגן</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold;">${u.name}</td>
            <td dir="ltr" style="text-align:right;">${u.phone}</td>
            <td>${yemotBadge}</td>
            <td>${webAcc}</td>
            <td>${editBtn}</td>
        `;
        tbody.appendChild(tr);
    });
};

window.openSmartAddUser = function() {
    document.getElementById('smart_inp_is_new').value = "1";
    document.getElementById('smart_inp_original_phone').value = "";
    document.getElementById('smart_inp_phone').value = "";
    document.getElementById('smart_inp_phone').readOnly = false;
    document.getElementById('smart_inp_name').value = "";
    document.getElementById('smart_inp_email').value = "";
    document.getElementById('smart_inp_password').required = true;
    
    document.getElementById('smart_inp_listen').checked = true;
    document.getElementById('smart_inp_record').checked = true;
    document.getElementById('smart_inp_upload').checked = false;
    document.getElementById('smart_inp_tzintuk').checked = true;

    document.getElementById('smart_protected_banner').style.display = 'none';
    document.getElementById('btn_smart_save_user').disabled = false;
    
    document.getElementById('smart_edit_title').innerHTML = '<i class="fa-solid fa-user-plus"></i> הוספת משתמש חדש';
    document.getElementById('smartUserEditModal').classList.add('active');
};

window.openSmartEditUser = function(phone) {
    const user = window.smartUsersList.find(u => u.phone === phone);
    if (!user) return;

    document.getElementById('smart_inp_is_new').value = "0";
    document.getElementById('smart_inp_original_phone').value = phone;
    document.getElementById('smart_inp_phone').value = phone;
    document.getElementById('smart_inp_phone').readOnly = true; 
    document.getElementById('smart_inp_name').value = user.name === "לא הוגדר (בימות)" ? "" : user.name;
    document.getElementById('smart_inp_email').value = user.email || "";
    document.getElementById('smart_inp_password').required = false; 
    
    document.getElementById('smart_inp_listen').checked = user.canListen !== false;
    document.getElementById('smart_inp_record').checked = user.canRecord === true;
    document.getElementById('smart_inp_upload').checked = user.canUpload === true;
    document.getElementById('smart_inp_tzintuk').checked = user.canTzintuk === true;

    const isProtected = user.isProtected && !state.adminToken;
    document.getElementById('smart_protected_banner').style.display = isProtected ? 'block' : 'none';
    document.getElementById('btn_smart_save_user').disabled = isProtected;

    document.getElementById('smart_edit_title').innerHTML = '<i class="fa-solid fa-user-pen"></i> עריכת משתמש';
    document.getElementById('smartUserEditModal').classList.add('active');
};

window.submitSmartUserEdit = async function(e) {
    e.preventDefault();
    const isNew = document.getElementById('smart_inp_is_new').value === "1";
    const phone = document.getElementById('smart_inp_phone').value.trim();
    const name = document.getElementById('smart_inp_name').value.trim();
    const email = document.getElementById('smart_inp_email').value.trim();
    const password = document.getElementById('smart_inp_password').value;

    const btn = document.getElementById('btn_smart_save_user');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> שומר...'; btn.disabled = true;

    try {
        let successCount = 0;
        let errMsg = '';

        // 1. עדכון השם בימות המשיח (עבור הוספה או עריכה)
        const nameRes = await fetch(`${API_BASE_URL}/admin/update-yemot-name`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ userToken: state.userToken, phone: phone, newName: name })
        });
        const nameData = await nameRes.json();
        if (nameRes.ok && nameData.success) successCount++;
        else errMsg += "שגיאה בעדכון השם בימות. ";

        // 2. שמירת הנתונים במסד האתר
        const userPayload = {
            userToken: state.userToken, phone: phone, email: email,
            canListen: document.getElementById('smart_inp_listen').checked,
            canRecord: document.getElementById('smart_inp_record').checked,
            canUpload: document.getElementById('smart_inp_upload').checked,
            canTzintuk: document.getElementById('smart_inp_tzintuk').checked,
            receiveEmails: true 
        };
        if (password) userPayload.password = password;
        if (isNew) userPayload.newPassword = password; // Compatibility for create API

        const endpoint = isNew ? '/admin/create-user' : '/admin/update-user';
        const webRes = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(userPayload)
        });
        const webData = await webRes.json();
        
        if (webRes.ok && webData.success) successCount++;
        else errMsg += webData.error || "שגיאה במסד הנתונים.";

        if (successCount > 0) {
            showToast('הנתונים נשמרו בהצלחה', 'success');
            document.getElementById('smartUserEditModal').classList.remove('active');
            loadSmartUsers();
        } else {
            showToast(errMsg, 'error');
        }
    } catch(err) { showToast('שגיאת תקשורת מול השרת', 'error'); }
    finally { btn.innerHTML = '<i class="fa-solid fa-save"></i> שמור משתמש'; btn.disabled = false; }
};
