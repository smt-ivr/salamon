document.addEventListener('DOMContentLoaded', () => {
    const adminMenu = document.querySelector('.admin-sidebar-menu');
    if (adminMenu) {
        const adMenuItem = document.createElement('div');
        adMenuItem.className = 'nav-item';
        adMenuItem.id = 'tab-btn-ads';
        adMenuItem.onclick = () => switchAdminTab('ads');
        adMenuItem.innerHTML = `<i class="fa-solid fa-bullhorn"></i> <span>מערכת פרסום ומודעות</span>`;
        adminMenu.appendChild(adMenuItem);
    }

    const appMainArea = document.querySelector('#admin-dash-view .app-main-area');
    if (appMainArea) {
        const adTab = document.createElement('div');
        adTab.id = 'tab-admin-ads';
        adTab.className = 'app-tab scrollable-tab';
        adTab.innerHTML = `
            <div class="admin-top-bar" style="margin-bottom: 20px;">
                <div><h1>מערכת פרסום מתקדמת</h1><p class="subtitle">ניהול חשיפות, פופאפים חוסמים, עיצוב ללא קוד וסטטיסטיקות</p></div>
                <button onclick="openEditAdModal()" class="btn-primary small-btn" style="width: auto; background: var(--secondary);"><i class="fa-solid fa-plus"></i> צור מודעה</button>
            </div>
            
            <div class="table-wrapper">
                <table class="modern-table">
                    <thead><tr><th>כותרת</th><th>סוג חשיפה</th><th>סך הכל חשיפות</th><th>משתמשים ייחודיים</th><th>סטטוס</th><th>פעולות</th></tr></thead>
                    <tbody id="admin-ads-table-body"><tr><td colspan="6" class="empty-state">טוען...</td></tr></tbody>
                </table>
            </div>

            <div class="modal-overlay" id="adEditModal">
                <div class="modal-content professional-modal" style="max-width: 750px;">
                    <div class="modal-header">
                        <h2 id="ad-modal-title"><i class="fa-solid fa-pen-nib"></i> סטודיו מודעות</h2>
                        <button class="close-modal-btn" onclick="closeEditAdModal()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="padding: 20px; overflow-y: auto; max-height: 75vh;">
                        <form id="ad-edit-form" onsubmit="saveAdminAd(event)">
                            <input type="hidden" id="ad_id" value="">
                            
                            <h3 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">1. תוכן ועיצוב (No-Code)</h3>
                            <div class="form-group"><label>כותרת (פנימי ומוצג למשתמש)</label><input type="text" id="ad_title" required class="input-modern"></div>
                            <div class="form-group"><label>תוכן המודעה</label><textarea id="ad_html" required class="input-modern" rows="3"></textarea></div>
                            <div class="form-group"><label>קישור לתמונה (אופציונלי - יופיע בראש המודעה)</label><input type="url" id="ad_image" class="ltr-input input-modern" placeholder="https://..."></div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div class="form-group"><label>צבע רקע</label><input type="color" id="ad_bg" value="#ffffff" style="width:100%; height:40px; border:none; border-radius:8px;"></div>
                                <div class="form-group"><label>צבע טקסט</label><input type="color" id="ad_text" value="#1a202c" style="width:100%; height:40px; border:none; border-radius:8px;"></div>
                            </div>

                            <h3 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 25px; margin-bottom: 15px;">2. התנהגות ותצוגה</h3>
                            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <label style="font-weight: bold; color: var(--danger);">הצג כפופאפ מרכזי חוסם מסך (במקום מודעת צד)</label>
                                    <input type="checkbox" id="ad_is_mandatory" style="width: 20px; height: 20px;">
                                </div>
                                <div class="form-group" style="margin: 0;"><label>כמה שניות לנעול את כפתור ה-X למשתמש?</label><input type="number" id="ad_cooldown" value="0" class="input-modern"></div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div class="form-group"><label>מקס' צפיות למשתמש (0=ללא הגבלה)</label><input type="number" id="ad_max_views" value="0" class="input-modern"></div>
                                <div class="form-group"><label>התנהגות לאחר הגעה למכסה</label>
                                    <select id="ad_behavior" class="input-modern">
                                        <option value="hide">הסתר את המודעה לגמרי</option>
                                        <option value="downgrade">בטל פופאפ (הצג רק כמודעת צד)</option>
                                    </select>
                                </div>
                                <div class="form-group"><label>תוקף (השאר ריק לתמיד)</label><input type="datetime-local" id="ad_expires" class="input-modern"></div>
                                <div class="form-group"><label>המתנה בין צפיות (בדקות)</label><input type="number" id="ad_interval" value="0" class="input-modern"></div>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding: 10px; background: #f0fdf4; border-radius: 8px;">
                                <label style="font-weight: bold; color: var(--success);">חשוף למשתמשים את מונה הצפיות ("נצפה ע"י X")</label>
                                <input type="checkbox" id="ad_show_count" style="width: 20px; height: 20px;">
                            </div>

                            <div style="margin-top: 25px; display: flex; gap: 10px;">
                                <button type="button" class="btn-text" onclick="closeEditAdModal()">ביטול</button>
                                <button type="submit" id="btn-save-ad" class="btn-primary" style="flex: 1;"><i class="fa-solid fa-floppy-disk"></i> שמור ופרסם</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" id="adLogsModal">
                <div class="modal-content professional-modal">
                    <div class="modal-header">
                        <h2><i class="fa-solid fa-eye"></i> היסטוריית צפיות למודעה</h2>
                        <button class="close-modal-btn" onclick="document.getElementById('adLogsModal').classList.remove('active')"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="padding: 20px; max-height: 60vh; overflow-y: auto;">
                        <table class="modern-table">
                            <thead><tr><th>טלפון / מזהה</th><th>שעת צפייה</th><th>כתובת IP</th></tr></thead>
                            <tbody id="ad-logs-tbody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        appMainArea.appendChild(adTab);
    }
});

const originalSwitchTab = window.switchAdminTab;
window.switchAdminTab = function(tabName) {
    if(originalSwitchTab) originalSwitchTab(tabName);
    if(tabName === 'ads') loadAdminAds();
};

window.currentAdsList = [];

window.loadAdminAds = async function() {
    const tbody = document.getElementById('admin-ads-table-body');
    if(!tbody) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/system-messages/list`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken }) });
        const data = await res.json();
        if (!res.ok) return;
        window.currentAdsList = data.messages;
        tbody.innerHTML = '';
        data.messages.forEach(msg => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:700;">${msg.title}</td>
                <td>${msg.is_mandatory ? '<span class="status-bad">פופאפ</span>' : '<span class="status-ok">רגיל</span>'}</td>
                <td style="font-weight:bold; font-size:1.1rem;">${msg.total_impressions || 0}</td>
                <td style="font-weight:bold; color:var(--secondary);">${msg.unique_viewers || 0} יוניקים</td>
                <td>${msg.expires_at && new Date(msg.expires_at.replace(' ','T')+'Z') < new Date() ? 'פג תוקף' : 'פעיל'}</td>
                <td>
                    <button class="actions-btn" title="ערוך עיצוב והגדרות" onclick="openEditAdModal(${msg.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="actions-btn" title="מי צפה בזה?" style="color:var(--secondary);" onclick="openAdLogs(${msg.id})"><i class="fa-solid fa-list"></i></button>
                    <button class="actions-btn" style="color:var(--danger);" onclick="deleteAdminAd(${msg.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) { console.error(err); }
};

window.openEditAdModal = function(id = null) {
    document.getElementById('ad-edit-form').reset();
    document.getElementById('ad_id').value = '';
    document.getElementById('ad_bg').value = '#ffffff';
    document.getElementById('ad_text').value = '#1a202c';
    if (id) {
        const msg = window.currentAdsList.find(m => m.id === id);
        if (msg) {
            document.getElementById('ad_id').value = msg.id;
            document.getElementById('ad_title').value = msg.title;
            document.getElementById('ad_html').value = msg.html_content;
            document.getElementById('ad_image').value = msg.image_url || '';
            document.getElementById('ad_bg').value = msg.bg_color || '#ffffff';
            document.getElementById('ad_text').value = msg.text_color || '#1a202c';
            document.getElementById('ad_is_mandatory').checked = msg.is_mandatory;
            document.getElementById('ad_cooldown').value = msg.close_cooldown_seconds;
            document.getElementById('ad_max_views').value = msg.max_views_per_user;
            document.getElementById('ad_behavior').value = msg.behavior_after_limit || 'hide';
            if (msg.expires_at) document.getElementById('ad_expires').value = msg.expires_at.replace(' ', 'T');
            document.getElementById('ad_interval').value = msg.view_interval_minutes;
            document.getElementById('ad_show_count').checked = msg.show_view_count;
        }
    }
    document.getElementById('adEditModal').classList.add('active');
};

window.closeEditAdModal = function() { document.getElementById('adEditModal').classList.remove('active'); };

window.saveAdminAd = async function(e) {
    e.preventDefault();
    const payload = {
        adminToken: state.adminToken, id: document.getElementById('ad_id').value,
        title: document.getElementById('ad_title').value, htmlContent: document.getElementById('ad_html').value,
        imageUrl: document.getElementById('ad_image').value, bgColor: document.getElementById('ad_bg').value, textColor: document.getElementById('ad_text').value,
        maxViewsPerUser: parseInt(document.getElementById('ad_max_views').value) || 0, behaviorAfterLimit: document.getElementById('ad_behavior').value,
        viewIntervalMinutes: parseInt(document.getElementById('ad_interval').value) || 0,
        isMandatory: document.getElementById('ad_is_mandatory').checked, closeCooldownSeconds: parseInt(document.getElementById('ad_cooldown').value) || 0,
        showViewCount: document.getElementById('ad_show_count').checked
    };
    let exp = document.getElementById('ad_expires').value;
    payload.expiresAt = exp ? exp.replace('T', ' ') + ':00' : null;
    
    await fetch(`${API_BASE_URL}/admin/system-messages/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    closeEditAdModal(); loadAdminAds();
};

window.openAdLogs = async function(id) {
    document.getElementById('adLogsModal').classList.add('active');
    const tbody = document.getElementById('ad-logs-tbody');
    tbody.innerHTML = '<tr><td colspan="3">טוען נתונים...</td></tr>';
    const res = await fetch(`${API_BASE_URL}/admin/system-messages/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken, messageId: id }) });
    const data = await res.json();
    tbody.innerHTML = '';
    data.logs.forEach(l => {
        tbody.innerHTML += `<tr><td dir="ltr" style="text-align:right;">${l.phone}</td><td>${l.viewed_at}</td><td dir="ltr">${l.ip_address}</td></tr>`;
    });
};

window.deleteAdminAd = async function(id) {
    if (!confirm('למחוק מודעה זו?')) return;
    await fetch(`${API_BASE_URL}/admin/system-messages/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken, id: id }) });
    loadAdminAds();
};
