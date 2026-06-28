// client-settings.js

function updateDashboardUI() {
    const user = state.currentUser;
    if (!user) return;
    
    document.getElementById('ui-user-name').innerText = user.name || 'אורח';
    document.getElementById('ui-user-phone').innerText = user.phone;
    
    // אייקונים עגולים ונקיים בלבד ללא טקסט
    const authIcon = user.authMethod === 'google' 
        ? `<div class="auth-icon-circle google" title="התחברות מאובטחת באמצעות חשבון Google"><i class="fa-brands fa-google"></i></div>`
        : `<div class="auth-icon-circle password" title="התחברות רגילה (סיסמה)"><i class="fa-solid fa-lock"></i></div>`;
        
    const tokenIcon = user.tokenType === 'permanent' 
        ? `<div class="auth-icon-circle perm" title="מכשיר מוכר (זכור אותי פעיל)"><i class="fa-solid fa-infinity"></i></div>`
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
    document.querySelectorAll('.settings-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('settings-profile-form').style.display = 'none';
    document.getElementById('settings-security-form').style.display = 'none';
    
    if (tab === 'profile') {
        document.querySelectorAll('.settings-tab-btn')[0].classList.add('active');
        document.getElementById('settings-profile-form').style.display = 'block';
    } else {
        document.querySelectorAll('.settings-tab-btn')[1].classList.add('active');
        document.getElementById('settings-security-form').style.display = 'block';
    }
    
    const alertBox = document.getElementById('alert-settings');
    if (alertBox) alertBox.style.display = 'none';
}

function openUserSettingsModal() {
    const user = state.currentUser;
    if (!user) return;
    
    document.getElementById('update_email').value = user.email || '';
    document.getElementById('update_receive_emails').checked = user.receiveEmails;
    document.getElementById('update_google_only').checked = user.googleLoginOnly;
    document.getElementById('update_auth_pass').value = '';
    
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
        setLoading('btn-update-profile', false, 'שמור העדפות <i class="fa-solid fa-floppy-disk"></i>');
        
        if (!res.ok) {
            const errorMsg = (data.message || data.error || 'שגיאה בעדכון - ייתכן והסיסמה שגויה').replace(/\\n|\n/g, '<br>');
            showMessage('alert-settings', errorMsg, 'error');
            return;
        }

        // תמיכה במבנה החדש של עדכון חלקי
        const alertType = data.partialUpdate ? 'warning' : 'success';
        const successMsg = (data.message || 'הגדרות החשבון וההעדפות עודכנו בהצלחה!').replace(/\\n|\n/g, '<br>');
        showMessage('alert-settings', successMsg, alertType);
        
        document.getElementById('update_auth_pass').value = '';
        
        // רענון נתוני המשתמש מהשרת כדי להבטיח תאימות מדויקת למסד הנתונים
        const userRes = await fetch(`${API_BASE_URL}/user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken })
        });
        const userData = await userRes.json();
        
        if (userRes.ok && userData.user) {
            state.currentUser = userData.user;
            if (typeof updateDashboardUI === 'function') updateDashboardUI();
            
            // סנכרון השדות בטופס לערכים המעודכנים בפועל (חשוב למקרה של עדכון חלקי)
            document.getElementById('update_email').value = userData.user.email || '';
            document.getElementById('update_receive_emails').checked = userData.user.receiveEmails;
            document.getElementById('update_google_only').checked = userData.user.googleLoginOnly;
        }
        
    } catch (err) {
        setLoading('btn-update-profile', false, 'שמור העדפות <i class="fa-solid fa-floppy-disk"></i>');
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
