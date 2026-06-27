// client-settings.js

function updateDashboardUI() {
    const user = state.currentUser;
    if (!user) return;
    
    document.getElementById('ui-user-name').innerText = user.name || 'אורח';
    document.getElementById('ui-user-phone').innerText = user.phone;
    
    // יצירת אייקוני התחברות חכמים עם Tooltips המופעלים במעבר עכבר (מרחפים)
    const authIcon = user.authMethod === 'google' 
        ? `<span class="auth-badge text-google" title="התחברות מאובטחת דרך חשבון Google"><i class="fa-brands fa-google"></i></span>`
        : `<span class="auth-badge text-password" title="התחברות רגילה באמצעות סיסמה"><i class="fa-solid fa-key"></i></span>`;
        
    const tokenIcon = user.tokenType === 'permanent' 
        ? `<span class="auth-badge text-perm" title="טוקן התחברות קבוע ('זכור אותי' פעיל)"><i class="fa-solid fa-infinity"></i></span>`
        : `<span class="auth-badge text-temp" title="טוקן התחברות זמני (יפוג בניתוק הקרוב)"><i class="fa-solid fa-stopwatch"></i></span>`;

    const badgeContainer = document.getElementById('ui-auth-badges');
    if (badgeContainer) badgeContainer.innerHTML = `${authIcon} ${tokenIcon}`;

    // עדכון אייקון הצינתוקים
    const tzIcon = document.getElementById('ui-tzintuk-icon');
    const isConnected = (user.connectedToTzintukim === 'yes' || user.connectedToTzintukim === true || user.connectedToTzintukim === '1');
    if(tzIcon) {
        if (isConnected) {
            tzIcon.innerHTML = '<i class="fa-solid fa-phone-volume" style="color: var(--success); cursor: help;" title="מחובר לצינתוקים"></i>';
        } else {
            tzIcon.innerHTML = '<i class="fa-solid fa-phone-slash" style="color: var(--danger); cursor: help;" title="מנותק מצינתוקים"></i>';
        }
    }

    // הגדרות הרשאות בממשק ההודעות
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

// ניווט בין כרטיסיות ההגדרות
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
    
    // מילוי הנתונים בכרטיסיית הפרופיל
    document.getElementById('update_email').value = user.email || '';
    document.getElementById('update_receive_emails').checked = user.receiveEmails;
    document.getElementById('update_google_only').checked = user.googleLoginOnly;
    document.getElementById('update_auth_pass').value = '';
    
    // מילוי נתונים ריקים באבטחה
    document.getElementById('change_old_pass').value = '';
    document.getElementById('change_new_pass').value = '';
    document.getElementById('change_new_pass_confirm').value = '';
    document.getElementById('change_logout_devices').checked = false;

    // הסתרה חכמה של בקשת הסיסמה אם המשתמש התחבר מגוגל
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

// עדכון פרופיל והעדפות בלבד (לשונית 1)
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

        // הוספת סיסמה לאימות רק אם לא התחברנו דרך גוגל
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
            showMessage('alert-settings', data.message || data.error || 'שגיאה בעדכון - ייתכן והסיסמה שגויה', 'error');
            return;
        }

        // עדכון State המקומי
        state.currentUser.email = newEmail;
        state.currentUser.receiveEmails = receiveEmails;
        state.currentUser.googleLoginOnly = googleLoginOnly;
        
        showMessage('alert-settings', 'הגדרות החשבון וההעדפות עודכנו בהצלחה!', 'success');
        document.getElementById('update_auth_pass').value = '';
        
    } catch (err) {
        setLoading('btn-update-profile', false, 'שמור העדפות <i class="fa-solid fa-floppy-disk"></i>');
        showMessage('alert-settings', 'שגיאת תקשורת מול השרת', 'error');
    }
}

// שינוי סיסמה (לשונית 2) - משתמש בנתיב החדש בשרת
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
            showMessage('alert-settings', data.message || data.error || 'שגיאה בעדכון - ייתכן והסיסמה הנוכחית שגויה', 'error');
            return;
        }

        showMessage('alert-settings', data.message || 'הסיסמה שונתה בהצלחה!', 'success');
        document.getElementById('change_old_pass').value = '';
        document.getElementById('change_new_pass').value = '';
        document.getElementById('change_new_pass_confirm').value = '';
        
        if (logoutAllDevices) {
            setTimeout(() => {
                closeUserSettingsModal();
                logout(); // אם הוא בחר לנתק את כולם, גם הנוכחי מתנתק
            }, 2500);
        } else {
            setTimeout(() => closeUserSettingsModal(), 2000);
        }
        
    } catch (err) {
        setLoading('btn-change-password', false, 'עדכן סיסמה <i class="fa-solid fa-key"></i>');
        showMessage('alert-settings', 'שגיאת תקשורת מול השרת', 'error');
    }
}
