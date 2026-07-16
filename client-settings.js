function updateDashboardUI() {
    const user = state.currentUser;
    if (!user) return;
    
    document.getElementById('ui-user-name').innerText = user.name || 'אורח';
    document.getElementById('ui-user-phone').innerText = user.phone;
    
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
    // איפוס הכפתורים בתפריט הצד
    document.querySelectorAll('.settings-nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('settings-profile-form').style.display = 'none';
    document.getElementById('settings-security-form').style.display = 'none';
    
    if (tab === 'profile') {
        document.querySelectorAll('.settings-nav-btn')[0].classList.add('active');
        document.getElementById('settings-profile-form').style.display = 'block';
        document.getElementById('settings-section-title').innerText = 'העדפות מערכת';
    } else {
        document.querySelectorAll('.settings-nav-btn')[1].classList.add('active');
        document.getElementById('settings-security-form').style.display = 'block';
        document.getElementById('settings-section-title').innerText = 'אבטחה וסיסמה';
    }
    
    const alertBox = document.getElementById('inline-settings-alert');
    if (alertBox) alertBox.style.display = 'none';
}

function openUserSettingsModal() {
    const user = state.currentUser;
    if (!user) return;
    
    document.getElementById('inline_email').value = user.email || '';
    document.getElementById('inline_receive_emails').checked = user.receiveEmails;
    document.getElementById('inline_google_only').checked = user.googleLoginOnly;
    document.getElementById('inline_auth_pass').value = '';
    
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

    const authPassSection = document.getElementById('inline_password_auth_section');
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

// -------------------------------------------------------------
// שמירה אוטומטית / עריכה מובנית (Inline Save)
// -------------------------------------------------------------
async function saveInlineSetting(settingKey, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    let newValue;
    let isCheckbox = element.type === 'checkbox';
    
    if (isCheckbox) {
        newValue = element.checked;
        const spinner = document.getElementById('spinner_' + settingKey);
        if (spinner) spinner.style.display = 'inline-block';
        element.disabled = true;
    } else {
        newValue = element.value;
        const btn = document.getElementById('btn_save_' + settingKey);
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
            btn.disabled = true;
        }
    }

    // קריאת הסיסמה בלי חסימות לקוח - השרת יבדוק את תקינותה ויחזיר שגיאה אם צריך.
    const authPass = document.getElementById('inline_auth_pass').value;

    try {
        const payload = {
            userToken: state.userToken,
            key: settingKey,
            value: newValue,
            password: authPass
        };

        const res = await fetch(`${API_BASE_URL}/update-profile-single`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        // 1. השרת פוסק את המילה האחרונה לגבי הערך הנוכחי האמיתי
        if (data.currentValue !== undefined && data.currentValue !== null) {
            if (isCheckbox) {
                element.checked = (data.currentValue === 1 || data.currentValue === true);
            } else {
                element.value = data.currentValue;
            }
            
            if(settingKey === 'email') state.currentUser.email = data.currentValue;
            if(settingKey === 'receive_emails') state.currentUser.receiveEmails = data.currentValue;
            if(settingKey === 'google_login_only') state.currentUser.googleLoginOnly = data.currentValue;
        }

        const alertBox = document.getElementById('inline-settings-alert');
        alertBox.style.display = 'block';

        // 2. תצוגת משוב
        if (res.ok && data.success) {
            alertBox.className = 'alert-box compact-alert success';
            alertBox.innerHTML = `<i class="fa-solid fa-check"></i> ${data.message || 'עודכן בהצלחה.'}`;
            
            if (settingKey === 'email' && state.currentUser.emailGloballyBlocked && newValue !== state.currentUser.email) {
                 document.getElementById('email_blocked_warning').style.display = 'none';
            }
        } else {
            alertBox.className = 'alert-box compact-alert error';
            alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${data.error || 'שגיאה בעדכון ההגדרה.'}`;
        }
        
        setTimeout(() => { 
            if (alertBox.style.display === 'block') alertBox.style.display = 'none'; 
        }, 4000);

    } catch (err) {
        const alertBox = document.getElementById('inline-settings-alert');
        alertBox.style.display = 'block';
        alertBox.className = 'alert-box compact-alert error';
        alertBox.innerHTML = '<i class="fa-solid fa-wifi"></i> שגיאת תקשורת מול השרת.';
    } finally {
        if (isCheckbox) {
            const spinner = document.getElementById('spinner_' + settingKey);
            if (spinner) spinner.style.display = 'none';
            element.disabled = false;
        } else {
            const btn = document.getElementById('btn_save_' + settingKey);
            if (btn) {
                btn.innerHTML = 'שמור';
                btn.disabled = false;
            }
        }
    }
}

async function updatePassword(e) {
    if (e) e.preventDefault();
    
    const oldPassword = document.getElementById('change_old_pass').value;
    const newPassword = document.getElementById('change_new_pass').value;
    const newPasswordConfirm = document.getElementById('change_new_pass_confirm').value;
    const logoutAllDevices = document.getElementById('change_logout_devices').checked;

    const alertBox = document.getElementById('inline-settings-alert');

    if (newPassword !== newPasswordConfirm) {
        alertBox.style.display = 'block';
        alertBox.className = 'alert-box compact-alert error';
        alertBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> הסיסמאות החדשות שהוזנו אינן תואמות.';
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
        
        alertBox.style.display = 'block';

        if (!res.ok) {
            const errorMsg = (data.message || data.error || 'שגיאה בעדכון - ייתכן והסיסמה הנוכחית שגויה').replace(/\\n|\n/g, '<br>');
            alertBox.className = 'alert-box compact-alert error';
            alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${errorMsg}`;
            return;
        }

        const successMsg = (data.message || 'הסיסמה שונתה בהצלחה!').replace(/\\n|\n/g, '<br>');
        alertBox.className = 'alert-box compact-alert success';
        alertBox.innerHTML = `<i class="fa-solid fa-check"></i> ${successMsg}`;
        
        document.getElementById('change_old_pass').value = '';
        document.getElementById('change_new_pass').value = '';
        document.getElementById('change_new_pass_confirm').value = '';
        document.getElementById('inline_auth_pass').value = ''; 
        
        if (logoutAllDevices) {
            setTimeout(() => {
                closeUserSettingsModal();
                logout(); 
            }, 2500);
        } else {
            setTimeout(() => { if (alertBox.style.display === 'block') alertBox.style.display = 'none'; }, 3000);
        }
        
    } catch (err) {
        setLoading('btn-change-password', false, 'עדכן סיסמה <i class="fa-solid fa-key"></i>');
        alertBox.style.display = 'block';
        alertBox.className = 'alert-box compact-alert error';
        alertBox.innerHTML = '<i class="fa-solid fa-wifi"></i> שגיאת תקשורת מול השרת.';
    }
}
