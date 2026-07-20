// הזרקת המודלים בטעינת העמוד
document.addEventListener('DOMContentLoaded', injectSettingsModal);

function updateDashboardUI() {
    const user = state.currentUser;
    if (!user) return;
    
    document.getElementById('ui-user-name').innerText = user.name || 'אורח';
    
    // סידור מספר הטלפון משמאל לימין בתוך הטקסט
    document.getElementById('ui-user-phone').innerHTML = `<span dir="ltr" style="font-weight:600; color:var(--text-main); font-family: monospace; font-size: 0.9rem;">${user.phone}</span>`;
    
    // עדכון תמונת פרופיל או הצגת האות הראשונה כ-FallBack
    const avatarDiv = document.querySelector('.user-profile-wrap .avatar');
    if (avatarDiv) {
        if (user.profilePictureUrl && user.profilePictureUrl.trim() !== '') {
            avatarDiv.innerHTML = `<img src="${user.profilePictureUrl}" class="avatar-img" draggable="false" oncontextmenu="return false;" alt="פרופיל">`;
        } else {
            const firstLetter = (user.name && user.name.trim().length > 0) ? user.name.trim().charAt(0) : 'א';
            avatarDiv.innerHTML = `<span class="avatar-letter">${firstLetter}</span>`;
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

function switchSettingsTab(tab) {
    document.querySelectorAll('#userSettingsModal .settings-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('settings-profile-form').style.display = 'none';
    document.getElementById('settings-security-form').style.display = 'none';
    
    if (tab === 'profile') {
        document.querySelectorAll('#userSettingsModal .settings-tab-btn')[0].classList.add('active');
        document.getElementById('settings-profile-form').style.display = 'block';
    } else {
        document.querySelectorAll('#userSettingsModal .settings-tab-btn')[1].classList.add('active');
        document.getElementById('settings-security-form').style.display = 'block';
    }
    
    const alertBox = document.getElementById('alert-settings');
    if (alertBox) alertBox.style.display = 'none';
}

let hasUnsavedChanges = false;
function trackSettingsChanges() {
    hasUnsavedChanges = false;
    const banner = document.getElementById('unsaved-changes-banner');
    if (banner) banner.style.display = 'none';
    
    document.querySelectorAll('#userSettingsModal .clean-settings-row').forEach(row => row.classList.remove('is-changed'));

    const inputs = document.querySelectorAll('#userSettingsModal input.track-change');
    
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.dataset.initialValue = input.checked;
        } else {
            input.dataset.initialValue = input.value;
        }
        
        input.addEventListener('input', function() {
            const currentValue = this.type === 'checkbox' ? this.checked : this.value;
            const initialValue = this.type === 'checkbox' ? (this.dataset.initialValue === 'true') : this.dataset.initialValue;
            const row = this.closest('.clean-settings-row');
            
            if (currentValue !== initialValue) {
                if (row) row.classList.add('is-changed');
            } else {
                if (row) row.classList.remove('is-changed');
            }
            
            hasUnsavedChanges = Array.from(inputs).some(inp => {
                const val = inp.type === 'checkbox' ? inp.checked : inp.value;
                const init = inp.type === 'checkbox' ? (inp.dataset.initialValue === 'true') : inp.dataset.initialValue;
                return val !== init;
            });
            
            if (banner) banner.style.display = hasUnsavedChanges ? 'flex' : 'none';
        });
    });
}

function openUserSettingsModal() {
    const user = state.currentUser;
    if (!user) return;
    
    document.getElementById('update_email').value = user.email || '';
    document.getElementById('update_receive_emails').checked = user.receiveEmails;
    document.getElementById('update_google_only').checked = user.googleLoginOnly;
    document.getElementById('update_auth_pass').value = '';
    
    const emailBlockedWarning = document.getElementById('email_blocked_warning');
    if (user.emailGloballyBlocked) {
        emailBlockedWarning.style.display = 'block';
        const unblockBtn = document.getElementById('btn_unblock_email');
        const blockText = document.getElementById('email_blocked_text');
        
        if (user.authMethod === 'google') {
            unblockBtn.style.display = 'inline-flex';
            blockText.innerText = 'כתובת האימייל שלך חסומה ברשימה השחורה. מכיוון שהתחברת עם חשבון גוגל, באפשרותך לשחרר את החסימה כעת.';
        } else {
            unblockBtn.style.display = 'none';
            blockText.innerHTML = 'כתובת האימייל חסומה. <b>לשחרור החסימה:</b> התנתקו והתחברו מחדש למערכת באמצעות כפתור ה-Google המשויך לכתובת זו.';
        }
    } else {
        emailBlockedWarning.style.display = 'none';
    }
    
    document.getElementById('change_old_pass').value = '';
    document.getElementById('change_new_pass').value = '';
    document.getElementById('change_new_pass_confirm').value = '';
    document.getElementById('change_logout_devices').checked = false;

    const authPassSection = document.getElementById('profile_password_auth');
    if (user.authMethod === 'google') {
        authPassSection.style.display = 'none';
    } else {
        authPassSection.style.display = 'block';
    }

    switchSettingsTab('profile');
    document.getElementById('userSettingsModal').classList.add('active');
    
    setTimeout(trackSettingsChanges, 50);
}

function closeUserSettingsModal() {
    document.getElementById('userSettingsModal').classList.remove('active');
}

async function updateUserProfile(e) {
    if (e) e.preventDefault();
    
    const newEmail = document.getElementById('update_email').value;
    const receiveEmails = document.getElementById('update_receive_emails').checked;
    const googleLoginOnly = document.getElementById('update_google_only').checked;
    const password = document.getElementById('update_auth_pass').value;

    setLoading('btn-update-profile', true);
    
    try {
        const payload = {
            userToken: state.userToken,
            newEmail: newEmail,
            receiveEmails: receiveEmails,
            googleLoginOnly: googleLoginOnly
        };

        if (state.currentUser.authMethod === 'password') {
            payload.password = password;
        }

        const res = await fetch(`${API_BASE_URL}/update-profile`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        setLoading('btn-update-profile', false, 'שמור שינויים <i class="fa-solid fa-floppy-disk"></i>');
        
        if (!res.ok) {
            const errorMsg = (data.message || data.error || 'שגיאה בעדכון - ייתכן והסיסמה שגויה').replace(/\\n|\n/g, '<br>');
            showMessage('alert-settings', errorMsg, 'error');
            return;
        }

        const alertType = data.partialUpdate ? 'warning' : 'success';
        const successMsg = (data.message || 'הגדרות החשבון וההעדפות עודכנו בהצלחה!').replace(/\\n|\n/g, '<br>');
        showMessage('alert-settings', successMsg, alertType);
        
        document.getElementById('update_auth_pass').value = '';
        trackSettingsChanges();
        
        const userRes = await fetch(`${API_BASE_URL}/user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken })
        });
        const userData = await userRes.json();
        
        if (userRes.ok && userData.user) {
            state.currentUser = userData.user;
            if (typeof updateDashboardUI === 'function') updateDashboardUI();
            
            document.getElementById('update_email').value = userData.user.email || '';
            document.getElementById('update_receive_emails').checked = userData.user.receiveEmails;
            document.getElementById('update_google_only').checked = userData.user.googleLoginOnly;
            
            if (userData.user.emailGloballyBlocked) {
                document.getElementById('email_blocked_warning').style.display = 'block';
            } else {
                document.getElementById('email_blocked_warning').style.display = 'none';
            }
            trackSettingsChanges();
        }
        
    } catch (err) {
        setLoading('btn-update-profile', false, 'שמור שינויים <i class="fa-solid fa-floppy-disk"></i>');
        showMessage('alert-settings', 'שגיאת תקשורת מול השרת', 'error');
    }
}

async function updatePassword(e) {
    if (e) e.preventDefault();
    
    const oldPassword = document.getElementById('change_old_pass').value;
    const newPassword = document.getElementById('change_new_pass').value;
    const newPasswordConfirm = document.getElementById('change_new_pass_confirm').value;
    const logoutAllDevices = document.getElementById('change_logout_devices').checked;

    if (newPassword !== newPasswordConfirm) {
        showMessage('alert-settings', 'הסיסמאות החדשות שהוזנו אינן תואמות.', 'error');
        return;
    }

    setLoading('btn-change-password', true);
    try {
        const res = await fetch(`${API_BASE_URL}/change-password`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userToken: state.userToken, 
                oldPassword: oldPassword, 
                newPassword: newPassword, 
                newPasswordConfirm: newPasswordConfirm, 
                logoutAllDevices: logoutAllDevices 
            })
        });
        const data = await res.json();
        setLoading('btn-change-password', false, 'עדכן סיסמה <i class="fa-solid fa-key"></i>');
        
        if (!res.ok) {
            const errorMsg = (data.message || data.error || 'שגיאה בעדכון - ייתכן והסיסמה הנוכחית שגויה').replace(/\\n|\n/g, '<br>');
            showMessage('alert-settings', errorMsg, 'error');
            return;
        }

        const successMsg = (data.message || 'הסיסמה שונתה בהצלחה!').replace(/\\n|\n/g, '<br>');
        showMessage('alert-settings', successMsg, 'success');
        
        document.getElementById('change_old_pass').value = '';
        document.getElementById('change_new_pass').value = '';
        document.getElementById('change_new_pass_confirm').value = '';
        trackSettingsChanges();
        
        if (logoutAllDevices) {
            setTimeout(() => {
                closeUserSettingsModal();
                logout(); 
            }, 2500);
        } else {
            setTimeout(() => closeUserSettingsModal(), 2000);
        }
    } catch (err) {
        setLoading('btn-change-password', false, 'עדכן סיסמה <i class="fa-solid fa-key"></i>');
        showMessage('alert-settings', 'שגיאת תקשורת מול השרת', 'error');
    }
}

function injectSettingsModal() {
    const modalsContainer = document.createElement('div');
    modalsContainer.innerHTML = `
        <div class="modal-overlay" id="userSettingsModal">
            <div class="modal-content professional-modal" style="max-width: 550px; display: flex; flex-direction: column; max-height: 90vh;">
                <div class="modal-header">
                    <h2><i class="fa-solid fa-gear"></i> הגדרות חשבון</h2>
                    <button class="close-modal-btn" onclick="closeUserSettingsModal()" type="button"><i class="fa-solid fa-xmark"></i></button>
                </div>
                
                <div class="settings-tabs">
                    <button class="settings-tab-btn active" onclick="switchSettingsTab('profile')" type="button"><i class="fa-solid fa-user-pen"></i> פרופיל והעדפות</button>
                    <button class="settings-tab-btn" onclick="switchSettingsTab('security')" type="button"><i class="fa-solid fa-shield-halved"></i> אבטחה וסיסמה</button>
                </div>
                
                <div style="background: #f8fafc; padding: 20px 20px 0 20px; flex-shrink: 0;">
                    <div id="alert-settings" class="alert-box" style="margin-bottom: 0;"></div>
                    <div id="unsaved-changes-banner" class="unsaved-banner">
                        <span style="font-weight:bold;"><i class="fa-solid fa-triangle-exclamation"></i> ישנם שינויים שלא נשמרו</span>
                        <span style="font-size:0.8rem;">אל תשכח ללחוץ על 'שמור שינויים' בתחתית המסך</span>
                    </div>
                </div>
                
                <div style="padding: 20px; overflow-y: auto; background: #f8fafc; flex: 1;">
                    <form id="settings-profile-form" onsubmit="updateUserProfile(event)">
                        <div class="clean-settings-card">
                            <div class="clean-settings-row" style="flex-direction: column; align-items: stretch;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                    <div class="setting-title">כתובת אימייל</div>
                                </div>
                                <input type="email" id="update_email" class="input-modern ltr-input track-change" placeholder="email@example.com">
                                <div id="email_blocked_warning" style="display:none; margin-top:10px; padding:10px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; font-size:0.85rem; color:#b91c1c;">
                                    <p id="email_blocked_text" style="margin-bottom:8px;"></p>
                                    <button type="button" id="btn_unblock_email" class="btn-text" style="padding:5px 10px; background:#fee2e2; color:#b91c1c; border-radius:6px; margin:0; width:auto;" onclick="unblockEmailGlobally()"><i class="fa-solid fa-unlock"></i> שחרר חסימה</button>
                                </div>
                            </div>
                            
                            <div class="clean-settings-row">
                                <div class="clean-settings-text">
                                    <div class="setting-title">קבלת עדכונים למייל</div>
                                    <div class="setting-desc">שליחת התראות וקודי איפוס</div>
                                </div>
                                <div class="clean-settings-control">
                                    <label class="clean-switch"><input type="checkbox" id="update_receive_emails" class="track-change"><span class="slider"></span></label>
                                </div>
                            </div>
                            
                            <div class="clean-settings-row">
                                <div class="clean-settings-text">
                                    <div class="setting-title">התחברות Google בלבד</div>
                                    <div class="setting-desc">חסום כניסה באמצעות סיסמה</div>
                                </div>
                                <div class="clean-settings-control">
                                    <label class="clean-switch"><input type="checkbox" id="update_google_only" class="track-change"><span class="slider"></span></label>
                                </div>
                            </div>
                            
                            <div class="clean-settings-row" id="profile_password_auth" style="flex-direction: column; align-items: stretch; background:#f1f5f9;">
                                <div class="setting-title" style="margin-bottom:8px;">אימות אבטחה</div>
                                <input type="password" id="update_auth_pass" class="input-modern ltr-input center-text track-change" placeholder="הזן סיסמה נוכחית לשמירה">
                            </div>
                        </div>
                        <button type="submit" id="btn-update-profile" class="btn-pro-primary" style="width: 100%;">שמור שינויים <i class="fa-solid fa-floppy-disk"></i></button>
                    </form>

                    <form id="settings-security-form" onsubmit="updatePassword(event)" style="display:none;">
                        <div class="clean-settings-card">
                            <div class="clean-settings-row" style="flex-direction: column; align-items: stretch;">
                                <div class="setting-title" style="margin-bottom:8px;">סיסמה נוכחית</div>
                                <input type="password" id="change_old_pass" required class="input-modern ltr-input center-text track-change" placeholder="****">
                            </div>
                            <div class="clean-settings-row" style="flex-direction: column; align-items: stretch;">
                                <div class="setting-title" style="margin-bottom:8px;">סיסמה חדשה (4-10 ספרות)</div>
                                <input type="password" id="change_new_pass" required class="input-modern ltr-input center-text track-change" placeholder="****">
                            </div>
                            <div class="clean-settings-row" style="flex-direction: column; align-items: stretch;">
                                <div class="setting-title" style="margin-bottom:8px;">אימות סיסמה חדשה</div>
                                <input type="password" id="change_new_pass_confirm" required class="input-modern ltr-input center-text track-change" placeholder="****">
                            </div>
                            <div class="clean-settings-row">
                                <div class="clean-settings-text">
                                    <div class="setting-title">נתק מכל המכשירים</div>
                                    <div class="setting-desc">יחייב התחברות מחדש בכל מקום</div>
                                </div>
                                <div class="clean-settings-control">
                                    <label class="clean-switch"><input type="checkbox" id="change_logout_devices" class="track-change"><span class="slider danger-slider"></span></label>
                                </div>
                            </div>
                        </div>
                        <button type="submit" id="btn-change-password" class="btn-pro-primary" style="width: 100%; background:var(--secondary);">עדכן סיסמה <i class="fa-solid fa-key"></i></button>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalsContainer);
}
