async function silentLogin(token) {
    try {
        const [identifier, password] = token.split(':');
        const res = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            state.currentUser = data.user;
            if(typeof updateDashboardUI === 'function') updateDashboardUI();
            showView('user-dash-view');
            if(typeof loadMessages === 'function') loadMessages();
            startPolling(); 
        } else {
            logout();
        }
    } catch (err) {
        logout();
    }
}

async function checkIdentifier(e) {
    if (e) e.preventDefault();
    const identifier = document.getElementById('init_id').value.trim();
    if(!identifier) return;
    
    setLoading('btn-init', true);
    try {
        const res = await fetch(`${API_BASE_URL}/check-identifier`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier })
        });
        const data = await res.json();
        setLoading('btn-init', false, 'המשך <i class="fa-solid fa-arrow-left"></i>');
        if (data.isRegistered) {
            state.tempIdentifier = data.identifier;
            document.getElementById('login_display_id').innerText = data.identifier;
            showView('login-view');
            document.getElementById('login_pass').focus();
        } else if (data.authorized) {
            state.tempIdentifier = data.phone;
            document.getElementById('reg_name').value = data.name || 'משתמש לא מזוהה';
            document.getElementById('pre_verify_phone').innerText = data.phone;
            showView('pre-verify-view');
        } else {
            showMessage('alert-init', data.message || data.error || 'אירעה שגיאה בבדיקה', 'error');
        }
    } catch (err) {
        setLoading('btn-init', false, 'המשך <i class="fa-solid fa-arrow-left"></i>');
        showMessage('alert-init', 'שגיאת תקשורת עם השרת', 'error');
    }
}

async function approveVerification() {
    setLoading('btn-approve-tzintuk', true);
    await initiateVerification(state.tempIdentifier);
    setLoading('btn-approve-tzintuk', false, 'שלח צינתוק עכשיו <i class="fa-solid fa-phone-volume"></i>');
}

async function initiateVerification(phone) {
    try {
        const res = await fetch(`${API_BASE_URL}/verify/send`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, intent: 'register' })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            state.sessionId = data.sessionId;
            document.getElementById('verify_display_phone').innerText = phone;
            showView('verify-view');
            showMessage('alert-verify', 'השיחה נשלחה, נא להזין 4 ספרות אחרונות.', 'info');
            setTimeout(() => document.getElementById('verify_code').focus(), 100);
        } else {
            showMessage('alert-pre-verify', data.message || data.error || 'שגיאה בהוצאת שיחה', 'error');
        }
    } catch (err) {
        showMessage('alert-pre-verify', 'שגיאת תקשורת', 'error');
    }
}

async function verifyPhoneCode(e) {
    if (e) e.preventDefault();
    const code = document.getElementById('verify_code').value.trim();
    setLoading('btn-verify', true);
    try {
        const res = await fetch(`${API_BASE_URL}/verify/check`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: state.sessionId, phone: state.tempIdentifier, code: code })
        });
        const data = await res.json();
        setLoading('btn-verify', false, 'אמת והמשך <i class="fa-solid fa-shield-check"></i>');
        if (res.ok && data.success) {
            document.getElementById('reg_display_phone').innerText = state.tempIdentifier;
            showView('register-view');
            showMessage('alert-register', 'אומת בהצלחה! הגדר סיסמה.', 'success');
            document.getElementById('reg_password').focus();
        } else {
            showMessage('alert-verify', data.message || data.error || 'קוד שגוי', 'error');
            document.getElementById('verify_code').value = '';
        }
    } catch (err) {
        setLoading('btn-verify', false, 'אמת והמשך <i class="fa-solid fa-shield-check"></i>');
        showMessage('alert-verify', 'שגיאת תקשורת', 'error');
    }
}

async function resendVerification() {
    if (!state.tempIdentifier) return;
    showMessage('alert-verify', '<i class="fa-solid fa-circle-notch fa-spin"></i> שולח שיחה שוב...', 'info');
    try {
        const res = await fetch(`${API_BASE_URL}/verify/send`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: state.tempIdentifier, intent: 'register' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            state.sessionId = data.sessionId;
            showMessage('alert-verify', 'קוד חדש נשלח אליך.', 'success');
        } else {
            showMessage('alert-verify', data.message || data.error || 'שגיאה בשליחה', 'error');
        }
    } catch (e) {
        showMessage('alert-verify', 'שגיאת רשת', 'error');
    }
}

async function userRegister(e) {
    if (e) e.preventDefault();
    const phone = state.tempIdentifier;
    const email = document.getElementById('reg_email').value;
    const password = document.getElementById('reg_password').value;
    const passwordConfirm = document.getElementById('reg_password_confirm').value;

    setLoading('btn-register', true);
    try {
        const res = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, email, password, passwordConfirm, sessionId: state.sessionId })
        });
        const data = await res.json();
        setLoading('btn-register', false, 'סיום הרשמה <i class="fa-solid fa-check"></i>');
        if (!res.ok) {
            showMessage('alert-register', data.message || data.error || 'שגיאה ברישום', 'error');
            return;
        }

        document.getElementById('login_display_id').innerText = phone;
        showView('login-view');
        showMessage('alert-login', 'החשבון נפתח בהצלחה! התחבר כעת.', 'success');
    } catch (err) {
        setLoading('btn-register', false, 'סיום הרשמה <i class="fa-solid fa-check"></i>');
        showMessage('alert-register', 'שגיאת רשת במהלך הרישום', 'error');
    }
}

async function userLogin(e) {
    if (e) e.preventDefault();
    const password = document.getElementById('login_pass').value;
    setLoading('btn-login', true);
    
    try {
        const res = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: state.tempIdentifier, password })
        });
        const data = await res.json();
        setLoading('btn-login', false, 'היכנס למערכת');
        
        if (!res.ok) {
            showMessage('alert-login', data.message || data.error || 'שגיאת התחברות', 'error');
            return;
        }

        state.userToken = data.token;
        state.currentUser = data.user;
        localStorage.setItem('userToken', data.token);

        if(typeof updateDashboardUI === 'function') updateDashboardUI();
        showView('user-dash-view');
        if(typeof loadMessages === 'function') loadMessages();
        startPolling(); 
    } catch (err) {
        setLoading('btn-login', false, 'היכנס למערכת');
        showMessage('alert-login', 'שגיאת תקשורת עם השרת', 'error');
    }
}

async function forgotPassword() {
    setLoading('btn-forgot-pass', true);
    showMessage('alert-login', '<i class="fa-solid fa-circle-notch fa-spin"></i> שולח בקשה למערכת...', 'info');
    try {
        const res = await fetch(`${API_BASE_URL}/verify/send`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: state.tempIdentifier, intent: 'reset' })
        });
        const data = await res.json();
        setLoading('btn-forgot-pass', false, '<i class="fa-solid fa-unlock-keyhole"></i> שכחת סיסמה? איפוס דרך אימייל');
        if (res.ok && data.success) {
            state.sessionId = data.sessionId;
            state.tempIdentifier = data.phone; 
            document.getElementById('reset_display_id').innerText = data.phone;
            showView('reset-verify-view');
            showMessage('alert-reset-verify', data.message || 'קוד נשלח לאימייל המעודכן בחשבונך', 'success');
        } else {
            showMessage('alert-login', data.message || data.error || 'שגיאה בשליחת אימייל לאיפוס', 'error');
        }
    } catch (e) {
        setLoading('btn-forgot-pass', false, '<i class="fa-solid fa-unlock-keyhole"></i> שכחת סיסמה? איפוס דרך אימייל');
        showMessage('alert-login', 'שגיאת תקשורת עם השרת', 'error');
    }
}

async function verifyResetCode(e) {
    if (e) e.preventDefault();
    const code = document.getElementById('reset_verify_code').value.trim();
    setLoading('btn-reset-verify', true);
    try {
        const res = await fetch(`${API_BASE_URL}/verify/check`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: state.sessionId, phone: state.tempIdentifier, code: code })
        });
        const data = await res.json();
        setLoading('btn-reset-verify', false, 'אמת קוד אימייל <i class="fa-solid fa-shield-check"></i>');
        if (res.ok && data.success) {
            state.resetToken = data.token;
            showView('reset-confirm-view');
            showMessage('alert-reset-confirm', 'האימייל אומת! כעת תוכל להגדיר סיסמה חדשה.', 'success');
        } else {
            showMessage('alert-reset-verify', data.message || data.error || 'קוד אימות שגוי', 'error');
            document.getElementById('reset_verify_code').value = '';
        }
    } catch (err) {
        setLoading('btn-reset-verify', false, 'אמת קוד אימייל <i class="fa-solid fa-shield-check"></i>');
        showMessage('alert-reset-verify', 'שגיאת תקשורת', 'error');
    }
}

async function confirmNewPassword(e) {
    if (e) e.preventDefault();
    const password = document.getElementById('new_reset_pass').value;
    const passwordConfirm = document.getElementById('new_reset_pass_confirm').value;
    
    if (password !== passwordConfirm) {
        showMessage('alert-reset-confirm', 'הסיסמאות החדשות שהוזנו אינן תואמות.', 'error');
        return;
    }

    setLoading('btn-reset-confirm', true);
    try {
        const res = await fetch(`${API_BASE_URL}/reset-password/confirm`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: state.tempIdentifier, password: password, passwordConfirm: passwordConfirm, token: state.resetToken })
        });
        const data = await res.json();
        setLoading('btn-reset-confirm', false, 'החלף סיסמה <i class="fa-solid fa-floppy-disk"></i>');
        if (res.ok && data.success) {
            showView('login-view');
            document.getElementById('login_pass').value = '';
            showMessage('alert-login', data.message || 'הסיסמה אופסה בהצלחה! תוכל כעת להתחבר.', 'success');
        } else {
            showMessage('alert-reset-confirm', data.message || data.error || 'שגיאה בעדכון הסיסמה', 'error');
        }
    } catch (e) {
        setLoading('btn-reset-confirm', false, 'החלף סיסמה <i class="fa-solid fa-floppy-disk"></i>');
        showMessage('alert-reset-confirm', 'שגיאת תקשורת עם השרת', 'error');
    }
}

function logout() {
    state = { userToken: null, currentUser: null, adminToken: null, tempIdentifier: null, sessionId: null, resetToken: null };
    localStorage.removeItem('userToken');
    localStorage.removeItem('adminToken');
    if (pollingInterval) clearInterval(pollingInterval);
    
    document.querySelectorAll('input').forEach(input => input.value = ''); 
    if(globalAudio) { globalAudio.pause(); globalAudio.src = ''; }
    
    const path = window.location.pathname;
    if (path.includes('/admin')) {
        showView('admin-login-view');
    } else {
        showView('init-view');
    }
}
