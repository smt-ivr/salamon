let currentUnsubscribeToken = null;

// פונקציות החסימה (Unsubscribe Flow) - חיצוני לחלוטין משרת המשתמשים
window.handleUnsubscribeFlow = async function(token) {
    showView('unsubscribe-view');
    currentUnsubscribeToken = token;
    
    const btn = document.getElementById('btn-confirm-unsubscribe');
    btn.style.display = 'none';
    
    showMessage('alert-unsubscribe', '<i class="fa-solid fa-circle-notch fa-spin"></i> מאמת מול השרת...', 'info');
    
    try {
        const res = await fetch(`${API_BASE_URL}/unsubscribe/check`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await res.json();
        
        clearMessage();
        if (res.ok && data.success) {
            document.getElementById('unsubscribe-details').style.display = 'block';
            document.getElementById('unsub_email_display').innerText = data.email;
            document.getElementById('unsub_name_display').innerText = data.name;
            document.getElementById('unsub_phone_display').innerText = data.maskedPhone;
            
            btn.style.display = 'flex';
        } else {
            showMessage('alert-unsubscribe', data.error || 'הקישור פג תוקף, שגוי או שכבר נעשה בו שימוש.', 'error');
        }
    } catch (err) {
        showMessage('alert-unsubscribe', 'שגיאת תקשורת עם השרת.', 'error');
    }
};

window.confirmUnsubscribeAction = async function() {
    if (!currentUnsubscribeToken) return;
    setLoading('btn-confirm-unsubscribe', true);
    
    try {
        const res = await fetch(`${API_BASE_URL}/unsubscribe/confirm`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentUnsubscribeToken })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            document.getElementById('unsubscribe-details').style.display = 'none';
            document.getElementById('btn-confirm-unsubscribe').style.display = 'none';
            showMessage('alert-unsubscribe', data.message || 'האימייל נחסם בהצלחה והוכנס לרשימה השחורה.', 'success');
        } else {
            setLoading('btn-confirm-unsubscribe', false, 'כן, חסום כתובת זו <i class="fa-solid fa-lock"></i>');
            showMessage('alert-unsubscribe', data.error || 'שגיאה בביצוע החסימה.', 'error');
        }
    } catch (err) {
        setLoading('btn-confirm-unsubscribe', false, 'כן, חסום כתובת זו <i class="fa-solid fa-lock"></i>');
        showMessage('alert-unsubscribe', 'שגיאת תקשורת מול השרת.', 'error');
    }
};

window.unblockEmailGlobally = async function() {
    const btn = document.getElementById('btn_unblock_email');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מסיר מהרשימה...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/unblock-email`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken })
        });
        const data = await res.json();
        
        btn.innerHTML = originalHtml;
        btn.disabled = false;

        if (res.ok && data.success) {
            showMessage('alert-settings', data.message, 'success');
            state.currentUser.emailGloballyBlocked = false; 
            document.getElementById('email_blocked_warning').style.display = 'none';
        } else {
            showMessage('alert-settings', data.error || 'שגיאה בשחרור החסימה.', 'error');
        }
    } catch (err) {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        showMessage('alert-settings', 'שגיאת תקשורת מול השרת.', 'error');
    }
};

// ==========================================
// פונקציות הליבה (Auth Flow הקיים)
// ==========================================
async function silentLogin(token) {
    if (token.includes(':')) { logout(); return; }
    try {
        const res = await fetch(`${API_BASE_URL}/user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: token })
        });
        const data = await res.json();
        
        if (res.ok && data.user) {
            state.userToken = token;
            state.currentUser = data.user;

            if(typeof updateDashboardUI === 'function') updateDashboardUI();
            showView('user-dash-view');
            if(typeof loadMessages === 'function') loadMessages();
            if(typeof loadSystemStats === 'function') loadSystemStats();
            if(typeof loadSystemMessage === 'function') loadSystemMessage(); 
            startPolling(); 
        } else {
            logout(); 
        }
    } catch (err) { logout(); }
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
    const rememberCheckbox = document.getElementById('login_remember');
    const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;

    setLoading('btn-login', true);
    
    try {
        const loginRes = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: state.tempIdentifier, password, rememberMe })
        });
        const loginData = await loginRes.json();
        
        if (!loginRes.ok) {
            setLoading('btn-login', false, 'היכנס למערכת');
            showMessage('alert-login', loginData.message || loginData.error || 'שגיאת התחברות', 'error');
            return;
        }

        const tempToken = loginData.token;
        const userRes = await fetch(`${API_BASE_URL}/user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: tempToken })
        });
        const userData = await userRes.json();
        
        setLoading('btn-login', false, 'היכנס למערכת');

        if (!userRes.ok || !userData.user) {
            showMessage('alert-login', userData.message || userData.error || 'שגיאה במשיכת נתוני החשבון', 'error');
            return;
        }

        state.userToken = tempToken;
        state.currentUser = userData.user;
        localStorage.setItem('userToken', tempToken);

        if(typeof updateDashboardUI === 'function') updateDashboardUI();
        showView('user-dash-view');
        if(typeof loadMessages === 'function') loadMessages();
        if(typeof loadSystemStats === 'function') loadSystemStats();
        if(typeof loadSystemMessage === 'function') loadSystemMessage();
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

function renderGoogleButton() {
    const container = document.getElementById("googleSignInContainer");
    if (!container) return;

    if (window.google) {
        google.accounts.id.initialize({
            client_id: "89500817024-tbvsuu4dci6bqh173l65ua9lc65pe24p.apps.googleusercontent.com", 
            callback: handleGoogleLoginResponse
        });

        google.accounts.id.renderButton(container, { 
            theme: "outline", 
            size: "large", 
            width: "100%", 
            text: "continue_with" 
        });

        google.accounts.id.prompt();
    } else {
        setTimeout(renderGoogleButton, 500);
    }
}

async function handleGoogleLoginResponse(response) {
    const googleToken = response.credential;
    showMessage('alert-init', '<i class="fa-solid fa-circle-notch fa-spin"></i> מאמת מול גוגל...', 'info');

    try {
        const loginRes = await fetch(`${API_BASE_URL}/login/google`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: googleToken })
        });
        const loginData = await loginRes.json();

        if (!loginRes.ok) {
            showMessage('alert-init', loginData.message || loginData.error || 'שגיאת התחברות עם גוגל', 'error');
            return;
        }

        const tempToken = loginData.token;
        const userRes = await fetch(`${API_BASE_URL}/user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: tempToken })
        });
        const userData = await userRes.json();

        if (!userRes.ok || !userData.user) {
            showMessage('alert-init', userData.message || userData.error || 'שגיאה במשיכת נתוני החשבון', 'error');
            return;
        }

        state.userToken = tempToken;
        state.currentUser = userData.user;
        localStorage.setItem('userToken', tempToken);

        if(typeof updateDashboardUI === 'function') updateDashboardUI();
        showView('user-dash-view');
        if(typeof loadMessages === 'function') loadMessages();
        if(typeof loadSystemStats === 'function') loadSystemStats();
        if(typeof loadSystemMessage === 'function') loadSystemMessage();
        startPolling();
    } catch (err) {
        showMessage('alert-init', 'שגיאת תקשורת מול השרת', 'error');
    }
}
