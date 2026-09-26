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
        .smart-admin-modal .modal-content { max-width: 1100px; width: 98%; height: 90vh; max-height: 900px; display: flex; flex-direction: row; padding: 0; background: #f8fafc; overflow: hidden; border-radius: 16px; }
        .smart-admin-sidebar { width: 250px; background: #0f172a; color: white; display: flex; flex-direction: column; flex-shrink: 0; }
        .smart-admin-header { padding: 20px; border-bottom: 1px solid #1e293b; }
        .smart-admin-header h2 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #f8fafc; }
        .smart-admin-header p { margin: 5px 0 0; font-size: 0.8rem; color: #94a3b8; }
        .smart-admin-menu { flex: 1; overflow-y: auto; padding: 15px 0; }
        .smart-admin-tab-btn { width: 100%; text-align: right; background: none; border: none; outline: none; color: #cbd5e1; padding: 12px 20px; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 12px; border-right: 4px solid transparent; }
        .smart-admin-tab-btn:hover { background: #1e293b; color: white; }
        .smart-admin-tab-btn.active { background: #1e293b; color: var(--secondary); border-right-color: var(--secondary); font-weight: bold; }
        .smart-admin-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #f8fafc; position: relative; }
        .smart-admin-top { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; background: white; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;}
        .smart-admin-top h3 { margin: 0; font-size: 1.2rem; color: #1e293b; font-weight:800; }
        .smart-admin-content { flex: 1; overflow: hidden; padding: 20px; display: flex; flex-direction: column; }
        
        .smart-admin-panel { display: none; height: 100%; animation: fadeIn 0.3s ease; }
        .smart-admin-panel.active { display: flex; flex-direction: column; }
        
        .compact-table th, .compact-table td { padding: 8px 12px !important; }
        .compact-input { padding: 6px 10px !important; font-size: 0.9rem !important; }
        
        .placeholder-card { background: white; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 40px; text-align: center; color: #64748b; margin: auto; width: 100%; max-width: 500px;}
        .placeholder-card i { font-size: 3rem; color: #cbd5e1; margin-bottom: 15px; }

        @media (max-width: 768px) {
            .smart-admin-modal .modal-content { flex-direction: column; }
            .smart-admin-sidebar { width: 100%; height: auto; }
            .smart-admin-menu { display: flex; overflow-x: auto; padding: 0; }
            .smart-admin-tab-btn { white-space: nowrap; border-right: none; border-bottom: 3px solid transparent; justify-content: center; }
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
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מושך נתונים...';
        btn.disabled = true;
    }
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> מסנכרן שמות מול ימות המשיח...</td></tr>';

    try {
        const res = await fetch(`${API_BASE_URL}/admin/yemot-names`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken })
        });
        const data = await res.json();
        
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> רענן נתונים';
            btn.disabled = false;
        }

        if (res.ok && data.success) {
            window.smartYemotNamesList = data.list;
            window.smartIsMainAdmin = data.isMainAdmin;
            renderSmartYemotNames();
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color:var(--danger);">${data.error || 'שגיאה'}</td></tr>`;
        }
    } catch (err) {
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> רענן נתונים';
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
    const statsContainer = document.getElementById('smart_names_stats');
    
    let missingNamesCount = 0;

    const filtered = window.smartYemotNamesList.filter(u => {
        if (!u.name || u.name.trim() === '') missingNamesCount++;
        return u.phone.includes(searchVal) || (u.name && u.name.toLowerCase().includes(searchVal));
    });

    if (statsContainer) {
        statsContainer.innerHTML = `
            <span style="color: var(--text-light);">סה"כ מנויים: <span style="color: var(--text-dark);">${window.smartYemotNamesList.length}</span></span>
            <span style="color: #b91c1c; background: #fee2e2; padding: 4px 10px; border-radius: 12px; border: 1px solid #fca5a5;">
                <i class="fa-solid fa-triangle-exclamation"></i> ללא שם: ${missingNamesCount}
            </span>
        `;
    }

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">לא נמצאו מנויים התואמים לחיפוש.</td></tr>';
        return;
    }

    filtered.forEach(u => {
        const isLocked = u.isProtected && !window.smartIsMainAdmin;
        
        const statusBadge = u.active 
            ? '<span class="status-ok" style="font-size:0.8rem; padding: 2px 6px;">פעיל</span>' 
            : '<span class="status-bad" style="font-size:0.8rem; padding: 2px 6px;">חסום</span>';
        
        const safeName = u.name.replace(/"/g, '&quot;');
        
        let inputHtml = '';
        let btnHtml = '';

        if (isLocked) {
            inputHtml = `<div style="padding: 6px 10px; color: #94a3b8; font-weight: 600; font-size: 0.9rem;">${safeName || 'ללא שם'}</div>`;
            btnHtml = ``; 
        } else {
            const noNameStyle = !safeName ? 'border-color: #fca5a5; background: #fff5f5;' : '';
            inputHtml = `<input type="text" id="name_input_${u.phone}" class="input-modern compact-input" value="${safeName}" placeholder="ללא שם..." onkeypress="if(event.key === 'Enter') saveInlineSmartName('${u.phone}')" style="${noNameStyle}">`;
            btnHtml = `<button id="btn_save_name_${u.phone}" class="actions-btn" onclick="saveInlineSmartName('${u.phone}')" style="background:#f0fdf4; color:#15803d; border-color:#bbf7d0; padding: 4px 12px; font-size: 0.8rem;"><i class="fa-solid fa-check"></i></button>`;
        }

        const tr = document.createElement('tr');
        if (isLocked) tr.style.backgroundColor = '#f8fafc'; 
        
        tr.innerHTML = `
            <td dir="ltr" style="font-weight:bold; text-align:right; font-size: 0.9rem; color: ${isLocked ? '#94a3b8' : 'inherit'};">${u.phone}</td>
            <td>${statusBadge}</td>
            <td style="min-width: 220px;">${inputHtml}</td>
            <td style="text-align: left;">${btnHtml}</td>
        `;
        tbody.appendChild(tr);
    });
};

window.saveInlineSmartName = async function(phone) {
    const input = document.getElementById(`name_input_${phone}`);
    const btn = document.getElementById(`btn_save_name_${phone}`);
    if (!input || !btn) return;
    
    const newName = input.value.trim();
    const user = window.smartYemotNamesList.find(u => u.phone === phone);

    if (user && user.name === newName) {
        showToast('לא בוצע שינוי בטקסט', 'info');
        return;
    }
    
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
            showToast(`השם נשמר: ${newName || 'ללא שם'}`, 'success');
            if (user) user.name = newName;
            
            input.style.backgroundColor = '#dcfce7';
            input.style.borderColor = '#bbf7d0';
            setTimeout(() => { 
                input.style.backgroundColor = ''; 
                input.style.borderColor = ''; 
                if (!newName) { 
                    input.style.backgroundColor = '#fff5f5';
                    input.style.borderColor = '#fca5a5';
                }
            }, 1000);

            renderSmartYemotNames();
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
        title: 'ספר טלפונים',
        html: `
            <div class="clean-settings-card" style="display: flex; flex-direction: column; height: 100%; border:none; box-shadow: none; margin: 0; overflow: hidden;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="display: flex; gap: 15px; flex: 1;">
                        <input type="text" id="smart_names_search" class="input-modern compact-input" placeholder="חפש לפי טלפון או שם..." onkeyup="filterSmartYemotNames()" style="max-width: 300px;">
                    </div>
                    <div id="smart_names_stats" style="font-size: 0.9rem; font-weight: 600; display: flex; gap: 15px; align-items: center; margin-left: 15px;">
                        <!-- נתונים יוזרקו לכאן -->
                    </div>
                    <button onclick="loadSmartYemotNames()" id="btn_refresh_yemot_names" class="btn-primary small-btn" style="width: auto; background: var(--secondary); padding: 8px 15px; font-size: 0.9rem;"><i class="fa-solid fa-rotate-right"></i> רענן</button>
                </div>

                <div class="table-wrapper" style="flex: 1; overflow-y: auto; margin-bottom: 0; border-radius: 8px;">
                    <table class="modern-table compact-table">
                        <thead style="position: sticky; top: 0; z-index: 10; background: var(--header-bg); box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <tr>
                                <th style="width: 140px;">טלפון מנוי</th>
                                <th style="width: 80px;">צינתוקים</th>
                                <th>שם משתמש (ניתן לעריכה ישירה)</th>
                                <th style="width: 80px; text-align: left;">שמירה</th>
                            </tr>
                        </thead>
                        <tbody id="smart_yemot_names_tbody">
                            <tr><td colspan="4" class="empty-state">יש ללחוץ על "רענן נתונים" כדי להציג את הרשימה</td></tr>
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

    if (moduleId === 'manage_names' && window.smartYemotNamesList.length === 0) {
        loadSmartYemotNames();
    }
}

function closeSmartAdminModal() { document.getElementById('smartAdminModal').classList.remove('active'); }
