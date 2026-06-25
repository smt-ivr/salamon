const API_BASE_URL = 'https://smti.uk/salamon/api';
let state = { userToken: null, currentUser: null, adminToken: null, tempIdentifier: null, sessionId: null, resetToken: null };
let activeAlertId = null;
let globalAudio = document.createElement('audio');
let currentPlayingId = null;
let pollingInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const savedUserToken = localStorage.getItem('userToken');
    const savedAdminToken = localStorage.getItem('adminToken');

    if (path.includes('/admin')) {
        if (savedAdminToken) {
            state.adminToken = savedAdminToken;
            showView('admin-dash-view');
            loadAdminUsers();
        } else {
            showView('admin-login-view');
        }
    } else {
        if (savedUserToken) {
            state.userToken = savedUserToken;
            silentLogin(savedUserToken);
        } else {
            showView('init-view');
        }
    }
    
    const htmlAudio = document.getElementById('global-audio-player');
    if (htmlAudio) globalAudio = htmlAudio;
    if(typeof setupAudioListeners === 'function') setupAudioListeners();
});

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        if (!state.userToken) return;
        try {
            const [identifier, password] = state.userToken.split(':');
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            const data = await res.json();
            if (res.ok && data.user) {
                state.currentUser = data.user;
                if(typeof updateDashboardUI === 'function') updateDashboardUI(); 
            }
        } catch (e) {}
    }, 30000);
}

// ==== הפונקציה החדשה לשליפת הודעת המערכת מהשרת ====
async function loadSystemMessage() {
    try {
        const res = await fetch(`${API_BASE_URL}/system-message`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken || localStorage.getItem('userToken') })
        });
        const data = await res.json();
        
        const desktopBox = document.getElementById('desktop-announcement');
        const mobileBox = document.getElementById('mobile-announcement-content');
        const mobileBtn = document.getElementById('mobile-announcement-btn-id');
        
        if (res.ok && data.success && data.htmlContent) {
            if(desktopBox) desktopBox.innerHTML = data.htmlContent;
            if(mobileBox) mobileBox.innerHTML = data.htmlContent;
            if(mobileBtn) mobileBtn.classList.add('active-btn');
        } else {
            if(desktopBox) desktopBox.innerHTML = '';
            if(mobileBox) mobileBox.innerHTML = '';
            if(mobileBtn) mobileBtn.classList.remove('active-btn');
        }
    } catch (e) {
        console.error('לא ניתן לטעון את הודעת המערכת');
        const desktopBox = document.getElementById('desktop-announcement');
        const mobileBtn = document.getElementById('mobile-announcement-btn-id');
        if(desktopBox) desktopBox.innerHTML = '';
        if(mobileBtn) mobileBtn.classList.remove('active-btn');
    }
}

function openAnnouncementModal() { document.getElementById('announcementModal').classList.add('active'); }
function closeAnnouncementModal() { document.getElementById('announcementModal').classList.remove('active'); }

function showMessage(containerId, msg, type = 'info') {
    const box = document.getElementById(containerId);
    if (!box) return;
    box.className = `alert-box ${type}`;
    box.innerHTML = msg;
    box.style.display = 'block';
    activeAlertId = containerId;
}

function clearMessage() {
    if (activeAlertId) {
        const box = document.getElementById(activeAlertId);
        if (box) box.style.display = 'none';
        activeAlertId = null;
    }
}
document.addEventListener('input', clearMessage);

function showView(viewId) {
    clearMessage();
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    if (viewId === 'initial-loader') {
        document.getElementById('initial-loader').classList.add('active');
    } else if (viewId.includes('view') && !viewId.includes('dash')) {
        document.getElementById('auth-layout').classList.add('active');
        document.querySelectorAll('.auth-card').forEach(card => card.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    } else {
        document.getElementById(viewId).classList.add('active');
    }
}

function switchUserTab(tabName) {
    clearMessage();
    document.querySelectorAll('#user-dash-view .app-tab').forEach(tab => tab.classList.remove('active'));
    const tabEl = document.getElementById('tab-' + tabName);
    if (tabEl) tabEl.classList.add('active');
    
    document.querySelectorAll('#user-dash-view .nav-item').forEach(li => li.classList.remove('active'));
    const btn = document.getElementById('tab-btn-' + tabName);
    if(btn) btn.classList.add('active');
}

function switchAdminTab(tabName) {
    clearMessage();
    document.querySelectorAll('#admin-dash-view .app-tab').forEach(tab => tab.classList.remove('active'));
    const tabEl = document.getElementById('tab-admin-' + tabName);
    if (tabEl) tabEl.classList.add('active');
    
    document.querySelectorAll('#admin-dash-view .nav-item').forEach(li => li.classList.remove('active'));
    const btn = document.getElementById('tab-btn-' + tabName);
    if(btn) btn.classList.add('active');

    if (tabName === 'users' && typeof loadAdminUsers === 'function') loadAdminUsers();
    if (tabName === 'tzintuk' && typeof refreshTzintukData === 'function') { 
        refreshTzintukData();
    }
}

function setLoading(btnId, isLoading, originalText = '') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ממתין...';
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function goBackToInit() {
    if(state.userToken || state.adminToken) return;
    document.getElementById('login_pass').value = '';
    document.getElementById('reg_password').value = '';
    document.getElementById('reg_password_confirm').value = '';
    if(document.getElementById('verify_code')) document.getElementById('verify_code').value = '';
    if(document.getElementById('reset_verify_code')) document.getElementById('reset_verify_code').value = '';
    showView('init-view');
    setTimeout(() => document.getElementById('init_id').focus(), 100);
}

function showErrorModal(title, text) {
    document.getElementById('errorModalTitle').innerHTML = title;
    document.getElementById('errorModalText').innerHTML = text;
    document.getElementById('errorAlertModal').classList.add('active');
}

function closeErrorModal() {
    document.getElementById('errorAlertModal').classList.remove('active');
}
