// client-smart-admin.js

document.addEventListener('DOMContentLoaded', () => {
    injectSmartAdminStyles();
    injectSmartAdminModal();
    
    // אנו עוטפים את פונקציית עדכון הממשק הקיימת מבלי לדרוס אותה
    // כך שכאשר משתמש מתחבר, נבדוק את ההרשאות שלו ונוסיף את הכפתור במידת הצורך
    if (typeof window.updateDashboardUI === 'function') {
        const originalUpdateDashboardUI = window.updateDashboardUI;
        window.updateDashboardUI = function() {
            originalUpdateDashboardUI(); // מריץ את הקוד המקורי
            setupSmartAdminAccess();     // מריץ את התוספת שלנו
        };
    }
});

function injectSmartAdminStyles() {
    const styles = document.createElement('style');
    styles.innerHTML = `
        .smart-admin-modal .modal-content {
            max-width: 1000px; width: 95%; height: 85vh; max-height: 800px;
            display: flex; flex-direction: row; padding: 0; background: #f8fafc;
            overflow: hidden; border-radius: 16px;
        }
        .smart-admin-sidebar {
            width: 250px; background: #0f172a; color: white; display: flex;
            flex-direction: column; flex-shrink: 0;
        }
        .smart-admin-header {
            padding: 20px; border-bottom: 1px solid #1e293b;
        }
        .smart-admin-header h2 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #f8fafc; }
        .smart-admin-header p { margin: 5px 0 0; font-size: 0.8rem; color: #94a3b8; }
        
        .smart-admin-menu { flex: 1; overflow-y: auto; padding: 15px 0; }
        .smart-admin-tab-btn {
            width: 100%; text-align: right; background: none; border: none; outline: none;
            color: #cbd5e1; padding: 12px 20px; font-size: 0.95rem; cursor: pointer;
            transition: 0.2s; display: flex; align-items: center; gap: 12px;
            border-right: 4px solid transparent;
        }
        .smart-admin-tab-btn:hover { background: #1e293b; color: white; }
        .smart-admin-tab-btn.active {
            background: #1e293b; color: var(--secondary);
            border-right-color: var(--secondary); font-weight: bold;
        }
        
        .smart-admin-main {
            flex: 1; display: flex; flex-direction: column; overflow: hidden;
            background: #f8fafc; position: relative;
        }
        .smart-admin-top {
            display: flex; justify-content: space-between; align-items: center;
            padding: 15px 25px; background: white; border-bottom: 1px solid #e2e8f0;
        }
        .smart-admin-top h3 { margin: 0; font-size: 1.2rem; color: #1e293b; }
        
        .smart-admin-content {
            flex: 1; overflow-y: auto; padding: 25px;
        }
        .smart-admin-panel { display: none; animation: fadeIn 0.3s ease; }
        .smart-admin-panel.active { display: block; }
        
        .placeholder-card {
            background: white; border: 1px dashed #cbd5e1; border-radius: 12px;
            padding: 40px; text-align: center; color: #64748b;
        }
        .placeholder-card i { font-size: 3rem; color: #cbd5e1; margin-bottom: 15px; }
    `;
    document.head.appendChild(styles);
}

function injectSmartAdminModal() {
    const modalHtml = `
        <div class="modal-overlay smart-admin-modal" id="smartAdminModal">
            <div class="modal-content professional-modal">
                <div class="smart-admin-sidebar">
                    <div class="smart-admin-header">
                        <h2><i class="fa-solid fa-bolt"></i> פאנל חכם</h2>
                        <p>מותאם אישית להרשאות שלך</p>
                    </div>
                    <div class="smart-admin-menu" id="smart-admin-menu-container">
                        <!-- התפריט ייווצר כאן דינמית -->
                    </div>
                </div>
                <div class="smart-admin-main">
                    <div class="smart-admin-top">
                        <h3 id="smart-admin-current-title">טוען...</h3>
                        <button class="close-modal-btn" onclick="closeSmartAdminModal()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="smart-admin-content" id="smart-admin-content-container">
                        <!-- התוכן ייווצר כאן דינמית -->
                    </div>
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
    if (!user || !user.isAdmin) return; // רק אם הוא מנהל

    // חיפוש אזור הפעולות בסיידבר של המשתמש
    const sidebarActions = document.querySelector('#user-dash-view .sidebar-actions');
    if (!sidebarActions) return;

    // נוודא שלא נוסיף כפתור פעמיים
    if (!document.getElementById('btn-open-smart-admin')) {
        const adminBtn = document.createElement('button');
        adminBtn.id = 'btn-open-smart-admin';
        adminBtn.title = 'פתח פאנל ניהול חכם';
        adminBtn.innerHTML = '<i class="fa-solid fa-user-shield" style="color: var(--secondary);"></i>';
        adminBtn.onclick = openSmartAdminModal;
        
        // נכניס את הכפתור לפני כפתור ההתנתקות
        const logoutBtn = sidebarActions.querySelector('.logout-btn');
        if (logoutBtn) {
            sidebarActions.insertBefore(adminBtn, logoutBtn);
        } else {
            sidebarActions.appendChild(adminBtn);
        }
    }
}

// הגדרת המודולים האפשריים במערכת החכמה
const SMART_ADMIN_MODULES = [
    {
        id: 'manage_users',
        icon: 'fa-users',
        title: 'ניהול משתמשים',
        description: 'צפייה, עריכה ויצירת משתמשים במערכת',
        html: `
            <div class="clean-settings-card" style="padding: 20px; border:none; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <div>
                        <h4 style="margin:0; font-size:1.1rem; color:var(--text-dark);">ניהול לקוחות</h4>
                        <p style="margin:0; font-size:0.85rem; color:var(--text-light);">לסנכרון נתונים יש ללחוץ על הלחצן</p>
                    </div>
                    <button class="btn-pro-primary" onclick="alert('חיבור מודול טבלת משתמשים יכנס כאן')"><i class="fa-solid fa-download"></i> משוך נתונים</button>
                </div>
                <div class="placeholder-card">
                    <i class="fa-solid fa-table-list"></i>
                    <h3>אזור טבלת המשתמשים</h3>
                    <p>כאן תוכל לשלב את הפונקציות הקימות של טבלת המשתמשים (renderAdminUsersTable) או לייצר ממשק חדש ומפונפן יותר.</p>
                </div>
            </div>
        `
    },
    {
        id: 'manage_chat',
        icon: 'fa-headset',
        title: 'צ\'אט והודעות',
        description: 'מענה מהיר לפניות לקוחות',
        html: `
            <div class="placeholder-card">
                <i class="fa-solid fa-comments"></i>
                <h3>אזור הודעות לקוחות</h3>
                <p>כאן יוצג ממשק תיבת הדואר הנכנס של ההנהלה.</p>
            </div>
        `
    },
    {
        id: 'manage_ads',
        icon: 'fa-bullhorn',
        title: 'מודעות וקמפיינים',
        description: 'שליטה על פופאפים וחסימות מסך',
        html: `
            <div class="placeholder-card">
                <i class="fa-solid fa-rectangle-ad"></i>
                <h3>סטודיו המודעות</h3>
                <p>עיצוב מודעות, ניהול חשיפות והגבלת צפיות מנוהל מכאן.</p>
            </div>
        `
    },
    {
        id: 'manage_system',
        icon: 'fa-database',
        title: 'מסד נתונים ולוגים',
        description: 'שאילתות SQL וצפייה בלוגים של אבטחה',
        html: `
            <div class="placeholder-card">
                <i class="fa-solid fa-terminal"></i>
                <h3>מסוף נתונים מתקדם</h3>
                <p>אזור זה מיועד למפתחים או למנהל ראשי לצורך שליחת פקודות ישירות ל-D1.</p>
            </div>
        `
    }
];

function openSmartAdminModal() {
    const user = state.currentUser;
    if (!user) return;

    // חילוץ ההרשאות (יכול להיות 'all' או רשימה של מזהים כמו 'manage_users,manage_chat')
    const permsStr = user.adminPermissions || '';
    const permsArray = permsStr.split(',').map(p => p.trim());
    const hasAll = permsArray.includes('all');

    // סינון המודולים - נציג רק מה שמותר לו
    const allowedModules = SMART_ADMIN_MODULES.filter(module => {
        return hasAll || permsArray.includes(module.id);
    });

    if (allowedModules.length === 0) {
        showToast('יש לך הרשאת ניהול, אך לא הוקצו לך מודולים. פנה למנהל הראשי.', 'error');
        return;
    }

    renderSmartAdminMenu(allowedModules);
    document.getElementById('smartAdminModal').classList.add('active');
    
    // פתיחת המודול הראשון אוטומטית
    switchSmartAdminTab(allowedModules[0].id, allowedModules[0].title);
}

function renderSmartAdminMenu(allowedModules) {
    const menuContainer = document.getElementById('smart-admin-menu-container');
    const contentContainer = document.getElementById('smart-admin-content-container');
    
    menuContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    allowedModules.forEach(module => {
        // יצירת כפתור בתפריט הצד
        const btn = document.createElement('button');
        btn.className = 'smart-admin-tab-btn';
        btn.id = `smart-tab-btn-${module.id}`;
        btn.innerHTML = `<i class="fa-solid ${module.icon}"></i> ${module.title}`;
        btn.onclick = () => switchSmartAdminTab(module.id, module.title);
        menuContainer.appendChild(btn);

        // יצירת פאנל התוכן עבור המודול
        const panel = document.createElement('div');
        panel.className = 'smart-admin-panel';
        panel.id = `smart-panel-${module.id}`;
        panel.innerHTML = module.html;
        contentContainer.appendChild(panel);
    });
}

function switchSmartAdminTab(moduleId, moduleTitle) {
    // איפוס כפתורים
    document.querySelectorAll('.smart-admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`smart-tab-btn-${moduleId}`);
    if (activeBtn) activeBtn.classList.add('active');

    // איפוס פאנלים
    document.querySelectorAll('.smart-admin-panel').forEach(panel => panel.classList.remove('active'));
    const activePanel = document.getElementById(`smart-panel-${moduleId}`);
    if (activePanel) activePanel.classList.add('active');

    // עדכון כותרת עליונה
    document.getElementById('smart-admin-current-title').innerText = moduleTitle;
}

function closeSmartAdminModal() {
    document.getElementById('smartAdminModal').classList.remove('active');
}
