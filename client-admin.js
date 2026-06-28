// client-admin.js

async function adminLogin(e) {
    if (e) e.preventDefault();
    const username = document.getElementById('admin_user').value;
    const password = document.getElementById('admin_pass').value;

    setLoading('btn-admin-login', true);
    try {
        const res = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        setLoading('btn-admin-login', false, 'התחברות מאובטחת');

        if (!res.ok) {
            showMessage('alert-admin-login', data.message || data.error || 'פרטי מנהל שגויים', 'error');
            return;
        }

        state.adminToken = data.adminToken;
        localStorage.setItem('adminToken', data.adminToken);
        
        showView('admin-dash-view');
        loadAdminUsers();
    } catch (err) {
        setLoading('btn-admin-login', false, 'התחברות מאובטחת');
        showMessage('alert-admin-login', 'שגיאת תקשורת. השרת לא זמין.', 'error');
    }
}

// ==========================================
// ניהול משתמשים (Advanced User Management)
// ==========================================

window.adminUsersList = []; // שמירה גלובלית לטובת סינון מהיר

async function loadAdminUsers() {
    if (!state.adminToken) return;
    const tbody = document.getElementById('admin-users-table-body');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען נתונים... (מסתנכרן מול ימות המשיח)</td></tr>';
    setLoading('btn-refresh-users', true);
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken })
        });
        const data = await res.json();
        setLoading('btn-refresh-users', false, '<i class="fa-solid fa-rotate-right"></i> רענן נתונים');
        
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) { logout(); return; }
            showMessage('alert-admin-dash', data.message || data.error || 'שגיאה', 'error');
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="color:var(--danger);">שגיאה בטעינה</td></tr>';
            return;
        }

        window.adminUsersList = data.users || [];
        renderAdminUsersTable(); // קריאה לפונקציית הרינדור החדשה
    } catch (err) {
        setLoading('btn-refresh-users', false, '<i class="fa-solid fa-rotate-right"></i> רענן נתונים');
        showMessage('alert-admin-dash', 'שגיאת שרת', 'error');
    }
}

// פונקציית בניית הטבלה המופרדת - מאפשרת סינון דינמי בלחיצת כפתור
window.renderAdminUsersTable = function() {
    const tbody = document.getElementById('admin-users-table-body');
    const showOnlyWebUsers = document.getElementById('filter_web_users').checked;
    
    tbody.innerHTML = '';
    
    // סינון הרשימה בהתאם למצב הצ'קבוקס
    let filteredUsers = window.adminUsersList;
    if (showOnlyWebUsers) {
        filteredUsers = filteredUsers.filter(u => u.hasWebAccount);
    }

    if(filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">לא נמצאו משתמשים התואמים לסינון.</td></tr>';
        return;
    }

    filteredUsers.forEach(user => {
        const yemotBadge = user.yemotActive ? '<span class="status-ok">פעיל</span>' : '<span class="status-bad">מנותק / חסר</span>';
        
        // אם למשתמש יש חשבון, מציג איקון גלובוס. אם לא, מציג כפתור "פתח חשבון".
        const webBadge = user.hasWebAccount 
            ? '<i class="fa-solid fa-globe" style="color:var(--secondary);" title="רשום באתר"></i>' 
            : `<button class="actions-btn" onclick="adminCreateAccount('${user.phone}')" style="background:#eff6ff; color:#2563eb; border: 1px solid #bfdbfe; padding:4px 8px; font-size:0.8rem;"><i class="fa-solid fa-user-plus"></i> פתח חשבון</button>`;
        
        const actionBtn = user.hasWebAccount
            ? `<button class="actions-btn" onclick="openUserProfile('${user.phone}')" style="background: var(--secondary); color: white; border-color: var(--secondary);"><i class="fa-solid fa-user-gear"></i> ניהול תיק</button>`
            : `<button class="actions-btn" disabled style="opacity:0.5; cursor:not-allowed;"><i class="fa-solid fa-user-gear"></i> מותנה בחשבון</button>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700; direction:ltr; text-align:right;">${user.phone}</td>
            <td>${user.name}</td>
            <td dir="ltr" style="text-align:right;">${user.email || '-'}</td>
            <td>${yemotBadge}</td>
            <td style="text-align:center;">${webBadge}</td>
            <td style="text-align:center; font-size: 0.85rem; color: var(--text-light);">${user.createdAt ? formatDateStr(user.createdAt) : '-'}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
};

// פונקציית פתיחת חשבון יזומה על ידי מנהל
window.adminCreateAccount = async function(phone) {
    const password = prompt(`פתיחת חשבון למספר ${phone}\n\nהזן סיסמה ראשונית (4-10 ספרות):`);
    if (!password) return; // המשתמש לחץ ביטול
    if (!/^\d{4,10}$/.test(password)) {
        alert('שגיאה: הסיסמה חייבת להכיל בין 4 ל-10 ספרות בלבד.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/admin/create-user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, phone: phone, password: password })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            alert('החשבון נפתח בהצלחה! המשתמש יכול כעת להתחבר עם הסיסמה שהגדרת.');
            loadAdminUsers(); // רענון הרשימה מול השרת
        } else {
            alert(data.error || 'אירעה שגיאה ביצירת החשבון.');
        }
    } catch (e) {
        alert('שגיאת תקשורת מול השרת.');
    }
};

function switchAdminProfileTab(tab) {
    document.querySelectorAll('#adminUserProfileModal .settings-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tab-admin-profile-info').style.display = 'none';
    document.getElementById('tab-admin-profile-sessions').style.display = 'none';
    
    if (tab === 'info') {
        document.querySelectorAll('#adminUserProfileModal .settings-tab-btn')[0].classList.add('active');
        document.getElementById('tab-admin-profile-info').style.display = 'block';
    } else {
        document.querySelectorAll('#adminUserProfileModal .settings-tab-btn')[1].classList.add('active');
        document.getElementById('tab-admin-profile-sessions').style.display = 'block';
    }
}

function closeUserProfileModal() {
    document.getElementById('adminUserProfileModal').classList.remove('active');
}

async function openUserProfile(phone) {
    const modal = document.getElementById('adminUserProfileModal');
    const alertBox = document.getElementById('alert-admin-profile');
    alertBox.style.display = 'none';
    
    document.getElementById('prof_phone').value = phone;
    document.getElementById('prof_phone_hidden').value = phone;
    document.getElementById('prof_name').value = 'טוען...';
    document.getElementById('prof_email').value = '';
    document.getElementById('prof_password').value = '';
    document.getElementById('prof_yemot_status').innerHTML = '';
    document.getElementById('prof-sessions-tbody').innerHTML = '<tr><td colspan="4" class="empty-state">טוען...</td></tr>';
    
    switchAdminProfileTab('info');
    modal.classList.add('active');

    try {
        const res = await fetch(`${API_BASE_URL}/admin/user-profile`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, phone: phone })
        });
        const data = await res.json();
        
        if (!res.ok) {
            showMessage('alert-admin-profile', data.error || 'שגיאה בטעינת פרופיל', 'error');
            return;
        }

        const p = data.profile;
        document.getElementById('prof_name').value = p.yemot.name || 'לא הוגדר במערכת בימות';
        const yemotHtml = p.yemot.active 
            ? `<span class="status-ok"><i class="fa-solid fa-check-circle"></i> פעיל בימות</span>` 
            : `<span class="status-bad"><i class="fa-solid fa-xmark-circle"></i> חסר/מנותק בימות</span>`;
        document.getElementById('prof_yemot_status').innerHTML = yemotHtml;

        if (p.user) {
            document.getElementById('prof_email').value = p.user.email || '';
            document.getElementById('prof_can_record').checked = p.user.can_record !== 0;
            document.getElementById('prof_can_upload').checked = !!p.user.can_upload;
            document.getElementById('prof_can_tzintuk').checked = p.user.can_tzintuk !== 0;
            document.getElementById('prof_receive_emails').checked = p.user.receive_emails !== 0;
            document.getElementById('prof_google_only').checked = p.user.google_login_only === 1;
        }

        const tbody = document.getElementById('prof-sessions-tbody');
        tbody.innerHTML = '';
        if (!p.activeSessions || p.activeSessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">אין חיבורים פעילים למשתמש זה.</td></tr>';
        } else {
            p.activeSessions.forEach(sess => {
                let typeIcon = sess.token_type.includes('google') ? '<i class="fa-brands fa-google text-google"></i> Google' : '<i class="fa-solid fa-lock text-password"></i> סיסמה';
                let expInfo = sess.token_type.includes('perm') ? '<span class="status-ok">קבוע</span>' : '<span class="status-bad">זמני</span>';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-size:0.85rem; font-weight:bold;">${typeIcon} (${expInfo})</td>
                    <td dir="ltr" style="font-size:0.85rem; color:var(--text-light);">${sess.session_email || '-'}</td>
                    <td dir="ltr" style="font-size:0.85rem;">${formatDateStr(sess.last_used_at)}</td>
                    <td><button class="actions-btn" onclick="disconnectAdminUserToken('${sess.id}')" style="color:var(--danger); border-color:var(--danger); padding:4px 8px; font-size:0.8rem;"><i class="fa-solid fa-plug-circle-xmark"></i> נתק מכשיר</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        showMessage('alert-admin-profile', 'שגיאת תקשורת מול השרת.', 'error');
    }
}

async function submitAdminUserUpdate(e) {
    if (e) e.preventDefault();
    const phone = document.getElementById('prof_phone_hidden').value;
    
    const payload = {
        adminToken: state.adminToken, phone: phone,
        newEmail: document.getElementById('prof_email').value,
        newPassword: document.getElementById('prof_password').value,
        canRecord: document.getElementById('prof_can_record').checked,
        canUpload: document.getElementById('prof_can_upload').checked,
        canTzintuk: document.getElementById('prof_can_tzintuk').checked,
        receiveEmails: document.getElementById('prof_receive_emails').checked,
        googleLoginOnly: document.getElementById('prof_google_only').checked
    };

    setLoading('btn-save-user-profile', true);
    try {
        const res = await fetch(`${API_BASE_URL}/admin/update-user`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        setLoading('btn-save-user-profile', false, 'שמור שינויים <i class="fa-solid fa-check"></i>');
        if (!res.ok) { showMessage('alert-admin-profile', data.error || 'שגיאה בעדכון', 'error'); return; }
        
        showMessage('alert-admin-profile', 'ההגדרות נשמרו בהצלחה!', 'success');
        document.getElementById('prof_password').value = ''; 
        loadAdminUsers();
    } catch (err) {
        setLoading('btn-save-user-profile', false, 'שמור שינויים <i class="fa-solid fa-check"></i>');
        showMessage('alert-admin-profile', 'שגיאת תקשורת', 'error');
    }
}

async function disconnectAdminUserToken(tokenId) {
    const phone = document.getElementById('prof_phone_hidden').value;
    const msg = tokenId ? 'האם לנתק את המכשיר הספציפי הזה?' : 'האם לנתק את המשתמש מ*כל* המכשירים המחוברים?';
    if (!confirm(msg)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/user-tokens/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken, phone: phone, tokenId: tokenId }) });
        const data = await res.json();
        if (res.ok) { showMessage('alert-admin-profile', data.message || 'הניתוק בוצע בהצלחה', 'success'); openUserProfile(phone); }
        else { showMessage('alert-admin-profile', data.error || 'שגיאה בניתוק', 'error'); }
    } catch (err) { showMessage('alert-admin-profile', 'שגיאת תקשורת', 'error'); }
}

// ==========================================
// אבטחה וצינתוקים (Security & Logs Management)
// ==========================================

async function refreshTzintukData() {
    const btn = document.getElementById('btn-refresh-tzintuk');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מרענן נתונים...'; btn.disabled = true; }
    await Promise.all([loadVerifyBlocks(), loadVerifyLogs()]);
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> רענן נתונים'; btn.disabled = false; }
}

async function loadVerifyBlocks() {
    if (!state.adminToken) return;
    const tbody = document.getElementById('admin-blocks-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען נתוני חסימות...</td></tr>';
    try {
        const res = await fetch(`${API_BASE_URL}/verify/admin/blocks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken }) });
        const data = await res.json();
        if (!res.ok) { tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color:var(--danger);">${data.error || 'שגיאה'}</td></tr>`; return; }
        tbody.innerHTML = '';
        if (!data.blocks || data.blocks.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">אין חסימות</td></tr>'; window.currentActiveBlocks = 0; return; }
        window.currentActiveBlocks = data.blocks.length;
        
        data.blocks.forEach(b => {
            const isIp = b.block_type === 'ip';
            const icon = isIp ? '<i class="fa-solid fa-network-wired"></i>' : '<i class="fa-solid fa-phone"></i>';
            const typeName = isIp ? 'כתובת IP' : 'מספר טלפון';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${icon} ${typeName}</td><td dir="ltr" style="font-weight:700;">${b.block_value}</td><td>${b.reason || 'ללא סיבה'}</td>
                <td dir="ltr" style="color: var(--text-light);">${formatDateStr(b.created_at)}</td>
                <td dir="ltr">${b.expires_at ? formatDateStr(b.expires_at) : '<span style="color:var(--danger);font-weight:bold;"><i class="fa-solid fa-ban"></i> לצמיתות</span>'}</td>
                <td><button class="actions-btn" onclick="unblockUser('${b.block_type}', '${b.block_value}')"><i class="fa-solid fa-unlock"></i> הסר</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="color:var(--danger);">שגיאת תקשורת</td></tr>'; }
}

async function loadVerifyLogs() {
    if (!state.adminToken) return;
    const tbody = document.getElementById('admin-logs-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען היסטוריה...</td></tr>';
    try {
        const res = await fetch(`${API_BASE_URL}/verify/admin/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken, limit: 150 }) });
        const data = await res.json();
        if (!res.ok) { tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:var(--danger);">${data.error}</td></tr>`; return; }
        tbody.innerHTML = '';
        if (!data.logs || data.logs.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">אין דוחות</td></tr>'; updateSecurityStats(window.currentActiveBlocks || 0, 0, 0); return; }
        
        let warnCount = 0; let blockEventCount = 0;
        data.logs.forEach(log => {
            if (log.level === 'WARN') warnCount++; if (log.level === 'BLOCKED') blockEventCount++;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="color: var(--text-light); font-size: 0.85rem; font-weight: bold;">#${log.id}</td><td dir="ltr" style="white-space: nowrap; font-size: 0.85rem; color: #475569;">${formatDateStr(log.timestamp)}</td><td>${getLevelBadge(log.level)}</td><td>${getActionBadge(log.action)}</td><td dir="ltr" style="font-weight:700;">${log.phone || '-'}</td><td dir="ltr" style="font-size:0.85rem; color: var(--text-light); font-family: monospace;">${log.ip_address || '-'}</td><td style="max-width: 250px; white-space: normal; line-height: 1.4; font-size: 0.85rem;">${log.details || ''}</td>`;
            tbody.appendChild(tr);
        });
        updateSecurityStats(window.currentActiveBlocks || 0, warnCount, blockEventCount);
    } catch (err) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="color:var(--danger);">שגיאת תקשורת</td></tr>'; }
}

async function submitManualBlock(e) {
    e.preventDefault();
    const type = document.getElementById('block_type').value;
    const value = document.getElementById('block_value').value.trim();
    const reason = document.getElementById('block_reason').value.trim();
    const duration = parseInt(document.getElementById('block_duration').value);
    const unit = document.getElementById('block_unit').value;

    if (!value) return;
    setLoading('btn-submit-block', true);
    try {
        const res = await fetch(`${API_BASE_URL}/verify/admin/block`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken, type, value, reason, durationValue: duration, durationUnit: unit }) });
        const data = await res.json();
        setLoading('btn-submit-block', false, 'החל חסימה <i class="fa-solid fa-lock"></i>');
        if (res.ok) { document.getElementById('block_value').value = ''; document.getElementById('block_reason').value = ''; refreshTzintukData(); }
        else alert(data.error || 'שגיאה ביצירת חסימה');
    } catch (err) { setLoading('btn-submit-block', false, 'החל חסימה <i class="fa-solid fa-lock"></i>'); alert('שגיאת תקשורת'); }
}

async function unblockUser(type, value) {
    if (!confirm(`לשחרר חסימה על ${value}?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/verify/admin/unblock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken, type, target: value }) });
        if (res.ok) refreshTzintukData(); else alert((await res.json()).error || 'שגיאה');
    } catch (err) { alert('שגיאת תקשורת'); }
}

async function cleanOldLogs() {
    if (!confirm('למחוק לצמיתות לוגים ישנים?')) return;
    const btn = document.getElementById('btn-clean-logs');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מנקה...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE_URL}/verify/admin/clean`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken }) });
        if (res.ok) refreshTzintukData(); else alert((await res.json()).error || 'שגיאה');
    } catch (err) { alert('שגיאת תקשורת'); } finally { btn.innerHTML = originalText; btn.disabled = false; }
}

// פונקציות עזר ויזואליות למנהל
function formatDateStr(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split(' ');
        if (parts.length === 2) { const dateParts = parts[0].split('-'); return `${dateParts[2]}/${dateParts[1]}/${dateParts[0].substring(2)} ${parts[1].substring(0,5)}`; }
        return dateStr;
    } catch(e) { return dateStr; }
}

function getLevelBadge(level) {
    switch(level) {
        case 'INFO': return '<span class="badge-level info"><i class="fa-solid fa-circle-info"></i> מידע</span>';
        case 'WARN': return '<span class="badge-level warn"><i class="fa-solid fa-triangle-exclamation"></i> חריגה</span>';
        case 'BLOCKED': return '<span class="badge-level blocked"><i class="fa-solid fa-shield-virus"></i> נבלם</span>';
        default: return `<span class="badge-level info">${level}</span>`;
    }
}

function getActionBadge(action) {
    const actions = { 'VERIFY_SUCCESS': { label: 'אימות הושלם', class: 'success' }, 'SEND_REQUEST': { label: 'שליחת צינתוק', class: 'info' }, 'RATE_LIMIT': { label: 'הגבלת קצב', class: 'warn' }, 'VERIFY_CODE': { label: 'בדיקת קוד', class: 'neutral' }, 'ADMIN_BLOCK_CREATE': { label: 'חסימה יזומה', class: 'danger' }, 'ADMIN_BLOCK_UPDATE': { label: 'עדכון חסימה', class: 'warn' }, 'ADMIN_UNBLOCK': { label: 'שחרור חסימה', class: 'success' }, 'SEND_REJECTED': { label: 'שליחה נדחתה', class: 'danger' }, 'RESET_CODE_SENT': { label: 'קוד איפוס נשלח', class: 'info' }, 'RESET_REJECTED': { label: 'איפוס נחסם', class: 'danger' } };
    const mapped = actions[action];
    return mapped ? `<span class="badge-action ${mapped.class}" style="padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">${mapped.label}</span>` : `<span class="badge-action neutral" style="padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700; background:#f1f5f9; color:#475569;">${action}</span>`;
}

function updateSecurityStats(activeBlocks, warnings, blockEvents) {
    const container = document.getElementById('security-stats');
    if (!container) return;
    container.innerHTML = `
        <div class="stat-card"><div class="stat-icon" style="color: #ef4444; background: #fee2e2;"><i class="fa-solid fa-ban"></i></div><div class="stat-info"><h3>${activeBlocks}</h3><p>חסימות פעילות כעת</p></div></div>
        <div class="stat-card"><div class="stat-icon" style="color: #d97706; background: #fef3c7;"><i class="fa-solid fa-bolt"></i></div><div class="stat-info"><h3>${warnings}</h3><p>חריגות והגבלות קצב</p></div></div>
        <div class="stat-card"><div class="stat-icon" style="color: #15803d; background: #dcfce7;"><i class="fa-solid fa-shield-halved"></i></div><div class="stat-info"><h3>${blockEvents}</h3><p>התקפות שנבלמו</p></div></div>
    `;
}
