// הזרקת המודלים בטעינת העמוד
document.addEventListener('DOMContentLoaded', injectSettingsModal);

function updateDashboardUI() {
    const user = state.currentUser;
    if (!user) return;
    
    document.getElementById('ui-user-name').innerText = user.name || 'אורח';
    
    // סידור מספר הטלפון משמאל לימין בתוך הטקסט
    document.getElementById('ui-user-phone').innerHTML = `<span dir="ltr" style="font-weight:600; color:var(--text-main); font-family: monospace; font-size: 0.9rem;">${user.phone}</span>`;
    
    // עדכון תמונת פרופיל מתקדמת - יוקרתית ונקייה
    const avatarDiv = document.querySelector('.user-profile-wrap .avatar');
    if (avatarDiv) {
        if (user.profilePictureUrl && user.profilePictureUrl.trim() !== '') {
            avatarDiv.innerHTML = `<img src="${user.profilePictureUrl}" class="avatar-img" draggable="false" oncontextmenu="return false;" alt="פרופיל">`;
        } else {
            // עיצוב יוקרתי למי שאין תמונה - אות בתוך עיגול עם צבעים רכים
            const firstLetter = (user.name && user.name.trim().length > 0) ? user.name.trim().charAt(0) : 'א';
            avatarDiv.innerHTML = `<div style="width: 100%; height: 100%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.6rem; font-family: system-ui;">${firstLetter}</div>`;
        }
    }
    
    const authIcon = user.authMethod === 'google' 
        ? `<div class="auth-icon-circle google" title="חשבון Google"><i class="fa-brands fa-google"></i></div>`
        : `<div class="auth-icon-circle password" title="סיסמה"><i class="fa-solid fa-lock"></i></div>`;
        
    const tokenIcon = user.tokenType === 'permanent' 
        ? `<div class="auth-icon-circle perm" title="מכשיר מוכר"><i class="fa-solid fa-infinity"></i></div>`
        : `<div class="auth-icon-circle temp" title="חיבור זמני"><i class="fa-solid fa-hourglass-half"></i></div>`;

    const badgeContainer = document.getElementById('ui-auth-badges');
    if (badgeContainer) badgeContainer.innerHTML = `${authIcon}${tokenIcon}`;

    const tzIcon = document.getElementById('ui-tzintuk-icon');
    const isConnected = (user.connectedToTzintukim === 'yes' || user.connectedToTzintukim === true || user.connectedToTzintukim === '1');
    if(tzIcon) {
        if (isConnected) {
            tzIcon.innerHTML = '<i class="fa-solid fa-phone-volume" style="color: var(--success); cursor: help;" title="מחובר לצינתוקים"></i>';
        } else {
            tzIcon.innerHTML = '<i class="fa-solid fa-phone-slash" style="color: var(--danger); cursor: help;" title="מנותק מצינתוקים"></i>';
        }
    }

    const uploadArea = document.getElementById('chat-upload-area');
    const statusText = document.getElementById('chat-upload-status');
    const recordBtn = document.getElementById('chat-record-btn');
    const attachBtn = document.getElementById('chat-attach-btn');
    if (uploadArea && statusText && recordBtn && attachBtn) {
        uploadArea.classList.remove('disabled');
        recordBtn.classList.remove('disabled');
        attachBtn.classList.remove('disabled');

        if (user.canRecord) {
            statusText.innerText = 'הקלט או בחר קובץ להעלאה';
        } else {
            recordBtn.classList.add('disabled');
            statusText.innerText = 'הקלטה חסומה (ניתן להעלות קובץ)';
        }

        if (!user.canRecord && !user.canUpload) {
            uploadArea.classList.add('disabled');
            statusText.innerText = 'אין לך הרשאות כתיבה או העלאה למערכת';
        }
    }
}

// ==========================================
// הגדרות חשבון הלקוח
// ==========================================

const US = { tab: 'account', initial: null, security: null, busy: false };

function usEsc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function usDate(str) {
    if (!str) return '';
    const [d, t] = String(str).split(' ');
    const [y, m, day] = (d || '').split('-');
    return `${day}/${m}/${String(y).slice(2)} ${String(t || '').slice(0, 5)}`;
}

function usRelative(str) {
    if (!str) return '';
    const d = new Date(String(str).replace(' ', 'T'));
    if (isNaN(d)) return usDate(str);
    const sec = (Date.now() - d.getTime()) / 1000;
    if (sec < 90) return 'עכשיו';
    if (sec < 3600) return `לפני ${Math.round(sec / 60)} דק׳`;
    if (sec < 86400) return `לפני ${Math.round(sec / 3600)} שע׳`;
    return usDate(str);
}

async function usPost(path, body) {
    const res = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userToken: state.userToken, ...body }) });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok && data.success !== false, status: res.status, data };
}

function usToast(msg, type = 'success') {
    if (typeof showToast === 'function') showToast(msg, type);
}

function usAlert(msg, type = 'error') {
    const box = document.getElementById('alert-settings');
    if (!box) return;
    if (!msg) { box.style.display = 'none'; return; }
    box.className = `us-alert ${type}`;
    box.innerHTML = msg;
    box.style.display = 'flex';
}

// ---------- פתיחה, סגירה וניווט ----------

function openUserSettingsModal(tab) {
    const user = state.currentUser;
    if (!user) return;
    fillUserSettings(user);
    switchSettingsTab(typeof tab === 'string' ? tab : 'account');
    document.getElementById('userSettingsModal').classList.add('active');
    loadSecurityInfo();
}

function closeUserSettingsModal(force) {
    if (force !== true && usDirty() && !confirm('יש שינויים שלא נשמרו. לצאת בלי לשמור?')) return;
    document.getElementById('userSettingsModal').classList.remove('active');
}

function switchSettingsTab(tab) {
    US.tab = tab;
    document.querySelectorAll('#userSettingsModal .us-nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('#userSettingsModal .us-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
    usAlert('');
    if (tab === 'devices' && !US.security) loadSecurityInfo();
}

function fillUserSettings(user) {
    const name = user.name || 'משתמש';
    const pic = user.profilePictureUrl && /^https?:\/\//i.test(user.profilePictureUrl)
        ? `<img src="${usEsc(user.profilePictureUrl)}" alt="" referrerpolicy="no-referrer">` : usEsc(name.trim().charAt(0) || 'א');
    const connected = user.connectedToTzintukim === true || user.connectedToTzintukim === 'yes' || user.connectedToTzintukim === '1';
    document.getElementById('us-hero').innerHTML = `
        <div class="us-avatar">${pic}</div>
        <div class="us-hero-text">
            <b>${usEsc(name)}</b>
            <span dir="ltr">${usEsc(user.phone)}</span>
            <div class="us-chips">
                <span class="us-chip ${connected ? 'good' : 'bad'}"><i class="fa-solid fa-phone-${connected ? 'volume' : 'slash'}"></i> ${connected ? 'מחובר לצינתוקים' : 'מנותק מצינתוקים'}</span>
                <span class="us-chip"><i class="fa-${user.authMethod === 'google' ? 'brands fa-google' : 'solid fa-lock'}"></i> ${user.authMethod === 'google' ? 'מחובר עם Google' : 'מחובר עם סיסמה'}</span>
                <span class="us-chip"><i class="fa-solid fa-${user.tokenType === 'permanent' ? 'infinity' : 'hourglass-half'}"></i> ${user.tokenType === 'permanent' ? 'מכשיר מוכר' : 'חיבור זמני'}</span>
            </div>
        </div>`;

    document.getElementById('us-name').textContent = name;
    document.getElementById('us-phone').textContent = user.phone;
    document.getElementById('update_email').value = user.email || '';
    document.getElementById('update_receive_emails').checked = !!user.receiveEmails;
    document.getElementById('update_google_only').checked = !!user.googleLoginOnly;
    document.getElementById('update_auth_pass').value = '';
    US.initial = { email: user.email || '', receive: !!user.receiveEmails, google: !!user.googleLoginOnly };

    const blocked = document.getElementById('email_blocked_warning');
    blocked.style.display = user.emailGloballyBlocked ? 'flex' : 'none';
    const unblock = document.getElementById('btn_unblock_email');
    unblock.style.display = user.authMethod === 'google' ? 'inline-flex' : 'none';
    document.getElementById('email_blocked_text').innerHTML = user.authMethod === 'google'
        ? 'כתובת המייל שלך ברשימת החסימה, ולכן לא יישלחו אליה הודעות. מכיוון שהתחברת עם Google, אפשר לשחרר את החסימה עכשיו.'
        : 'כתובת המייל שלך ברשימת החסימה, ולכן לא יישלחו אליה הודעות. <b>לשחרור:</b> התחבר מחדש עם Google של כתובת זו.';

    const googleHint = document.getElementById('us-google-hint');
    googleHint.textContent = user.authMethod === 'google'
        ? 'כשמופעל, לא ניתן יהיה להתחבר עם סיסמה. הכניסה תתאפשר רק עם חשבון ה-Google של כתובת המייל שלך.'
        : 'כדי להפעיל אפשרות זו, יש להתחבר קודם עם Google של כתובת המייל שבחשבון.';
    document.getElementById('update_google_only').disabled = user.authMethod !== 'google' && !user.googleLoginOnly;

    document.getElementById('settings-security-form').reset();
    renderNotifySetting();
    usRefreshDirty();
}

// ---------- שמירת פרטי החשבון (מייל, עדכונים, Google בלבד) ----------

function usCurrent() {
    return {
        email: document.getElementById('update_email').value.trim(),
        receive: document.getElementById('update_receive_emails').checked,
        google: document.getElementById('update_google_only').checked,
    };
}

function usDirty() {
    if (!US.initial) return false;
    const c = usCurrent();
    return c.email !== US.initial.email || c.receive !== US.initial.receive || c.google !== US.initial.google;
}

function usRefreshDirty() {
    const dirty = usDirty();
    const bar = document.getElementById('unsaved-changes-banner');
    bar.classList.toggle('show', dirty);
    const needPass = dirty && state.currentUser && state.currentUser.authMethod === 'password';
    document.getElementById('profile_password_auth').style.display = needPass ? 'flex' : 'none';
    ['us-row-email', 'us-row-receive', 'us-row-google'].forEach((id, i) => {
        const c = usCurrent();
        const key = ['email', 'receive', 'google'][i];
        document.getElementById(id).classList.toggle('changed', !!US.initial && c[key] !== US.initial[key]);
    });
}

async function updateUserProfile(e) {
    if (e) e.preventDefault();
    if (!usDirty()) return;
    const c = usCurrent();
    const payload = { newEmail: c.email, receiveEmails: c.receive, googleLoginOnly: c.google };
    if (state.currentUser.authMethod === 'password') {
        payload.password = document.getElementById('update_auth_pass').value;
        if (!payload.password) { usAlert('כדי לשמור שינויים יש להזין את הסיסמה הנוכחית שלך.'); document.getElementById('update_auth_pass').focus(); return; }
    }
    setLoading('btn-update-profile', true);
    const r = await usPost('/update-profile', payload);
    setLoading('btn-update-profile', false, '<i class="fa-solid fa-check"></i> שמירת שינויים');
    if (!r.ok) { usAlert(String(r.data.error || r.data.message || 'השמירה נכשלה').replace(/\n/g, '<br>')); return; }
    usAlert(String(r.data.message || 'השינויים נשמרו').replace(/\n/g, '<br>'), r.data.partialUpdate ? 'warning' : 'success');

    const me = await usPost('/user', {});
    if (me.ok && me.data.user) {
        state.currentUser = me.data.user;
        if (typeof updateDashboardUI === 'function') updateDashboardUI();
        fillUserSettings(me.data.user);
    }
}

// ---------- סיסמה ----------

function usPasswordStrength() {
    const v = document.getElementById('change_new_pass').value;
    const meter = document.getElementById('us-pass-meter');
    const ok = /^\d{4,10}$/.test(v);
    const level = !v ? 0 : !ok ? 1 : v.length >= 8 && new Set(v).size >= 4 ? 3 : 2;
    meter.dataset.level = level;
    meter.querySelector('span').textContent = ['', 'הסיסמה חייבת להכיל 4–10 ספרות', 'תקינה', 'חזקה'][level];
}

async function updatePassword(e) {
    if (e) e.preventDefault();
    const oldPassword = document.getElementById('change_old_pass').value;
    const newPassword = document.getElementById('change_new_pass').value;
    const newPasswordConfirm = document.getElementById('change_new_pass_confirm').value;
    const logoutAllDevices = document.getElementById('change_logout_devices').checked;
    if (!/^\d{4,10}$/.test(newPassword)) { usAlert('הסיסמה החדשה חייבת להכיל 4–10 ספרות בלבד.'); return; }
    if (newPassword !== newPasswordConfirm) { usAlert('הסיסמאות החדשות אינן תואמות.'); return; }

    setLoading('btn-change-password', true);
    const r = await usPost('/change-password', { oldPassword, newPassword, newPasswordConfirm, logoutAllDevices });
    setLoading('btn-change-password', false, '<i class="fa-solid fa-key"></i> עדכון סיסמה');
    if (!r.ok) { usAlert(String(r.data.error || r.data.message || 'השינוי נכשל').replace(/\n/g, '<br>')); return; }
    usAlert(String(r.data.message || 'הסיסמה שונתה בהצלחה').replace(/\n/g, '<br>'), 'success');
    document.getElementById('settings-security-form').reset();
    usPasswordStrength();
    if (logoutAllDevices) setTimeout(() => { closeUserSettingsModal(true); logout(); }, 2200);
    else loadSecurityInfo();
}

// ---------- מכשירים והיסטוריה ----------

const US_EVENTS = {
    LOGIN: ['התחברות', 'fa-right-to-bracket', 'good'],
    LOGIN_MASTER: ['כניסת הנהלה לחשבון', 'fa-user-shield', 'warn'],
    LOGIN_FAILED: ['ניסיון התחברות שנכשל', 'fa-triangle-exclamation', 'bad'],
    LOGOUT: ['התנתקות', 'fa-right-from-bracket', ''],
    PASSWORD_CHANGE: ['שינוי סיסמה', 'fa-key', 'warn'],
    PASSWORD_RESET: ['איפוס סיסמה', 'fa-key', 'warn'],
    PROFILE_UPDATE: ['עדכון הגדרות', 'fa-user-pen', ''],
    EMAIL_LINK_OPENED: ['כניסה מקישור במייל', 'fa-envelope-open-text', 'info'],
    REGISTER: ['פתיחת החשבון', 'fa-user-plus', 'good'],
};

async function loadSecurityInfo() {
    const list = document.getElementById('us-sessions');
    if (!list) return;
    if (!US.security) list.innerHTML = '<div class="us-empty"><i class="fa-solid fa-circle-notch fa-spin"></i></div>';
    const r = await usPost('/account/security', {});
    if (!r.ok) { list.innerHTML = `<div class="us-empty">${usEsc(r.data.error || 'לא ניתן לטעון את הנתונים')}</div>`; return; }
    US.security = r.data;
    renderSecurityInfo();
}

function renderSecurityInfo() {
    const d = US.security || { sessions: [], history: [] };
    const methodText = m => m === 'google' ? 'Google' : m === 'email_link' ? 'קישור מהמייל' : 'סיסמה';
    document.getElementById('us-sessions-count').textContent = d.sessions.length ? `${d.sessions.length} מכשירים` : '';
    document.getElementById('us-sessions').innerHTML = d.sessions.length ? d.sessions.map(s => `
        <div class="us-item">
            <div class="us-ico ${s.current ? 'good' : ''}"><i class="fa-${s.method === 'google' ? 'brands fa-google' : s.method === 'email_link' ? 'solid fa-envelope' : 'solid fa-lock'}"></i></div>
            <div class="us-item-body">
                <b>${s.current ? 'המכשיר הזה' : `חיבור עם ${methodText(s.method)}`} ${s.current ? '<span class="us-tag good">פעיל עכשיו</span>' : ''} <span class="us-tag">${s.persistent ? 'קבוע' : 'זמני'}</span></b>
                <small>התחבר ${usEsc(usDate(s.createdAt))} · פעילות אחרונה ${usEsc(usRelative(s.lastUsedAt))}${s.email ? ` · <span dir="ltr">${usEsc(s.email)}</span>` : ''}</small>
            </div>
            ${s.current ? '' : `<button type="button" class="us-btn danger sm" data-revoke="${usEsc(s.handle)}"><i class="fa-solid fa-plug-circle-xmark"></i> ניתוק</button>`}
        </div>`).join('') : '<div class="us-empty">אין מכשירים מחוברים</div>';
    document.getElementById('us-revoke-others').hidden = d.sessions.filter(s => !s.current).length === 0;

    document.getElementById('us-history').innerHTML = d.history.length ? d.history.map(h => {
        const [label, icon, tone] = US_EVENTS[h.action] || [h.action, 'fa-circle', ''];
        const extra = h.action === 'LOGIN' && h.meta ? (h.meta.method === 'google' ? 'עם Google' : 'עם סיסמה') : h.action === 'LOGIN_FAILED' && h.meta ? h.meta.reason : '';
        return `<div class="us-item">
            <div class="us-ico ${tone}"><i class="fa-solid ${icon}"></i></div>
            <div class="us-item-body"><b>${usEsc(label)}${extra ? ` <span class="us-muted">· ${usEsc(extra)}</span>` : ''}</b><small>${usEsc(usDate(h.createdAt))}${h.device ? ` · ${usEsc(h.device)}` : ''}${h.ip ? ` · <span dir="ltr">${usEsc(h.ip)}</span>` : ''}</small></div>
        </div>`;
    }).join('') : '<div class="us-empty">עדיין אין פעילות מתועדת</div>';
}

async function revokeDevice(handle) {
    const others = !handle;
    if (!confirm(others ? 'לנתק את כל המכשירים האחרים? הם יצטרכו להתחבר מחדש.' : 'לנתק את המכשיר הזה?')) return;
    const r = await usPost('/account/security', others ? { revokeOthers: true } : { revoke: handle });
    if (!r.ok) { usAlert(r.data.error || 'הניתוק נכשל'); return; }
    US.security = r.data;
    renderSecurityInfo();
    usToast(others ? 'כל שאר המכשירים נותקו' : 'המכשיר נותק');
}

// ---------- התראות דפדפן לצ'אט ----------

function renderNotifySetting() {
    const n = window.salamonChatNotifications;
    const input = document.getElementById('us-browser-notify');
    const hint = document.getElementById('us-browser-notify-hint');
    if (!n || !n.supported()) { input.checked = false; input.disabled = true; hint.textContent = 'הדפדפן הזה לא תומך בהתראות.'; return; }
    const perm = n.permission();
    input.disabled = perm === 'denied';
    input.checked = n.enabled();
    hint.textContent = perm === 'denied'
        ? 'ההתראות חסומות בהגדרות הדפדפן. כדי להפעיל, אפשר התראות לאתר בהגדרות הדפדפן.'
        : 'הודעה קופצת בדפדפן כשצוות עכשיו סלומון עונה לך, גם כשאתה בכרטיסייה אחרת.';
}

async function toggleBrowserNotify(input) {
    const n = window.salamonChatNotifications;
    if (!n) return;
    if (input.checked) { const ok = await n.enable(); input.checked = ok; }
    else { n.disable(); usToast('ההתראות כובו', 'info'); }
    renderNotifySetting();
}

// ---------- בניית החלון ----------

function injectSettingsModal() {
    const css = document.createElement('style');
    css.textContent = `
    #userSettingsModal .us-panel { width: min(860px, 100vw); height: min(680px, 94vh); display: flex; flex-direction: column; background: #f6f7fb; border-radius: 22px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.35); font-family: inherit; color: #0f172a; text-align: right; }
    @media (max-width: 640px) { #userSettingsModal .us-panel { height: 100dvh; border-radius: 0; } }
    .us-hero { position: relative; display: flex; align-items: center; gap: 16px; padding: 22px 24px; background: linear-gradient(135deg, #14532d, #16a34a 60%, #22c55e); color: #fff; flex-shrink: 0; }
    .us-close { position: absolute; top: 14px; left: 14px; width: 38px; height: 38px; border-radius: 50%; border: none; background: rgba(255,255,255,.16); color: #fff; cursor: pointer; font-size: 1.05rem; }
    .us-close:hover { background: rgba(255,255,255,.28); }
    .us-avatar { width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,.95); color: #16a34a; display: grid; place-items: center; font-size: 1.7rem; font-weight: 800; overflow: hidden; flex-shrink: 0; box-shadow: 0 0 0 4px rgba(255,255,255,.25); }
    .us-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .us-hero-text { min-width: 0; }
    .us-hero-text b { display: block; font-size: 1.25rem; }
    .us-hero-text > span { opacity: .85; font-size: .9rem; font-family: monospace; }
    .us-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .us-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,.16); font-size: .76rem; }
    .us-chip.bad { background: rgba(239,68,68,.35); }
    .us-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 220px 1fr; }
    .us-nav { padding: 14px 10px; border-left: 1px solid #e5e7eb; background: #fff; display: flex; flex-direction: column; gap: 4px; }
    .us-nav button { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border: none; background: none; border-radius: 12px; font: inherit; font-size: .92rem; color: #475569; cursor: pointer; text-align: right; }
    .us-nav button i { width: 18px; text-align: center; color: #94a3b8; }
    .us-nav button:hover { background: #f1f5f9; color: #0f172a; }
    .us-nav button.active { background: #ecfdf5; color: #15803d; font-weight: 600; }
    .us-nav button.active i { color: #16a34a; }
    .us-main { position: relative; overflow-y: auto; padding: 20px 22px 90px; }
    .us-pane { display: none; animation: usIn .2s ease; }
    .us-pane.active { display: block; }
    @keyframes usIn { from { opacity: 0; transform: translateY(4px); } }
    .us-pane h3 { margin: 0 0 4px; font-size: 1.15rem; }
    .us-pane > p.us-sub { margin: 0 0 16px; color: #64748b; font-size: .88rem; }
    .us-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; margin-bottom: 14px; overflow: hidden; }
    .us-card-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; font-size: .92rem; }
    .us-card-head .us-muted { font-weight: 400; margin-right: auto; }
    .us-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-bottom: 1px solid #f1f5f9; transition: background .15s; }
    .us-row:last-child { border-bottom: none; }
    .us-row.changed { background: #fffbeb; box-shadow: inset -3px 0 0 #f59e0b; }
    .us-row-text { flex: 1; min-width: 0; }
    .us-row-text b { display: block; font-size: .93rem; font-weight: 600; }
    .us-row-text small { display: block; color: #64748b; font-size: .8rem; margin-top: 2px; line-height: 1.45; }
    .us-field { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
    .us-field:last-child { border-bottom: none; }
    .us-field label { font-size: .82rem; font-weight: 600; color: #475569; }
    .us-input { width: 100%; height: 44px; padding: 0 14px; border: 1px solid #d1d5db; border-radius: 12px; font: inherit; font-size: .95rem; background: #f9fafb; color: #0f172a; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
    .us-input:focus { outline: none; border-color: #16a34a; box-shadow: 0 0 0 4px rgba(22,163,74,.14); background: #fff; }
    .us-input[dir="ltr"] { text-align: left; }
    .us-grid { display: grid; grid-template-columns: 1fr 1fr; }
    .us-grid .us-field:first-child { border-left: 1px solid #f1f5f9; }
    .us-static { font-size: .95rem; padding: 2px 0; }
    .us-switch { position: relative; width: 46px; height: 26px; flex-shrink: 0; }
    .us-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
    .us-switch span { position: absolute; inset: 0; border-radius: 26px; background: #cbd5e1; cursor: pointer; transition: .2s; }
    .us-switch span::before { content: ""; position: absolute; width: 20px; height: 20px; top: 3px; right: 3px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: .2s; }
    .us-switch input:checked + span { background: #16a34a; }
    .us-switch input:checked + span::before { transform: translateX(-20px); }
    .us-switch input:disabled + span { opacity: .45; cursor: not-allowed; }
    .us-switch.danger input:checked + span { background: #ef4444; }
    .us-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 20px; border-radius: 12px; border: 1px solid #d1d5db; background: #fff; color: #0f172a; font: inherit; font-weight: 600; font-size: .9rem; cursor: pointer; transition: .15s; }
    .us-btn:hover { border-color: #94a3b8; }
    .us-btn.primary { background: #16a34a; border-color: #16a34a; color: #fff; box-shadow: 0 6px 16px -6px rgba(22,163,74,.6); }
    .us-btn.primary:hover { background: #15803d; }
    .us-btn.danger { color: #dc2626; border-color: #fecaca; }
    .us-btn.danger:hover { background: #fef2f2; }
    .us-btn.sm { height: 34px; padding: 0 12px; font-size: .8rem; }
    .us-btn:disabled { opacity: .6; cursor: default; }
    .us-alert { display: none; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; margin-bottom: 14px; font-size: .88rem; line-height: 1.5; }
    .us-alert.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .us-alert.success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .us-alert.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .us-warn { display: none; gap: 10px; align-items: flex-start; margin-top: 10px; padding: 12px; border-radius: 12px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: .84rem; }
    .us-warn p { margin: 0 0 8px; }
    .us-savebar { position: sticky; bottom: -90px; margin: 0 -22px -90px; padding: 12px 22px; display: none; align-items: center; gap: 12px; flex-wrap: wrap; background: rgba(255,255,255,.96); backdrop-filter: blur(8px); border-top: 1px solid #e5e7eb; box-shadow: 0 -10px 30px rgba(0,0,0,.06); }
    .us-savebar.show { display: flex; animation: usIn .2s ease; }
    .us-savebar > span { flex: 1; min-width: 160px; font-size: .86rem; color: #b45309; font-weight: 600; }
    .us-savebar .us-pass { display: none; align-items: center; gap: 8px; }
    .us-savebar .us-pass .us-input { height: 40px; width: 190px; }
    .us-meter { display: flex; align-items: center; gap: 10px; font-size: .78rem; color: #64748b; }
    .us-meter i { flex: 1; height: 6px; border-radius: 6px; background: #e5e7eb; position: relative; overflow: hidden; }
    .us-meter i::after { content: ""; position: absolute; inset: 0; width: 0; border-radius: 6px; transition: .2s; }
    .us-meter[data-level="1"] i::after { width: 30%; background: #ef4444; }
    .us-meter[data-level="2"] i::after { width: 65%; background: #f59e0b; }
    .us-meter[data-level="3"] i::after { width: 100%; background: #16a34a; }
    .us-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
    .us-item:last-child { border-bottom: none; }
    .us-item-body { flex: 1; min-width: 0; }
    .us-item-body b { display: block; font-size: .9rem; font-weight: 600; }
    .us-item-body small { display: block; color: #64748b; font-size: .78rem; margin-top: 2px; }
    .us-ico { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: #f1f5f9; color: #64748b; flex-shrink: 0; }
    .us-ico.good { background: #dcfce7; color: #16a34a; }
    .us-ico.bad { background: #fee2e2; color: #dc2626; }
    .us-ico.warn { background: #fef3c7; color: #b45309; }
    .us-ico.info { background: #e0f2fe; color: #0284c7; }
    .us-tag { display: inline-block; padding: 1px 8px; border-radius: 999px; background: #f1f5f9; color: #64748b; font-size: .7rem; font-weight: 500; vertical-align: middle; }
    .us-tag.good { background: #dcfce7; color: #15803d; }
    .us-muted { color: #94a3b8; font-weight: 400; }
    .us-empty { padding: 28px; text-align: center; color: #94a3b8; font-size: .88rem; }
    @media (max-width: 640px) {
        .us-body { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
        .us-nav { display: grid; grid-template-columns: repeat(4, 1fr); border-left: none; border-bottom: 1px solid #e5e7eb; padding: 6px; gap: 2px; }
        .us-nav button { flex-direction: column; gap: 4px; padding: 8px 2px; font-size: .74rem; text-align: center; justify-content: center; white-space: nowrap; }
        .us-main { padding: 16px 14px 90px; }
        .us-savebar { margin: 0 -14px -90px; padding: 12px 14px; }
        .us-grid { grid-template-columns: 1fr; }
        .us-grid .us-field:first-child { border-left: none; }
        .us-hero { padding: 18px 16px; }
        .us-savebar .us-pass .us-input { width: 100%; }
        .us-savebar .us-pass { width: 100%; }
    }
    `;
    document.head.appendChild(css);

    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div class="modal-overlay" id="userSettingsModal">
        <div class="us-panel" role="dialog" aria-modal="true" aria-label="הגדרות חשבון">
            <div class="us-hero"><div id="us-hero" style="display:contents;"></div><button type="button" class="us-close" data-us-close aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="us-body">
                <nav class="us-nav">
                    <button type="button" data-tab="account"><i class="fa-solid fa-user"></i> החשבון שלי</button>
                    <button type="button" data-tab="notifications"><i class="fa-solid fa-bell"></i> התראות</button>
                    <button type="button" data-tab="security"><i class="fa-solid fa-shield-halved"></i> אבטחה</button>
                    <button type="button" data-tab="devices"><i class="fa-solid fa-laptop"></i> מכשירים</button>
                </nav>
                <div class="us-main">
                    <div id="alert-settings" class="us-alert"></div>

                    <form class="us-pane" data-pane="account" id="settings-profile-form">
                        <h3>החשבון שלי</h3>
                        <p class="us-sub">הפרטים שלך במערכת עכשיו סלומון</p>
                        <div class="us-card">
                            <div class="us-grid">
                                <div class="us-field"><label>שם</label><div class="us-static" id="us-name"></div><small class="us-muted">השם נקבע במערכת הטלפונית</small></div>
                                <div class="us-field"><label>מספר טלפון</label><div class="us-static" dir="ltr" style="text-align:right; font-family:monospace;" id="us-phone"></div></div>
                            </div>
                        </div>
                        <div class="us-card">
                            <div class="us-field" id="us-row-email">
                                <label for="update_email">כתובת מייל</label>
                                <input type="email" id="update_email" class="us-input" dir="ltr" placeholder="email@example.com" autocomplete="email">
                                <div id="email_blocked_warning" class="us-warn"><i class="fa-solid fa-ban" style="margin-top:3px;"></i><div><p id="email_blocked_text"></p><button type="button" id="btn_unblock_email" class="us-btn danger sm" onclick="unblockEmailGlobally()"><i class="fa-solid fa-unlock"></i> שחרור החסימה</button></div></div>
                            </div>
                        </div>
                    </form>

                    <div class="us-pane" data-pane="notifications">
                        <h3>התראות</h3>
                        <p class="us-sub">איך ומתי לעדכן אותך</p>
                        <div class="us-card">
                            <div class="us-row" id="us-row-receive">
                                <div class="us-row-text"><b>עדכונים במייל</b><small>קבלת התראות אבטחה, קודי איפוס ותשובות מהצ'אט לכתובת המייל שלך</small></div>
                                <label class="us-switch"><input type="checkbox" id="update_receive_emails"><span></span></label>
                            </div>
                            <div class="us-row">
                                <div class="us-row-text"><b>התראות דפדפן על הודעות בצ'אט</b><small id="us-browser-notify-hint"></small></div>
                                <label class="us-switch"><input type="checkbox" id="us-browser-notify"><span></span></label>
                            </div>
                        </div>
                    </div>

                    <div class="us-pane" data-pane="security">
                        <h3>אבטחה וסיסמה</h3>
                        <p class="us-sub">שמירה על החשבון שלך</p>
                        <div class="us-card">
                            <div class="us-row" id="us-row-google">
                                <div class="us-row-text"><b><i class="fa-brands fa-google" style="color:#4285f4;"></i> כניסה עם Google בלבד</b><small id="us-google-hint"></small></div>
                                <label class="us-switch"><input type="checkbox" id="update_google_only"><span></span></label>
                            </div>
                        </div>
                        <form class="us-card" id="settings-security-form">
                            <div class="us-card-head"><i class="fa-solid fa-key" style="color:#16a34a;"></i> שינוי סיסמה</div>
                            <div class="us-field"><label for="change_old_pass">סיסמה נוכחית</label><input type="password" id="change_old_pass" class="us-input" dir="ltr" inputmode="numeric" autocomplete="current-password" required></div>
                            <div class="us-grid">
                                <div class="us-field"><label for="change_new_pass">סיסמה חדשה (4–10 ספרות)</label><input type="password" id="change_new_pass" class="us-input" dir="ltr" inputmode="numeric" autocomplete="new-password" required>
                                    <div class="us-meter" id="us-pass-meter" data-level="0"><i></i><span></span></div></div>
                                <div class="us-field"><label for="change_new_pass_confirm">אימות סיסמה חדשה</label><input type="password" id="change_new_pass_confirm" class="us-input" dir="ltr" inputmode="numeric" autocomplete="new-password" required></div>
                            </div>
                            <div class="us-row">
                                <div class="us-row-text"><b>ניתוק מכל המכשירים</b><small>אחרי השינוי תצטרך להתחבר מחדש בכל מקום</small></div>
                                <label class="us-switch danger"><input type="checkbox" id="change_logout_devices"><span></span></label>
                            </div>
                            <div class="us-field" style="align-items:flex-start;"><button type="submit" id="btn-change-password" class="us-btn primary"><i class="fa-solid fa-key"></i> עדכון סיסמה</button></div>
                        </form>
                    </div>

                    <div class="us-pane" data-pane="devices">
                        <h3>מכשירים והתחברויות</h3>
                        <p class="us-sub">איפה החשבון שלך מחובר ומה קרה בו לאחרונה</p>
                        <div class="us-card">
                            <div class="us-card-head"><i class="fa-solid fa-laptop" style="color:#16a34a;"></i> מכשירים מחוברים <span class="us-muted" id="us-sessions-count"></span>
                                <button type="button" class="us-btn danger sm" id="us-revoke-others" hidden><i class="fa-solid fa-power-off"></i> ניתוק כל השאר</button></div>
                            <div id="us-sessions"></div>
                        </div>
                        <div class="us-card">
                            <div class="us-card-head"><i class="fa-solid fa-clock-rotate-left" style="color:#16a34a;"></i> פעילות אחרונה בחשבון</div>
                            <div id="us-history"></div>
                        </div>
                    </div>

                    <div class="us-savebar" id="unsaved-changes-banner">
                        <span><i class="fa-solid fa-circle-exclamation"></i> יש שינויים שלא נשמרו</span>
                        <div class="us-pass" id="profile_password_auth"><input type="password" id="update_auth_pass" class="us-input" dir="ltr" placeholder="הסיסמה שלך לאישור" autocomplete="current-password"></div>
                        <button type="button" class="us-btn" data-us-reset>ביטול</button>
                        <button type="button" class="us-btn primary" id="btn-update-profile"><i class="fa-solid fa-check"></i> שמירת שינויים</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.appendChild(wrap.firstElementChild);

    const modal = document.getElementById('userSettingsModal');
    modal.addEventListener('click', e => {
        if (e.target === modal || e.target.closest('[data-us-close]')) { closeUserSettingsModal(); return; }
        const tab = e.target.closest('.us-nav button');
        if (tab) { switchSettingsTab(tab.dataset.tab); return; }
        const revoke = e.target.closest('[data-revoke]');
        if (revoke) { revokeDevice(revoke.dataset.revoke); return; }
        if (e.target.closest('#us-revoke-others')) { revokeDevice(''); return; }
        if (e.target.closest('[data-us-reset]')) { fillUserSettings(state.currentUser); usAlert(''); }
    });
    ['update_email', 'update_receive_emails', 'update_google_only'].forEach(id => {
        document.getElementById(id).addEventListener('input', usRefreshDirty);
        document.getElementById(id).addEventListener('change', usRefreshDirty);
    });
    document.getElementById('settings-profile-form').addEventListener('submit', updateUserProfile);
    document.getElementById('btn-update-profile').addEventListener('click', updateUserProfile);
    document.getElementById('update_auth_pass').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); updateUserProfile(); } });
    document.getElementById('settings-security-form').addEventListener('submit', updatePassword);
    document.getElementById('change_new_pass').addEventListener('input', usPasswordStrength);
    document.getElementById('us-browser-notify').addEventListener('change', e => toggleBrowserNotify(e.target));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('active')) closeUserSettingsModal(); });
}
