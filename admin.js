const adminJsContent = \`async function adminLogin(e) {
    if (e) e.preventDefault();
    const username = document.getElementById('admin_user').value;
    const password = document.getElementById('admin_pass').value;

    setLoading('btn-admin-login', true);
    try {
        const res = await fetch(\`\${API_BASE_URL}/admin/login\`, {
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

async function loadAdminUsers() {
    if (!state.adminToken) return;
    const tbody = document.getElementById('admin-users-table-body');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען נתונים...</td></tr>';
    setLoading('btn-refresh-users', true);
    try {
        const res = await fetch(\`\${API_BASE_URL}/admin/users\`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken })
        });
        const data = await res.json();
        setLoading('btn-refresh-users', false, '<i class="fa-solid fa-rotate-right"></i> רענן נתונים');
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }
            showMessage('alert-admin-dash', data.message || data.error || 'שגיאה', 'error');
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="color:var(--danger);">שגיאה בטעינה</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        if(data.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">אין משתמשים.</td></tr>';
            return;
        }

        data.users.forEach(user => {
            const isTz = (user.connectedToTzintukim === 'yes' || user.connectedToTzintukim === true || user.connectedToTzintukim === '1');
            const badgeHtml = isTz ? '<span class="status-ok">פעיל</span>' : '<span class="status-bad">מנותק</span>';
            const recordHtml = user.canRecord ? '<span class="status-ok">מורשה</span>' : '<span class="status-bad">חסום</span>';
            const uploadHtml = user.canUpload ? '<span class="status-ok">מורשה</span>' : '<span class="status-bad">חסום</span>';
 
            const tr = document.createElement('tr');
            tr.innerHTML = \`
                <td style="font-weight:700; direction:ltr; text-align:right;">\${user.phone}</td>
                <td>\${user.name || ''}</td>
                <td dir="ltr" style="text-align:right;">\${user.email || '-'}</td>
                <td>\${badgeHtml}</td>
                <td>\${recordHtml}</td>
                <td>\${uploadHtml}</td>
                <td><button class="actions-btn" onclick="openAdminModal('\${user.phone}', '\${user.email || ''}', \${user.canUpload}, \${user.canRecord})"><i class="fa-solid fa-pen"></i> עריכה</button></td>
            \`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        setLoading('btn-refresh-users', false, '<i class="fa-solid fa-rotate-right"></i> רענן נתונים');
        showMessage('alert-admin-dash', 'שגיאת שרת', 'error');
    }
}

function openAdminModal(phone, email, canUpload, canRecord) {
    document.getElementById('modal_phone').value = phone;
    document.getElementById('modal_email').value = email;
    document.getElementById('modal_password').value = '';
    
    const checkUpload = document.getElementById('modal_can_upload');
    if(checkUpload) checkUpload.checked = canUpload;
    
    const checkRecord = document.getElementById('modal_can_record');
    if(checkRecord) checkRecord.checked = canRecord;
    
    document.getElementById('alert-modal').style.display = 'none';
    document.getElementById('adminEditModal').classList.add('active');
}

function closeAdminModal() {
    document.getElementById('adminEditModal').classList.remove('active');
}

async function submitAdminUpdate(e) {
    if (e) e.preventDefault();
    const phone = document.getElementById('modal_phone').value;
    const newEmail = document.getElementById('modal_email').value;
    const newPassword = document.getElementById('modal_password').value;
    
    const checkUpload = document.getElementById('modal_can_upload');
    const canUpload = checkUpload ? checkUpload.checked : false;

    const checkRecord = document.getElementById('modal_can_record');
    const canRecord = checkRecord ? checkRecord.checked : true;

    setLoading('btn-modal-save', true);
    try {
        const res = await fetch(\`\${API_BASE_URL}/admin/update-user\`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, phone, newEmail, newPassword, canUpload, canRecord })
        });
        const data = await res.json();
        setLoading('btn-modal-save', false, 'שמור שינויים <i class="fa-solid fa-check"></i>');
        if (!res.ok) {
            showMessage('alert-modal', data.message || data.error || 'עדכון נכשל', 'error');
            return;
        }

        closeAdminModal();
        showMessage('alert-admin-dash', 'המשתמש עודכן בהצלחה!', 'success');
        loadAdminUsers();
    } catch (err) {
        setLoading('btn-modal-save', false, 'שמור שינויים <i class="fa-solid fa-check"></i>');
        showMessage('alert-modal', 'שגיאת רשת', 'error');
    }
}

async function refreshTzintukData() {
    const btn = document.getElementById('btn-refresh-tzintuk');
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מרענן נתונים...';
        btn.disabled = true;
    }
    
    await Promise.all([loadVerifyBlocks(), loadVerifyLogs()]);
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> רענן נתונים';
        btn.disabled = false;
    }
}

async function loadVerifyBlocks() {
    if (!state.adminToken) return;
    const tbody = document.getElementById('admin-blocks-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען נתוני חסימות...</td></tr>';
    try {
        const res = await fetch(\`\${API_BASE_URL}/admin/blocks\`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken })
        });
        const data = await res.json();
        
        if (!res.ok) {
            tbody.innerHTML = \`<tr><td colspan="6" class="empty-state" style="color:var(--danger);">\${data.error || 'שגיאה בטעינת חסימות'}</td></tr>\`;
            return;
        }

        tbody.innerHTML = '';
        if (!data.blocks || data.blocks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">אין חסימות פעילות במערכת.</td></tr>';
            window.currentActiveBlocks = 0;
            return;
        }

        window.currentActiveBlocks = data.blocks.length;
        data.blocks.forEach(b => {
            const isIp = b.block_type === 'ip';
            const icon = isIp ? '<i class="fa-solid fa-network-wired"></i>' : '<i class="fa-solid fa-phone"></i>';
            const typeName = isIp ? 'כתובת IP' : 'מספר טלפון';
            
            const tr = document.createElement('tr');
            tr.innerHTML = \`
                <td>\${icon} \${typeName}</td>
                <td dir="ltr" style="font-weight:700;">\${b.block_value}</td>
                <td>\${b.reason || 'ללא סיבה מוצהרת'}</td>
                <td dir="ltr" style="color: var(--text-light);">\${formatDateStr(b.created_at)}</td>
                <td dir="ltr">\${b.expires_at ? formatDateStr(b.expires_at) : '<span style="color:var(--danger);font-weight:bold;"><i class="fa-solid fa-ban"></i> לצמיתות</span>'}</td>
                <td><button class="actions-btn" onclick="unblockUser('\${b.block_type}', '\${b.block_value}')"><i class="fa-solid fa-unlock"></i> הסר חסימה</button></td>
            \`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="color:var(--danger);">שגיאת תקשורת</td></tr>';
    }
}

async function loadVerifyLogs() {
    if (!state.adminToken) return;
    const tbody = document.getElementById('admin-logs-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען היסטוריית לוגים...</td></tr>';
    try {
        const res = await fetch(\`\${API_BASE_URL}/admin/logs\`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, limit: 150 })
        });
        const data = await res.json();
        
        if (!res.ok) {
            tbody.innerHTML = \`<tr><td colspan="7" class="empty-state" style="color:var(--danger);">\${data.error || 'שגיאה בטעינת לוגים'}</td></tr>\`;
            return;
        }

        tbody.innerHTML = '';
        if (!data.logs || data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">אין דוחות להצגה.</td></tr>';
            updateSecurityStats(window.currentActiveBlocks || 0, 0, 0);
            return;
        }

        let warnCount = 0;
        let blockEventCount = 0;

        data.logs.forEach(log => {
            if (log.level === 'WARN') warnCount++;
            if (log.level === 'BLOCKED') blockEventCount++;

            const levelBadge = getLevelBadge(log.level);
            const actionBadge = getActionBadge(log.action);
            
            const tr = document.createElement('tr');
            tr.innerHTML = \`
                <td style="color: var(--text-light); font-size: 0.85rem; font-weight: bold;">#\${log.id}</td>
                <td dir="ltr" style="white-space: nowrap; font-size: 0.85rem; color: #475569;">\${formatDateStr(log.timestamp)}</td>
                <td>\${levelBadge}</td>
                <td>\${actionBadge}</td>
                <td dir="ltr" style="font-weight:700;">\${log.phone || '-'}</td>
                <td dir="ltr" style="font-size:0.85rem; color: var(--text-light); font-family: monospace;">\${log.ip_address || '-'}</td>
                <td style="max-width: 250px; white-space: normal; line-height: 1.4; font-size: 0.85rem;">\${log.details || ''}</td>
            \`;
            tbody.appendChild(tr);
        });
        updateSecurityStats(window.currentActiveBlocks || 0, warnCount, blockEventCount);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="color:var(--danger);">שגיאת תקשורת בטעינת לוגים</td></tr>';
    }
}

function formatDateStr(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split(' ');
        if (parts.length === 2) {
            const dateParts = parts[0].split('-');
            return \`\${dateParts[2]}/\${dateParts[1]}/\${dateParts[0].substring(2)} \${parts[1].substring(0,5)}\`;
        }
        return dateStr;
    } catch(e) { return dateStr; }
}

function getLevelBadge(level) {
    switch(level) {
        case 'INFO': return '<span class="badge-level info"><i class="fa-solid fa-circle-info"></i> מידע</span>';
        case 'WARN': return '<span class="badge-level warn"><i class="fa-solid fa-triangle-exclamation"></i> חריגה</span>';
        case 'BLOCKED': return '<span class="badge-level blocked"><i class="fa-solid fa-shield-virus"></i> נבלם</span>';
        default: return \`<span class="badge-level info">\${level}</span>\`;
    }
}

function getActionBadge(action) {
    const actions = {
        'VERIFY_SUCCESS': { label: 'אימות הושלם', class: 'success' },
        'SEND_REQUEST': { label: 'שליחת צינתוק', class: 'info' },
        'RATE_LIMIT': { label: 'הגבלת קצב (ספאם)', class: 'warn' },
        'VERIFY_CODE': { label: 'בדיקת קוד', class: 'neutral' },
        'ADMIN_BLOCK_CREATE': { label: 'חסימה יזומה', class: 'danger' },
        'ADMIN_BLOCK_UPDATE': { label: 'עדכון חסימה', class: 'warn' },
        'ADMIN_UNBLOCK': { label: 'שחרור חסימה', class: 'success' },
        'SEND_REJECTED': { label: 'שליחה נדחתה', class: 'danger' }
    };
    const mapped = actions[action];
    if (mapped) {
        return \`<span class="badge-action \${mapped.class}">\${mapped.label}</span>\`;
    }
    return \`<span class="badge-action neutral">\${action}</span>\`;
}

function updateSecurityStats(activeBlocks, warnings, blockEvents) {
    const container = document.getElementById('security-stats');
    if (!container) return;
    
    container.innerHTML = \`
        <div class="stat-card">
            <div class="stat-icon" style="color: #ef4444; background: #fee2e2;"><i class="fa-solid fa-ban"></i></div>
            <div class="stat-info">
                <h3>\${activeBlocks}</h3>
                <p>חסימות פעילות כעת</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="color: #d97706; background: #fef3c7;"><i class="fa-solid fa-bolt"></i></div>
            <div class="stat-info">
                <h3>\${warnings}</h3>
                <p>חריגות והגבלות קצב</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="color: #15803d; background: #dcfce7;"><i class="fa-solid fa-shield-halved"></i></div>
            <div class="stat-info">
                <h3>\${blockEvents}</h3>
                <p>התקפות שנבלמו</p>
            </div>
        </div>
    \`;
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
        const res = await fetch(\`\${API_BASE_URL}/admin/block\`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, type, value, reason, duration, unit })
        });
        const data = await res.json();
        setLoading('btn-submit-block', false, 'החל חסימה <i class="fa-solid fa-lock"></i>');
        if (res.ok) {
            document.getElementById('block_value').value = '';
            document.getElementById('block_reason').value = '';
            refreshTzintukData(); 
        } else {
            alert(data.error || 'שגיאה ביצירת חסימה');
        }
    } catch (err) {
        setLoading('btn-submit-block', false, 'החל חסימה <i class="fa-solid fa-lock"></i>');
        alert('שגיאת תקשורת');
    }
}

async function unblockUser(type, value) {
    if (!confirm(\`האם אתה בטוח שברצונך לשחרר את החסימה על \${value}?\`)) return;
    try {
        const res = await fetch(\`\${API_BASE_URL}/admin/unblock\`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, type, value })
        });
        if (res.ok) {
            refreshTzintukData();
        } else {
            const data = await res.json();
            alert(data.error || 'שגיאה בשחרור החסימה');
        }
    } catch (err) {
        alert('שגיאת תקשורת');
    }
}

async function cleanOldLogs() {
    if (!confirm('פעולה זו תמחק לצמיתות את כל הלוגים הישנים במערכת. להמשיך?')) return;
    const btn = document.getElementById('btn-clean-logs');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מנקה...';
    btn.disabled = true;
    try {
        const res = await fetch(\`\${API_BASE_URL}/admin/clean-logs\`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken })
        });
        if (res.ok) {
            refreshTzintukData();
        } else {
            const data = await res.json();
            alert(data.error || 'שגיאה בניקוי הלוגים');
        }
    } catch (err) {
        alert('שגיאת תקשורת');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}\`;

export default adminJsContent;
