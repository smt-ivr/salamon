// client-settings.js

function updateDashboardUI() {
    const user = state.currentUser;
    if (!user) return;
    
    document.getElementById('ui-user-name').innerText = user.name || 'אורח';
    document.getElementById('ui-user-phone').innerText = user.phone;
    
    const emailInput = document.getElementById('update_email');
    if (emailInput && document.activeElement !== emailInput) emailInput.value = user.email || '';
    
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

function openUserSettingsModal() {
    const user = state.currentUser;
    if (!user) return;
    document.getElementById('update_email').value = user.email || '';
    document.getElementById('update_new_pass').value = '';
    document.getElementById('update_old_pass').value = '';
    const alertBox = document.getElementById('alert-settings');
    if (alertBox) alertBox.style.display = 'none';
    document.getElementById('userSettingsModal').classList.add('active');
}

function closeUserSettingsModal() {
    document.getElementById('userSettingsModal').classList.remove('active');
}

async function updateUserProfile(e) {
    if (e) e.preventDefault();
    const oldPassword = document.getElementById('update_old_pass').value;
    const newPassword = document.getElementById('update_new_pass').value;
    const newEmail = document.getElementById('update_email').value;
    setLoading('btn-update', true);
    
    try {
        const res = await fetch(`${API_BASE_URL}/update-profile`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: state.currentUser.phone, oldPassword, newPassword, newEmail })
        });
        const data = await res.json();
        setLoading('btn-update', false, 'שמור שינויים <i class="fa-solid fa-floppy-disk"></i>');
        
        if (!res.ok) {
            showMessage('alert-settings', data.message || data.error || 'שגיאה בעדכון - ייתכן שהסיסמה הנוכחית שגויה', 'error');
            return;
        }

        state.currentUser.email = newEmail;
        showMessage('alert-settings', 'הגדרות החשבון עודכנו בהצלחה!', 'success');
        document.getElementById('update_old_pass').value = '';
        document.getElementById('update_new_pass').value = '';
        setTimeout(() => { closeUserSettingsModal(); }, 1500);
        
    } catch (err) {
        setLoading('btn-update', false, 'שמור שינויים <i class="fa-solid fa-floppy-disk"></i>');
        showMessage('alert-settings', 'שגיאה בשליחת העדכון לשרת', 'error');
    }
}
