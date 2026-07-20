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
        showToast('התחברת בהצלחה כמנהל', 'success');
        showView('admin-dash-view');
        loadAdminUsers();
    } catch (err) {
        setLoading('btn-admin-login', false, 'התחברות מאובטחת');
        showMessage('alert-admin-login', 'שגיאת תקשורת. השרת לא זמין.', 'error');
    }
}

window.adminUsersList = [];

async function loadAdminUsers() {
    if (!state.adminToken) return;
    const tbody = document.getElementById('admin-users-table-body');
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> מסנכרן נתונים מול השרת...</td></tr>';
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
            showToast(data.error || 'שגיאה בטעינת משתמשים', 'error');
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state" style="color:var(--danger);">שגיאה בטעינה</td></tr>';
            return;
        }

        window.adminUsersList = data.users || [];
        showToast('הנתונים סונכרנו בהצלחה', 'success');
        renderAdminUsersTable(); 
    } catch (err) {
        setLoading('btn-refresh-users', false, '<i class="fa-solid fa-rotate-right"></i> רענן נתונים');
        showToast('שגיאת תקשורת בטעינת משתמשים', 'error');
    }
}

window.renderAdminUsersTable = function() {
    const tbody = document.getElementById('admin-users-table-body');
    const showOnlyWebUsers = document.getElementById('filter_web_users').checked;
    
    tbody.innerHTML = '';
    
    let filteredUsers = window.adminUsersList;
    if (showOnlyWebUsers) {
        filteredUsers = filteredUsers.filter(u => u.hasWebAccount);
    }

    if(filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">לא נמצאו משתמשים התואמים לסינון.</td></tr>';
        return;
    }

    filteredUsers.forEach(user => {
        let picHtml = '';
        if (user.profilePictureUrl && user.profilePictureUrl.trim() !== '') {
            picHtml = `<div class="avatar" style="width:36px; height:36px; border-radius:10px;"><img src="${user.profilePictureUrl}" class="avatar-img" alt="Profile" draggable="false" oncontextmenu="return false;"></div>`;
        } else {
            const firstLetter = (user.name && user.name.trim().length > 0) ? user.name.trim().charAt(0) : 'א';
            picHtml = `<div class="avatar" style="width:36px; height:36px; border-radius:10px;"><span class="avatar-letter" style="font-size:1.1rem;">${firstLetter}</span></div>`;
        }

        const yemotBadge = user.yemotActive ? '<span class="status-ok">פעיל</span>' : '<span class="status-bad">מנותק</span>';
        const webBadge = user.hasWebAccount 
            ? `<div style="font-size:0.85rem;"><i class="fa-solid fa-envelope" style="color:var(--secondary); margin-left:4px;"></i> ${user.email || 'ללא אימייל'}</div>`
            : `<button class="actions-btn" onclick="openAdminCreateUserModal('${user.phone}')" style="background:#eff6ff; color:#2563eb; border: 1px solid #bfdbfe; padding:4px 8px; font-size:0.8rem;"><i class="fa-solid fa-user-plus"></i> פתח חשבון</button>`;
        
        let togglesHtml = '-';
        if (user.hasWebAccount) {
            togglesHtml = `
                <div style="display:flex; gap:6px; justify-content:center; direction:ltr;">
                    <button class="icon-toggle ${user.canListen ? 'active' : 'danger-type'}" onclick="quickTogglePermission('${user.phone}', 'canListen', ${!user.canListen})" title="${user.canListen ? 'חסום האזנה' : 'אפשר האזנה'}"><i class="fa-solid fa-headphones"></i></button>
                    <button class="icon-toggle ${user.canTzintuk ? 'active' : ''}" onclick="quickTogglePermission('${user.phone}', 'canTzintuk', ${!user.canTzintuk})" title="${user.canTzintuk ? 'חסום צינתוק' : 'אפשר צינתוק'}"><i class="fa-solid fa-phone-volume"></i></button>
                    <button class="icon-toggle ${user.canUpload ? 'active' : ''}" onclick="quickTogglePermission('${user.phone}', 'canUpload', ${!user.canUpload})" title="${user.canUpload ? 'חסום העלאה' : 'אפשר העלאה'}"><i class="fa-solid fa-upload"></i></button>
                    <button class="icon-toggle ${user.canRecord ? 'active' : ''}" onclick="quickTogglePermission('${user.phone}', 'canRecord', ${!user.canRecord})" title="${user.canRecord ? 'חסום הקלטה' : 'אפשר הקלטה'}"><i class="fa-solid fa-microphone"></i></button>
                </div>
            `;
        }

        const actionBtn = user.hasWebAccount
            ? `<button class="actions-btn" onclick="openUserProfile('${user.phone}')" style="background: var(--secondary); color: white; border-color: var(--secondary);"><i class="fa-solid fa-user-gear"></i> ניהול מלא</button>`
            : `<button class="actions-btn" disabled style="opacity:0.5; cursor:not-allowed;"><i class="fa-solid fa-user-gear"></i> ניהול מלא</button>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center; padding: 6px;">${picHtml}</td>
            <td style="font-weight:700; direction:ltr; text-align:right;">${user.phone}</td>
            <td style="font-weight:600;">${user.name}</td>
            <td>${yemotBadge}</td>
            <td>${webBadge}</td>
            <td style="text-align:center; font-size: 0.85rem; color: var(--text-light);">${user.createdAt ? formatDateStr(user.createdAt) : '-'}</td>
            <td style="text-align:center;">${togglesHtml}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
};

window.quickTogglePermission = async function(phone, field, newValue) {
    const payload = { adminToken: state.adminToken, phone: phone };
    payload[field] = newValue;
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/update-user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            showToast('ההרשאה עודכנה בהצלחה', 'success');
            const userObj = window.adminUsersList.find(u => u.phone === phone);
            if (userObj) {
                userObj[field] = newValue;
                renderAdminUsersTable(); 
            }
        } else {
            showToast(data.error || 'שגיאה בעדכון ההרשאה', 'error');
        }
    } catch (e) {
        showToast('שגיאת תקשורת', 'error');
    }
};

window.openAdminCreateUserModal = function(phone) {
    document.getElementById('alert-admin-create').style.display = 'none';
    document.getElementById('create_phone').value = phone;
    document.getElementById('create_email').value = '';
    document.getElementById('create_password').value = '';
    document.getElementById('create_can_record').checked = true;
    document.getElementById('create_can_upload').checked = false;
    document.getElementById('create_can_tzintuk').checked = true;
    document.getElementById('create_receive_emails').checked = true;
    document.getElementById('adminCreateUserModal').classList.add('active');
};

window.closeCreateUserModal = function() {
    document.getElementById('adminCreateUserModal').classList.remove('active');
};

window.submitAdminCreateUser = async function(e) {
    if (e) e.preventDefault();
    const phone = document.getElementById('create_phone').value;
    const password = document.getElementById('create_password').value;
    
    if (!/^\d{4,10}$/.test(password)) {
        showToast('הסיסמה חייבת להכיל בין 4 ל-10 ספרות', 'error');
        return;
    }

    const payload = {
        adminToken: state.adminToken,
        phone: phone,
        password: password,
        email: document.getElementById('create_email').value,
        canRecord: document.getElementById('create_can_record').checked,
        canUpload: document.getElementById('create_can_upload').checked,
        canTzintuk: document.getElementById('create_can_tzintuk').checked,
        receiveEmails: document.getElementById('create_receive_emails').checked,
        googleLoginOnly: false,
        canListen: true,
        listenWhitelist: '',
        listenBlacklist: ''
    };

    setLoading('btn-submit-create-user', true);
    try {
        const res = await fetch(`${API_BASE_URL}/admin/create-user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        setLoading('btn-submit-create-user', false, 'צור חשבון <i class="fa-solid fa-check"></i>');
        
        if (res.ok && data.success) {
            closeCreateUserModal();
            showToast('החשבון נוצר בהצלחה!', 'success');
            loadAdminUsers();
        } else {
            showToast(data.error || 'אירעה שגיאה ביצירת החשבון', 'error');
        }
    } catch (e) {
        setLoading('btn-submit-create-user', false, 'צור חשבון <i class="fa-solid fa-check"></i>');
        showToast('שגיאת תקשורת מול השרת', 'error');
    }
};

window.switchAdminProfileTab = function(tab) {
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
};

window.closeUserProfileModal = function() {
    document.getElementById('adminUserProfileModal').classList.remove('active');
};

window.openUserProfile = async function(phone) {
    const modal = document.getElementById('adminUserProfileModal');
    const alertBox = document.getElementById('alert-admin-profile');
    alertBox.style.display = 'none';
    
    document.getElementById('prof_phone').value = phone;
    document.getElementById('prof_phone_hidden').value = phone;
    document.getElementById('prof_name').value = 'טוען...';
    document.getElementById('prof_email').value = '';
    document.getElementById('prof_password').value = '';
    document.getElementById('prof_listen_whitelist').value = '';
    document.getElementById('prof_listen_blacklist').value = '';
    document.getElementById('prof_picture_url').value = '';
    document.getElementById('prof_lock_picture').checked = false;
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
        
        if (!res.ok) { showToast(data.error || 'שגיאה בטעינת פרופיל', 'error'); return; }

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
            document.getElementById('prof_can_listen').checked = p.user.can_listen !== 0;
            document.getElementById('prof_receive_emails').checked = p.user.receive_emails !== 0;
            document.getElementById('prof_google_only').checked = p.user.google_login_only === 1;
            document.getElementById('prof_listen_whitelist').value = p.user.listen_whitelist || '';
            document.getElementById('prof_listen_blacklist').value = p.user.listen_blacklist || '';
            document.getElementById('prof_picture_url').value = p.user.profile_picture_url || '';
            document.getElementById('prof_lock_picture').checked = p.user.lock_profile_picture === 1;
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
                    <td><button type="button" class="actions-btn" onclick="disconnectAdminUserToken('${sess.id}')" style="color:var(--danger); border-color:var(--danger); padding:4px 8px; font-size:0.8rem;"><i class="fa-solid fa-plug-circle-xmark"></i> נתק מכשיר</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) { showToast('שגיאת תקשורת מול השרת', 'error'); }
};

window.submitAdminUserUpdate = async function(e) {
    if (e) e.preventDefault();
    const phone = document.getElementById('prof_phone_hidden').value;
    
    const payload = {
        adminToken: state.adminToken, phone: phone,
        newEmail: document.getElementById('prof_email').value,
        newPassword: document.getElementById('prof_password').value,
        canRecord: document.getElementById('prof_can_record').checked,
        canUpload: document.getElementById('prof_can_upload').checked,
        canTzintuk: document.getElementById('prof_can_tzintuk').checked,
        canListen: document.getElementById('prof_can_listen').checked,
        receiveEmails: document.getElementById('prof_receive_emails').checked,
        googleLoginOnly: document.getElementById('prof_google_only').checked,
        listenWhitelist: document.getElementById('prof_listen_whitelist').value,
        listenBlacklist: document.getElementById('prof_listen_blacklist').value,
        profilePictureUrl: document.getElementById('prof_picture_url').value,
        lockProfilePicture: document.getElementById('prof_lock_picture').checked
    };

    setLoading('btn-save-user-profile', true);
    try {
        const res = await fetch(`${API_BASE_URL}/admin/update-user`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        setLoading('btn-save-user-profile', false, 'שמור שינויים <i class="fa-solid fa-check"></i>');
        if (!res.ok) { showToast(data.error || 'שגיאה בעדכון', 'error'); return; }
        
        showToast('הגדרות המשתמש נשמרו בהצלחה', 'success');
        document.getElementById('prof_password').value = ''; 
        loadAdminUsers();
    } catch (err) {
        setLoading('btn-save-user-profile', false, 'שמור שינויים <i class="fa-solid fa-check"></i>');
        showToast('שגיאת תקשורת', 'error');
    }
};

window.disconnectAdminUserToken = async function(tokenId) {
    const phone = document.getElementById('prof_phone_hidden').value;
    const msg = tokenId ? 'האם לנתק את המכשיר הספציפי הזה?' : 'האם לנתק את המשתמש מ*כל* המכשירים המחוברים?';
    if (!confirm(msg)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/user-tokens/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken, phone: phone, tokenId: tokenId }) });
        const data = await res.json();
        if (res.ok) { showToast(data.message || 'הניתוק בוצע בהצלחה', 'success'); openUserProfile(phone); }
        else { showToast(data.error || 'שגיאה בניתוק', 'error'); }
    } catch (err) { showToast('שגיאת תקשורת', 'error'); }
};

window.adminDeleteAccount = async function() {
    const phone = document.getElementById('prof_phone_hidden').value;
    if (!phone) return;
    
    if (!confirm(`אזהרה חמורה!\nהאם אתה בטוח שברצונך למחוק לחלוטין את החשבון של ${phone} מהאתר?\nפעולה זו תמחק את כל ההרשאות, האימייל, והמכשירים המחוברים, והיא לא ניתנת לביטול.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/admin/delete-user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, phone: phone })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            showToast('החשבון נמחק בהצלחה לצמיתות', 'success');
            closeUserProfileModal();
            loadAdminUsers();
        } else {
            showToast(data.error || 'אירעה שגיאה במחיקת החשבון', 'error');
        }
    } catch (e) {
        showToast('שגיאת תקשורת מול השרת', 'error');
    }
};

window.refreshTzintukData = async function() {
    const btn = document.getElementById('btn-refresh-tzintuk');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מרענן נתונים...'; btn.disabled = true; }
    await Promise.all([loadVerifyBlocks(), loadVerifyLogs()]);
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> רענן נתונים'; btn.disabled = false; }
    showToast('הנתונים רועננו בהצלחה', 'success');
};

window.loadVerifyBlocks = async function() {
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
                <td><button type="button" class="actions-btn" onclick="unblockUser('${b.block_type}', '${b.block_value}')"><i class="fa-solid fa-unlock"></i> הסר</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="color:var(--danger);">שגיאת תקשורת</td></tr>'; }
};

window.loadVerifyLogs = async function() {
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
};

window.submitManualBlock = async function(e) {
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
        if (res.ok) { 
            document.getElementById('block_value').value = ''; 
            document.getElementById('block_reason').value = ''; 
            refreshTzintukData(); 
            showToast('החסימה הופעלה בהצלחה', 'success');
        } else {
            showToast(data.error || 'שגיאה ביצירת חסימה', 'error');
        }
    } catch (err) { 
        setLoading('btn-submit-block', false, 'החל חסימה <i class="fa-solid fa-lock"></i>'); 
        showToast('שגיאת תקשורת', 'error');
    }
};

window.unblockUser = async function(type, value) {
    if (!confirm(`לשחרר חסימה על ${value}?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/verify/admin/unblock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken, type, target: value }) });
        if (res.ok) {
            refreshTzintukData();
            showToast('החסימה הוסרה', 'success');
        } else {
            showToast((await res.json()).error || 'שגיאה', 'error');
        }
    } catch (err) { showToast('שגיאת תקשורת', 'error'); }
};

window.cleanOldLogs = async function() {
    if (!confirm('למחוק לצמיתות לוגים ישנים?')) return;
    const btn = document.getElementById('btn-clean-logs');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מנקה...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE_URL}/verify/admin/clean`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken }) });
        if (res.ok) {
            refreshTzintukData();
            showToast('לוגים ישנים נוקו בהצלחה', 'success');
        } else {
            showToast((await res.json()).error || 'שגיאה', 'error');
        }
    } catch (err) { showToast('שגיאת תקשורת', 'error'); } 
    finally { btn.innerHTML = originalText; btn.disabled = false; }
};

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
