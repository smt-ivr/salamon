// client-admin-ads.js

document.addEventListener('DOMContentLoaded', () => {
    const adminAdStyles = document.createElement('style');
    adminAdStyles.innerHTML = `
        .ad-grid { display: grid; gap: 15px; grid-template-columns: 1fr 1fr; }
        @media (max-width: 600px) { .ad-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(adminAdStyles);

    // הזרקת לשונית לתפריט הצד של המנהל
    const adminMenu = document.querySelector('.admin-sidebar-menu');
    if (adminMenu) {
        const adMenuItem = document.createElement('div');
        adMenuItem.className = 'nav-item';
        adMenuItem.id = 'tab-btn-ads';
        adMenuItem.onclick = () => switchAdminTab('ads');
        adMenuItem.innerHTML = `<i class="fa-solid fa-bullhorn"></i> <span>ניהול מודעות ופופאפים</span>`;
        adminMenu.appendChild(adMenuItem);
    }

    // הזרקת מסך הניהול לחלון המרכזי
    const appMainArea = document.querySelector('#admin-dash-view .app-main-area');
    if (appMainArea) {
        const adTab = document.createElement('div');
        adTab.id = 'tab-admin-ads';
        adTab.className = 'app-tab scrollable-tab';
        adTab.innerHTML = `
            <div class="admin-top-bar" style="margin-bottom: 20px;">
                <div><h1>מערכת פרסום ומודעות</h1><p class="subtitle">ניהול חשיפות מודעות (פופאפים חוסמים / מודעות צד)</p></div>
                <button onclick="openEditAdModal()" class="btn-primary small-btn" style="width: auto; background: var(--secondary);"><i class="fa-solid fa-plus"></i> צור מודעה חדשה</button>
            </div>
            
            <div class="table-wrapper">
                <table class="modern-table">
                    <thead>
                        <tr>
                            <th>כותרת</th>
                            <th>סטטוס תפוגה</th>
                            <th>סוג מודעה</th>
                            <th>עדיפות</th>
                            <th>חשיפות בפועל</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>
                    <tbody id="admin-ads-table-body">
                        <tr><td colspan="6" class="empty-state">טוען נתונים...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="modal-overlay" id="adEditModal">
                <div class="modal-content professional-modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 id="ad-modal-title"><i class="fa-solid fa-pen"></i> עריכת מודעה</h2>
                        <button type="button" class="close-modal-btn" onclick="closeEditAdModal()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="padding: 20px; overflow-y: auto; max-height: 75vh;">
                        <form id="ad-edit-form" onsubmit="saveAdminAd(event)">
                            <input type="hidden" id="ad_id" value="">
                            
                            <div class="form-group"><label>כותרת המודעה (פנימי ולכותרת פופאפ)</label>
                            <input type="text" id="ad_title" required class="input-modern" placeholder="לדוגמה: עדכון חשוב למערכת"></div>
                            
                            <div class="form-group"><label>תוכן המודעה (תומך בטקסט ופקודות HTML)</label>
                            <textarea id="ad_html" required class="input-modern" rows="4" style="resize: vertical; direction: rtl; text-align: right;" placeholder="שלום רב,<br>הוספנו פיצ'ר חדש..."></textarea></div>
                            
                            <div class="ad-grid">
                                <div class="form-group">
                                    <label>זמן תפוגה מוחלט (השאר ריק לתמיד)</label>
                                    <input type="datetime-local" id="ad_expires" class="input-modern ltr-input center-text">
                                </div>
                                <div class="form-group">
                                    <label>עדיפות (10 יופיע לפני 1)</label>
                                    <input type="number" id="ad_priority" value="0" class="input-modern center-text">
                                </div>
                                <div class="form-group">
                                    <label>מקס' חשיפות לכל יוזר (0=ללא הגבלה)</label>
                                    <input type="number" id="ad_max_views" value="0" class="input-modern center-text">
                                </div>
                                <div class="form-group">
                                    <label>צינון בין הצגה להצגה בדקות (0=אין)</label>
                                    <input type="number" id="ad_interval" value="0" class="input-modern center-text">
                                </div>
                            </div>

                            <div style="background: #fff1f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca; margin-top: 15px;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                                    <label for="ad_is_mandatory" style="font-weight: bold; margin: 0; color: var(--danger);">הצג כפופאפ חובה חוסם מסך</label>
                                    <input type="checkbox" id="ad_is_mandatory" style="width: 20px; height: 20px; accent-color: var(--danger);">
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label style="color: var(--danger);">נעילת כפתור 'סגור' (בשניות)</label>
                                    <input type="number" id="ad_cooldown" value="0" class="input-modern center-text">
                                </div>
                            </div>

                            <div style="margin-top: 25px; display: flex; gap: 10px;">
                                <button type="button" class="btn-text" onclick="closeEditAdModal()">ביטול</button>
                                <button type="submit" id="btn-save-ad" class="btn-primary" style="flex: 1;"><i class="fa-solid fa-floppy-disk"></i> שמור ופרסם</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        appMainArea.appendChild(adTab);
    }
});

// דריסת הפונקציה המקורית כדי להטעין נתונים במעבר לשונית המודעות
const originalSwitchTab = window.switchAdminTab;
window.switchAdminTab = function(tabName) {
    if(originalSwitchTab) originalSwitchTab(tabName);
    if(tabName === 'ads') loadAdminAds();
};

window.currentAdsList = [];

window.loadAdminAds = async function() {
    const tbody = document.getElementById('admin-ads-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען נתונים...</td></tr>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/system-messages/list`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken })
        });
        const data = await res.json();
        
        if (!res.ok) { tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color:red;">${data.error}</td></tr>`; return; }

        window.currentAdsList = data.messages;

        if (data.messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">אין מודעות במערכת. לחץ על "צור מודעה חדשה".</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.messages.forEach(msg => {
            const isMandatoryHtml = msg.is_mandatory ? '<span class="status-bad" style="background:#fee2e2;color:#b91c1c;">פופאפ חובה</span>' : '<span class="status-ok">מודעה צדדית</span>';
            const isExpired = msg.expires_at && new Date(msg.expires_at.replace(' ','T')+'Z') < new Date();
            const statusHtml = isExpired ? '<span style="color:var(--danger);font-weight:bold;">פג תוקף</span>' : '<span style="color:var(--success);font-weight:bold;">פעיל</span>';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:700;">${msg.title}</td>
                <td>${statusHtml} ${msg.expires_at ? `<div style="font-size:0.75rem; direction:ltr;">${msg.expires_at.substring(0, 16)}</div>` : ''}</td>
                <td>${isMandatoryHtml}</td>
                <td style="text-align:center;">${msg.priority}</td>
                <td style="text-align:center; font-weight:bold; color:var(--secondary); font-size:1.1rem;">${msg.total_impressions || 0}</td>
                <td>
                    <button class="actions-btn" onclick="openEditAdModal(${msg.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="actions-btn" style="color: var(--danger); border-color: var(--danger); background: white;" onclick="deleteAdminAd(${msg.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="color:red;">שגיאת תקשורת</td></tr>'; }
};

window.openEditAdModal = function(id = null) {
    const modal = document.getElementById('adEditModal');
    document.getElementById('ad-edit-form').reset();
    document.getElementById('ad_id').value = '';
    document.getElementById('ad-modal-title').innerHTML = '<i class="fa-solid fa-plus"></i> יצירת מודעה חדשה';
    
    if (id) {
        const msg = window.currentAdsList.find(m => m.id === id);
        if (msg) {
            document.getElementById('ad-modal-title').innerHTML = '<i class="fa-solid fa-pen"></i> עריכת מודעה';
            document.getElementById('ad_id').value = msg.id;
            document.getElementById('ad_title').value = msg.title;
            document.getElementById('ad_html').value = msg.html_content;
            document.getElementById('ad_priority').value = msg.priority;
            if (msg.expires_at) document.getElementById('ad_expires').value = msg.expires_at.replace(' ', 'T');
            document.getElementById('ad_max_views').value = msg.max_views_per_user;
            document.getElementById('ad_interval').value = msg.view_interval_minutes;
            document.getElementById('ad_is_mandatory').checked = msg.is_mandatory;
            document.getElementById('ad_cooldown').value = msg.close_cooldown_seconds;
        }
    }
    modal.classList.add('active');
};

window.closeEditAdModal = function() { document.getElementById('adEditModal').classList.remove('active'); };

window.saveAdminAd = async function(e) {
    e.preventDefault();
    const payload = {
        adminToken: state.adminToken,
        title: document.getElementById('ad_title').value,
        htmlContent: document.getElementById('ad_html').value,
        priority: parseInt(document.getElementById('ad_priority').value) || 0,
        maxViewsPerUser: parseInt(document.getElementById('ad_max_views').value) || 0,
        viewIntervalMinutes: parseInt(document.getElementById('ad_interval').value) || 0,
        isMandatory: document.getElementById('ad_is_mandatory').checked,
        closeCooldownSeconds: parseInt(document.getElementById('ad_cooldown').value) || 0
    };
    
    let expiresAt = document.getElementById('ad_expires').value;
    payload.expiresAt = expiresAt ? expiresAt.replace('T', ' ') + ':00' : null;
    
    const id = document.getElementById('ad_id').value;
    if (id) payload.id = id;

    const btn = document.getElementById('btn-save-ad');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> שומר...'; btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/system-messages/save`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) { closeEditAdModal(); loadAdminAds(); } 
        else { alert(data.error || 'שגיאה בשמירה'); }
    } catch(err) { alert('שגיאת תקשורת מול השרת'); } 
    finally { btn.innerHTML = originalText; btn.disabled = false; }
};

window.deleteAdminAd = async function(id) {
    if (!confirm('האם אתה בטוח שברצונך למחוק מודעה זו לצמיתות?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/system-messages/delete`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, id: id })
        });
        if (res.ok) loadAdminAds(); else alert((await res.json()).error || 'שגיאה במחיקה');
    } catch(err) { alert('שגיאת תקשורת'); }
};
