// core.js — הליבה של הגרסה החדשה: תקשורת, מצב, העדפות ועיצוב, ניווט, גיליונות, הודעות והתראות.
// כל הקבצים של הגרסה החדשה מתחברים דרך האובייקט App, בלי פונקציות גלובליות ובלי onclick בתוך ה-HTML.

(() => {
'use strict';

const API = 'https://smti.uk/salamon/api';
const LOGO = 'https://smt-tel-manager.netlify.app/salamon-logo.png';

const DEFAULT_PREFS = {
    theme: 'system', accent: 'green', fontScale: 1, density: 'comfortable', reduceMotion: false,
    playbackRate: 1, skipSeconds: 10, autoplayNext: true, rememberPosition: true, hideHeard: false, showStats: true,
    notifyNewMessages: false, notifyChat: true, sounds: true, haptics: true,
    confirmSend: false, tzintukPrompt: true, startTab: 'feed', feedFilter: 'all', quietStart: '', quietEnd: '',
};

const App = window.App = {
    API, LOGO, DEFAULT_PREFS,
    token: null, user: null, config: null,
    prefs: { ...DEFAULT_PREFS },
    tab: null,
    actions: {},
    views: {},
    timers: [],
};

// ---------- כלים ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
App.$ = $; App.$$ = $$;

App.esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
App.richText = text => App.esc(text).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
App.num = n => Number(n || 0).toLocaleString('he-IL');

App.parseDate = str => {
    if (!str) return null;
    const d = new Date(String(str).trim().replace(' ', 'T'));
    return isNaN(d) ? null : d;
};
App.time = str => { const d = App.parseDate(str); return d ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''; };
App.dateTime = str => { const d = App.parseDate(str); return d ? d.toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; };
App.dayLabel = d => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diff = Math.round((today - day) / 86400000);
    if (diff === 0) return 'היום';
    if (diff === 1) return 'אתמול';
    if (diff < 7) return d.toLocaleDateString('he-IL', { weekday: 'long' });
    return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
};
App.rel = str => {
    const d = typeof str === 'string' ? App.parseDate(str) : str;
    if (!d) return '';
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    if (s < 45) return 'עכשיו';
    if (s < 3600) return `לפני ${Math.round(s / 60)} דק׳`;
    if (s < 86400) return `לפני ${Math.round(s / 3600)} שע׳`;
    if (s < 86400 * 7) return `לפני ${Math.round(s / 86400)} ימים`;
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
};
App.clock = sec => {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};
App.parseDuration = str => {
    const p = String(str || '').split(':').map(Number);
    if (p.some(isNaN)) return 0;
    return p.reduce((a, v) => a * 60 + v, 0);
};

const PALETTE = ['#16a34a', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0d9488', '#ca8a04', '#4f46e5', '#0891b2', '#be123c'];
App.colorFor = key => {
    let h = 0;
    for (const ch of String(key || '?')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length];
};
App.initial = name => (String(name || '?').trim().replace(/[^\p{L}\p{N}]/gu, '')[0] || '?').toUpperCase();
App.avatar = (name, key, cls = '', url = '') => {
    if (url && /^https?:\/\//.test(url)) return `<span class="avatar ${cls}"><img src="${App.esc(url)}" alt="" referrerpolicy="no-referrer" loading="lazy"></span>`;
    return `<span class="avatar ${cls}" style="background:${App.colorFor(key || name)}">${App.esc(App.initial(name))}</span>`;
};

App.debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
App.store = {
    get(k, fb = null) { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch (e) { return fb; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

// ---------- תקשורת ----------

App.api = async (path, body = {}, { auth = true, signal } = {}) => {
    try {
        const res = await fetch(API + path, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
            body: JSON.stringify(auth && App.token ? { userToken: App.token, ...body } : body),
        });
        let data = {};
        try { data = await res.json(); } catch (e) {}
        const ok = res.ok && data.success !== false;
        if (res.status === 401 && auth && App.token && !path.startsWith('/login')) App.sessionExpired();
        return { ok, status: res.status, data, error: ok ? null : (data.message || data.error || 'משהו השתבש, נסו שוב') };
    } catch (e) {
        if (e.name === 'AbortError') return { ok: false, status: 0, data: {}, error: 'בוטל' };
        return { ok: false, status: 0, data: {}, error: navigator.onLine ? 'אין תקשורת עם השרת' : 'אין חיבור לאינטרנט' };
    }
};

App.sessionExpired = () => {
    if (!App.token) return;
    App.toast('החיבור פג תוקף, יש להתחבר מחדש', 'bad');
    App.logout(true);
};

// ---------- העדפות ומראה ----------

const media = window.matchMedia('(prefers-color-scheme: dark)');
App.applyPrefs = () => {
    const p = App.prefs;
    const root = document.documentElement;
    const dark = p.theme === 'dark' || (p.theme === 'system' && media.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.accent = p.accent;
    root.dataset.density = p.density;
    root.dataset.motion = p.reduceMotion ? 'reduce' : 'full';
    root.style.setProperty('--fs', p.fontScale);
    const meta = document.querySelectorAll('meta[name="theme-color"]');
    meta.forEach(m => m.setAttribute('content', dark ? '#0a0f1c' : '#f4f6fb'));
};
media.addEventListener && media.addEventListener('change', () => App.applyPrefs());

const syncPrefs = App.debounce(() => { if (App.token) App.api('/v2/prefs', { prefs: App.prefs }); }, 900);
App.setPref = (k, v, { silent } = {}) => {
    App.prefs[k] = v;
    App.store.set('v2.prefs', App.prefs);
    App.applyPrefs();
    if (!silent) syncPrefs();
    document.dispatchEvent(new CustomEvent('prefs', { detail: { key: k, value: v } }));
};
App.loadPrefs = (server = {}, defaults = {}) => {
    const local = App.store.get('v2.prefs', {});
    App.prefs = { ...DEFAULT_PREFS, ...defaults, ...local, ...server };
    App.store.set('v2.prefs', App.prefs);
    App.applyPrefs();
};
// מראה מיידי לפני שהדף נטען (בלי הבזק של ערכת צבעים לא נכונה)
App.prefs = { ...DEFAULT_PREFS, ...App.store.get('v2.prefs', {}) };
App.applyPrefs();

// ---------- משוב: רטט וצלילים ----------

App.haptic = (ms = 10) => { if (App.prefs.haptics && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };
let actx = null;
App.sound = kind => {
    if (!App.prefs.sounds) return;
    try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const tones = { msg: [[880, 0], [1320, .1]], sent: [[660, 0]], start: [[520, 0], [780, .09]], stop: [[780, 0], [520, .09]], error: [[300, 0], [220, .12]] }[kind] || [[700, 0]];
        tones.forEach(([f, at]) => {
            const o = actx.createOscillator(), g = actx.createGain();
            o.type = 'sine'; o.frequency.value = f;
            const t = actx.currentTime + at;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
            o.connect(g).connect(actx.destination);
            o.start(t); o.stop(t + 0.25);
        });
    } catch (e) {}
};

// ---------- התראות דפדפן ----------

App.inQuietHours = () => {
    const { quietStart: a, quietEnd: b } = App.prefs;
    if (!a || !b) return false;
    const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
    const [ah, am] = a.split(':').map(Number), [bh, bm] = b.split(':').map(Number);
    const s = ah * 60 + am, e = bh * 60 + bm;
    return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
};
App.canNotify = () => 'Notification' in window && Notification.permission === 'granted';
App.requestNotify = async () => {
    if (!('Notification' in window)) { App.toast('הדפדפן הזה לא תומך בהתראות', 'bad'); return false; }
    if (Notification.permission === 'denied') { App.toast('ההתראות חסומות בהגדרות הדפדפן. יש לאפשר אותן ידנית.', 'bad'); return false; }
    const p = await Notification.requestPermission();
    return p === 'granted';
};
App.notify = (title, body, { tag, onClick } = {}) => {
    if (!App.canNotify() || App.inQuietHours()) return false;
    try {
        const n = new Notification(title, { body, icon: LOGO, badge: LOGO, tag, renotify: !!tag });
        n.onclick = () => { window.focus(); n.close(); onClick && onClick(); };
        return true;
    } catch (e) { return false; }
};

// ---------- הודעות קופצות ----------

App.toast = (text, type = 'good', { action, onAction, ms = 3800 } = {}) => {
    const host = $('#toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', type === 'bad' ? 'alert' : 'status');
    const icon = { good: 'fa-circle-check', bad: 'fa-circle-exclamation', info: 'fa-circle-info' }[type] || 'fa-circle-info';
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${App.esc(text)}</span>${action ? `<button type="button">${App.esc(action)}</button>` : ''}`;
    if (action) el.querySelector('button').addEventListener('click', () => { onAction && onAction(); el.remove(); });
    host.appendChild(el);
    while (host.children.length > 3) host.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms);
};

// ---------- גיליונות ודיאלוגים ----------

const sheets = [];
App.openSheet = ({ title = '', body = '', foot = '', dialog = false, onClose, className = '', closable = true } = {}) => {
    const el = document.createElement('div');
    el.className = `sheet ${dialog ? 'dialog' : ''} ${className}`;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    if (title) el.setAttribute('aria-label', title);
    el.innerHTML = dialog ? body : `<div class="sheet-grip"></div>
        ${title ? `<div class="sheet-head"><h3>${App.esc(title)}</h3>${closable ? '<button class="icon-btn sm" data-act="sheet-close" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button>' : ''}</div>` : ''}
        <div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}`;
    $('#sheet-host').appendChild(el);
    const entry = { el, onClose, closable, prevFocus: document.activeElement };
    sheets.push(entry);
    $('#scrim').classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
    // כפתור "אחורה" בטלפון סוגר את הגיליון במקום לצאת מהאתר
    try { history.pushState({ sheet: sheets.length }, ''); } catch (e) {}
    setTimeout(() => { const f = el.querySelector('[autofocus], .sheet-body input, .sheet-body textarea, button'); f && !('ontouchstart' in window) && f.focus(); }, 300);
    if (!dialog && 'ontouchstart' in window) enableSwipeClose(el);
    return el;
};
App.closeSheet = (fromHistory = false) => {
    const entry = sheets.pop();
    if (!entry) return;
    entry.el.classList.remove('on');
    setTimeout(() => entry.el.remove(), 320);
    if (!sheets.length) $('#scrim').classList.remove('on');
    entry.onClose && entry.onClose();
    if (entry.prevFocus && entry.prevFocus.focus) try { entry.prevFocus.focus({ preventScroll: true }); } catch (e) {}
    if (!fromHistory) { App._skipPop = true; try { history.back(); } catch (e) {} }
};
App.closeAllSheets = () => { while (sheets.length) App.closeSheet(); };
App.topSheet = () => sheets.length ? sheets[sheets.length - 1].el : null;
window.addEventListener('popstate', () => {
    if (App._skipPop) { App._skipPop = false; return; }
    if (sheets.length) App.closeSheet(true);
});

function enableSwipeClose(el) {
    let y0 = null, dy = 0;
    const grip = el.querySelector('.sheet-grip, .sheet-head');
    if (!grip) return;
    grip.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; el.style.transition = 'none'; }, { passive: true });
    grip.addEventListener('touchmove', e => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); el.style.transform = `translateY(${dy}px)`; }, { passive: true });
    grip.addEventListener('touchend', () => {
        el.style.transition = ''; el.style.transform = '';
        if (dy > 110) App.closeSheet();
        y0 = null; dy = 0;
    });
}

App.confirm = ({ title, text = '', ok = 'אישור', cancel = 'ביטול', danger = false, icon } = {}) => new Promise(resolve => {
    let done = false;
    const finish = v => { if (done) return; done = true; resolve(v); };
    const el = App.openSheet({
        dialog: true, onClose: () => finish(false),
        body: `<div class="dlg"><div class="dlg-icon ${danger ? 'bad' : ''}"><i class="fa-solid ${icon || (danger ? 'fa-triangle-exclamation' : 'fa-circle-question')}"></i></div>
            <h3>${App.esc(title)}</h3>${text ? `<p>${App.esc(text)}</p>` : ''}
            <div class="dlg-actions"><button class="btn" data-dlg="no">${App.esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-dlg="yes">${App.esc(ok)}</button></div></div>`,
    });
    el.querySelector('[data-dlg="yes"]').addEventListener('click', () => { finish(true); App.closeSheet(); });
    el.querySelector('[data-dlg="no"]').addEventListener('click', () => App.closeSheet());
});

// ---------- כפתור במצב טעינה ----------

App.busy = (btn, on, label) => {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i>${label ? ` ${App.esc(label)}` : ''}`; }
    else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; delete btn.dataset.html; }
};

// ---------- ניווט ----------

App.TABS = [
    { id: 'feed', label: 'הודעות', icon: 'fa-headphones', title: 'הודעות' },
    { id: 'updates', label: 'עדכונים', icon: 'fa-bullhorn', title: 'עדכונים' },
    { id: 'chat', label: 'צ׳אט', icon: 'fa-comments', title: 'צ׳אט עם הצוות' },
    { id: 'settings', label: 'הגדרות', icon: 'fa-sliders', title: 'הגדרות' },
];

App.renderNav = () => {
    const tab = t => `<button class="tab" data-act="tab" data-tab="${t.id}" aria-label="${t.label}"><i class="fa-solid ${t.icon}"></i><span>${t.label}</span><b class="dot" data-badge="${t.id}" hidden></b></button>`;
    const canRecord = App.user && (App.user.canRecord || App.user.canUpload);
    $('#tabbar').innerHTML = tab(App.TABS[0]) + tab(App.TABS[1])
        + (canRecord ? '<button class="tab-fab" data-act="record" aria-label="הקלטה חדשה"><span><i class="fa-solid fa-microphone"></i></span></button>' : '')
        + tab(App.TABS[2]) + tab(App.TABS[3]);
    $('#rail-links').innerHTML = App.TABS.map(t => `<button class="rail-link" data-act="tab" data-tab="${t.id}"><i class="fa-solid ${t.icon}"></i><span>${t.title}</span><b class="dot" data-badge="${t.id}" hidden></b></button>`).join('');
    $('#rail-record').hidden = !canRecord;
};

App.setBadge = (tab, count) => {
    $$(`[data-badge="${tab}"]`).forEach(b => { b.hidden = !count; b.textContent = count > 99 ? '99+' : count; });
};

App.go = (tab, { replace } = {}) => {
    if (!App.TABS.some(t => t.id === tab)) tab = 'feed';
    const prev = App.tab;
    App.tab = tab;
    document.body.dataset.tab = tab;
    $$('.view').forEach(v => v.classList.toggle('on', v.dataset.view === tab));
    $$('[data-act="tab"]').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'); });
    const t = App.TABS.find(x => x.id === tab);
    $('#tb-title').textContent = t.title;
    document.title = `${t.title} · עכשיו סלומון`;
    const url = `#${tab}`;
    if (location.hash !== url) { try { history[replace ? 'replaceState' : 'pushState']({ tab }, '', url); } catch (e) {} }
    if (prev && App.views[prev] && App.views[prev].leave) App.views[prev].leave();
    const v = App.views[tab];
    if (v) {
        if (!v._init) { v._init = true; v.init && v.init($(`#view-${tab}`)); }
        v.enter && v.enter();
        App.renderTopActions(v.actions ? v.actions() : '');
        $('#tb-sub').textContent = v.subtitle ? v.subtitle() : '';
    }
    $('#topbar').classList.remove('scrolled');
};
window.addEventListener('hashchange', () => {
    const tab = location.hash.replace('#', '');
    if (App.user && tab && tab !== App.tab && App.TABS.some(t => t.id === tab)) App.go(tab, { replace: true });
});

App.renderTopActions = html => { $('#tb-actions').innerHTML = html || ''; };
App.setSubtitle = text => { $('#tb-sub').textContent = text || ''; };

// ---------- פעולות (event delegation) ----------

document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = App.actions[el.dataset.act];
    if (!fn) return;
    e.preventDefault();
    fn(el, e);
});
Object.assign(App.actions, {
    'tab': el => { App.haptic(); App.go(el.dataset.tab); },
    'sheet-close': () => App.closeSheet(),
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && App.topSheet()) { const s = sheets[sheets.length - 1]; if (s.closable) App.closeSheet(); }
});
document.addEventListener('DOMContentLoaded', () => {
    $('#scrim').addEventListener('click', () => { const s = sheets[sheets.length - 1]; if (s && s.closable) App.closeSheet(); });
    // צל לסרגל העליון כשגוללים
    $('#main').addEventListener('scroll', e => { $('#topbar').classList.toggle('scrolled', e.target.scrollTop > 4); }, true);
});

// ---------- מתזמן (רק כשמחוברים) ----------

App.every = (ms, fn, { hiddenMs } = {}) => {
    let last = 0;
    const t = { ms, fn, hiddenMs: hiddenMs || ms * 3, tick() { const now = Date.now(); const gap = document.hidden ? this.hiddenMs : this.ms; if (now - last >= gap) { last = now; try { fn(); } catch (e) {} } } };
    App.timers.push(t);
    return t;
};
setInterval(() => { if (App.token) App.timers.forEach(t => t.tick()); }, 1000);

App.logout = (expired = false) => {
    const token = App.token;
    if (token && !expired) fetch(API + '/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userToken: token }), keepalive: true }).catch(() => {});
    App.token = null; App.user = null;
    App.store.del('v2.prefs.server');
    try { localStorage.removeItem('userToken'); } catch (e) {}
    document.dispatchEvent(new Event('logout'));
    App.closeAllSheets();
    $('#app').hidden = true;
    App.showAuth && App.showAuth();
};
})();
