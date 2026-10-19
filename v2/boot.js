// boot.js — הפעלת האפליקציה: בדיקת החיבור, הרשאת גישה לגרסה החדשה, טעינת העדפות ומעבר למסך הראשון.

(() => {
'use strict';
const { $, esc } = App;

async function loadUser() {
    const r = await App.api('/user');
    if (!r.ok || !r.data.user) return null;
    App.user = r.data.user;
    return App.user;
}

function renderMe() { App.renderNav(); }

function renderBanner() {
    const b = App.config && App.config.banner;
    const box = $('#global-banner');
    const dismissed = App.store.get('v2.bannerClosed', '');
    if (!b || dismissed === b.text) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<div class="alert ${esc(b.tone || 'info')}"><i class="fa-solid ${b.tone === 'warn' ? 'fa-triangle-exclamation' : b.tone === 'good' ? 'fa-circle-check' : 'fa-circle-info'}"></i><div style="flex:1;">${esc(b.text)}</div><button class="icon-btn sm" data-act="banner-close" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button></div>`;
}

App.actions['banner-close'] = () => { App.store.set('v2.bannerClosed', App.config.banner.text); $('#global-banner').hidden = true; };

App.refreshUser = async () => {
    const before = JSON.stringify(App.user);
    const u = await loadUser();
    if (!u) return;
    if (JSON.stringify(u) !== before) { renderMe(); document.dispatchEvent(new Event('user')); }
};

// כניסה לאפליקציה אחרי שיש טוקן
App.enter = async () => {
    const [user, cfg] = await Promise.all([loadUser(), App.api('/v2/config')]);
    if (!user) {
        App.token = null;
        try { localStorage.removeItem('userToken'); } catch (e) {}
        App.showAuth();
        return false;
    }
    App.config = cfg.ok ? cfg.data : { allowed: true, defaults: {} };
    if (!App.config.allowed) {
        $('#splash').classList.add('out');
        $('#auth').hidden = true;
        $('#blocked').hidden = false;
        $('#blocked-text').textContent = App.config.offMessage || 'הגרסה החדשה זמינה כרגע רק לחלק מהמשתמשים. אפשר להמשיך באתר הרגיל.';
        return false;
    }
    const prefs = await App.api('/v2/prefs', { open: true });
    App.loadPrefs(prefs.ok ? prefs.data.prefs : {}, App.config.defaults || {});

    renderMe();
    renderBanner();
    $('#auth').hidden = true;
    $('#blocked').hidden = true;
    $('#app').hidden = false;
    $('#splash').classList.add('out');

    document.dispatchEvent(new Event('login'));
    const fromHash = location.hash.replace('#', '');
    App.go(App.TABS.some(t => t.id === fromHash) ? fromHash : App.prefs.startTab || 'feed', { replace: true });
    if (!App._userTimer) App._userTimer = App.every(60000, App.refreshUser);
    return true;
};

document.addEventListener('DOMContentLoaded', async () => {
    // קישור מהאתר הוותיק עם ?tab=chat וכו'
    const q = new URLSearchParams(location.search);
    if (q.get('tab')) { history.replaceState(null, '', location.pathname + '#' + q.get('tab')); }

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/salamon/v2/sw.js', { scope: '/salamon/v2/' }).catch(() => {});

    let token = null;
    try { token = localStorage.getItem('userToken'); } catch (e) {}
    if (token && !token.includes(':')) {
        App.token = token;
        await App.enter();
    } else {
        const cfg = await App.api('/v2/config', {}, { auth: false });
        if (cfg.ok && cfg.data.mode === 'off') {
            $('#splash').classList.add('out');
            $('#blocked').hidden = false;
            $('#blocked-text').textContent = cfg.data.offMessage || 'אפשר להמשיך להשתמש באתר הרגיל.';
            return;
        }
        App.showAuth();
    }
});

// חיבור/ניתוק רשת
window.addEventListener('offline', () => App.toast('אין חיבור לאינטרנט', 'bad', { ms: 5000 }));
window.addEventListener('online', () => { App.toast('החיבור חזר', 'good'); document.dispatchEvent(new Event('reconnect')); });

// התקנה כאפליקציה
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); App.installPrompt = e; document.dispatchEvent(new Event('installable')); });
})();
