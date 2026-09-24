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

// מערכת טבלת השמות החדשה (Inline Editing)
window.smartYemotNamesList = [];
window.smartIsMainAdmin = false;

window.loadSmartYemotNames = async function() {
    const btn = document.getElementById('btn_refresh_yemot_names');
    const tbody = document.getElementById('smart_yemot_names_tbody');
    
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> טוען...';
        btn.disabled = true;
    }
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> מושך נתונים מימות המשיח...</td></tr>';

    try {
        const res = await fetch(`${API_BASE_URL}/admin/yemot-names`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken })
        });
        const data = await res.json();
        
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> טען משתמשים';
            btn.disabled = false;
        }

        if (res.ok && data.success) {
            window.smartYemotNamesList = data.list;
            window.smartIsMainAdmin = data.isMainAdmin;
            renderSmartYemotNames();
            showToast('הרשימה המלאה נטענה בהצלחה', 'success');
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color:var(--danger);">${data.error || 'שגיאה'}</td></tr>`;
        }
    } catch (err) {
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> טען משתמשים';
            btn.disabled = false;
        }
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="color:var(--danger);">שגיאת תקשורת מול השרת</td></tr>';
    }
};

window.filterSmartYemotNames = function() {
    renderSmartYemotNames();
};

window.renderSmartYemotNames = function() {
    const tbody = document.getElementById('smart_yemot_names_tbody');
    const searchVal = document.getElementById('smart_names_search').value.toLowerCase();
    
    const filtered = window.smartYemotNamesList.filter(u => 
        u.phone.includes(searchVal) || (u.name && u.name.toLowerCase().includes(searchVal))
    );

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">לא נמצאו מנויים התואמים לחיפוש.</td></tr>';
        return;
    }

    filtered.forEach(u => {
        const isLocked = u.isProtected && !window.smartIsMainAdmin;
        const statusBadge = u.active 
            ? '<span class="status-ok" style="font-size:0.85rem;">פעיל</span>' 
            : '<span class="status-bad" style="font-size:0.85rem;">חסום</span>';
        
        const safeName = u.name.replace(/"/g, '&quot;');
        
        const inputHtml = isLocked
            ? `<input type="text" class="input-modern" value="${safeName}" disabled style="background:#f1f5f9; cursor:not-allowed;" title="משתמש מוגן מעריכה">`
            : `<input type="text" id="name_input_${u.phone}" class="input-modern" value="${safeName}" placeholder="ללא שם" onkeypress="if(event.key === 'Enter') saveInlineSmartName('${u.phone}')">`;
        
        const btnHtml = isLocked
            ? `<button class="actions-btn" disabled style="opacity:0.5; cursor:not-allowed;"><i class="fa-solid fa-lock"></i> מוגן</button>`
            : `<button id="btn_save_name_${u.phone}" class="actions-btn" onclick="saveInlineSmartName('${u.phone}')" style="background:#f0fdf4; color:#15803d; border-color:#bbf7d0;"><i class="fa-solid fa-check"></i> שמור</button>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td dir="ltr" style="font-weight:bold; text-align:right;">${u.phone}</td>
            <td>${statusBadge}</td>
            <td style="min-width: 200px;">${inputHtml}</td>
            <td>${btnHtml}</td>
        `;
        tbody.appendChild(tr);
    });
};

window.saveInlineSmartName = async function(phone) {
    const input = document.getElementById(`name_input_${phone}`);
    const btn = document.getElementById(`btn_save_name_${phone}`);
    if (!input || !btn) return;
    
    const newName = input.value.trim();
    
    const originalBtnHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/update-yemot-name`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken, phone: phone, newName: newName })
        });
        const data = await res.json();
        
        btn.innerHTML = originalBtnHtml;
        btn.disabled = false;

        if (res.ok && data.success) {
            showToast(`השם עודכן ל-${newName || 'ריק'}`, 'success');
            const user = window.smartYemotNamesList.find(u => u.phone === phone);
            if (user) user.name = newName;
            
            // אפקט חזותי להצלחה
            input.style.backgroundColor = '#dcfce7';
            setTimeout(() => { input.style.backgroundColor = ''; }, 1000);
        } else {
            showToast(data.error || 'שגיאה בעדכון השם', 'error');
        }
    } catch (err) {
        btn.innerHTML = originalBtnHtml;
        btn.disabled = false;
        showToast('שגיאת תקשורת', 'error');
    }
};

const SMART_ADMIN_MODULES = [
    { id: 'manage_users', icon: 'fa-users', title: 'ניהול משתמשים', html: `<div class="placeholder-card"><i class="fa-solid fa-users-gear"></i><h3>טבלת משתמשים</h3><p>לחץ כדי לנהל את המשתמשים במערכת</p></div>` },
    {
        id: 'manage_names',
        icon: 'fa-address-book',
        title: 'ספר טלפונים (מנויים)',
        html: `
            <div class="clean-settings-card" style="padding: 25px; border:none; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color:var(--text-dark); font-weight:800;"><i class="fa-solid fa-address-book"></i> ספר טלפונים - רשימת "members"</h3>
                    <button onclick="loadSmartYemotNames()" id="btn_refresh_yemot_names" class="btn-primary small-btn" style="width: auto; background: var(--secondary);"><i class="fa-solid fa-rotate-right"></i> טען רשימה</button>
                </div>
                
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; line-height: 1.5;">
                    <i class="fa-solid fa-circle-info" style="color: #3b82f6;"></i> <strong>שים לב:</strong> כאן מוצגים כלל המנויים הרשומים במערכת הטלפונית. ניתן לחפש מנוי ולעדכן את שמו בקלות (לחץ אנטר בתוך השדה או על כפתור השמירה). מנויים מוגנים מסומנים ולא יאפשרו עריכה.
                </div>

                <div style="margin-bottom: 15px;">
                    <input type="text" id="smart_names_search" class="input-modern" placeholder="חפש לפי מספר טלפון או שם..." onkeyup="filterSmartYemotNames()" style="max-width: 400px;">
                </div>

                <div class="table-wrapper" style="max-height: 50vh; overflow-y: auto;">
                    <table class="modern-table">
                        <thead style="position: sticky; top: 0; z-index: 10; background: var(--header-bg); box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <tr>
                                <th>מספר טלפון</th>
                                <th>סטטוס צינתוקים</th>
                                <th>שם מנוי (ניתן לעריכה)</th>
                                <th>פעולה</th>
                            </tr>
                        </thead>
                        <tbody id="smart_yemot_names_tbody">
                            <tr><td colspan="4" class="empty-state">יש ללחוץ על "טען רשימה" להצגת הנתונים</td></tr>
                        </tbody>
                    </table>
                </div>
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
    
    // פתיחת המודול הראשון האפשרי והפעלת פונקציית טעינה אם קיימת
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

    // טעינה אוטומטית אם נכנסים למסך השמות והוא טרם נטען
    if (moduleId === 'manage_names' && window.smartYemotNamesList.length === 0) {
        loadSmartYemotNames();
    }
}

function closeSmartAdminModal() { document.getElementById('smartAdminModal').classList.remove('active'); }
