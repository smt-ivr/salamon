const API_BASE_URL = 'https://smti.uk/salamon/api';
let state = { userToken: null, currentUser: null, adminToken: null, tempIdentifier: null, sessionId: null, resetToken: null };
let activeAlertId = null;
let globalAudio = document.createElement('audio');
let currentPlayingId = null;
let pollingInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    injectMainModals(); // הזרקת המודלים ל-HTML
    
    const path = window.location.pathname;
    const savedUserToken = localStorage.getItem('userToken');
    const savedAdminToken = localStorage.getItem('adminToken');
    
    const urlParams = new URLSearchParams(window.location.search);
    const unsubscribeToken = urlParams.get('token');

    if (path.includes('/unsubscribe') || unsubscribeToken) {
        if (typeof handleUnsubscribeFlow === 'function') {
            handleUnsubscribeFlow(unsubscribeToken);
        }
        return; 
    }

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
        if(typeof loadMessages === 'function') loadMessages(true);
        if(typeof loadSystemStats === 'function') loadSystemStats(true); 
        try {
            const res = await fetch(`${API_BASE_URL}/user`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userToken: state.userToken })
            });
            const data = await res.json();
            if (res.ok && data.user) {
                state.currentUser = data.user;
                if(typeof updateDashboardUI === 'function') updateDashboardUI(); 
            } else {
                logout();
            }
        } catch (e) {}
    }, 30000); 
}

async function loadSystemStats(isSilent = false) {
    const token = state.userToken || localStorage.getItem('userToken');
    if (!token) return;
    const statsEl = document.getElementById('header-system-stats');
    if (!statsEl) return;
    if (!isSilent) statsEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> טוען משתתפים...';
    try {
        const res = await fetch(`${API_BASE_URL}/stats/members`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: token })
        });
        const data = await res.json();
        if (res.ok && data.success && data.stats) {
            const s = data.stats;
            statsEl.innerHTML = `סה"כ ${s.total} משתתפים <span style="margin: 0 4px;">|</span> <i class="fa-solid fa-phone-volume" style="font-size: 0.75rem; color: var(--play-out); margin-left: 2px;"></i> ${s.active} <i class="fa-solid fa-phone-slash" style="font-size: 0.75rem; color: var(--danger); margin-right: 4px; margin-left: 2px;"></i> ${s.blocked}`;
            statsEl.title = `${s.total} משתתפים רשומים במערכת: ${s.active} פעילים לקבלת צינתוקים, ו-${s.blocked} מנותקים.`;
        } else if (!isSilent) {
            statsEl.innerHTML = '<span style="color:var(--danger);">שגיאה בטעינת נתונים</span>';
        }
    } catch (err) {
        if (!isSilent) statsEl.innerHTML = '<span style="color:var(--danger);">שגיאת תקשורת</span>';
    }
}

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
        const desktopBox = document.getElementById('desktop-announcement');
        const mobileBtn = document.getElementById('mobile-announcement-btn-id');
        if(desktopBox) desktopBox.innerHTML = '';
        if(mobileBtn) mobileBtn.classList.remove('active-btn');
    }
}

function openAnnouncementModal() { document.getElementById('announcementModal').classList.add('active'); }
function closeAnnouncementModal() { document.getElementById('announcementModal').classList.remove('active'); }

/* מערכת ההודעות הקופצות החדשה - Toast System */
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color:#10b981;"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i>';
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

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

        if (viewId === 'init-view' && typeof renderGoogleButton === 'function') {
            setTimeout(renderGoogleButton, 100); 
        }
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
    if (tabName === 'tzintuk' && typeof refreshTzintukData === 'function') refreshTzintukData();
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

function injectMainModals() {
    const modalsContainer = document.createElement('div');
    modalsContainer.innerHTML = `
        <div class="modal-overlay" id="errorAlertModal">
            <div class="modal-content professional-modal" style="text-align: center; border-top: 4px solid var(--danger);">
                <div style="padding: 30px 25px;">
                    <div style="width: 65px; height: 65px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fa-solid fa-lock" style="font-size: 2rem; color: var(--danger);"></i>
                    </div>
                    <h2 id="errorModalTitle" style="color: var(--text-dark); font-size: 1.35rem; margin-bottom: 12px; font-weight: 800;">שגיאת הרשאה</h2>
                    <p id="errorModalText" style="font-size: 1rem; color: var(--text-light); margin-bottom: 25px; line-height: 1.6;"></p>
                    <button class="btn-pro-secondary" onclick="closeErrorModal()" style="width: 100%; background: #f1f5f9; color: var(--text-main); font-weight: bold; padding: 14px; font-size: 1rem;">הבנתי, סגור</button>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="announcementModal">
            <div class="modal-content professional-modal">
                <div class="modal-header">
                    <h2><i class="fa-solid fa-bullhorn"></i> מודעת מערכת</h2>
                    <button class="close-modal-btn" onclick="closeAnnouncementModal()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div style="padding: 20px; max-height: 70vh; overflow-y: auto;" id="mobile-announcement-content">
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalsContainer);
}
