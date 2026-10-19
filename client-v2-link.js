// client-v2-link.js — כפתור קטן "לגרסה החדשה" אחרי ההתחברות באתר הוותיק.
// מופיע רק אם המנהל הפעיל אותו במרכז השליטה ואם הגרסה החדשה זמינה למשתמש.

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.updateDashboardUI !== 'function') return;
    const original = window.updateDashboardUI;
    window.updateDashboardUI = function() {
        original.apply(this, arguments);
        setupV2Link();
    };
});

let v2LinkChecked = false;
async function setupV2Link() {
    if (v2LinkChecked || !state.userToken) return;
    v2LinkChecked = true;
    try {
        const res = await fetch(`${API_BASE_URL}/v2/config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userToken: state.userToken }) });
        const data = await res.json();
        if (!res.ok || !data.showSwitch) return;
    } catch (e) { v2LinkChecked = false; return; }

    const actions = document.querySelector('#user-dash-view .sidebar-actions');
    if (!actions || document.getElementById('btn-open-v2')) return;
    const btn = document.createElement('button');
    btn.id = 'btn-open-v2';
    btn.title = 'לגרסה החדשה של האתר';
    btn.setAttribute('aria-label', 'לגרסה החדשה של האתר');
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="color: #7c3aed;"></i>';
    btn.onclick = () => { window.location.href = '/salamon/v2'; };
    const logoutBtn = actions.querySelector('.logout-btn');
    if (logoutBtn) actions.insertBefore(btn, logoutBtn); else actions.appendChild(btn);
}
