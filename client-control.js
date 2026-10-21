// client-control.js — Salamon Control (admin console)

(() => {
'use strict';

const API_BASE_URL = 'https://smti.uk/salamon/api';

const S = {
    mode: null,                 // 'admin' | 'staff'
    adminToken: null,
    userToken: null,
    me: null,
    staffPerms: [],
    canNames: false,
    permList: [],
    view: null,
    loaded: {},
    users: [],
    usersFilter: 'web',
    usersSearch: '',
    usersSort: { key: 'createdAt', dir: -1 },
    usersPage: 0,
    blocks: [],
    logs: [],
    logsLevel: 'all',
    logsSearch: '',
    convs: [],
    chatSearch: '',
    activePhone: null,
    activeHash: '',
    ads: [],
    names: [],
    namesFilter: 'all',
    namesSearch: '',
    audit: [],
    auditSearch: '',
    sqlTable: '',
    sqlRows: [],
    sqlCols: [],
    editingUser: null,
    udSnapshot: '',
    selected: new Set(),
    msgSel: new Set(),
    selectMode: false,
    chatFilter: 'all',
    replyTo: null,
    thread: null,
    threadMsgs: [],
    focusMsgId: null,
    chatSettings: null,
    lastInteraction: Date.now(),
    activity: null,
    onlineSet: new Set(),
    actEvents: [],
    actFilter: '',
    actPhone: '',
    namesSel: new Set(),
    lockPhones: [],
    convsReady: false,
    lastSync: 0,
    offline: false,
};

const VIEWS = [
    { id: 'overview', label: 'סקירה', icon: 'fa-gauge-high', group: 'ראשי', key: 'o' },
    { id: 'users', label: 'משתמשים', icon: 'fa-users', group: 'ראשי', key: 'u' },
    { id: 'activity', label: 'פעילות ונוכחות', icon: 'fa-wave-square', group: 'ראשי', key: 'p' },
    { id: 'chat', label: 'תיבת תמיכה', icon: 'fa-comments', group: 'ראשי', key: 'c' },
    { id: 'security', label: 'אבטחה', icon: 'fa-shield-halved', group: 'ראשי', key: 's' },
    { id: 'ads', label: 'קמפיינים', icon: 'fa-bullhorn', group: 'תוכן', key: 'a' },
    { id: 'mail', label: 'דיוור במייל', icon: 'fa-envelope-open-text', group: 'תוכן', key: 'e' },
    { id: 'voice', label: 'הודעות קוליות', icon: 'fa-microphone-lines', group: 'תוכן', key: 'v' },
    { id: 'names', label: 'ספר טלפונים', icon: 'fa-address-book', group: 'תוכן', key: 'n' },
    { id: 'sql', label: 'מסוף נתונים', icon: 'fa-database', group: 'מערכת', key: 'd' },
    { id: 'audit', label: 'יומן צוות', icon: 'fa-clipboard-list', group: 'מערכת', key: 'l' },
    { id: 'master', label: 'התחברות מאסטר', icon: 'fa-user-secret', group: 'מערכת', key: 'm' },
    { id: 'settings', label: 'הגדרות', icon: 'fa-gear', group: 'מערכת', key: 't' },
];

const ACTION_LABELS = {
    VERIFY_SUCCESS: ['אימות הושלם', 'good'], SEND_REQUEST: ['שליחת צינתוק', 'info'], RATE_LIMIT: ['הגבלת קצב', 'warn'],
    VERIFY_CODE: ['בדיקת קוד', ''], ADMIN_BLOCK_CREATE: ['חסימה יזומה', 'bad'], ADMIN_BLOCK_UPDATE: ['עדכון חסימה', 'warn'],
    ADMIN_UNBLOCK: ['שחרור חסימה', 'good'], SEND_REJECTED: ['שליחה נדחתה', 'bad'], RESET_CODE_SENT: ['קוד איפוס נשלח', 'info'],
    RESET_REJECTED: ['איפוס נחסם', 'bad'],
};
const AUDIT_LABELS = { UPDATE_USER: 'עדכון משתמש', CREATE_USER: 'יצירת משתמש', DELETE_USER: 'מחיקת משתמש', UPDATE_NAME: 'עדכון שם בימות' };

// ---------- Utilities ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function store(kind) {
    try { return kind === 'session' ? window.sessionStorage : window.localStorage; } catch (e) { return null; }
}
function getItem(key, kind = 'local') { try { return store(kind)?.getItem(key) ?? null; } catch (e) { return null; } }
function setItem(key, val, kind = 'local') { try { store(kind)?.setItem(key, val); } catch (e) {} }
function delItem(key, kind = 'local') { try { store(kind)?.removeItem(key); } catch (e) {} }

function parseDate(str) {
    if (!str) return null;
    const d = new Date(String(str).replace(' ', 'T'));
    return isNaN(d) ? null : d;
}

function fmtDate(str) {
    if (!str) return '';
    const parts = String(str).split(' ');
    if (parts.length === 2) {
        const d = parts[0].split('-');
        if (d.length === 3) return `${d[2]}/${d[1]}/${d[0].substring(2)} ${parts[1].substring(0, 5)}`;
    }
    return String(str);
}

function relTime(str) {
    const d = parseDate(str);
    if (!d) return fmtDate(str);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 0) return fmtDate(str);
    if (diff < 60) return 'עכשיו';
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק׳`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע׳`;
    if (diff < 86400 * 7) return `לפני ${Math.floor(diff / 86400)} ימים`;
    return fmtDate(str);
}

function chatTime(str) {
    const d = parseDate(str);
    if (!d) return esc(str);
    const t = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return t;
}

function dayLabel(d) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diff = Math.round((today - day) / 86400000);
    if (diff === 0) return 'היום';
    if (diff === 1) return 'אתמול';
    return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function num(n) { return Number(n || 0).toLocaleString('he-IL'); }

function initial(name) {
    const s = String(name || '').trim();
    return s ? s.charAt(0) : '#';
}

function avatarHtml(name, url, cls = '') {
    if (url && /^https?:\/\//i.test(url)) {
        return `<div class="avatar ${cls}"><img src="${esc(url)}" alt="" referrerpolicy="no-referrer" loading="lazy"></div>`;
    }
    return `<div class="avatar ${cls}">${esc(initial(name))}</div>`;
}

function debounce(fn, ms = 200) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function busy(btn, on) {
    if (!btn) return;
    if (on) {
        if (!btn.dataset.html) btn.dataset.html = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch spin"></i>';
    } else {
        btn.disabled = false;
        if (btn.dataset.html) { btn.innerHTML = btn.dataset.html; delete btn.dataset.html; }
    }
}

function downloadCsv(filename, rows) {
    const csv = rows.map(r => r.map(v => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function emptyRow(cols, text, icon = 'fa-inbox') {
    return `<tr><td colspan="${cols}"><div class="empty"><i class="fa-solid ${icon}"></i>${esc(text)}</div></td></tr>`;
}
function loadingRows(cols, n = 5) {
    let html = '';
    for (let i = 0; i < n; i++) {
        html += '<tr>' + Array.from({ length: cols }, () => `<td><div class="skeleton" style="width:${40 + Math.random() * 50}%"></div></td>`).join('') + '</tr>';
    }
    return html;
}

// ---------- API ----------

async function api(path, body = {}, auth = 'admin', method = 'POST') {
    const payload = { ...body };
    if (auth === 'admin') payload.adminToken = S.adminToken;
    // מאפשר לשרת לדעת שהמנהל באמת מול המסך, כדי לא לשלוח לו מיילים מיותרים
    if (auth === 'admin' && path.startsWith('/admin/chat/') && payload.active === undefined) payload.active = adminIsActive();
    if (auth === 'user') payload.userToken = S.userToken;
    let res;
    try {
        res = await fetch(`${API_BASE_URL}${path}`, method === 'GET'
            ? { method: 'GET' }
            : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch (e) {
        S.offline = true; updateLive();
        return { ok: false, status: 0, data: {}, error: 'שגיאת תקשורת מול השרת' };
    }
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && auth === 'admin' && S.mode === 'admin') {
        sessionExpired();
    }
    const ok = res.ok && data.success !== false;
    if (res.status < 500) { S.offline = false; S.lastSync = Date.now(); updateLive(); }
    return { ok, status: res.status, data, error: data.error || data.message || (ok ? '' : `שגיאה (${res.status})`) };
}

async function apiUpload(path, file, fields = {}) {
    const fd = new FormData();
    fd.append('adminToken', S.adminToken);
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) fd.append(k, v);
    fd.append('file', file, file.name);
    let res;
    try { res = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', body: fd }); }
    catch (e) { return { ok: false, status: 0, data: {}, error: 'שגיאת תקשורת מול השרת' }; }
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && S.mode === 'admin') sessionExpired();
    const ok = res.ok && data.success !== false;
    return { ok, status: res.status, data, error: data.error || data.message || (ok ? '' : `שגיאה (${res.status})`) };
}

function adminIsActive() {
    return !document.hidden && Date.now() - S.lastInteraction < 120000;
}

function sessionExpired() {
    if (!S.adminToken) return;
    toast('פג תוקף החיבור, יש להתחבר מחדש', 'bad');
    logout();
}

// ---------- Toasts ----------

function toast(text, type = 'good') {
    const icon = type === 'good' ? 'fa-circle-check' : type === 'bad' ? 'fa-circle-exclamation' : 'fa-circle-info';
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${esc(text)}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 3200);
}

// ---------- Dialog ----------

let dialogResolve = null;

function dialog({ title, text = '', icon = 'warn', buttons, input = null, extra = '' }) {
    return new Promise(resolve => {
        dialogResolve = resolve;
        $('#dialog-title').textContent = title;
        $('#dialog-text').textContent = text;
        const ic = $('#dialog-icon');
        ic.className = 'd-icon' + (icon === 'info' ? ' info' : '');
        ic.innerHTML = icon === 'info' ? '<i class="fa-solid fa-circle-info"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>';
        const ex = $('#dialog-extra');
        ex.innerHTML = extra;
        ex.hidden = !extra;
        const inp = $('#dialog-input');
        inp.hidden = !input;
        inp.value = (input && input.value) || '';
        if (input) { inp.placeholder = input.placeholder || ''; inp.className = 'input' + (input.ltr ? ' ltr' : ''); }
        const actions = $('#dialog-actions');
        actions.innerHTML = '';
        buttons.forEach(b => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `btn ${b.cls || ''}`;
            btn.textContent = b.label;
            btn.addEventListener('click', () => {
                if (b.value && input && input.expect !== undefined && inp.value.trim() !== input.expect) {
                    inp.focus(); inp.style.borderColor = 'var(--bad)'; return;
                }
                closeDialog(b.value ? { value: b.value, input: inp.value.trim(), extra: dialogExtraValues() } : null);
            });
            actions.appendChild(btn);
        });
        $('#dialog-scrim').classList.add('open');
        $('#dialog').classList.add('open');
        setTimeout(() => (input ? inp : actions.firstElementChild)?.focus(), 50);
    });
}

function dialogExtraValues() {
    const out = {};
    $$('#dialog-extra [name]').forEach(el => { out[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    return out;
}

function closeDialog(result) {
    $('#dialog-scrim').classList.remove('open');
    $('#dialog').classList.remove('open');
    $('#dialog-input').style.borderColor = '';
    if (dialogResolve) { const r = dialogResolve; dialogResolve = null; r(result); }
}

async function confirmDanger(title, text, confirmLabel = 'אישור') {
    const r = await dialog({ title, text, buttons: [{ label: 'ביטול' }, { label: confirmLabel, value: 'ok', cls: 'btn-danger-solid' }] });
    return !!r;
}

// ---------- Drawers ----------

function openDrawer(id) {
    $$('.drawer.open').forEach(d => { if (d.id !== id) d.classList.remove('open'); });
    $(`#${id}`).classList.add('open');
    $(`#${id}`).setAttribute('aria-hidden', 'false');
    $('#scrim').classList.add('open');
}

function udSerialize() {
    return $$('#ud-form input').map(i => i.type === 'checkbox' ? (i.checked ? 1 : 0) : i.value).join('\u0001');
}

function userDirty() {
    return $('#user-drawer').classList.contains('open') && !!S.udSnapshot && udSerialize() !== S.udSnapshot;
}

function markUserClean() {
    S.udSnapshot = udSerialize();
    $('#ud-dirty').hidden = true;
}

// User-initiated close (Esc, scrim, close buttons): asks before discarding unsaved edits.
async function requestCloseDrawers() {
    if (userDirty() && !await confirmDanger('שינויים שלא נשמרו', 'ביצעת שינויים במשתמש שעדיין לא נשמרו. לצאת בלי לשמור?', 'יציאה בלי שמירה')) return;
    closeDrawers();
}

function closeDrawers() {
    S.udSnapshot = '';
    $$('.drawer.open').forEach(d => { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); });
    $('#scrim').classList.remove('open');
    $('#app').classList.remove('mobile-nav');
}

// ---------- Theme & layout ----------

function applyTheme() {
    const t = getItem('controlTheme');
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
}

function toggleTheme() {
    const cur = getItem('controlTheme');
    const isDark = cur === 'dark' || (!cur && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setItem('controlTheme', isDark ? 'light' : 'dark');
    applyTheme();
    if (S.view === 'overview') renderChart();
}

// ---------- Auth ----------

async function boot() {
    applyTheme();
    injectChatFileStyles();
    if (getItem('controlSidebar') === 'collapsed') $('#app').classList.add('collapsed');
    if (getItem('controlDensity') === 'dense') document.body.classList.add('dense');

    S.adminToken = getItem('adminToken', 'session') || getItem('adminToken');
    S.userToken = getItem('userToken');

    if (S.adminToken) {
        await enterAdmin();
        return;
    }
    if (S.userToken) {
        const ok = await tryStaff(true);
        if (ok) return;
    }
    showLogin();
}

function showLogin(msg) {
    $('#boot').hidden = true;
    $('#app').hidden = true;
    $('#login').hidden = false;
    const al = $('#login-alert');
    if (msg) { al.innerHTML = msg; al.hidden = false; } else al.hidden = true;
}

async function login(e) {
    e.preventDefault();
    const btn = $('#login-submit');
    busy(btn, true);
    const r = await api('/admin/login', { username: $('#login-user').value.trim(), password: $('#login-pass').value, remember: $('#login-remember').checked }, 'none');
    busy(btn, false);
    if (!r.ok || !r.data.adminToken) {
        showLogin(`<i class="fa-solid fa-circle-exclamation"></i> ${esc(r.error || 'פרטי התחברות שגויים')}`);
        return;
    }
    storeAdminToken(r.data.adminToken, $('#login-remember').checked);
    $('#login-pass').value = '';
    await enterAdmin();
    toast('ברוך הבא למרכז השליטה');
}

function storeAdminToken(token, remember) {
    S.adminToken = token;
    if (remember) { setItem('adminToken', token); delItem('adminToken', 'session'); }
    else { setItem('adminToken', token, 'session'); delItem('adminToken'); }
}

function clearAdminToken() {
    delItem('adminToken'); delItem('adminToken', 'session');
    S.adminToken = null;
}

// בודק מול השרת שהחיבור בתוקף לפני שנכנסים (טוקנים ישנים או שפג תוקפם מחזירים למסך הכניסה)
async function enterAdmin() {
    const r = await api('/admin/me', {}, 'admin');
    if (!r.ok) {
        clearAdminToken();
        if (S.userToken && await tryStaff(true)) return;
        showLogin(r.status === 401 ? '<i class="fa-solid fa-circle-info"></i> החיבור הקודם הסתיים, יש להתחבר מחדש.' : undefined);
        return;
    }
    S.mode = 'admin';
    S.me = r.data.admin;
    S.session = r.data.session;
    loadPermList();
    startApp();
    reportPresence(true);
}

async function tryStaff(silent = false) {
    S.userToken = getItem('userToken');
    if (!S.userToken) {
        if (!silent) showLogin('<i class="fa-solid fa-circle-info"></i> לא נמצא חיבור פעיל באתר. <a href="/salamon">התחבר קודם עם החשבון שלך</a> וחזור לכאן.');
        return false;
    }
    // מנהל-העל נכנס עם חשבון האתר שלו ומקבל חיבור מנהל מלא
    const su = await api('/admin/login/user', {}, 'user');
    if (su.ok && su.data.adminToken) {
        storeAdminToken(su.data.adminToken, false);
        await enterAdmin();
        if (!silent) toast(`ברוך הבא, ${su.data.admin.name}`);
        return true;
    }
    const r = await api('/user', {}, 'user');
    const user = r.ok && r.data.user;
    if (!user || !user.isAdmin) {
        if (!silent) showLogin('<i class="fa-solid fa-circle-exclamation"></i> לחשבון המחובר אין הרשאות צוות.');
        return false;
    }
    S.mode = 'staff';
    S.me = user;
    S.staffPerms = String(user.adminPermissions || '').split(',').map(s => s.trim()).filter(Boolean);
    S.canNames = S.staffPerms.includes('all') || S.staffPerms.includes('manage_names');
    if (!S.canNames) {
        showLogin('<i class="fa-solid fa-circle-info"></i> יש לך גישת צוות, אך עדיין לא הוקצו לך מודולים. פנה למנהל הראשי.');
        return false;
    }
    startApp();
    return true;
}

function logout() {
    stopPolling();
    if (S.mode === 'admin' && S.adminToken) {
        api('/admin/logout', {}, 'admin');
        clearAdminToken();
    }
    S.adminToken = null;
    S.mode = null;
    S.loaded = {};
    closeDrawers();
    location.hash = '';
    showLogin();
}

function availableViews() {
    if (S.mode === 'admin') return VIEWS;
    return VIEWS.filter(v => v.id === 'names' && S.canNames);
}

function startApp() {
    $('#boot').hidden = true;
    $('#login').hidden = true;
    $('#app').hidden = false;

    $('#me-name').textContent = S.me.name || 'חבר צוות';
    $('#me-role').textContent = S.mode !== 'admin' ? 'חבר צוות' : S.me.kind === 'user' ? 'מנהל-על' : 'מנהל ראשי';
    $('#me-avatar').outerHTML = S.mode === 'admin'
        ? '<div class="avatar" id="me-avatar"><i class="fa-solid fa-user-shield"></i></div>'
        : avatarHtml(S.me.name, S.me.profilePictureUrl).replace('class="avatar', 'id="me-avatar" class="avatar');
    const h = new Date().getHours();
    $('#greet').textContent = (h < 12 ? 'בוקר טוב' : h < 18 ? 'צהריים טובים' : 'ערב טוב') + ' 👋';

    document.body.classList.toggle('staff', S.mode !== 'admin');
    renderNav();
    const views = availableViews();
    const { view, arg } = parseHash();
    go(views.some(v => v.id === view) ? view : views[0].id);
    if (view === 'chat' && arg) openConv(arg);
    startPolling();
}

async function loadPermList() {
    const r = await api('/admin/permissions', {}, 'none', 'GET');
    if (r.ok && Array.isArray(r.data.permissions)) S.permList = r.data.permissions;
}

// ---------- Navigation ----------

function renderNav() {
    let html = '';
    let group = '';
    availableViews().forEach(v => {
        if (v.group !== group) { group = v.group; html += `<div class="nav-group-label">${esc(group)}</div>`; }
        html += `<button class="nav-link" data-action="go" data-view="${v.id}" title="${esc(v.label)}"><i class="fa-solid ${v.icon}"></i><span>${esc(v.label)}</span>${v.id === 'chat' ? '<b class="nav-count" id="nav-chat-count" hidden></b>' : ''}</button>`;
    });
    $('#nav').innerHTML = html;
}

// "#chat/0501234567" פותח שיחה ישירות (משמש בקישורים שבמייל ההתראה)
function parseHash() {
    const [view, ...rest] = location.hash.replace(/^#/, '').split('/');
    let arg = rest.join('/');
    try { arg = decodeURIComponent(arg); } catch (e) {}
    return { view, arg };
}

function go(id) {
    const v = availableViews().find(x => x.id === id);
    if (!v) return;
    S.view = id;
    $$('.view').forEach(el => el.classList.toggle('active', el.id === `view-${id}`));
    $$('#nav .nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === id));
    $('#crumb').textContent = v.label;
    updateTitle();
    if (parseHash().view !== id) history.replaceState(null, '', `#${id}`);
    $('#app').classList.remove('mobile-nav');
    $('#content').scrollTop = 0;
    if (!S.loaded[id]) { S.loaded[id] = true; loadView(id); }
}

function loadView(id) {
    switch (id) {
        case 'overview': return loadOverview();
        case 'users': return loadUsers();
        case 'security': return loadSecurity();
        case 'chat': loadChatDefaults(); return loadConvs();
        case 'activity': return loadActivity();
        case 'ads': return loadAds();
        case 'mail': return loadMail();
        case 'voice': return loadVoice(1);
        case 'names': return loadNames();
        case 'sql': return loadTables();
        case 'audit': return loadAudit();
        case 'master': return loadMaster();
        case 'settings': return loadSettings();
    }
}

// ---------- Overview ----------

async function loadOverview() {
    $('#ov-kpis').innerHTML = Array.from({ length: 4 }, () => '<div class="card kpi"><div class="skeleton" style="width:50%"></div><div class="skeleton" style="height:28px;width:40%"></div><div class="skeleton" style="width:70%"></div></div>').join('');
    $('#ov-security').innerHTML = '<li><div class="skeleton" style="width:80%"></div></li>'.repeat(4);
    $('#ov-chats').innerHTML = '<li><div class="skeleton" style="width:70%"></div></li>'.repeat(3);
    await Promise.all([loadUsers(true), loadSecurity(true), loadConvs(true), loadOnline(true)]);
    renderOverview();
}

function renderOverview() {
    const u = S.users;
    const web = u.filter(x => x.hasWebAccount).length;
    const yemot = u.filter(x => x.yemotActive).length;
    const staff = u.filter(x => x.isAdmin).length;
    const unread = S.convs.reduce((a, c) => a + (Number(c.unread_count) || 0), 0);
    const warns = S.logs.filter(l => l.level === 'WARN' || l.level === 'BLOCKED').length;
    const pct = u.length ? Math.round((yemot / u.length) * 100) : 0;
    const webPct = u.length ? Math.round((web / u.length) * 100) : 0;

    $('#ov-kpis').innerHTML = [
        kpi('fa-users', '', 'מנויים במערכת', num(u.length), `${num(staff)} חברי צוות`),
        kpi('fa-signal', 'good', 'מחוברים עכשיו', num(S.activity ? S.activity.stats.onlineNow : 0), `${num(S.activity ? S.activity.stats.loginsToday : 0)} התחברויות היום`),
        kpi('fa-globe', 'info', 'חשבונות אתר', num(web), `${webPct}% מהמנויים`, webPct),
        kpi('fa-phone-volume', 'good', 'פעילים בימות', num(yemot), `${pct}% מקבלים צינתוקים`, pct),
        kpi('fa-comments', unread ? 'warn' : 'good', 'הודעות שלא נקראו', num(unread), `${num(S.convs.length)} שיחות סה״כ`),
        kpi('fa-shield-halved', S.blocks.length ? 'bad' : 'good', 'חסימות פעילות', num(S.blocks.length), `${num(warns)} חריגות ביומן האחרון`),
    ].join('');

    renderChart();

    const sec = S.logs.filter(l => l.level !== 'INFO').slice(0, 6);
    const secList = sec.length ? sec : S.logs.slice(0, 6);
    $('#ov-security').innerHTML = secList.length ? secList.map(l => {
        const [label] = ACTION_LABELS[l.action] || [l.action];
        const cls = l.level === 'BLOCKED' ? 'bad' : l.level === 'WARN' ? 'warn' : 'info';
        const icon = l.level === 'BLOCKED' ? 'fa-shield-virus' : l.level === 'WARN' ? 'fa-triangle-exclamation' : 'fa-circle-info';
        return `<li><div class="f-icon badge ${cls}" style="border-radius:9px;height:30px;padding:0;"><i class="fa-solid ${icon}"></i></div><div class="f-body"><div class="f-title">${esc(label)}</div><div class="f-sub ltr" style="text-align:right;">${esc(l.phone || l.ip_address || '')}</div></div><div class="f-time">${esc(relTime(l.timestamp))}</div></li>`;
    }).join('') : '<li><div class="empty" style="padding:24px;width:100%;">אין אירועים</div></li>';

    const waiting = S.convs.filter(c => Number(c.unread_count) > 0).slice(0, 6);
    $('#ov-chats').innerHTML = waiting.length ? waiting.map(c => `
        <li class="clickable" data-action="open-conv" data-phone="${esc(c.user_phone)}">
            ${avatarHtml(c.user_name)}
            <div class="f-body"><div class="f-title">${esc(c.user_name || c.user_phone)}</div><div class="f-sub">${num(c.unread_count)} הודעות חדשות</div></div>
            <div class="f-time">${esc(relTime(c.last_message_time))}</div>
        </li>`).join('') : '<li><div class="empty" style="padding:24px;width:100%;"><i class="fa-solid fa-mug-hot"></i>אין שיחות שממתינות לתשובה</div></li>';
}

function kpi(icon, tone, label, value, foot, pct) {
    return `<div class="card kpi">
        <div class="k-top"><div class="k-icon ${tone}"><i class="fa-solid ${icon}"></i></div>${esc(label)}</div>
        <div class="k-value">${value}</div>
        ${pct !== undefined ? `<div class="bar"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>` : ''}
        <div class="k-foot">${esc(foot)}</div>
    </div>`;
}

function renderChart() {
    const box = $('#ov-chart');
    if (!box) return;
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ y: d.getFullYear(), m: d.getMonth(), count: 0, label: d.toLocaleDateString('he-IL', { month: 'short' }), full: d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }) });
    }
    S.users.forEach(u => {
        if (!u.hasWebAccount) return;
        const d = parseDate(u.createdAt);
        if (!d) return;
        const m = months.find(x => x.y === d.getFullYear() && x.m === d.getMonth());
        if (m) m.count++;
    });

    const W = box.clientWidth || 600, H = 240, padL = 34, padB = 26, padT = 10;
    const max = Math.max(4, ...months.map(m => m.count));
    const step = Math.ceil(max / 4);
    const top = step * 4;
    const plotW = W - padL, plotH = H - padB - padT;
    const band = plotW / months.length;
    const bw = Math.min(36, band * 0.62);

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="הצטרפויות לפי חודש">`;
    for (let i = 0; i <= 4; i++) {
        const y = padT + plotH - (plotH * i / 4);
        svg += `<line class="gridline" x1="${padL}" x2="${W}" y1="${y}" y2="${y}"></line><text class="axis-label" x="${padL - 8}" y="${y + 4}" text-anchor="end">${step * i}</text>`;
    }
    months.forEach((m, i) => {
        const x = padL + band * i + (band - bw) / 2;
        const h = top ? (m.count / top) * plotH : 0;
        const y = padT + plotH - h;
        const r = Math.min(4, h);
        const path = h > 0
            ? `M${x},${padT + plotH} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + bw - r},${y} Q${x + bw},${y} ${x + bw},${y + r} L${x + bw},${padT + plotH} Z`
            : '';
        svg += `<g data-i="${i}"><rect class="bar-hit" x="${padL + band * i}" y="${padT}" width="${band}" height="${plotH}"></rect>${path ? `<path class="bar-mark" d="${path}"></path>` : ''}<text class="axis-label" x="${padL + band * i + band / 2}" y="${H - 6}" text-anchor="middle">${esc(m.label)}</text></g>`;
    });
    svg += '</svg><div class="chart-tip" id="chart-tip"></div>';
    box.setAttribute('dir', 'ltr');
    box.innerHTML = svg;

    const tip = $('#chart-tip');
    $$('g[data-i]', box).forEach(g => {
        g.addEventListener('mouseenter', () => {
            const m = months[+g.dataset.i];
            box.classList.add('hovering'); g.classList.add('hover');
            tip.innerHTML = `<div>${esc(m.full)}</div><b>${num(m.count)}</b> הצטרפויות`;
            const bx = padL + band * (+g.dataset.i) + band / 2;
            const h = top ? (m.count / top) * plotH : 0;
            tip.style.left = `${(bx / W) * 100}%`;
            tip.style.top = `${((padT + plotH - h) / H) * 100}%`;
            tip.style.transform = 'translate(-50%, -115%)';
            tip.style.opacity = 1;
        });
        g.addEventListener('mouseleave', () => { box.classList.remove('hovering'); g.classList.remove('hover'); tip.style.opacity = 0; });
    });
}

// ---------- Users ----------

async function loadUsers(silent = false) {
    if (S.mode === 'admin') loadOnline(true).then(d => { if (d && S.view === 'users') renderUsers(); });
    if (!silent) $('#users-body').innerHTML = loadingRows(8, 8);
    const r = await api('/admin/users');
    if (!r.ok) {
        if (r.status === 403) { sessionExpired(); return; }
        if (!silent) { $('#users-body').innerHTML = emptyRow(8, r.error, 'fa-circle-exclamation'); toast(r.error, 'bad'); }
        return;
    }
    S.users = r.data.users || [];
    S.loaded.users = true;
    renderUsers();
    if (!silent) toast(`${num(S.users.length)} משתמשים סונכרנו`);
}

function filteredUsers() {
    const q = S.usersSearch.toLowerCase();
    let list = S.users.filter(u => {
        switch (S.usersFilter) {
            case 'web': if (!u.hasWebAccount) return false; break;
            case 'noweb': if (u.hasWebAccount) return false; break;
            case 'staff': if (!u.isAdmin) return false; break;
            case 'off': if (u.yemotActive) return false; break;
        }
        if (!q) return true;
        return String(u.phone || '').includes(q) || String(u.name || '').toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q);
    });
    const { key, dir } = S.usersSort;
    list = list.slice().sort((a, b) => {
        let x = a[key], y = b[key];
        if (typeof x === 'boolean' || typeof y === 'boolean') { x = x ? 1 : 0; y = y ? 1 : 0; }
        x = x ?? ''; y = y ?? '';
        return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });
    return list;
}

function renderUsers() {
    const counts = {
        all: S.users.length,
        web: S.users.filter(u => u.hasWebAccount).length,
        noweb: S.users.filter(u => !u.hasWebAccount).length,
        staff: S.users.filter(u => u.isAdmin).length,
        off: S.users.filter(u => !u.yemotActive).length,
    };
    const chips = [['all', 'הכל'], ['web', 'עם חשבון אתר'], ['noweb', 'ללא חשבון'], ['staff', 'צוות'], ['off', 'מנותקים בימות']];
    $('#users-chips').innerHTML = chips.map(([k, l]) => `<button class="chip ${S.usersFilter === k ? 'active' : ''}" data-action="users-filter" data-filter="${k}">${l} <span class="n">${num(counts[k])}</span></button>`).join('');

    $$('#view-users th[data-sort]').forEach(th => {
        const ind = th.querySelector('.sort-ind'); if (ind) ind.remove();
        if (th.dataset.sort === S.usersSort.key) th.insertAdjacentHTML('beforeend', `<span class="sort-ind">${S.usersSort.dir === 1 ? '▲' : '▼'}</span>`);
    });

    const list = filteredUsers();
    const PAGE = 50;
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    if (S.usersPage >= pages) S.usersPage = pages - 1;
    const slice = list.slice(S.usersPage * PAGE, (S.usersPage + 1) * PAGE);

    $('#users-body').innerHTML = slice.length ? slice.map(u => {
        const phone = esc(u.phone);
        const toggles = u.hasWebAccount ? `<div class="perm-toggles">
            ${permToggle(u, 'canListen', 'fa-headphones', 'האזנה', true)}
            ${permToggle(u, 'canTzintuk', 'fa-phone-volume', 'צינתוק')}
            ${permToggle(u, 'canUpload', 'fa-upload', 'העלאה')}
            ${permToggle(u, 'canRecord', 'fa-microphone', 'הקלטה')}
        </div>` : '<span class="muted">—</span>';
        const web = u.hasWebAccount
            ? `<span class="badge info"><i class="fa-solid fa-envelope"></i> <span class="ltr">${esc(u.email || 'ללא אימייל')}</span></span>`
            : `<button class="btn btn-sm" data-action="create-user" data-phone="${phone}"><i class="fa-solid fa-user-plus"></i> פתיחת חשבון</button>`;
        const sel = S.selected.has(u.phone);
        return `<tr class="${u.hasWebAccount ? 'clickable' : ''} ${sel ? 'selected' : ''}" ${u.hasWebAccount ? `data-action="open-user" data-phone="${phone}"` : ''}>
            <td class="col-check">${u.hasWebAccount ? `<input type="checkbox" class="user-check" data-phone="${phone}" ${sel ? 'checked' : ''} aria-label="בחירה">` : ''}</td>
            <td><div class="cell-user">${avatarHtml(u.name, u.profilePictureUrl, S.onlineSet.has(u.phone) ? 'online' : '')}<div><b>${esc(u.name || 'ללא שם')}${u.isAdmin ? ' <span class="badge bad" style="height:20px;"><i class="fa-solid fa-user-shield"></i> צוות</span>' : ''}</b></div></div></td>
            <td class="ltr mono" style="text-align:right;">${phone}</td>
            <td>${u.yemotActive ? '<span class="badge good"><i class="fa-solid fa-circle-check"></i> פעיל</span>' : '<span class="badge bad"><i class="fa-solid fa-circle-xmark"></i> מנותק</span>'}</td>
            <td>${web}</td>
            <td class="muted nowrap">${esc(u.createdAt ? fmtDate(u.createdAt) : '—')}</td>
            <td>${toggles}</td>
            <td>${u.hasWebAccount ? '<i class="fa-solid fa-chevron-left muted"></i>' : ''}</td>
        </tr>`;
    }).join('') : emptyRow(8, 'לא נמצאו משתמשים התואמים לסינון', 'fa-user-slash');
    const pageWeb = slice.filter(u => u.hasWebAccount);
    const all = $('#users-check-all');
    all.checked = pageWeb.length > 0 && pageWeb.every(u => S.selected.has(u.phone));
    all.indeterminate = !all.checked && pageWeb.some(u => S.selected.has(u.phone));
    S.usersPageList = pageWeb.map(u => u.phone);
    renderBulkBar();

    $('#users-pager').innerHTML = `<span>${num(list.length)} תוצאות</span><div class="spacer"></div>
        <button class="icon-btn sm" data-action="users-page" data-dir="-1" ${S.usersPage === 0 ? 'disabled' : ''} aria-label="הקודם"><i class="fa-solid fa-chevron-right"></i></button>
        <span>עמוד ${S.usersPage + 1} מתוך ${pages}</span>
        <button class="icon-btn sm" data-action="users-page" data-dir="1" ${S.usersPage >= pages - 1 ? 'disabled' : ''} aria-label="הבא"><i class="fa-solid fa-chevron-left"></i></button>`;
}

function renderBulkBar() {
    // Drop selections that no longer exist after a refresh.
    for (const p of S.selected) if (!S.users.some(u => u.phone === p && u.hasWebAccount)) S.selected.delete(p);
    $('#users-bulk').hidden = !S.selected.size;
    if (!S.bulkBusy) $('#bulk-count').textContent = `${num(S.selected.size)} נבחרו`;
}

const FIELD_LABELS = { canListen: 'האזנה', canTzintuk: 'צינתוקים', canUpload: 'העלאת קבצים', canRecord: 'הקלטה' };

async function bulkSet(value) {
    const field = $('#bulk-field').value;
    const phones = [...S.selected];
    if (!phones.length || S.bulkBusy) return;
    const ok = await dialog({
        title: `${value ? 'הפעלת' : 'חסימת'} ${FIELD_LABELS[field]}`,
        text: `הפעולה תחול על ${num(phones.length)} משתמשים.`, icon: value ? 'info' : 'warn',
        buttons: [{ label: 'ביטול' }, { label: 'ביצוע', value: 'ok', cls: value ? 'btn-primary' : 'btn-danger-solid' }],
    });
    if (!ok) return;
    S.bulkBusy = true;
    $$('#users-bulk button, #users-bulk select').forEach(b => { b.disabled = true; });
    let done = 0, failed = 0;
    for (const phone of phones) {
        $('#bulk-count').textContent = `מעדכן ${num(done + failed + 1)} מתוך ${num(phones.length)}…`;
        const r = await api('/admin/update-user', { phone, [field]: !!value });
        if (r.ok) { done++; const u = S.users.find(x => x.phone === phone); if (u) u[field] = !!value; } else failed++;
    }
    S.bulkBusy = false;
    $$('#users-bulk button, #users-bulk select').forEach(b => { b.disabled = false; });
    renderUsers();
    if (failed) toast(`${num(done)} עודכנו, ${num(failed)} נכשלו`, 'bad');
    else toast(`${FIELD_LABELS[field]}: עודכן ל-${num(done)} משתמשים`);
}

function bulkExport() {
    const list = S.users.filter(u => S.selected.has(u.phone));
    downloadCsv(`salamon-selected-${new Date().toISOString().slice(0, 10)}.csv`, [
        ['phone', 'name', 'email', 'yemotActive', 'isAdmin', 'canListen', 'canTzintuk', 'canUpload', 'canRecord', 'createdAt'],
        ...list.map(u => [u.phone, u.name, u.email, u.yemotActive, u.isAdmin, u.canListen, u.canTzintuk, u.canUpload, u.canRecord, u.createdAt]),
    ]);
}

function permToggle(u, field, icon, label, offIsBad = false) {
    const on = !!u[field];
    const cls = on ? 'on' : (offIsBad ? 'off-bad' : '');
    return `<button class="perm-toggle ${cls}" data-action="quick-toggle" data-phone="${esc(u.phone)}" data-field="${field}" title="${on ? 'חסום' : 'אפשר'} ${label}" aria-pressed="${on}"><i class="fa-solid ${icon}"></i></button>`;
}

async function quickToggle(el) {
    const phone = el.dataset.phone, field = el.dataset.field;
    const user = S.users.find(u => u.phone === phone);
    if (!user) return;
    const newVal = !user[field];
    user[field] = newVal; renderUsers();
    const r = await api('/admin/update-user', { phone, [field]: newVal });
    if (r.ok) toast('ההרשאה עודכנה');
    else { user[field] = !newVal; renderUsers(); toast(r.error || 'שגיאה בעדכון ההרשאה', 'bad'); }
}

function renderPerms(containerId, activeStr) {
    const active = String(activeStr || '').split(',').map(s => s.trim());
    const box = $(`#${containerId}`);
    if (!S.permList.length) { box.innerHTML = '<div class="muted" style="padding:6px;">טוען רשימת הרשאות…</div>'; loadPermList().then(() => S.permList.length && renderPerms(containerId, activeStr)); return; }
    box.innerHTML = S.permList.map(p => `
        <label class="perm-item"><input type="checkbox" value="${esc(p.id)}" ${active.includes(p.id) || active.includes('all') ? 'checked' : ''}>
        <div><b>${esc(p.label)}</b><small>${esc(p.desc)}</small></div></label>`).join('');
}

function selectedPerms(containerId) {
    const sel = $$(`#${containerId} input:checked`).map(i => i.value);
    return sel.includes('all') ? 'all' : sel.join(',');
}

function switchUserTab(tab) {
    $$('#ud-tabs .drawer-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('#ud-form .tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
}

async function openUser(phone) {
    S.editingUser = phone;
    const u = S.users.find(x => x.phone === phone) || {};
    $('#ud-title').textContent = u.name || phone;
    $('#ud-sub').textContent = phone;
    $('#ud-name').textContent = 'טוען…';
    $('#ud-yemot').innerHTML = '';
    $('#ud-avatar').outerHTML = avatarHtml(u.name, u.profilePictureUrl, 'lg').replace('class="avatar', 'id="ud-avatar" class="avatar');
    ['ud-email', 'ud-password', 'ud-picture', 'ud-whitelist', 'ud-blacklist'].forEach(id => { $(`#${id}`).value = ''; });
    $('#ud-is-admin').checked = false; $('#ud-perms').hidden = true;
    $('#ud-sessions').innerHTML = loadingRows(4, 2);
    renderPerms('ud-perms', '');
    switchUserTab('profile');
    openDrawer('user-drawer');

    const r = await api('/admin/user-profile', { phone });
    if (S.editingUser !== phone) return;
    if (!r.ok) { toast(r.error || 'שגיאה בטעינת פרופיל', 'bad'); return; }
    const p = r.data.profile || {};
    const y = p.yemot || {};
    $('#ud-name').textContent = y.name || 'ללא שם בימות';
    $('#ud-yemot').innerHTML = y.active ? '<span class="badge good"><i class="fa-solid fa-circle-check"></i> פעיל בימות המשיח</span>' : '<span class="badge bad"><i class="fa-solid fa-circle-xmark"></i> חסר / מנותק בימות</span>';
    if (p.user) {
        const x = p.user;
        $('#ud-email').value = x.email || '';
        $('#ud-picture').value = x.profile_picture_url || '';
        $('#ud-lock-picture').checked = x.lock_profile_picture === 1;
        $('#ud-google-only').checked = x.google_login_only === 1;
        $('#ud-receive-emails').checked = x.receive_emails !== 0;
        $('#ud-can-record').checked = x.can_record !== 0;
        $('#ud-can-upload').checked = !!x.can_upload;
        $('#ud-can-tzintuk').checked = x.can_tzintuk !== 0;
        $('#ud-can-listen').checked = x.can_listen !== 0;
        $('#ud-whitelist').value = x.listen_whitelist || '';
        $('#ud-blacklist').value = x.listen_blacklist || '';
        $('#ud-is-admin').checked = x.is_admin === 1;
        $('#ud-perms').hidden = x.is_admin !== 1;
        renderPerms('ud-perms', x.admin_permissions || '');
    }
    renderSessions(p.activeSessions || []);
    markUserClean();
    if (S.mode === 'admin') loadUserActivity(phone);
}

function renderSessions(list) {
    $('#ud-sessions').innerHTML = list.length ? list.map(s => {
        const type = String(s.token_type || '');
        const kind = type.includes('google') ? '<i class="fa-brands fa-google"></i> Google' : '<i class="fa-solid fa-lock"></i> סיסמה';
        const perm = type.includes('perm') ? '<span class="badge good">קבוע</span>' : '<span class="badge warn">זמני</span>';
        return `<tr><td class="nowrap">${kind} ${perm}</td><td class="ltr muted">${esc(s.session_email || '—')}</td><td class="muted nowrap">${esc(relTime(s.last_used_at))}</td>
            <td><button type="button" class="icon-btn sm danger" data-action="disconnect" data-token="${esc(s.id)}" title="ניתוק מכשיר"><i class="fa-solid fa-plug-circle-xmark"></i></button></td></tr>`;
    }).join('') : emptyRow(4, 'אין חיבורים פעילים', 'fa-laptop');
}

async function saveUser(e) {
    e.preventDefault();
    const phone = S.editingUser;
    if (!phone) return;
    const pw = $('#ud-password').value;
    if (pw && !/^\d{4,10}$/.test(pw)) { switchUserTab('profile'); toast('הסיסמה חייבת להכיל 4–10 ספרות', 'bad'); return; }
    const isAdmin = $('#ud-is-admin').checked;
    const payload = {
        phone, newEmail: $('#ud-email').value.trim(), newPassword: pw,
        canRecord: $('#ud-can-record').checked, canUpload: $('#ud-can-upload').checked,
        canTzintuk: $('#ud-can-tzintuk').checked, canListen: $('#ud-can-listen').checked,
        receiveEmails: $('#ud-receive-emails').checked, googleLoginOnly: $('#ud-google-only').checked,
        listenWhitelist: $('#ud-whitelist').value, listenBlacklist: $('#ud-blacklist').value,
        profilePictureUrl: $('#ud-picture').value.trim(), lockProfilePicture: $('#ud-lock-picture').checked,
        isAdmin, adminPermissions: isAdmin ? selectedPerms('ud-perms') : '',
    };
    const btn = $('#ud-save');
    busy(btn, true);
    const r = await api('/admin/update-user', payload);
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה בעדכון', 'bad'); return; }
    $('#ud-password').value = '';
    markUserClean();
    toast('השינויים נשמרו');
    loadUsers(true);
}

async function disconnect(tokenId) {
    const phone = S.editingUser;
    const ok = await confirmDanger(tokenId ? 'ניתוק מכשיר' : 'ניתוק מכל המכשירים', tokenId ? 'המכשיר יידרש להתחבר מחדש.' : `כל המכשירים של ${phone} ינותקו מיד.`, 'ניתוק');
    if (!ok) return;
    const r = await api('/admin/user-tokens/delete', { phone, tokenId: tokenId || '' });
    if (!r.ok) { toast(r.error || 'שגיאה בניתוק', 'bad'); return; }
    toast(r.data.message || 'הניתוק בוצע');
    const p = await api('/admin/user-profile', { phone });
    if (p.ok) renderSessions(p.data.profile?.activeSessions || []);
}

async function deleteUser() {
    const phone = S.editingUser;
    if (!phone) return;
    const r = await dialog({
        title: 'מחיקת חשבון לצמיתות',
        text: `החשבון של ${phone} יימחק לחלוטין, ללא אפשרות שחזור.\nכדי לאשר, הקלד את מספר הטלפון:`,
        input: { placeholder: phone, ltr: true, expect: phone },
        buttons: [{ label: 'ביטול' }, { label: 'מחיקה סופית', value: 'ok', cls: 'btn-danger-solid' }],
    });
    if (!r) return;
    const res = await api('/admin/delete-user', { phone });
    if (!res.ok) { toast(res.error || 'שגיאה במחיקה', 'bad'); return; }
    toast('החשבון נמחק');
    closeDrawers();
    loadUsers(true);
}

function openCreate(phone) {
    $('#create-form').reset();
    $('#cr-phone').value = phone || '';
    $('#cr-perms').hidden = true;
    renderPerms('cr-perms', '');
    openDrawer('create-drawer');
    setTimeout(() => $(phone ? '#cr-email' : '#cr-phone').focus(), 250);
}

async function createUser(e) {
    e.preventDefault();
    const pw = $('#cr-password').value;
    if (!/^\d{4,10}$/.test(pw)) { toast('הסיסמה חייבת להכיל 4–10 ספרות', 'bad'); return; }
    const isAdmin = $('#cr-is-admin').checked;
    const payload = {
        phone: $('#cr-phone').value.trim(), password: pw, email: $('#cr-email').value.trim(),
        canRecord: $('#cr-can-record').checked, canUpload: $('#cr-can-upload').checked, canTzintuk: $('#cr-can-tzintuk').checked,
        receiveEmails: $('#cr-receive-emails').checked, isAdmin, adminPermissions: isAdmin ? selectedPerms('cr-perms') : '',
        googleLoginOnly: false, canListen: true, listenWhitelist: '', listenBlacklist: '',
    };
    const btn = $('#cr-save');
    busy(btn, true);
    const r = await api('/admin/create-user', payload);
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה ביצירת החשבון', 'bad'); return; }
    toast('החשבון נוצר בהצלחה');
    closeDrawers();
    loadUsers(true);
}

function exportUsers() {
    const list = filteredUsers();
    downloadCsv(`salamon-users-${new Date().toISOString().slice(0, 10)}.csv`, [
        ['phone', 'name', 'email', 'yemotActive', 'hasWebAccount', 'isAdmin', 'canListen', 'canTzintuk', 'canUpload', 'canRecord', 'createdAt'],
        ...list.map(u => [u.phone, u.name, u.email, u.yemotActive, u.hasWebAccount, u.isAdmin, u.canListen, u.canTzintuk, u.canUpload, u.canRecord, u.createdAt]),
    ]);
}

// ---------- Security ----------

async function loadSecurity(silent = false) {
    if (!silent) {
        $('#blocks-body').innerHTML = loadingRows(6, 3);
        $('#logs-body').innerHTML = loadingRows(8, 6);
    }
    const [b, l] = await Promise.all([api('/verify/admin/blocks'), api('/verify/admin/logs', { limit: 150 })]);
    if (b.ok) S.blocks = b.data.blocks || [];
    if (l.ok) S.logs = l.data.logs || [];
    S.loaded.security = true;
    renderSecurity(b.ok ? '' : b.error, l.ok ? '' : l.error);
}

function renderSecurity(blockErr, logErr) {
    const warns = S.logs.filter(l => l.level === 'WARN').length;
    const blocked = S.logs.filter(l => l.level === 'BLOCKED').length;
    $('#sec-kpis').innerHTML = [
        kpi('fa-ban', S.blocks.length ? 'bad' : 'good', 'חסימות פעילות', num(S.blocks.length), 'טלפונים וכתובות IP'),
        kpi('fa-bolt', warns ? 'warn' : 'good', 'חריגות והגבלות קצב', num(warns), 'ב-150 האירועים האחרונים'),
        kpi('fa-shield-virus', 'good', 'התקפות שנבלמו', num(blocked), 'ב-150 האירועים האחרונים'),
        kpi('fa-list-check', 'info', 'אירועים ביומן', num(S.logs.length), 'מוצגים כעת'),
    ].join('');

    $('#blocks-count').textContent = S.blocks.length ? `${num(S.blocks.length)} פעילות` : '';
    $('#blocks-body').innerHTML = blockErr ? emptyRow(6, blockErr, 'fa-circle-exclamation') : S.blocks.length ? S.blocks.map(b => {
        const isIp = b.block_type === 'ip';
        return `<tr>
            <td><span class="badge"><i class="fa-solid ${isIp ? 'fa-network-wired' : 'fa-phone'}"></i> ${isIp ? 'IP' : 'טלפון'}</span></td>
            <td class="ltr mono" style="text-align:right; font-weight:500;">${esc(b.block_value)}</td>
            <td>${esc(b.reason || '—')}</td>
            <td class="muted nowrap">${esc(fmtDate(b.created_at))}</td>
            <td class="nowrap">${b.expires_at ? esc(fmtDate(b.expires_at)) : '<span class="badge bad"><i class="fa-solid fa-infinity"></i> לצמיתות</span>'}</td>
            <td><button class="btn btn-sm" data-action="unblock" data-type="${esc(b.block_type)}" data-value="${esc(b.block_value)}"><i class="fa-solid fa-unlock"></i> שחרור</button></td>
        </tr>`;
    }).join('') : emptyRow(6, 'אין חסימות פעילות', 'fa-shield-halved');

    const levels = [['all', 'הכל'], ['INFO', 'מידע'], ['WARN', 'חריגה'], ['BLOCKED', 'נבלם']];
    $('#logs-chips').innerHTML = levels.map(([k, l]) => `<button class="chip ${S.logsLevel === k ? 'active' : ''}" data-action="logs-filter" data-filter="${k}">${l}</button>`).join('');

    const q = S.logsSearch.toLowerCase();
    const logs = S.logs.filter(l => (S.logsLevel === 'all' || l.level === S.logsLevel) &&
        (!q || [l.phone, l.ip_address, l.details, l.action].some(v => String(v || '').toLowerCase().includes(q))));
    $('#logs-body').innerHTML = logErr ? emptyRow(8, logErr, 'fa-circle-exclamation') : logs.length ? logs.map(l => {
        const [label, tone] = ACTION_LABELS[l.action] || [l.action, ''];
        return `<tr>
            <td class="muted mono">${esc(l.id)}</td>
            <td class="muted nowrap">${esc(fmtDate(l.timestamp))}</td>
            <td>${levelBadge(l.level)}</td>
            <td><span class="badge ${tone}">${esc(label)}</span></td>
            <td class="ltr mono" style="text-align:right;">${esc(l.phone || '—')}</td>
            <td class="ltr mono muted" style="text-align:right;">${esc(l.ip_address || '—')}</td>
            <td style="max-width:320px; white-space:normal; font-size:12.5px;">${esc(l.details || '')}</td>
            <td><div class="row-actions">
                ${l.phone ? `<button class="icon-btn sm danger" data-action="quick-block" data-type="phone" data-value="${esc(l.phone)}" title="חסימת הטלפון"><i class="fa-solid fa-phone-slash"></i></button>` : ''}
                ${l.ip_address ? `<button class="icon-btn sm danger" data-action="quick-block" data-type="ip" data-value="${esc(l.ip_address)}" title="חסימת ה-IP"><i class="fa-solid fa-network-wired"></i></button>` : ''}
            </div></td>
        </tr>`;
    }).join('') : emptyRow(8, 'אין אירועים תואמים', 'fa-list');
}

function levelBadge(level) {
    if (level === 'WARN') return '<span class="badge warn"><i class="fa-solid fa-triangle-exclamation"></i> חריגה</span>';
    if (level === 'BLOCKED') return '<span class="badge bad"><i class="fa-solid fa-shield-virus"></i> נבלם</span>';
    if (level === 'INFO') return '<span class="badge info"><i class="fa-solid fa-circle-info"></i> מידע</span>';
    return `<span class="badge">${esc(level)}</span>`;
}

async function submitBlock(e) {
    e.preventDefault();
    const value = $('#block-value').value.trim();
    if (!value) return;
    const btn = $('#block-submit');
    busy(btn, true);
    const r = await api('/verify/admin/block', {
        type: $('#block-type').value, value, reason: $('#block-reason').value.trim(),
        durationValue: parseInt($('#block-duration').value, 10) || 0, durationUnit: $('#block-unit').value,
    });
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה ביצירת חסימה', 'bad'); return; }
    $('#block-value').value = ''; $('#block-reason').value = '';
    toast('החסימה הופעלה');
    loadSecurity(true);
}

function quickBlock(el) {
    const blocked = S.blocks.some(b => b.block_type === el.dataset.type && String(b.block_value) === el.dataset.value);
    if (blocked) { toast(`${el.dataset.value} כבר חסום`, 'info'); return; }
    $('#block-type').value = el.dataset.type;
    $('#block-value').value = el.dataset.value;
    const form = $('#block-form').closest('.card');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    form.style.boxShadow = '0 0 0 3px var(--bad-soft)';
    setTimeout(() => { form.style.boxShadow = ''; }, 1600);
    setTimeout(() => $('#block-reason').focus(), 300);
}

async function unblock(el) {
    const value = el.dataset.value;
    if (!await confirmDanger('שחרור חסימה', `לשחרר את החסימה על ${value}?`, 'שחרור')) return;
    const r = await api('/verify/admin/unblock', { type: el.dataset.type, target: value });
    if (!r.ok) { toast(r.error || 'שגיאה', 'bad'); return; }
    toast('החסימה הוסרה');
    loadSecurity(true);
}

async function cleanLogs() {
    if (!await confirmDanger('ניקוי לוגים ישנים', 'לוגים ישנים יימחקו לצמיתות.', 'ניקוי')) return;
    const r = await api('/verify/admin/clean');
    if (!r.ok) { toast(r.error || 'שגיאה', 'bad'); return; }
    toast('הלוגים הישנים נוקו');
    loadSecurity(true);
}

// ---------- Chat ----------

async function loadConvs(silent = false) {
    if (!silent && !S.convs.length) $('#conv-list').innerHTML = '<div class="empty"><i class="fa-solid fa-circle-notch spin"></i></div>';
    const r = await api('/admin/chat/conversations');
    if (!r.ok) { if (!silent) $('#conv-list').innerHTML = `<div class="empty">${esc(r.error)}</div>`; return; }
    const prev = new Map(S.convs.map(c => [c.user_phone, Number(c.unread_count) || 0]));
    S.convs = r.data.conversations || [];
    if (S.convsReady) {
        S.convs.forEach(c => {
            const n = Number(c.unread_count) || 0;
            const viewing = S.view === 'chat' && S.activePhone === c.user_phone && !document.hidden;
            if (n > (prev.get(c.user_phone) || 0) && !viewing) notifyMessage(c);
        });
    }
    S.convsReady = true;
    renderConvs();
    updateUnreadBadge();
}

function notifyMessage(c) {
    const who = c.user_name || c.user_phone;
    toast(`הודעה חדשה מ${who}`, 'info');
    const bell = $('#notif-btn');
    bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring');
    if (getItem('controlNotify') !== '1') return;
    playChime();
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try {
            const n = new Notification('הודעה חדשה · Salamon Control', { body: who, tag: `chat-${c.user_phone}`, icon: 'https://smt-tel-manager.netlify.app/salamon-logo.png' });
            n.onclick = () => { window.focus(); openConv(c.user_phone); n.close(); };
        } catch (e) {}
    }
}

let audioCtx = null;
function playChime() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const t = audioCtx.currentTime;
        [880, 1320].forEach((f, i) => {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.frequency.value = f; o.type = 'sine';
            g.gain.setValueAtTime(0.0001, t + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.12 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.25);
            o.connect(g).connect(audioCtx.destination);
            o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.3);
        });
    } catch (e) {}
}

function totalUnread() { return S.convs.reduce((a, c) => a + (Number(c.unread_count) || 0), 0); }

function updateTitle() {
    const v = VIEWS.find(x => x.id === S.view);
    const n = totalUnread();
    document.title = `${n ? `(${n > 99 ? '99+' : n}) ` : ''}${v ? v.label + ' · ' : ''}Salamon Control`;
}

function renderNotifs() {
    const waiting = S.convs.filter(c => Number(c.unread_count) > 0);
    $('#notif-list').innerHTML = waiting.length ? waiting.map(c => `
        <li class="clickable" data-action="open-conv" data-phone="${esc(c.user_phone)}">
            ${avatarHtml(c.user_name)}
            <div class="f-body"><div class="f-title">${esc(c.user_name || c.user_phone)}</div><div class="f-sub">${num(c.unread_count)} הודעות שלא נקראו</div></div>
            <div class="f-time">${esc(relTime(c.last_message_time))}</div>
        </li>`).join('') : '<li><div class="empty" style="padding:28px;width:100%;"><i class="fa-regular fa-bell-slash"></i>אין התראות חדשות</div></li>';
}

function updateLive() {
    const el = $('#live');
    if (!el) return;
    const age = S.lastSync ? Math.floor((Date.now() - S.lastSync) / 1000) : null;
    el.classList.toggle('offline', S.offline);
    el.classList.toggle('stale', !S.offline && age !== null && age > 120);
    $('#live-text').textContent = S.offline ? 'אין חיבור לשרת' : age === null ? 'מתחבר…' : age < 60 ? 'עודכן עכשיו' : `עודכן לפני ${Math.floor(age / 60)} דק׳`;
}

const QR_DEFAULTS = [
    'שלום, איך אפשר לעזור?',
    'תודה על הפנייה! אנחנו בודקים את הנושא ונחזור אליך בהקדם.',
    'הבעיה טופלה. אם יש עוד משהו — אנחנו כאן.',
    'אפשר לשלוח מספר טלפון מלא כדי שנוכל לבדוק?',
];

function quickReplies() {
    try { const v = JSON.parse(getItem('controlQuickReplies')); return Array.isArray(v) ? v : QR_DEFAULTS.slice(); } catch (e) { return QR_DEFAULTS.slice(); }
}

function renderQuickReplies() {
    const list = quickReplies();
    $('#qr-list').innerHTML = list.length ? list.map((t, i) => `
        <div class="qr-item" data-action="qr-use" data-i="${i}"><span title="${esc(t)}">${esc(t)}</span>
        <button type="button" class="icon-btn sm danger" data-action="qr-del" data-i="${i}" title="מחיקה"><i class="fa-solid fa-trash-can"></i></button></div>`).join('')
        : '<div class="empty" style="padding:20px;">אין תשובות שמורות. כתוב טקסט ולחץ "שמור".</div>';
}

function closePopovers(except) {
    $$('.popover').forEach(p => { if (p !== except) p.hidden = true; });
}

function togglePopover(id) {
    const p = $(`#${id}`);
    const show = p.hidden;
    closePopovers(p);
    p.hidden = !show;
    return show;
}

function renderThreadTags() {
    const u = S.users.find(x => x.phone === S.activePhone);
    $('#thread-tags').innerHTML = !u ? '' : [
        u.yemotActive ? '<span class="badge good"><i class="fa-solid fa-phone-volume"></i> פעיל בימות</span>' : '<span class="badge bad"><i class="fa-solid fa-phone-slash"></i> מנותק בימות</span>',
        u.hasWebAccount ? `<span class="badge info"><i class="fa-solid fa-envelope"></i> <span class="ltr">${esc(u.email || 'ללא אימייל')}</span></span>` : '<span class="badge">ללא חשבון אתר</span>',
        u.isAdmin ? '<span class="badge bad"><i class="fa-solid fa-user-shield"></i> צוות</span>' : '',
    ].join('');
}

const CHAT_FILTERS = [['all', 'הכל'], ['unread', 'לא נקראו'], ['pinned', 'מוצמדים'], ['archived', 'ארכיון']];

function convMatchesFilter(c) {
    if (c.user_phone === S.activePhone) return true;
    switch (S.chatFilter) {
        case 'unread': return Number(c.unread_count) > 0;
        case 'pinned': return !!c.pinned;
        case 'archived': return !!c.archived;
        default: return !c.archived;
    }
}

function renderConvs() {
    const q = S.chatSearch.toLowerCase();
    const counts = {
        all: S.convs.filter(c => !c.archived).length,
        unread: S.convs.filter(c => Number(c.unread_count) > 0).length,
        pinned: S.convs.filter(c => c.pinned).length,
        archived: S.convs.filter(c => c.archived).length,
    };
    $('#chat-chips').innerHTML = CHAT_FILTERS.map(([k, l]) =>
        `<button class="chip ${S.chatFilter === k ? 'active' : ''}" data-action="chat-filter" data-filter="${k}">${l} <span class="n">${num(counts[k])}</span></button>`).join('');
    const list = S.convs.filter(c => convMatchesFilter(c) &&
        (String(c.user_phone || '').includes(q) || String(c.user_name || '').toLowerCase().includes(q)));
    $('#conv-list').innerHTML = list.length ? list.map(c => {
        const last = c.last_message || {};
        const preview = c.typing
            ? '<span class="typing">מקליד/ה…</span>'
            : `${last.sender === 'admin' ? '<i class="fa-solid fa-reply" style="font-size:10px;"></i>' : ''}<span>${esc(last.text || '')}</span>`;
        return `
        <div class="conv ${c.user_phone === S.activePhone ? 'active' : ''} ${Number(c.unread_count) > 0 ? 'unread' : ''}" data-action="open-conv" data-phone="${esc(c.user_phone)}">
            ${avatarHtml(c.user_name, '', presenceClass(c.presence, c.online))}
            <div class="c-main">
                <div class="c-top">${c.pinned ? '<i class="fa-solid fa-thumbtack c-pin"></i>' : ''}<div class="c-name">${esc(c.user_name || c.user_phone)}</div>${c.note ? '<i class="fa-regular fa-note-sticky muted" title="יש הערה"></i>' : ''}</div>
                <div class="c-prev">${preview}</div>
            </div>
            <div class="c-meta"><span class="c-time">${esc(relTime(c.last_message_time))}</span>${Number(c.unread_count) > 0 ? `<span class="c-badge">${num(c.unread_count)}</span>` : ''}</div>
        </div>`;
    }).join('') : `<div class="empty"><i class="fa-regular fa-comments"></i>${S.chatFilter === 'unread' ? 'אין שיחות שממתינות לתשובה 🎉' : S.chatFilter === 'archived' ? 'הארכיון ריק' : 'אין שיחות'}</div>`;
}

function updateUnreadBadge() {
    const n = totalUnread();
    const bell = $('#notif-count');
    bell.hidden = !n;
    bell.textContent = n > 99 ? '99+' : n;
    updateTitle();
    if (!$('#notif-panel').hidden) renderNotifs();
    const el = $('#nav-chat-count');
    if (!el) return;
    el.hidden = !n;
    el.textContent = n > 99 ? '99+' : n;
}

// חיפוש טקסט בכל ההודעות (מוצג מתחת לרשימת השיחות)
const searchMessages = debounce(async q => {
    const box = $('#msg-search-results');
    if (q.length < 2) { box.innerHTML = ''; return; }
    const r = await api('/admin/chat/search', { q });
    if (S.chatSearch !== q) return;
    const hits = r.ok ? r.data.results || [] : [];
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    box.innerHTML = hits.length ? `<div class="search-head">נמצא בהודעות (${num(hits.length)})</div>` + hits.map(h => `
        <div class="search-hit" data-action="open-hit" data-phone="${esc(h.phone)}" data-id="${esc(h.id)}">
            <small>${esc(h.name || h.phone)} · ${h.sender === 'admin' ? 'אתה' : 'הלקוח'} · ${esc(relTime(h.createdAt))}</small>
            ${esc(h.text).replace(re, m => `<mark>${m}</mark>`)}
        </div>`).join('') : '';
}, 300);

function presenceText(p) {
    if (p && p.status === 'background') return 'באתר · בכרטיסייה אחרת';
    if (p && p.online) return 'מחובר/ת עכשיו';
    if (p && p.lastSeenAt) return `נראה/תה לאחרונה ${relTime(p.lastSeenAt)}`;
    return '';
}

// נקודת נוכחות על האווטאר: ירוק = מול המסך, צהוב = בכרטיסייה אחרת
function presenceClass(status, online) {
    if (status === 'background') return 'away';
    return (status === 'active' || (status === undefined && online)) ? 'online' : '';
}

async function openConv(phone, focusMsgId) {
    if (S.view !== 'chat') go('chat');
    const changed = S.activePhone !== phone;
    S.activePhone = phone;
    S.activeHash = '';
    S.focusMsgId = focusMsgId || null;
    if (changed) { S.replyTo = null; S.thread = null; renderReplyBar(); setAttach(null); $('#composer-input').value = ''; setSelectMode(false); }
    history.replaceState(null, '', `#chat/${encodeURIComponent(phone)}`);
    const c = S.convs.find(x => x.user_phone === phone) || {};
    $('#inbox').classList.add('has-active');
    $('#thread-empty').hidden = true;
    $('#thread-head').hidden = false; $('#thread-msgs').hidden = false; $('#composer').hidden = false;
    $('#thread-name').textContent = c.user_name || phone;
    $('#thread-status').textContent = phone;
    $('#thread-status').className = 'ltr';
    $('#thread-avatar').outerHTML = avatarHtml(c.user_name, '', presenceClass(c.presence, c.online)).replace('class="avatar', 'id="thread-avatar" class="avatar');
    $('#thread-msgs').innerHTML = '<div class="empty"><i class="fa-solid fa-circle-notch spin"></i></div>';
    $('#typing-bar').hidden = true;
    $('#thread-note').hidden = true;
    closePopovers();
    renderConvs();
    renderThreadTags();
    if (!S.users.length) loadUsers(true).then(renderThreadTags);
    await refreshThread(false);
    $('#composer-input').focus();
}

function closeThread() {
    sendTyping(false);
    S.activePhone = null;
    S.replyTo = null;
    history.replaceState(null, '', '#chat');
    $('#inbox').classList.remove('has-active');
    $('#thread-empty').hidden = false;
    $('#thread-head').hidden = true; $('#thread-msgs').hidden = true; $('#composer').hidden = true;
    $('#typing-bar').hidden = true; $('#reply-bar').hidden = true; $('#thread-note').hidden = true;
    renderConvs();
}

function renderThreadMeta() {
    const d = S.thread;
    if (!d) return;
    const status = $('#thread-status');
    const pText = presenceText(d.presence);
    status.textContent = pText || S.activePhone;
    status.className = d.presence && d.presence.status === 'background' ? 'away' : d.presence && d.presence.online ? 'online' : (pText ? '' : 'ltr');
    status.title = S.activePhone + (d.presence && d.presence.device ? ` · ${d.presence.device}` : '');
    const av = $('#thread-avatar');
    if (av) {
        const pc = presenceClass(d.presence && d.presence.status, d.presence && d.presence.online);
        av.classList.toggle('online', pc === 'online');
        av.classList.toggle('away', pc === 'away');
    }
    $('#thread-pin').classList.toggle('on', !!d.thread.pinned);
    $('#thread-pin').title = d.thread.pinned ? 'ביטול הצמדה' : 'הצמדה לראש הרשימה';
    $('#thread-archive').innerHTML = d.thread.archived ? '<i class="fa-solid fa-box-open"></i> הוצאה מהארכיון' : '<i class="fa-solid fa-box-archive"></i> העברה לארכיון';
    const note = $('#thread-note');
    note.hidden = !d.thread.note;
    note.innerHTML = d.thread.note ? `<i class="fa-regular fa-note-sticky"></i><span>${esc(d.thread.note)}</span>` : '';
    const typing = $('#typing-bar');
    typing.hidden = !d.userTyping;
    $('#typing-text').textContent = `${$('#thread-name').textContent} מקליד/ה…`;
    const mail = $('#composer-email');
    const noEmail = !d.user || !d.user.hasAccount || !d.user.email || !d.user.receiveEmails;
    mail.disabled = noEmail;
    if (noEmail) mail.checked = false;
    $('#composer-email-wrap').title = noEmail ? 'ללקוח אין מייל פעיל, או שביקש לא לקבל מיילים' : `לשלוח את ההודעה גם במייל ל-${d.user.email}, עם קישור חד-פעמי שפותח את הצ'אט`;
    $('#composer-email-wrap').classList.toggle('disabled', noEmail);
}

async function refreshThread(silent = true) {
    const phone = S.activePhone;
    if (!phone) return;
    const r = await api('/admin/chat/list', { targetPhone: phone });
    if (phone !== S.activePhone) return;
    if (!r.ok) { if (!silent) toast(r.error || 'שגיאה בטעינת השיחה', 'bad'); return; }
    if (r.data.userName) $('#thread-name').textContent = r.data.userName;
    S.thread = r.data;
    renderThreadMeta();
    const msgs = r.data.messages || [];
    S.threadMsgs = msgs;
    const hash = JSON.stringify(msgs);
    if (hash === S.activeHash) return;
    const first = !S.activeHash;
    S.activeHash = hash;
    renderThread(msgs, first);
    if (msgs.some(m => m.sender === 'user' && !m.is_read)) api('/admin/chat/read', { targetPhone: phone }).then(() => loadConvs(true));
}

const MAX_CHAT_FILE = 20 * 1024 * 1024;

// ---------- קבצים בצ'אט ----------
// הקובץ נטען ישירות מהקישור שהשרת נותן (לא דרך הזיכרון של הדף), כך שגם סינון כמו נטפרי רואה ומעביר אותו כרגיל.
// לפי ההגדרה במרכז השליטה: קישור קבוע שנבדק מול עוגיית החיבור (כמו גוגל), או קישור חתום ומוגבל בזמן.
// כל הקבצים נפתחים בתוך הצ'אט (תמונה, וידאו, שמע, PDF, טקסט), ותמיד אפשר גם לשמור אותם.
// קובץ שהמנהל הגביל (צפייה חד-פעמית / מספר צפיות / תוקף) לא נטען אוטומטית, וכל פתיחה שלו נספרת.

// api: פונקציה שמחזירה את כתובת ה-API, auth: פונקציה שמחזירה את הטוקן לבקשה
function createChatFiles({ api, auth, esc, toast, onChange, viewer = 'user' }) {
    const PDFJS = '/salamon/vendor/pdf.min.js';
    const PDFJS_WORKER = '/salamon/vendor/pdf.worker.min.js';
    const VIDEO_EXT = /\.(mp4|m4v|mov|3gp|mkv|avi|webm)$/i;
    const kind = (type, name) => {
        const t = String(type || '');
        // יש טלפונים שמסמנים סרטון mp4 כקובץ שמע
        if (t.startsWith('audio/') && /\.(mp4|m4v|mov|3gp|mkv|avi)$/i.test(String(name || ''))) return 'video';
        if ((!t || t === 'application/octet-stream') && VIDEO_EXT.test(String(name || ''))) return 'video';
        if (/^image\/(png|jpe?g|gif|webp|avif|bmp)$/.test(t)) return 'img';
        if (t.startsWith('video/')) return 'video';
        if (t.startsWith('audio/')) return 'audio';
        if (t === 'application/pdf') return 'pdf';
        if (t === 'text/plain') return 'text';
        return 'file';
    };

    function size(n) {
        if (!n) return '';
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
        return `${(n / 1024 / 1024).toFixed(1)} MB`;
    }
    function icon(type, name) {
        const t = String(type || ''), n = String(name || '').toLowerCase();
        if (t.startsWith('image/')) return 'fa-file-image';
        if (t.startsWith('audio/')) return 'fa-file-audio';
        if (t.startsWith('video/')) return 'fa-file-video';
        if (t === 'application/pdf') return 'fa-file-pdf';
        if (/\.(docx?|odt|rtf)$/.test(n)) return 'fa-file-word';
        if (/\.(xlsx?|ods|csv)$/.test(n)) return 'fa-file-excel';
        if (/\.(pptx?|odp)$/.test(n)) return 'fa-file-powerpoint';
        if (/\.(zip|rar|7z|gz)$/.test(n)) return 'fa-file-zipper';
        return 'fa-file-lines';
    }
    function when(str) {
        const d = str ? new Date(String(str).replace(' ', 'T')) : null;
        return d && !isNaN(d) ? d.toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    }
    function limitText(f) {
        const parts = [];
        if (f.maxViews === 1) parts.push(viewer === 'admin' ? `צפייה חד-פעמית · ${f.views ? 'נצפה' : 'לא נצפה'}` : 'צפייה חד-פעמית');
        else if (f.maxViews !== null && f.maxViews !== undefined) parts.push(viewer === 'admin' ? `נצפה ${f.views}/${f.maxViews}` : `נותרו ${Math.max(0, f.maxViews - f.views)} צפיות`);
        else if (viewer === 'admin' && f.views) parts.push(`נצפה ${f.views} פעמים`);
        if (f.expiresAt) parts.push(`עד ${when(f.expiresAt)}`);
        return parts.join(' · ');
    }
    const BLOCKED = { expired: 'פג תוקף הקובץ', used: 'הקובץ כבר נצפה', revoked: 'הגישה לקובץ בוטלה' };
    const OPEN_TEXT = { img: 'לחץ לצפייה', video: 'לחץ לצפייה', audio: 'לחץ להשמעה', pdf: 'לחץ לפתיחה', text: 'לחץ לפתיחה', file: 'לחץ לפתיחה' };
    const OPEN_ICON = { video: 'fa-circle-play', audio: 'fa-circle-play' };

    function duration(sec) {
        if (!sec) return '';
        const s = Math.round(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = String(s % 60).padStart(2, '0');
        return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
    }

    // קישור לפתיחה: קובץ רגיל - הקישור שהגיע עם ההודעה (אם לא עומד לפוג); קובץ מוגבל - קישור חדש מהשרת, ואז נספרת צפייה
    // קישור קבוע (גישה לפי חיבור) לא פג; קישור חתום או אישור פתיחה - בודקים את מועד התפוגה שבו
    function linkExpired(u) {
        const s = String(u || '');
        if (!s) return true;
        const m = /[?&]e=(\d+)/.exec(s) || /\/chat\/f\/\d+\/[ft]\/(\d+)\//.exec(s);
        return !!m && Number(m[1]) * 1000 < Date.now() + 60000;
    }
    async function linkFor(id, f) {
        const limited = viewer === 'user' && f.limited && !f.master;
        if (!limited && f.url && !linkExpired(f.url)) return f.url;
        let res;
        try {
            res = await fetch(`${api()}/chat/file-link`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...auth(), messageId: Number(id) }) });
        } catch (e) { throw new Error('שגיאת תקשורת מול השרת'); }
        let d = {};
        try { d = await res.json(); } catch (e) {}
        if (!res.ok || !d.url) throw new Error(d.error || 'לא ניתן לפתוח את הקובץ');
        if (!limited) { f.url = d.url; if (d.thumbUrl) f.thumbUrl = d.thumbUrl; }
        return d.url;
    }

    // ---------- תמונה מקדימה ----------
    // נוצרת בדפדפן של השולח לפני ההעלאה: פריים מהסרטון, העמוד הראשון של PDF, או תמונה מוקטנת
    const THUMB_MAX = 520;
    const timeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
    const toJpeg = c => new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
    function fit(w, h) {
        const s = Math.min(1, THUMB_MAX / Math.max(w, h));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
        return c;
    }
    function once(el, ev) { return new Promise((res, rej) => { el.addEventListener(ev, res, { once: true }); el.addEventListener('error', rej, { once: true }); }); }
    // src: הקובץ שנבחר להעלאה (File), או קישור לקובץ שכבר בשרת
    const srcUrl = src => typeof src === 'string' ? src : URL.createObjectURL(src);
    const release = (src, url) => { if (typeof src !== 'string') URL.revokeObjectURL(url); };
    async function imageThumb(src, bytes) {
        const url = srcUrl(src);
        try {
            const img = new Image(); img.src = url; await once(img, 'load');
            const meta = { w: img.naturalWidth, h: img.naturalHeight };
            if (bytes < 120 * 1024) return { thumb: null, meta };
            const c = fit(meta.w, meta.h); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            return { thumb: await toJpeg(c), meta };
        } finally { release(src, url); }
    }
    async function videoThumb(src) {
        const url = srcUrl(src);
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
        try {
            await once(v, 'loadedmetadata');
            const meta = { duration: v.duration && isFinite(v.duration) ? v.duration : undefined, w: v.videoWidth || undefined, h: v.videoHeight || undefined };
            if (!v.videoWidth) return { thumb: null, meta };
            v.currentTime = Math.min(1, (meta.duration || 0) * 0.25);
            await timeout(once(v, 'seeked'), 4000);
            const c = fit(v.videoWidth, v.videoHeight); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
            return { thumb: await toJpeg(c), meta };
        } finally { v.removeAttribute('src'); v.load(); release(src, url); }
    }
    const PDF_FONTS = '/salamon/vendor/standard_fonts/';
    async function pdfThumb(src) {
        const lib = await loadPdfJs();
        const doc = await lib.getDocument(typeof src === 'string' ? { url: src, standardFontDataUrl: PDF_FONTS } : { data: new Uint8Array(await src.arrayBuffer()), standardFontDataUrl: PDF_FONTS }).promise;
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: THUMB_MAX / Math.max(base.width, base.height) });
        const c = document.createElement('canvas');
        c.width = Math.round(vp.width); c.height = Math.round(vp.height); c.dir = 'ltr'; c.style.direction = 'ltr';
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        return { thumb: await toJpeg(c), meta: { pages: doc.numPages, w: Math.round(base.width), h: Math.round(base.height) } };
    }
    async function makeThumb(src, type, name, bytes) {
        const k = kind(type || src.type, name || src.name);
        try {
            if (k === 'img') return await timeout(imageThumb(src, bytes ?? src.size), 8000);
            if (k === 'video') return await timeout(videoThumb(src), 10000);
            if (k === 'pdf') return await timeout(pdfThumb(src), 15000);
        } catch (e) {}
        return null;
    }
    // שדות שמצורפים להעלאה (thumb + meta), מוכנים פעם אחת לכל קובץ
    const prepared = new WeakMap();
    function prepare(file) {
        if (!prepared.has(file)) prepared.set(file, makeThumb(file).then(t => t ? { thumb: t.thumb || undefined, meta: JSON.stringify(t.meta || {}) } : {}).catch(() => ({})));
        return prepared.get(file);
    }
    // קובץ ישן בלי תמונה מקדימה: מכינים אותה מהקובץ שנפתח (דרך הקישור שלו) ושולחים לשרת
    async function backfill(id, f, url) {
        if (f.thumb || !['img', 'video', 'pdf'].includes(kind(f.type, f.name))) return;
        const t = await makeThumb(url, f.type, f.name, f.size);
        if (!t || (!t.thumb && !t.meta)) return;
        const fd = new FormData();
        for (const [k, v] of Object.entries(auth())) if (v) fd.append(k, v);
        fd.append('messageId', String(id));
        fd.append('meta', JSON.stringify(t.meta || {}));
        if (t.thumb) fd.append('thumb', t.thumb, 'thumb.jpg');
        const r = await fetch(`${api()}/chat/file-thumb`, { method: 'POST', body: fd }).catch(() => null);
        if (r && r.ok) {
            f.meta = f.meta || t.meta;
            if (t.thumb) f.thumb = true;
            if (onChange) onChange();
        }
    }

    function card(cls, ic, name, sub, attrs = '', tail = '') {
        return `<div class="cf-card ${cls}" ${attrs}><i class="fa-solid ${ic}"></i><span><b>${esc(name)}</b><small>${sub}</small></span>${tail}</div>`;
    }

    // state: 'up' (עולה), 'failed' (ההעלאה נכשלה), או ריק להודעה שנשמרה
    function html(f, id, state) {
        if (!f) return '';
        const t = String(f.type || ''), k = kind(t, f.name), key = String(id), meta = f.meta || {};
        if (state) return card('', icon(t, f.name), f.name, state === 'failed' ? 'לא נשלח · לחץ לשליחה חוזרת' : '<i class="fa-solid fa-circle-notch fa-spin"></i> מעלה…');
        const lim = f.limited || (viewer === 'admin' && f.views) ? limitText(f) : '';
        const badge = viewer === 'admin' && lim ? `<div class="cf-limit ${f.blocked ? 'off' : ''}"><i class="fa-solid fa-${f.blocked ? 'ban' : 'eye'}"></i> ${esc(lim)}${f.blocked ? ` · ${esc(BLOCKED[f.blocked] || '')}` : ''}</div>` : '';
        const openAttrs = `role="button" tabindex="0" data-file-open="${esc(key)}"`;
        if (viewer === 'user' && !f.available) return card('off', 'fa-lock', f.name, esc(BLOCKED[f.blocked] || 'הקובץ אינו זמין'));
        if (viewer === 'user' && f.limited && !f.master) return card('locked', 'fa-lock', f.name, `${esc(lim)} · ${OPEN_TEXT[k]}`, openAttrs, '<i class="fa-solid fa-eye cf-act"></i>');
        const pic = (thumb) => {
            const ratio = meta.w && meta.h ? ` style="aspect-ratio:${meta.w}/${meta.h}"` : '';
            return `<img src="${esc(thumb ? f.thumbUrl : f.url)}" loading="lazy" decoding="async" alt=""${ratio}>`;
        };
        if (k === 'img' && (f.thumbUrl || f.url)) return `<button type="button" class="cf-img" data-file-open="${esc(key)}" aria-label="${esc(f.name)}">${pic(!!f.thumbUrl)}</button>${badge}`;
        if (k === 'video' && f.thumbUrl) {
            return `<button type="button" class="cf-img cf-video" data-file-open="${esc(key)}" aria-label="${esc(f.name)}">${pic(true)}<span class="cf-play"><i class="fa-solid fa-play"></i></span>${meta.duration ? `<span class="cf-dur"><i class="fa-solid fa-video"></i> ${esc(duration(meta.duration))}</span>` : ''}</button>${badge}`;
        }
        if (k === 'pdf' && f.thumbUrl) {
            return `<button type="button" class="cf-img cf-doc" data-file-open="${esc(key)}" aria-label="${esc(f.name)}">${pic(true)}<span class="cf-doc-bar"><i class="fa-solid fa-file-pdf"></i><b>${esc(f.name)}</b><small>${meta.pages ? `${meta.pages} עמ' · ` : ''}${esc(size(f.size))}</small></span></button>${badge}`;
        }
        const extra = k === 'video' && meta.duration ? `${esc(duration(meta.duration))} · ` : k === 'pdf' && meta.pages ? `${meta.pages} עמ' · ` : '';
        return card(k === 'video' || k === 'audio' ? 'media' : '', OPEN_ICON[k] || icon(t, f.name), f.name, `${extra}${esc(size(f.size))} · ${OPEN_TEXT[k]}`, openAttrs, `<i class="fa-solid fa-${k === 'video' || k === 'audio' ? 'play' : 'eye'} cf-act"></i>`) + badge;
    }

    // תמונה שלא נטענה (למשל קישור שפג) מסומנת, ובלחיצה עליה נוצר קישור חדש
    function hydrate(root) {
        if (!root) return;
        root.querySelectorAll('.cf-img img:not([data-watch])').forEach(el => {
            el.dataset.watch = '1';
            el.addEventListener('error', () => el.closest('.cf-img')?.classList.add('broken'), { once: true });
        });
    }

    function save(url, name) {
        const a = document.createElement('a');
        a.href = url + (url.includes('?') ? '&' : '?') + 'dl=1'; a.download = name || 'file'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
    }

    let pdfjsReady = null;
    function loadPdfJs() {
        if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
        if (!pdfjsReady) {
            pdfjsReady = new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = PDFJS;
                s.onload = () => { if (!window.pdfjsLib) return reject(new Error('pdf')); window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; resolve(window.pdfjsLib); };
                s.onerror = () => { pdfjsReady = null; reject(new Error('pdf')); };
                document.head.appendChild(s);
            });
        }
        return pdfjsReady;
    }

    // הצגת PDF בתוך הצ'אט, עמוד אחרי עמוד (גם בטלפונים, שבהם הדפדפן היה מוריד את הקובץ)
    async function renderPdf(url, body, isOpen) {
        body.innerHTML = '<div class="cf-v-wait"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען מסמך…</div>';
        const lib = await loadPdfJs();
        const doc = await lib.getDocument({ url, standardFontDataUrl: PDF_FONTS }).promise;
        body.innerHTML = '';
        const width = Math.min(body.clientWidth - 20, 900);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= Math.min(doc.numPages, 300); n++) {
            if (!isOpen()) return;
            const page = await doc.getPage(n);
            const base = page.getViewport({ scale: 1 });
            const vp = page.getViewport({ scale: (width / base.width) * dpr });
            const canvas = document.createElement('canvas');
            // הטקסט במסמך כבר ממוקם במדויק; כיוון ימין-לשמאל של הדף היה מזיז כל אות
            canvas.dir = 'ltr';
            canvas.style.direction = 'ltr';
            canvas.width = vp.width; canvas.height = vp.height;
            canvas.style.width = `${Math.round(vp.width / dpr)}px`;
            body.appendChild(canvas);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        }
    }

    function viewerOpen(url, f) {
        const k = kind(f.type, f.name);
        const ov = document.createElement('div');
        ov.className = 'cf-viewer';
        ov.innerHTML = `<div class="cf-v-bar"><b>${esc(f.name)}</b><small>${esc(size(f.size))}</small><button type="button" class="cf-v-btn" data-v="save" aria-label="שמירה" title="שמירה למכשיר"><i class="fa-solid fa-download"></i></button><button type="button" class="cf-v-btn" data-v="close" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="cf-v-body ${k === 'pdf' || k === 'text' ? 'doc' : ''}"></div>
            ${f.limited && viewer === 'user' && !f.master ? `<div class="cf-v-note"><i class="fa-solid fa-lock"></i> ${esc(limitText(f))}</div>` : ''}`;
        const body = ov.querySelector('.cf-v-body');
        let open = true;
        if (k === 'img') body.innerHTML = `<img src="${esc(url)}" alt="">`;
        else if (k === 'video') body.innerHTML = `<video src="${esc(url)}" controls autoplay playsinline preload="metadata"></video>`;
        else if (k === 'audio') body.innerHTML = `<div class="cf-v-audio"><i class="fa-solid fa-music"></i><audio src="${esc(url)}" controls autoplay></audio></div>`;
        else if (k === 'text') fetch(url).then(r => r.text()).then(t => { if (open) body.innerHTML = `<pre class="cf-v-text">${esc(t.slice(0, 500000))}</pre>`; }).catch(() => {});
        else if (k === 'pdf') renderPdf(url, body, () => open).catch(() => {
            if (open) body.innerHTML = `<div class="cf-v-file"><i class="fa-solid fa-file-pdf"></i><b>${esc(f.name)}</b><p>לא ניתן להציג את המסמך כאן.</p><button type="button" class="cf-v-dl" data-v="save"><i class="fa-solid fa-download"></i> שמירה למכשיר</button></div>`;
        });
        else body.innerHTML = `<div class="cf-v-file"><i class="fa-solid ${icon(f.type, f.name)}"></i><b>${esc(f.name)}</b><p>${esc(size(f.size))} · אין תצוגה מקדימה לסוג קובץ זה</p><button type="button" class="cf-v-dl" data-v="save"><i class="fa-solid fa-download"></i> שמירה למכשיר</button></div>`;
        if (k === 'video') body.querySelector('video').addEventListener('loadedmetadata', e => {
            // הקול מתנגן אבל אין תמונה: הדפדפן לא מכיר את הקידוד של הסרטון (למשל HEVC מחלק מהטלפונים)
            if (open && !e.target.videoWidth) body.insertAdjacentHTML('beforeend', '<div class="cf-v-warn"><i class="fa-solid fa-circle-info"></i> הדפדפן הזה לא מצליח להציג את התמונה של הסרטון (רק את הקול). אפשר לשמור אותו ולצפות בו בגלריה של המכשיר.</div>');
        });
        if (k === 'video') body.querySelector('video').addEventListener('error', () => {
            if (open) body.innerHTML = `<div class="cf-v-file"><i class="fa-solid fa-file-video"></i><b>${esc(f.name)}</b><p>הדפדפן הזה לא מצליח להציג את הסרטון. אפשר לשמור אותו ולצפות בו במכשיר.</p><button type="button" class="cf-v-dl" data-v="save"><i class="fa-solid fa-download"></i> שמירה למכשיר</button></div>`;
        });

        const close = () => { open = false; ov.querySelectorAll('video, audio').forEach(m => { m.pause(); m.removeAttribute('src'); m.load(); }); ov.remove(); document.removeEventListener('keydown', onKey, true); };
        const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        ov.addEventListener('click', e => {
            const b = e.target.closest('[data-v]');
            if (b && b.dataset.v === 'save') { save(url, f.name); return; }
            if (b || e.target === ov || e.target === body) close();
        });
        document.addEventListener('keydown', onKey, true);
        document.body.appendChild(ov);
    }

    async function open(id, f) {
        if (!f) return;
        const key = String(id);
        const limited = viewer === 'user' && f.limited && !f.master;
        try {
            const url = await linkFor(key, f);
            viewerOpen(url, f);
            if (!limited) backfill(key, f, url).catch(() => {});
        } catch (e) {
            toast(e.message);
        }
        if (limited && onChange) onChange();
    }

    function clear() {}

    return { html, hydrate, open, clear, size, icon, limitText, prepare };
}

function injectChatFileStyles() {
    if (document.getElementById('cf-styles')) return;
    const css = document.createElement('style');
    css.id = 'cf-styles';
    css.textContent = `
    .cf-card { display: flex; align-items: center; gap: 10px; min-width: 210px; max-width: 290px; padding: 9px 11px; margin: 1px 0 4px; border-radius: 9px; background: rgba(127,127,127,.13); color: inherit; text-align: start; }
    .cf-card[data-file-open] { cursor: pointer; }
    .cf-card[data-file-open]:hover { background: rgba(127,127,127,.2); }
    .cf-card > i:first-child { font-size: 1.6rem; color: #3b82f6; flex-shrink: 0; }
    .cf-card.media > i:first-child { color: #16a34a; font-size: 1.9rem; }
    .cf-card.locked > i:first-child { color: #f59e0b; }
    .cf-card.off { opacity: .75; }
    .cf-card.off > i:first-child { color: #94a3b8; }
    .cf-card span { flex: 1; min-width: 0; line-height: 1.3; }
    .cf-card b { display: block; font-size: .86rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cf-card small { font-size: .73rem; opacity: .75; }
    .cf-card .cf-act { opacity: .7; }
    .cf-img { display: block; padding: 0; border: none; background: none; cursor: zoom-in; margin: 0 0 4px; border-radius: 8px; overflow: hidden; }
    .cf-img img { display: block; max-width: min(300px, 100%); max-height: 280px; object-fit: cover; }
    .cf-img img { min-width: 120px; min-height: 80px; }
    .cf-img.broken img { width: 220px; height: 60px; }
    .cf-img img { background: rgba(127,127,127,.15); }
    .cf-video, .cf-doc { position: relative; }
    .cf-video img { min-width: 200px; min-height: 120px; max-height: 300px; }
    .cf-play { position: absolute; inset: 0; margin: auto; width: 54px; height: 54px; border-radius: 50%; background: rgba(0,0,0,.55); color: #fff; display: grid; place-items: center; font-size: 1.25rem; padding-inline-start: 4px; box-shadow: 0 2px 12px rgba(0,0,0,.35); pointer-events: none; }
    .cf-dur { position: absolute; bottom: 6px; inset-inline-start: 6px; padding: 2px 7px; border-radius: 6px; background: rgba(0,0,0,.6); color: #fff; font-size: .72rem; direction: ltr; pointer-events: none; }
    .cf-doc { width: 260px; max-width: 100%; background: rgba(127,127,127,.13); text-align: start; }
    .cf-doc img { width: 100%; max-width: none; height: 150px; max-height: none; object-fit: cover; object-position: top; background: #fff; }
    .cf-doc-bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; color: inherit; }
    .cf-doc-bar i { color: #ef4444; font-size: 1.3rem; }
    .cf-doc-bar b { flex: 1; min-width: 0; font-size: .82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cf-doc-bar small { font-size: .7rem; opacity: .75; white-space: nowrap; }
    .cf-v-warn { position: absolute; bottom: 70px; inset-inline: 16px; margin: auto; max-width: 460px; padding: 10px 14px; border-radius: 10px; background: rgba(15,23,42,.92); color: #fde68a; font-size: .85rem; text-align: center; }
    .cf-limit { font-size: .72rem; opacity: .85; margin: -1px 0 4px; }
    .cf-limit.off { color: #ef4444; opacity: 1; }
    .cf-viewer { position: fixed; inset: 0; z-index: 3000; display: flex; flex-direction: column; background: rgba(2,6,23,.97); color: #fff; direction: rtl; font-family: inherit; animation: cfFade .15s ease; }
    @keyframes cfFade { from { opacity: 0; } }
    .cf-v-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; flex-shrink: 0; }
    .cf-v-bar b { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: .95rem; }
    .cf-v-bar small { opacity: .6; font-size: .78rem; direction: ltr; }
    .cf-v-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(255,255,255,.12); color: #fff; cursor: pointer; font-size: 1rem; flex-shrink: 0; }
    .cf-v-btn:hover { background: rgba(255,255,255,.22); }
    .cf-v-body { position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 10px; }
    .cf-v-body.doc { flex-direction: column; justify-content: flex-start; gap: 10px; overflow: auto; -webkit-overflow-scrolling: touch; }
    .cf-v-body img, .cf-v-body video { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; background: #000; }
    .cf-v-body canvas { display: block; max-width: 100%; height: auto; background: #fff; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,.4); flex-shrink: 0; }
    .cf-v-audio { display: flex; flex-direction: column; align-items: center; gap: 22px; width: min(460px, 100%); }
    .cf-v-audio > i { font-size: 4rem; opacity: .5; }
    .cf-v-audio audio { width: 100%; }
    .cf-v-text { width: min(900px, 100%); margin: 0; padding: 18px; background: #fff; color: #0f172a; border-radius: 8px; white-space: pre-wrap; word-wrap: break-word; font: 14px/1.6 ui-monospace, monospace; text-align: start; direction: auto; }
    .cf-v-file, .cf-v-wait { margin: auto; text-align: center; max-width: 340px; }
    .cf-v-file > i { font-size: 4rem; color: #60a5fa; display: block; margin-bottom: 14px; }
    .cf-v-file b { display: block; font-size: 1rem; word-break: break-word; }
    .cf-v-file p { opacity: .7; font-size: .88rem; margin: 6px 0 18px; }
    .cf-v-dl { border: none; border-radius: 999px; padding: 11px 22px; background: #16a34a; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
    .cf-v-note { text-align: center; padding: 10px 14px 16px; font-size: .85rem; color: #fcd34d; flex-shrink: 0; }
    `;
    document.head.appendChild(css);
}

const F = createChatFiles({
    api: () => API_BASE_URL, auth: () => ({ adminToken: S.adminToken }), esc, viewer: 'admin',
    toast: msg => toast(msg, 'bad'),
    onChange: () => { S.activeHash = ''; refreshThread(); },
});

// צירוף הקובץ למייל אפשרי רק לקובץ בלי הגבלות ועד 10MB, כדי שהמייל לא יעקוף את ההגבלה
function syncAttachOpts() {
    const limited = !!($('#attach-views').value || $('#attach-expiry').value);
    const big = S.attach && S.attach.size > 10 * 1024 * 1024;
    const opt = $('#attach-email').querySelector('option[value="attach"]');
    opt.disabled = limited || big;
    opt.textContent = limited ? 'במייל: לצרף (לא זמין לקובץ מוגבל)' : big ? 'במייל: לצרף (מעל 10MB)' : 'במייל: לצרף את הקובץ';
    if (opt.disabled) $('#attach-email').value = 'link';
}

async function editFileLimits(id) {
    const m = (S.threadMsgs || []).find(x => String(x.id) === String(id));
    if (!m || !m.file) return;
    const f = m.file;
    const r = await dialog({
        title: 'הגבלות הקובץ ללקוח', icon: 'info',
        text: `${f.name}${F.limitText(f) ? ` · ${F.limitText(f)}` : ''}. הצפיות שלך לא נספרות.`,
        extra: `<label class="dialog-field">מספר צפיות ללקוח<select class="input" name="views">
                <option value="">ללא הגבלה</option>${[1, 2, 3, 5, 10].map(n => `<option value="${n}" ${f.maxViews === n ? 'selected' : ''}>${n === 1 ? 'צפייה חד-פעמית' : `עד ${n} צפיות`}</option>`).join('')}
            </select></label>
            <label class="dialog-field">תוקף<select class="input" name="expiry">
                <option value="keep">${f.expiresAt ? 'ללא שינוי' : 'ללא תוקף'}</option>${f.expiresAt ? '<option value="">ביטול התוקף</option>' : ''}
                <option value="60">שעה מעכשיו</option><option value="1440">24 שעות מעכשיו</option><option value="10080">7 ימים מעכשיו</option><option value="43200">30 ימים מעכשיו</option>
            </select></label>
            <label class="dialog-check"><input type="checkbox" name="reset"> איפוס ספירת הצפיות (${f.views || 0} עד עכשיו)</label>`,
        buttons: [{ label: 'ביטול' }, { label: 'חסימת גישה עכשיו', value: 'revoke', cls: 'btn-danger' }, { label: 'שמירה', value: 'ok', cls: 'btn-primary' }],
    });
    if (!r) return;
    const x = r.extra || {};
    const body = r.value === 'revoke' ? { revoke: true }
        : { maxViews: x.views === '' ? null : Number(x.views), expiresMinutes: x.expiry === 'keep' || x.expiry === '' ? null : Number(x.expiry), keepExpiry: x.expiry === 'keep', resetViews: !!x.reset };
    const res = await api('/admin/chat/file-limits', { messageId: Number(id), ...body });
    if (!res.ok) { toast(res.error || 'שגיאה בעדכון ההגבלות', 'bad'); return; }
    toast(r.value === 'revoke' ? 'הגישה של הלקוח לקובץ נחסמה' : 'ההגבלות עודכנו', 'good');
    S.activeHash = '';
    refreshThread();
}

function setAttach(file) {
    if (file && file.size > MAX_CHAT_FILE) { toast(`הקובץ גדול מדי (עד ${MAX_CHAT_FILE / 1024 / 1024}MB)`, 'bad'); file = null; }
    S.attach = file || null;
    $('#attach-bar').hidden = !S.attach;
    $('#composer-file').value = '';
    if (!S.attach) return;
    $('#attach-icon').className = `fa-solid ${F.icon(S.attach.type, S.attach.name)}`;
    $('#attach-name').textContent = S.attach.name;
    $('#attach-size').textContent = `${F.size(S.attach.size)} · אפשר להוסיף הודעה ולשלוח`;
    $('#attach-views').value = ''; $('#attach-expiry').value = ''; $('#attach-email').value = 'link';
    syncAttachOpts();
    $('#composer-input').focus();
}

function renderThread(msgs, forceBottom) {
    const box = $('#thread-msgs');
    const atBottom = box.scrollHeight - box.scrollTop <= box.clientHeight + 60;
    const prevTop = box.scrollTop;
    if (!msgs.length) { box.innerHTML = '<div class="empty"><i class="fa-regular fa-paper-plane"></i>אין הודעות עדיין — כתוב את ההודעה הראשונה</div>'; return; }
    let html = '', lastDay = '';
    msgs.forEach(m => {
        const d = parseDate(m.created_at);
        const day = d ? d.toDateString() : '';
        if (day && day !== lastDay) { lastDay = day; html += `<div class="day-sep">${esc(dayLabel(d))}</div>`; }
        const out = m.sender === 'admin';
        const deleted = m.is_deleted === 1;
        const ticks = out && !deleted ? `<i class="fa-solid fa-check-double" style="${m.is_read ? 'color:#a5f3fc' : ''}" title="${m.is_read ? 'נקרא' : 'נשלח'}"></i>` : '';
        const quote = m.reply && !deleted ? `<div class="m-quote" data-action="jump-msg" data-id="${esc(m.reply.id)}"><b>${m.reply.sender === 'admin' ? 'אתה' : 'הלקוח'}</b>${esc(m.reply.text)}</div>` : '';
        const sel = S.selectMode;
        const actions = sel ? '' : deleted ? `<div class="m-actions">
            ${m.deleted_text ? `<button class="icon-btn" data-action="restore-msg" data-id="${esc(m.id)}" title="שחזור ההודעה"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
            <button class="icon-btn danger" data-action="purge-msg" data-id="${esc(m.id)}" title="מחיקה לצמיתות"><i class="fa-solid fa-trash-can"></i></button>
        </div>` : `<div class="m-actions">
            <button class="icon-btn" data-action="reply-msg" data-id="${esc(m.id)}" title="ציטוט ותשובה"><i class="fa-solid fa-reply"></i></button>
            ${out ? `<button class="icon-btn" data-action="edit-msg" data-id="${esc(m.id)}" title="עריכה"><i class="fa-solid fa-pen"></i></button>` : ''}
            ${out && m.file ? `<button class="icon-btn" data-action="file-limits" data-id="${esc(m.id)}" title="הגבלות צפייה ותוקף לקובץ"><i class="fa-solid fa-lock"></i></button>` : ''}
            <button class="icon-btn danger" data-action="delete-msg" data-id="${esc(m.id)}" title="מחיקה"><i class="fa-solid fa-trash-can"></i></button>
        </div>`;
        const picked = sel && S.msgSel.has(String(m.id));
        html += `<div class="msg ${out ? 'out' : 'in'} ${deleted ? 'deleted' : ''} ${sel ? 'selectable' : ''} ${picked ? 'picked' : ''}" data-msg="${esc(m.id)}"${sel ? ` data-action="pick-msg" data-id="${esc(m.id)}"` : ''}>
            ${sel ? `<span class="m-check"><i class="fa-solid fa-check"></i></span>` : ''}
            ${quote}
            ${deleted ? (m.file_name ? `<div class="m-file-gone"><i class="fa-solid fa-paperclip"></i> ${esc(m.file_name)}</div>` : '') : F.html(m.file, m.id)}
            ${deleted || m.message_text ? `<div class="m-text">${deleted ? `🚫 ההודעה נמחקה${m.deleted_at ? ` · ${esc(chatTime(m.deleted_at))}` : ''}` : esc(m.message_text)}</div>` : ''}
            ${deleted && m.deleted_text ? `<details class="m-deleted"><summary>הצגת התוכן שנמחק (רק אתה רואה)</summary><div>${esc(m.deleted_text)}</div></details>` : ''}
            ${m.email ? `<div class="m-email" title="${m.email.openedAt ? `נפתח ב-${esc(fmtDate(m.email.openedAt))}${m.email.openedIp ? ` מ-${esc(m.email.openedIp)}` : ''}` : 'הלקוח עוד לא פתח את הקישור'}"><i class="fa-solid fa-envelope${m.email.openedAt ? '-open' : ''}"></i> ${m.email.ok ? 'נשלח במייל' : 'שליחת המייל נכשלה'}${m.email.openedAt ? ` · נפתח ${esc(chatTime(m.email.openedAt))}` : ''}</div>` : ''}
            <div class="m-meta">${m.edited ? '<span class="m-edited">נערך</span>' : ''}<span>${chatTime(m.created_at)}</span>${ticks}</div>
            ${actions}
        </div>`;
    });
    box.innerHTML = html;
    F.hydrate(box);
    if (S.focusMsgId) { jumpToMessage(S.focusMsgId); S.focusMsgId = null; return; }
    box.scrollTop = (atBottom || forceBottom) ? box.scrollHeight : prevTop;
}

function jumpToMessage(id) {
    const el = $(`#thread-msgs [data-msg="${CSS.escape(String(id))}"]`);
    if (!el) { toast('ההודעה המקורית אינה מוצגת', 'info'); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

function renderReplyBar() {
    const bar = $('#reply-bar');
    const r = S.replyTo;
    bar.hidden = !r;
    if (!r) return;
    $('#reply-who').textContent = r.sender === 'admin' ? 'ציטוט של ההודעה שלך' : 'ציטוט של הלקוח';
    $('#reply-text').textContent = r.text;
}

function startReply(id) {
    const m = (S.threadMsgs || []).find(x => String(x.id) === String(id));
    if (!m) return;
    S.replyTo = { id: m.id, sender: m.sender, text: m.message_text || (m.file_name ? `📎 ${m.file_name}` : '') };
    renderReplyBar();
    $('#composer-input').focus();
}

let typingSentAt = 0;
function sendTyping(on) {
    if (!S.activePhone) return;
    if (on) {
        if (Date.now() - typingSentAt < 3500) return;
        typingSentAt = Date.now();
        api('/admin/chat/typing', { targetPhone: S.activePhone, typing: true });
    } else if (typingSentAt) {
        typingSentAt = 0;
        api('/admin/chat/typing', { targetPhone: S.activePhone, typing: false });
    }
}

const EMAIL_RESULT = {
    queued: ['ההודעה נשלחה גם במייל, עם קישור חד-פעמי לצ׳אט', 'good'],
    no_email: ['המייל לא נשלח: ללקוח אין כתובת מייל', 'bad'],
    opted_out: ['המייל לא נשלח: הלקוח ביקש לא לקבל מיילים', 'bad'],
    blocked: ['המייל לא נשלח: הכתובת חסומה ברשימה השחורה', 'bad'],
};

async function sendMsg(e) {
    if (e) e.preventDefault();
    const input = $('#composer-input');
    const text = input.value.trim();
    const file = S.attach;
    if ((!text && !file) || !S.activePhone) return;
    const box = $('#thread-msgs');
    const tmp = document.createElement('div');
    tmp.className = 'msg out pending';
    tmp.innerHTML = `${S.replyTo ? `<div class="m-quote"><b>${S.replyTo.sender === 'admin' ? 'אתה' : 'הלקוח'}</b>${esc(S.replyTo.text)}</div>` : ''}${file ? F.html({ name: file.name, type: file.type, size: file.size }, 'tmp', 'up') : ''}${text ? `<div class="m-text">${esc(text)}</div>` : ''}<div class="m-meta"><i class="fa-regular fa-clock"></i></div>`;
    box.querySelector('.empty')?.remove();
    box.appendChild(tmp);
    box.scrollTop = box.scrollHeight;
    const replyTo = S.replyTo;
    input.value = ''; input.style.height = '';
    S.replyTo = null; renderReplyBar();
    setAttach(null);
    typingSentAt = 0;
    const btn = $('#composer-send');
    btn.disabled = true;
    const mail = $('#composer-email');
    const withEmail = mail.checked && !mail.disabled;
    const limits = file ? { maxViews: $('#attach-views').value || undefined, expiresMinutes: $('#attach-expiry').value || undefined, emailFile: $('#attach-email').value } : {};
    const r = file
        ? await apiUpload('/admin/chat/send-file', file, { targetPhone: S.activePhone, text, replyTo: replyTo ? replyTo.id : undefined, sendEmail: withEmail ? '1' : undefined, ...limits, ...(await F.prepare(file)) })
        : await api('/admin/chat/send', { targetPhone: S.activePhone, text, replyTo: replyTo ? replyTo.id : undefined, sendEmail: withEmail });
    btn.disabled = false;
    if (!r.ok) { tmp.remove(); input.value = text; S.replyTo = replyTo; renderReplyBar(); if (file) setAttach(file); toast(r.error || 'שגיאה בשליחת ההודעה', 'bad'); return; }
    mail.checked = false;
    if (EMAIL_RESULT[r.data.email]) toast(...EMAIL_RESULT[r.data.email]);
    S.activeHash = '';
    refreshThread();
}

async function editMsg(id) {
    const m = (S.threadMsgs || []).find(x => String(x.id) === String(id));
    if (!m) return;
    const r = await dialog({
        title: 'עריכת הודעה', text: 'הלקוח יראה שההודעה נערכה.', icon: 'info',
        input: { value: m.message_text },
        buttons: [{ label: 'ביטול' }, { label: 'שמירה', value: 'ok', cls: 'btn-primary' }],
    });
    if (!r || !r.input || r.input === m.message_text) return;
    const res = await api('/admin/chat/edit', { messageId: Number(id), text: r.input });
    if (!res.ok) { toast(res.error || 'שגיאה בעריכה', 'bad'); return; }
    S.activeHash = '';
    refreshThread();
}

async function deleteMsg(id) {
    const r = await dialog({
        title: 'מחיקת הודעה', text: 'מחיקה רכה: אצל הלקוח יופיע "ההודעה נמחקה", ואתה עדיין יכול לשחזר אותה. מחיקה לצמיתות: ההודעה נעלמת לגמרי משני הצדדים.',
        buttons: [{ label: 'ביטול' }, { label: 'מחיקה לצמיתות', value: 'hard', cls: 'btn-danger' }, { label: 'מחיקה רכה', value: 'soft', cls: 'btn-danger-solid' }],
    });
    if (!r) return;
    await deleteMessages([id], r.value === 'hard');
}

async function purgeMsg(id) {
    if (!await confirmDanger('מחיקה לצמיתות', 'ההודעה תימחק לגמרי, גם השורה "ההודעה נמחקה" תיעלם אצל הלקוח. אי אפשר לשחזר.', 'מחיקה לצמיתות')) return;
    await deleteMessages([id], true);
}

async function deleteMessages(ids, hard) {
    const res = await api('/admin/chat/delete', { messageIds: ids.map(Number), hardDelete: !!hard });
    if (!res.ok) { toast(res.error || 'שגיאה במחיקה', 'bad'); return false; }
    toast(ids.length > 1 ? `${ids.length} הודעות נמחקו${hard ? ' לצמיתות' : ''}` : hard ? 'ההודעה נמחקה לצמיתות' : 'ההודעה נמחקה');
    S.activeHash = '';
    refreshThread();
    loadConvs(true);
    return true;
}

async function restoreMsg(id) {
    const res = await api('/admin/chat/restore', { messageId: Number(id) });
    if (!res.ok) { toast(res.error || 'שגיאה בשחזור', 'bad'); return; }
    toast('ההודעה שוחזרה');
    S.activeHash = '';
    refreshThread();
}

// מצב בחירה: סימון כמה הודעות ומחיקה בבת אחת
function setSelectMode(on) {
    S.selectMode = !!on;
    S.msgSel = new Set();
    $('#select-bar').hidden = !S.selectMode;
    $('#composer').classList.toggle('dim', S.selectMode);
    renderSelectBar();
    if (S.threadMsgs) { S.activeHash = ''; renderThread(S.threadMsgs); S.activeHash = JSON.stringify(S.threadMsgs); }
}

function renderSelectBar() {
    const n = S.msgSel ? S.msgSel.size : 0;
    $('#select-count').textContent = n ? `${n} נבחרו` : 'לחץ על הודעות כדי לבחור';
    $$('#select-bar [data-need]').forEach(b => { b.disabled = !n; });
}

function pickMsg(id) {
    const k = String(id);
    S.msgSel.has(k) ? S.msgSel.delete(k) : S.msgSel.add(k);
    const el = $(`#thread-msgs [data-msg="${CSS.escape(k)}"]`);
    if (el) el.classList.toggle('picked', S.msgSel.has(k));
    renderSelectBar();
}

async function deleteSelected(hard) {
    const ids = [...S.msgSel];
    if (!ids.length) return;
    if (hard && !await confirmDanger('מחיקה לצמיתות', `למחוק לצמיתות ${ids.length} הודעות? הן ייעלמו לגמרי גם אצל הלקוח.`, 'מחיקה לצמיתות')) return;
    if (await deleteMessages(ids, hard)) setSelectMode(false);
}

async function purgeThread(scope) {
    closePopovers();
    if (!S.activePhone) return;
    const name = $('#thread-name').textContent;
    const ok = scope === 'all'
        ? await confirmDanger('מחיקת השיחה כולה', `כל ההודעות עם ${name} יימחקו לצמיתות, כולל הערות ותיוגים של השיחה. אי אפשר לשחזר.`, 'מחיקת השיחה')
        : await confirmDanger('ניקוי הודעות שנמחקו', 'כל ההודעות שסומנו "נמחקה" בשיחה הזו יימחקו לצמיתות ויעלמו גם אצל הלקוח.', 'ניקוי');
    if (!ok) return;
    const r = await api('/admin/chat/purge', { targetPhone: S.activePhone, scope });
    if (!r.ok) { toast(r.error || 'שגיאה במחיקה', 'bad'); return; }
    toast(r.data.deleted ? `${r.data.deleted} הודעות נמחקו לצמיתות` : 'לא היו הודעות למחיקה');
    S.activeHash = '';
    if (scope === 'all') { await loadConvs(true); refreshThread(); } else { refreshThread(); loadConvs(true); }
}

async function updateThreadMeta(fields, okText) {
    if (!S.activePhone) return;
    const r = await api('/admin/chat/meta', { targetPhone: S.activePhone, ...fields });
    if (!r.ok) { toast(r.error || 'שגיאה בעדכון', 'bad'); return; }
    if (S.thread) Object.assign(S.thread.thread, fields);
    const c = S.convs.find(x => x.user_phone === S.activePhone);
    if (c) Object.assign(c, fields);
    renderThreadMeta();
    renderConvs();
    if (okText) toast(okText);
}

async function editThreadNote() {
    const cur = (S.thread && S.thread.thread.note) || '';
    const r = await dialog({
        title: 'הערה פנימית', text: 'ההערה גלויה רק לך ומוצגת בראש השיחה.', icon: 'info',
        input: { value: cur, placeholder: 'למשל: לקוח VIP, ממתין לבדיקה…' },
        buttons: [{ label: 'ביטול' }, ...(cur ? [{ label: 'מחיקת הערה', value: 'clear', cls: 'btn-danger' }] : []), { label: 'שמירה', value: 'ok', cls: 'btn-primary' }],
    });
    if (!r) return;
    updateThreadMeta({ note: r.value === 'clear' ? '' : r.input }, r.value === 'clear' ? 'ההערה נמחקה' : 'ההערה נשמרה');
}

async function markThreadUnread() {
    const r = await api('/admin/chat/unread', { targetPhone: S.activePhone });
    if (!r.ok) { toast(r.error || 'שגיאה', 'bad'); return; }
    toast('השיחה סומנה כלא נקראה');
    const phone = S.activePhone;
    closeThread();
    loadConvs(true);
}

async function newChat() {
    const r = await dialog({
        title: 'שיחה חדשה', text: 'הזן מספר טלפון של מנוי:', icon: 'info',
        input: { placeholder: '05XXXXXXXX', ltr: true },
        buttons: [{ label: 'ביטול' }, { label: 'פתיחת שיחה', value: 'ok', cls: 'btn-primary' }],
    });
    const phone = r && r.input.replace(/[^\d+]/g, '');
    if (!phone) return;
    if (phone.length < 9) { toast('מספר טלפון לא תקין', 'bad'); return; }
    openConv(phone);
}

// ---------- Settings ----------

async function loadSettings() {
    $('#set-me').innerHTML = '<div class="skeleton" style="width:60%"></div>';
    $('#sess-list').innerHTML = '<li><div class="skeleton" style="width:70%"></div></li>'.repeat(2);
    const [acc, sess, st, v2] = await Promise.all([api('/admin/account'), api('/admin/sessions'), api('/admin/settings'), api('/admin/v2/settings')]);
    if (v2.ok) fillV2(v2.data);
    if (acc.ok) renderAccount(acc.data.account);
    if (sess.ok) renderSessionsList(sess.data.sessions || []);
    if (st.ok) fillSettings(st.data.settings);
}

// הגדרות האתר החדש (גרסה 2) ונתוני שימוש
function fillV2(d) {
    const s = d.settings, u = d.usage;
    $('#v2-mode').value = s.v2_mode;
    $('#v2-off').value = s.v2_off_message || '';
    $('#v2-switch').checked = s.v2_show_switch === '1';
    $('#v2-banner').value = s.v2_banner || '';
    $('#v2-tone').value = s.v2_banner_tone || 'info';
    $('#v2-theme').value = s.v2_default_theme;
    $('#v2-accent').value = s.v2_default_accent;
    $('#v2-welcome').value = s.v2_chat_welcome || '';
    const dark = (u.themes.dark || 0), total = Object.values(u.themes).reduce((a, b) => a + b, 0);
    $('#v2-usage').innerHTML = [
        kpi('fa-user-check', 'good', 'השתמשו השבוע', num(u.week), `${num(u.month)} בחודש האחרון`),
        kpi('fa-users', '', 'סך הכל ניסו', num(u.total), `${num(u.opens)} כניסות`),
        kpi('fa-moon', 'info', 'בחרו מצב כהה', total ? Math.round(dark / total * 100) + '%' : '—', `${num(dark)} מתוך ${num(total)}`),
    ].join('');
    $('#v2-recent').textContent = u.recent.length ? `אחרונים: ${u.recent.slice(0, 5).map(r => { const x = S.users.find(y => y.phone === r.phone); return x && x.name ? x.name : r.phone; }).join(', ')}` : '';
}

async function saveV2(e) {
    e.preventDefault();
    const btn = $('#v2-save');
    busy(btn, true);
    const r = await api('/admin/v2/settings', { settings: {
        v2_mode: $('#v2-mode').value, v2_off_message: $('#v2-off').value.trim(), v2_show_switch: $('#v2-switch').checked,
        v2_banner: $('#v2-banner').value.trim(), v2_banner_tone: $('#v2-tone').value,
        v2_default_theme: $('#v2-theme').value, v2_default_accent: $('#v2-accent').value, v2_chat_welcome: $('#v2-welcome').value.trim(),
    } });
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה בשמירה', 'bad'); return; }
    fillV2(r.data);
    toast('הגדרות האתר החדש נשמרו');
}

function renderAccount(a) {
    S.account = a;
    const me = a.me || {};
    const exp = S.session && S.session.expiresAt;
    $('#set-me').innerHTML = `
        <div class="me-card">
            <div class="avatar lg"><i class="fa-solid fa-${me.kind === 'user' ? 'crown' : 'user-shield'}"></i></div>
            <div style="flex:1; min-width:0;">
                <b style="font-size:16px;">${esc(me.name || 'מנהל ראשי')}</b>
                <div class="p-grid">
                    <span>סוג כניסה</span><span>${me.kind === 'user' ? `מנהל-על דרך חשבון האתר (<span class="ltr">${esc(me.phone)}</span>)` : `שם משתמש <span class="ltr mono">${esc(me.username || '')}</span>`}</span>
                    <span>תוקף החיבור</span><span>${S.session && S.session.remember ? `${num(a.rememberDays)} יום מהשימוש האחרון ("זכור אותי")` : `מתנתק אחרי ${num(a.idleMinutes / 60)} שעות ללא פעילות`}${exp ? ` · כרגע עד ${esc(fmtDate(exp))}` : ''}</span>
                </div>
            </div>
            <button class="btn btn-danger btn-sm" data-action="logout"><i class="fa-solid fa-arrow-right-from-bracket"></i> התנתקות</button>
        </div>`;
    $('#pw-form').hidden = me.kind !== 'admin';
    $('#sa-current').innerHTML = a.superAdmin
        ? `<div class="alert info" style="align-items:center;"><i class="fa-solid fa-crown"></i><span style="flex:1;">מנהל-העל כרגע: <b>${esc(a.superAdmin.name || 'ללא שם')}</b> · <span class="ltr">${esc(a.superAdmin.phone)}</span></span>
            ${me.kind === 'admin' ? '<button type="button" class="btn btn-sm btn-danger" data-action="sa-remove">ביטול</button>' : ''}</div>`
        : '<div class="muted">לא הוגדר מנהל-על.</div>';
    $('#sa-phone').value = '';
    $('#sa-phone').disabled = me.kind !== 'admin';
}

function renderSessionsList(list) {
    $('#sess-list').innerHTML = list.length ? list.map(s => `
        <li>
            <div class="act-icon ${s.current ? 'good' : ''}"><i class="fa-solid fa-${/iPhone|Android/.test(s.device) ? 'mobile-screen' : 'desktop'}"></i></div>
            <div class="f-body">
                <div class="f-title">${esc(s.device || 'מכשיר לא מזוהה')} ${s.current ? '<span class="badge good" style="height:20px;">המכשיר הזה</span>' : ''} ${s.kind === 'user' ? `<span class="badge accent" style="height:20px;"><i class="fa-solid fa-crown"></i> ${esc(s.name)}</span>` : ''}</div>
                <div class="f-sub"><span class="ltr">${esc(s.ip || '')}</span> · התחבר ${esc(fmtDate(s.createdAt))} · פעיל ${esc(relTime(s.lastUsedAt))}${s.remember ? ' · זכור אותי' : ''}</div>
            </div>
            ${s.current ? '' : `<button class="icon-btn sm danger" data-action="sess-revoke" data-id="${esc(s.id)}" title="ניתוק"><i class="fa-solid fa-plug-circle-xmark"></i></button>`}
        </li>`).join('') : '<li><div class="empty" style="padding:20px;width:100%;">אין חיבורים</div></li>';
}

function fillSettings(s) {
    S.chatSettings = s;
    $('#cs-enabled').checked = s.notify_admin_enabled === '1';
    renderNotifyRecipient(s);
    $('#cs-idle').value = s.notify_idle_minutes;
    $('#cs-cooldown').value = s.notify_cooldown_minutes;
    $('#pv-presence').checked = s.admin_show_presence !== '0';
    $('#pv-typing').checked = s.admin_show_typing !== '0';
    $('#pv-receipts').checked = s.admin_show_read_receipts !== '0';
    $('#pv-file-cookie').checked = s.file_access_cookie !== '0';
}

async function saveChatSettings(e) {
    e.preventDefault();
    const btn = $('#cs-save');
    busy(btn, true);
    const r = await api('/admin/settings', { settings: {
        notify_admin_enabled: $('#cs-enabled').checked,
        notify_idle_minutes: $('#cs-idle').value, notify_cooldown_minutes: $('#cs-cooldown').value,
    } });
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה בשמירה', 'bad'); return; }
    fillSettings(r.data.settings);
    toast('הגדרות ההתראות נשמרו');
}

async function savePrivacy(input) {
    const r = await api('/admin/settings', { settings: { [input.dataset.setting]: input.checked } });
    if (!r.ok) { input.checked = !input.checked; toast(r.error || 'שגיאה בשמירה', 'bad'); return; }
    fillSettings(r.data.settings);
    toast(input.dataset.setting === 'file_access_cookie' ? 'הגדרת הגישה לקבצים עודכנה' : 'הגדרת הפרטיות עודכנה');
}

async function chatTestEmail() {
    if (!S.chatSettings || !S.chatSettings.notify_recipient) { toast('יש להגדיר קודם מנהל-על שיש לו כתובת מייל', 'info'); return; }
    const r = await api('/admin/chat/test-email');
    toast(r.ok ? r.data.message : (r.error || 'שליחת המייל נכשלה'), r.ok ? 'good' : 'bad');
}

async function changeAdminPassword(e) {
    e.preventDefault();
    if ($('#pw-new').value !== $('#pw-confirm').value) { toast('הסיסמאות החדשות אינן תואמות', 'bad'); return; }
    const btn = $('#pw-save');
    busy(btn, true);
    const r = await api('/admin/account', { changePassword: { currentPassword: $('#pw-current').value, newPassword: $('#pw-new').value } });
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה בשינוי הסיסמה', 'bad'); return; }
    $('#pw-form').reset();
    toast(r.data.message || 'הסיסמה שונתה');
    loadSettings();
}

async function setSuperAdmin(phone) {
    if (!phone) {
        if (!await confirmDanger('ביטול מנהל-על', 'המשתמש ינותק ממרכז השליטה ולא יוכל להיכנס יותר עם החשבון שלו.', 'ביטול')) return;
    } else if (!await confirmDanger('הגדרת מנהל-על', `המשתמש ${phone} יקבל גישה מלאה למרכז השליטה, כולל הצ'אט וההגדרות. מנהל-על קודם, אם הוגדר, ינותק.`, 'הגדרה')) return;
    const r = await api('/admin/account', { superAdminPhone: phone });
    if (!r.ok) { toast(r.error || 'שגיאה', 'bad'); return; }
    renderAccount(r.data.account);
    toast(phone ? 'מנהל-העל הוגדר' : 'מנהל-העל בוטל');
    const sess = await api('/admin/sessions');
    if (sess.ok) renderSessionsList(sess.data.sessions || []);
}

async function revokeSessions(id) {
    if (!id && !await confirmDanger('ניתוק כל המכשירים האחרים', 'כל החיבורים למרכז השליטה, חוץ מהמכשיר הזה, יתנתקו מיד.', 'ניתוק')) return;
    const r = await api('/admin/sessions', id ? { revoke: id } : { revokeOthers: true });
    if (!r.ok) { toast(r.error || 'שגיאה', 'bad'); return; }
    renderSessionsList(r.data.sessions || []);
    toast(id ? 'המכשיר נותק' : 'כל שאר המכשירים נותקו');
}

// ---------- Admin presence ----------
// מדווח לשרת אם המנהל מול המסך, כדי שהלקוחות יראו "מחובר/ת" רק כשזה נכון

let lastPresence = '';
function reportPresence(force) {
    if (S.mode !== 'admin' || !S.adminToken) return;
    const state = document.hidden ? 'away' : (Date.now() - S.lastInteraction < 120000 ? 'online' : 'away');
    if (!force && state === lastPresence && state !== 'online') return;
    lastPresence = state;
    api('/admin/presence', { state });
}

function presenceOffline() {
    if (S.mode !== 'admin' || !S.adminToken) return;
    lastPresence = 'offline';
    try {
        navigator.sendBeacon(`${API_BASE_URL}/admin/presence`, new Blob([JSON.stringify({ adminToken: S.adminToken, state: 'offline' })], { type: 'text/plain' }));
    } catch (e) {}
}

function renderNotifyRecipient(s) {
    const box = $('#cs-recipient');
    if (s.notify_recipient) {
        box.className = 'alert info';
        box.innerHTML = `<i class="fa-solid fa-envelope"></i><span>ההתראות נשלחות למייל של מנהל-העל: <b class="ltr">${esc(s.notify_recipient)}</b></span>`;
    } else {
        box.className = 'alert bad';
        box.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>${s.super_admin_set ? 'למנהל-העל אין כתובת מייל בחשבון, לכן לא יישלחו התראות.' : 'לא הוגדר מנהל-על, לכן לא יישלחו התראות.'} ההתראות נשלחות תמיד למייל של חשבון מנהל-העל.</span>`;
    }
}

async function loadChatDefaults() {
    const r = await api('/admin/chat/settings');
    if (r.ok) S.chatSettings = r.data.settings;
}


// ---------- Ads ----------

const AD_PLACES = { sidebar: ['מודעת צד', 'fa-table-columns', 'info'], popup: ['פופאפ', 'fa-window-maximize', 'bad'], banner: ['פס עליון', 'fa-grip-lines', 'accent'], toast: ['הודעה צפה', 'fa-message', 'warn'] };
const AD_FILTERS = [['all', 'הכל'], ['live', 'פעילים'], ['scheduled', 'מתוזמנים'], ['paused', 'מושהים'], ['ended', 'הסתיימו']];
const AD_PRESETS = [
    { name: 'נקי', bgColor: '#ffffff', textColor: '#1a202c', design: { border: '#e2e8f0' } },
    { name: 'ירוק סלומון', bgColor: '#16a34a', textColor: '#ffffff', design: { gradient: '#0ea5e9', ctaColor: '#ffffff', ctaText: '#15803d' } },
    { name: 'כחול', bgColor: '#1d4ed8', textColor: '#ffffff', design: { gradient: '#06b6d4', ctaColor: '#ffffff', ctaText: '#1d4ed8' } },
    { name: 'שקיעה', bgColor: '#f97316', textColor: '#ffffff', design: { gradient: '#e11d48', ctaColor: '#ffffff', ctaText: '#c2410c' } },
    { name: 'סגול', bgColor: '#7c3aed', textColor: '#ffffff', design: { gradient: '#db2777', ctaColor: '#ffffff', ctaText: '#6d28d9' } },
    { name: 'לילה', bgColor: '#0f172a', textColor: '#f8fafc', design: { gradient: '#334155', ctaColor: '#22c55e', ctaText: '#052e16' } },
    { name: 'זהב', bgColor: '#fef3c7', textColor: '#78350f', design: { gradient: '#fde68a', border: '#fcd34d', ctaColor: '#b45309', ctaText: '#ffffff' } },
    { name: 'התראה', bgColor: '#fef2f2', textColor: '#991b1b', design: { border: '#fca5a5', ctaColor: '#dc2626', ctaText: '#ffffff', icon: 'fa-triangle-exclamation' } },
];
const AD_ICONS = ['', 'fa-bullhorn', 'fa-gift', 'fa-star', 'fa-bell', 'fa-circle-info', 'fa-triangle-exclamation', 'fa-fire', 'fa-heart', 'fa-calendar-days', 'fa-phone', 'fa-headphones', 'fa-rocket', 'fa-tag'];

function adState(ad) {
    if (ad.is_paused) return 'paused';
    if (adExpired(ad)) return 'ended';
    if (ad.starts_at && parseDate(ad.starts_at) > new Date()) return 'scheduled';
    return 'live';
}
const AD_STATE = { live: ['פעיל', 'good', 'fa-circle'], paused: ['מושהה', 'warn', 'fa-pause'], scheduled: ['מתוזמן', 'info', 'fa-clock'], ended: ['הסתיים', '', 'fa-flag-checkered'] };

async function loadAds() {
    $('#ads-grid').innerHTML = '<div class="card"><div class="card-body"><div class="skeleton" style="width:60%"></div></div></div>'.repeat(3);
    const [r, d] = await Promise.all([api('/admin/system-messages/list'), api('/admin/system-messages/designs')]);
    if (d.ok) S.adDesigns = d.data.designs || [];
    if (!r.ok) { $('#ads-grid').innerHTML = `<div class="card"><div class="empty">${esc(r.error)}</div></div>`; return; }
    S.ads = r.data.messages || [];
    renderAds();
}

function adExpired(ad) {
    const d = ad.expires_at && new Date(String(ad.expires_at).replace(' ', 'T') + 'Z');
    return d && !isNaN(d) && d < new Date();
}

function safeColor(c, fallback) { return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : fallback; }

function adBackground(bg, d) {
    return d && d.gradient ? `linear-gradient(135deg, ${safeColor(bg, '#ffffff')}, ${safeColor(d.gradient, bg)})` : safeColor(bg, '#ffffff');
}

function renderAds() {
    const all = S.ads || [];
    const live = all.filter(a => adState(a) === 'live');
    const views = all.reduce((s, a) => s + (a.total_impressions || 0), 0), clicks = all.reduce((s, a) => s + (a.clicks || 0), 0);
    $('#ads-kpis').innerHTML = [
        kpi('fa-bullhorn', 'good', 'פעילים עכשיו', num(live.length), `${num(all.length)} קמפיינים בסך הכל`),
        kpi('fa-eye', '', 'צפיות היום', num(all.reduce((s, a) => s + (a.views_today || 0), 0)), `${num(views)} צפיות בסך הכל`),
        kpi('fa-arrow-pointer', 'info', 'הקלקות', num(clicks), views ? `${(clicks / views * 100).toFixed(1)}% מהצפיות` : 'עוד אין צפיות'),
    ].join('');
    const f = S.adsFilter || 'all';
    $('#ads-chips').innerHTML = AD_FILTERS.map(([k, l]) => `<button class="chip ${f === k ? 'active' : ''}" data-action="ads-filter" data-filter="${k}">${l} <span class="n">${num(k === 'all' ? all.length : all.filter(a => adState(a) === k).length)}</span></button>`).join('');
    const list = all.filter(a => f === 'all' || adState(a) === f);
    if (!list.length) {
        $('#ads-grid').innerHTML = `<div class="card" style="grid-column:1/-1;"><div class="empty"><i class="fa-solid fa-bullhorn"></i>${all.length ? 'אין קמפיינים בסינון הזה' : 'עוד אין קמפיינים'}<br><br><button class="btn btn-primary" data-action="new-ad"><i class="fa-solid fa-plus"></i> יצירת קמפיין</button></div></div>`;
        return;
    }
    $('#ads-grid').innerHTML = list.map(ad => {
        const st = adState(ad);
        const [sl, stone, sicon] = AD_STATE[st];
        const [pl, picon, ptone] = AD_PLACES[ad.placement] || AD_PLACES.sidebar;
        const d = ad.design || {};
        const fg = safeColor(ad.text_color, '#1a202c');
        const ctr = ad.total_impressions ? (ad.clicks / ad.total_impressions * 100).toFixed(1) : '0';
        const aud = ad.audience || {};
        const audTxt = aud.mode === 'include' ? `${num(aud.phones.length)} מספרים` : aud.mode === 'exclude' ? `חוץ מ-${num(aud.phones.length)}` : '';
        return `<div class="card ad-card st-${st}">
            <div class="ad-swatch" style="background:${adBackground(ad.bg_color, d)}; color:${fg};">
                ${ad.image_url && /^https?:\/\//i.test(ad.image_url) ? `<img src="${esc(ad.image_url)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : ''}
                ${d.badge ? `<span class="ad-sw-badge">${esc(d.badge)}</span>` : ''}
                <b>${d.icon ? `<i class="fa-solid ${esc(d.icon)}"></i> ` : ''}${esc(ad.title)}</b>
            </div>
            <div class="row" style="padding:10px 14px; gap:6px; flex-wrap:wrap;">
                <span class="badge ${stone}"><i class="fa-solid ${sicon}"></i> ${sl}</span>
                <span class="badge ${ptone}"><i class="fa-solid ${picon}"></i> ${pl}</span>
                ${aud.device && aud.device !== 'all' ? `<span class="badge"><i class="fa-solid ${aud.device === 'mobile' ? 'fa-mobile-screen' : 'fa-desktop'}"></i></span>` : ''}
                ${audTxt ? `<span class="badge"><i class="fa-solid fa-bullseye"></i> ${audTxt}</span>` : ''}
                ${st === 'scheduled' ? `<span class="badge info">מ-${esc(fmtDate(ad.starts_at))}</span>` : ad.expires_at && st !== 'ended' ? `<span class="badge">עד ${esc(fmtDate(ad.expires_at))}</span>` : ''}
            </div>
            <div class="ad-stats three">
                <div><b>${num(ad.total_impressions)}</b><small>צפיות</small></div>
                <div><b>${num(ad.unique_viewers)}</b><small>אנשים</small></div>
                <div><b>${ad.cta_url ? num(ad.clicks) : '—'}</b><small>${ad.cta_url ? `הקלקות · ${ctr}%` : 'אין כפתור'}</small></div>
            </div>
            <div class="ad-foot">
                <button class="btn btn-sm" data-action="edit-ad" data-id="${esc(ad.id)}"><i class="fa-solid fa-pen"></i> עריכה</button>
                <button class="btn btn-sm" data-action="ad-logs" data-id="${esc(ad.id)}"><i class="fa-solid fa-chart-simple"></i> ביצועים</button>
                <div class="spacer"></div>
                <button class="icon-btn sm" data-action="ad-toggle" data-id="${esc(ad.id)}" title="${ad.is_paused ? 'חידוש' : 'השהיה'}"><i class="fa-solid ${ad.is_paused ? 'fa-play' : 'fa-pause'}"></i></button>
                <button class="icon-btn sm" data-action="ad-dup" data-id="${esc(ad.id)}" title="שכפול"><i class="fa-regular fa-copy"></i></button>
                <button class="icon-btn sm danger" data-action="delete-ad" data-id="${esc(ad.id)}" title="מחיקה"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>`;
    }).join('');
}

function switchAdTab(tab) {
    $$('#ad-tabs .drawer-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('#ad-form .tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
}

function setSeg(id, v) { $$(`#${id} button`).forEach(b => b.classList.toggle('active', b.dataset.v === v)); }
function segVal(id) { const b = $(`#${id} button.active`); return b ? b.dataset.v : ''; }
function toLocalInput(v) { return v ? String(v).replace(' ', 'T').slice(0, 16) : ''; }

function applyAdDesign(bgColor, textColor, d = {}) {
    $('#ad-bg').value = safeColor(bgColor, '#ffffff');
    $('#ad-text').value = safeColor(textColor, '#1a202c');
    $('#ad-grad-on').checked = !!d.gradient; if (d.gradient) $('#ad-grad').value = d.gradient;
    $('#ad-ctac-on').checked = !!d.ctaColor; if (d.ctaColor) $('#ad-ctac').value = d.ctaColor;
    $('#ad-ctat').value = safeColor(d.ctaText, '#ffffff');
    $('#ad-border-on').checked = !!d.border; if (d.border) $('#ad-border').value = d.border;
    $('#ad-radius').value = d.radius === null || d.radius === undefined ? -1 : d.radius;
    setSeg('ad-size', d.size || 'md'); setSeg('ad-align', d.align || 'auto'); setSeg('ad-imgpos', d.imagePos || 'top');
    $('#ad-anim').value = d.animation || 'fade';
    $('#ad-shadow').checked = d.shadow !== false;
    if ('badge' in d) $('#ad-badge').value = d.badge || '';
    if ('icon' in d) S.adIcon = d.icon || '';
    renderAdIcons();
}

function adDesignFromForm() {
    const r = parseInt($('#ad-radius').value, 10);
    return {
        gradient: $('#ad-grad-on').checked ? $('#ad-grad').value : '',
        radius: r < 0 ? null : r, size: segVal('ad-size'), align: segVal('ad-align'), imagePos: segVal('ad-imgpos'),
        animation: $('#ad-anim').value, shadow: $('#ad-shadow').checked,
        border: $('#ad-border-on').checked ? $('#ad-border').value : '',
        ctaColor: $('#ad-ctac-on').checked ? $('#ad-ctac').value : '', ctaText: $('#ad-ctac-on').checked ? $('#ad-ctat').value : '',
        icon: S.adIcon || '', badge: $('#ad-badge').value.trim(),
    };
}

function renderAdIcons() {
    $('#ad-icons').innerHTML = AD_ICONS.map(ic => `<button type="button" class="${(S.adIcon || '') === ic ? 'active' : ''}" data-action="ad-icon" data-icon="${ic}" title="${ic ? '' : 'ללא'}">${ic ? `<i class="fa-solid ${ic}"></i>` : '<i class="fa-solid fa-ban" style="opacity:.4"></i>'}</button>`).join('');
}

function renderAdPresets() {
    const tile = (p, attrs, extra = '') => `<button type="button" class="preset" ${attrs} style="background:${adBackground(p.bgColor, p.design)}; color:${safeColor(p.textColor, '#1a202c')}; ${p.design && p.design.border ? `border-color:${p.design.border};` : ''}"><span>Aa</span><small>${esc(p.name)}</small>${extra}</button>`;
    $('#ad-presets').innerHTML = AD_PRESETS.map((p, i) => tile(p, `data-action="ad-preset" data-i="${i}"`)).join('');
    const mine = S.adDesigns || [];
    $('#ad-my-designs').innerHTML = mine.length ? mine.map(p => tile(p, `data-action="ad-my-design" data-id="${esc(p.id)}"`)).join('') : '<div class="muted" style="grid-column:1/-1;">עוד אין ערכות שמורות. עצב קמפיין ולחץ "שמירת העיצוב הנוכחי".</div>';
}

function openAd(id) {
    $('#ad-form').reset();
    $('#ad-id').value = '';
    S.adIcon = '';
    $('#ad-title-head').textContent = 'קמפיין חדש';
    const ad = id ? S.ads.find(a => String(a.id) === String(id)) : null;
    S.adPlace = ad ? ad.placement : 'sidebar';
    $('#ad-badge').value = '';
    applyAdDesign('#ffffff', '#1a202c', {});
    if (ad) {
        $('#ad-title-head').textContent = ad.title;
        $('#ad-id').value = ad.id;
        $('#ad-title').value = ad.title || '';
        $('#ad-html').value = ad.html_content || '';
        $('#ad-image').value = ad.image_url || '';
        $('#ad-cta-label').value = ad.cta_label || '';
        $('#ad-cta-url').value = ad.cta_url || '';
        applyAdDesign(ad.bg_color, ad.text_color, ad.design || {});
        $('#ad-cooldown').value = ad.close_cooldown_seconds || 0;
        $('#ad-max-views').value = ad.max_views_per_user || 0;
        $('#ad-behavior').value = ad.behavior_after_limit || 'hide';
        $('#ad-expires').value = toLocalInput(ad.expires_at);
        $('#ad-starts').value = toLocalInput(ad.starts_at);
        $('#ad-interval').value = ad.view_interval_minutes || 0;
        $('#ad-show-count').checked = !!ad.show_view_count;
        $('#ad-priority').value = ad.priority || 0;
        $('#ad-paused').checked = !!ad.is_paused;
        const a = ad.audience || {};
        $(`input[name="ad-aud"][value="${a.mode || 'all'}"]`).checked = true;
        $('#ad-phones').value = (a.phones || []).join(', ');
        $('#ad-device').value = a.device || 'all';
        $('#ad-newdays').value = a.newDays || 0;
    }
    renderAdPlaces();
    renderAdAudience();
    renderAdPresets();
    switchAdTab('content');
    updateAdPreview();
    openDrawer('ad-drawer');
}

function renderAdPlaces() {
    $$('#ad-places .place-opt').forEach(b => b.classList.toggle('active', b.dataset.place === S.adPlace));
    $('#ad-cooldown-wrap').hidden = S.adPlace !== 'popup';
}

function renderAdAudience() {
    const mode = $('input[name="ad-aud"]:checked').value;
    $('#ad-phones-wrap').hidden = mode === 'all';
    const n = $('#ad-phones').value.split(/[\s,;]+/).filter(p => p.replace(/\D/g, '').length >= 9).length;
    $('#ad-phones-count').textContent = mode === 'all' ? '' : `${num(n)} מספרים`;
}

// התצוגה המקדימה משחזרת את העיצוב של האתר (client-ads.js) בכל אחד מהמיקומים
function adPreviewCard(m, place) {
    const d = m.design;
    const img = /^https?:\/\//i.test(m.imageUrl) ? m.imageUrl : '';
    const parts = [`color:${m.textColor}`];
    if (d.imagePos === 'cover' && img) parts.push(`background:linear-gradient(${m.bgColor}cc, ${(d.gradient || m.bgColor)}ee), url("${esc(img)}") center/cover`);
    else parts.push(`background:${d.gradient ? `linear-gradient(135deg, ${m.bgColor}, ${d.gradient})` : m.bgColor}`);
    const defRadius = { sidebar: 12, popup: 20, toast: 12, banner: 0 }[place];
    parts.push(`border-radius:${place === 'banner' ? 0 : d.radius === null ? defRadius : d.radius}px`);
    const align = d.align === 'auto' ? (place === 'popup' ? 'center' : 'right') : d.align;
    parts.push(`text-align:${align}`);
    if (d.size === 'sm') parts.push('font-size:.92em'); else if (d.size === 'lg') parts.push('font-size:1.1em');
    if (d.border) parts.push(`border:1px solid ${d.border}`);
    parts.push(d.shadow === false ? 'box-shadow:none' : 'box-shadow:0 10px 30px rgba(0,0,0,.18)');
    const imgTag = img && d.imagePos !== 'cover' ? `<img src="${esc(img)}" alt="">` : '';
    const cta = m.ctaLabel ? `<span class="cta" style="background:${d.ctaColor || m.textColor};color:${d.ctaText || m.bgColor};">${esc(m.ctaLabel)} ←</span>` : '';
    const head = `${d.badge ? `<span class="badge">${esc(d.badge)}</span>` : ''}${d.icon ? `<div class="ic">●</div>` : ''}`;
    if (place === 'banner') return `<div class="banner anim-${d.animation}" style="${parts.join(';')}">${d.badge ? `<span class="badge" style="margin:0">${esc(d.badge)}</span>` : ''}<div class="bt"><b>${esc(m.title)}</b> <span>${m.html}</span></div>${cta}<span class="x">✕</span></div>`;
    return `<div class="card ${place} anim-${d.animation}" style="${parts.join(';')}">${place === 'popup' ? '<span class="x">✕</span>' : place === 'toast' ? '<span class="x">✕</span>' : ''}${d.imagePos === 'bottom' ? '' : imgTag}<div class="in">${head}<h3>${esc(m.title)}</h3><div>${m.html}</div>${d.imagePos === 'bottom' ? imgTag : ''}${cta}${m.showCount ? '<div class="cnt">👁 נצפה 128 פעמים</div>' : ''}</div></div>`;
}

function updateAdPreview() {
    const m = {
        title: $('#ad-title').value || 'כותרת הקמפיין', html: $('#ad-html').value || '<span style="opacity:.5">תוכן הקמפיין יופיע כאן</span>',
        imageUrl: $('#ad-image').value.trim(), bgColor: safeColor($('#ad-bg').value, '#ffffff'), textColor: safeColor($('#ad-text').value, '#1a202c'),
        ctaLabel: $('#ad-cta-label').value.trim(), design: adDesignFromForm(), showCount: $('#ad-show-count').checked,
    };
    $('#ad-radius-v').textContent = m.design.radius === null ? '(ברירת מחדל)' : `${m.design.radius}px`;
    const place = S.adPlace || 'sidebar';
    const mobile = S.adPvDevice === 'mobile';
    const page = `<div class="page ${mobile ? 'm' : ''}"><div class="top"></div><div class="main"><div class="lines"><i></i><i></i><i style="width:70%"></i><i></i><i style="width:55%"></i></div>${place === 'sidebar' ? `<div class="side">${adPreviewCard(m, place)}</div>` : '<div class="side ghost"></div>'}</div></div>`;
    const overlay = place === 'popup' ? `<div class="ov"><div class="popw">${adPreviewCard(m, place)}</div></div>` : place === 'banner' ? adPreviewCard(m, place) : place === 'toast' ? `<div class="toastw">${adPreviewCard(m, place)}</div>` : '';
    // Rendered inside a sandboxed iframe (no scripts, isolated origin), so admin-authored HTML is safe to preview.
    $('#ad-preview').srcdoc = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
        *{box-sizing:border-box} body{margin:0;font-family:Rubik,system-ui,sans-serif;background:#eef0f6;min-height:100vh;position:relative;overflow:hidden}
        .page{padding:${place === 'banner' ? '70px' : '14px'} 14px 14px}.top{height:34px;border-radius:10px;background:#fff;margin-bottom:12px}
        .main{display:flex;gap:12px}.lines{flex:1;background:#fff;border-radius:12px;padding:14px}.lines i{display:block;height:9px;border-radius:5px;background:#e5e7eb;margin:0 0 10px}
        .side{width:46%;min-width:0}.side.ghost{background:#fff;border-radius:12px;opacity:.6;min-height:120px}.page.m .main{flex-direction:column-reverse}.page.m .side{width:100%}
        .card{overflow:hidden;word-wrap:break-word;position:relative}.card img{width:100%;max-height:130px;object-fit:cover;display:block}.card .in{padding:14px}
        .card.popup .in{padding:26px 18px 20px}.card h3{margin:0 0 8px;font-size:${place === 'popup' ? '20px' : '15px'};font-weight:800}
        .badge{display:inline-block;padding:2px 9px;border-radius:50px;font-size:11px;font-weight:800;background:rgba(255,255,255,.25);border:1px solid rgba(0,0,0,.08);margin-bottom:6px}
        .ic{font-size:18px;opacity:.85;margin-bottom:4px}.cta{display:inline-block;margin-top:12px;padding:8px 16px;border-radius:10px;font-weight:800;font-size:13px}
        .cnt{font-size:11px;opacity:.7;margin-top:8px}.x{position:absolute;top:10px;left:10px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.12);display:grid;place-items:center;font-size:11px}
        .ov{position:absolute;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);display:grid;place-items:center;padding:16px}.popw{width:100%;max-width:${mobile ? '100%' : '300px'}}
        .banner{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:13px;flex-wrap:${mobile ? 'wrap' : 'nowrap'}}
        .banner .bt{flex:1;min-width:0}.banner .bt span p{display:inline;margin:0}.banner .cta{margin:0}.banner .x{position:static;flex-shrink:0}
        .toastw{position:absolute;bottom:14px;left:14px;width:${mobile ? 'calc(100% - 28px)' : '240px'}}.toastw .card{font-size:13px}
        .anim-fade{animation:f .5s both}.anim-slide{animation:s .5s both}.anim-pop{animation:p .45s cubic-bezier(.2,1.4,.4,1) both}
        @keyframes f{from{opacity:0}}@keyframes s{from{opacity:0;transform:translateY(12px)}}@keyframes p{from{opacity:0;transform:scale(.9)}}
    </style></head><body>${page}${overlay}</body></html>`;
    $('#ad-frame-wrap').classList.toggle('mobile', mobile);
}

async function saveAd(e) {
    e.preventDefault();
    const exp = $('#ad-expires').value, start = $('#ad-starts').value;
    const payload = {
        id: $('#ad-id').value, title: $('#ad-title').value, htmlContent: $('#ad-html').value,
        imageUrl: $('#ad-image').value.trim(), bgColor: $('#ad-bg').value, textColor: $('#ad-text').value,
        maxViewsPerUser: parseInt($('#ad-max-views').value, 10) || 0, behaviorAfterLimit: $('#ad-behavior').value,
        viewIntervalMinutes: parseInt($('#ad-interval').value, 10) || 0,
        placement: S.adPlace, isMandatory: S.adPlace === 'popup', closeCooldownSeconds: parseInt($('#ad-cooldown').value, 10) || 0,
        showViewCount: $('#ad-show-count').checked, priority: parseInt($('#ad-priority').value, 10) || 0, isPaused: $('#ad-paused').checked,
        expiresAt: exp ? exp.replace('T', ' ') + ':00' : null, startsAt: start ? start.replace('T', ' ') + ':00' : null,
        ctaLabel: $('#ad-cta-label').value.trim(), ctaUrl: $('#ad-cta-url').value.trim(),
        design: adDesignFromForm(),
        audience: { mode: $('input[name="ad-aud"]:checked').value, phones: $('#ad-phones').value, device: $('#ad-device').value, newDays: parseInt($('#ad-newdays').value, 10) || 0 },
    };
    if (!payload.title.trim() || !payload.htmlContent.trim()) { switchAdTab('content'); toast('חובה למלא כותרת ותוכן', 'bad'); return; }
    const btn = $('#ad-save');
    busy(btn, true);
    const r = await api('/admin/system-messages/save', payload);
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה בשמירה', 'bad'); return; }
    toast(payload.isPaused ? 'הקמפיין נשמר (מושהה)' : 'הקמפיין נשמר ופורסם');
    closeDrawers();
    loadAds();
}

async function adAction(id, action, okText) {
    const r = await api('/admin/system-messages/action', { id: Number(id), action });
    if (!r.ok) { toast(r.error || 'שגיאה', 'bad'); return null; }
    toast(okText);
    await loadAds();
    return r.data;
}

async function adLogs(id) {
    const ad = S.ads.find(a => String(a.id) === String(id));
    S.adInsightsId = id;
    $('#adlogs-title').textContent = ad ? ad.title : 'ביצועי הקמפיין';
    $('#adlogs-sub').innerHTML = ad ? `${AD_PLACES[ad.placement][0]} · נוצר ${esc(fmtDate(ad.created_at))}` : '';
    $('#adlogs-body').innerHTML = '<div class="skeleton" style="height:140px;"></div>';
    $('#adlogs-foot').innerHTML = `<button class="btn btn-danger" data-action="ad-reset" data-id="${esc(id)}"><i class="fa-solid fa-eraser"></i> איפוס נתונים</button><div class="spacer"></div><button class="btn" data-action="ad-csv"><i class="fa-solid fa-file-csv"></i> ייצוא</button><button class="btn btn-primary" data-action="edit-ad" data-id="${esc(id)}"><i class="fa-solid fa-pen"></i> עריכה</button>`;
    openDrawer('adlogs-drawer');
    const r = await api('/admin/system-messages/logs', { messageId: Number(id) });
    if (!r.ok) { $('#adlogs-body').innerHTML = `<div class="empty">${esc(r.error)}</div>`; return; }
    S.adInsights = r.data;
    S.adViewerFilter = 'all';
    renderAdInsights();
}

function renderAdInsights() {
    const ad = S.ads.find(a => String(a.id) === String(S.adInsightsId)) || {};
    const { viewers, daily } = S.adInsights;
    const f = S.adViewerFilter;
    const views = viewers.reduce((s, v) => s + v.views, 0), clickers = viewers.filter(v => v.clicks).length, closers = viewers.filter(v => v.closes).length;
    // 14 הימים האחרונים, כולל ימים בלי צפיות
    const days = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000); days.push(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem' }).format(d)); }
    const byDay = Object.fromEntries(daily.map(d => [d.day, d]));
    const max = Math.max(1, ...days.map(d => (byDay[d] || {}).views || 0));
    const rows = viewers.filter(v => f === 'all' || (f === 'clicked' && v.clicks) || (f === 'closed' && v.closes) || (f === 'repeat' && v.views > 1));
    $('#adlogs-body').innerHTML = `
        <div class="kpis" style="margin:0;">
            ${kpi('fa-eye', '', 'צפיות', num(views), `${num(viewers.length)} אנשים שונים`)}
            ${kpi('fa-arrow-pointer', 'info', 'לחצו על הכפתור', ad.cta_url ? num(clickers) : '—', ad.cta_url ? `${viewers.length ? Math.round(clickers / viewers.length * 100) : 0}% מהצופים` : 'אין כפתור בקמפיין', ad.cta_url && viewers.length ? clickers / viewers.length * 100 : undefined)}
            ${kpi('fa-xmark', 'warn', 'סגרו', num(closers), 'לחצו על ✕')}
        </div>
        <div class="card"><div class="card-head"><h3>14 ימים אחרונים</h3></div><div class="card-body">
            <div class="day-bars">${days.map(d => { const x = byDay[d] || {}; return `<div class="db" title="${esc(d)}\n${num(x.views || 0)} צפיות · ${num(x.people || 0)} אנשים${x.clicks ? ` · ${num(x.clicks)} הקלקות` : ''}"><i style="height:${Math.round(((x.views || 0) / max) * 100)}%"></i>${x.clicks ? `<em style="height:${Math.round((x.clicks / max) * 100)}%"></em>` : ''}<small>${Number(d.slice(8))}</small></div>`; }).join('')}</div>
            <div class="muted" style="font-size:12px; margin-top:6px;"><span class="lg-dot"></span> צפיות <span class="lg-dot info"></span> הקלקות</div>
        </div></div>
        <div class="card"><div class="card-head"><h3>מי ראה</h3><div class="tools"><div class="chips">${[['all', 'כולם'], ['clicked', 'לחצו'], ['closed', 'סגרו'], ['repeat', 'ראו יותר מפעם']].map(([k, l]) => `<button class="chip ${f === k ? 'active' : ''}" data-action="ad-viewers" data-filter="${k}">${l}</button>`).join('')}</div></div></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>אדם</th><th>צפיות</th><th>ראשונה</th><th>אחרונה</th><th>פעולה</th><th>מכשיר</th></tr></thead><tbody>
        ${rows.length ? rows.slice(0, 500).map(v => `<tr><td><div class="cell-user">${avatarHtml(v.name || v.phone, null, 'sm')}<div><b>${esc(v.name || v.phone)}</b><small class="ltr">${esc(v.phone)}</small></div></div></td>
            <td><b>${num(v.views)}</b></td><td class="muted nowrap">${esc(fmtDate(v.firstView))}</td><td class="muted nowrap" title="${esc(fmtDate(v.lastView))}">${esc(relTime(v.lastView))}</td>
            <td>${v.clicks ? `<span class="badge info" title="${esc(fmtDate(v.clickedAt))}"><i class="fa-solid fa-arrow-pointer"></i> לחץ${v.clicks > 1 ? ` ×${num(v.clicks)}` : ''}</span>` : ''}${v.closes ? ` <span class="badge"><i class="fa-solid fa-xmark"></i> סגר</span>` : ''}</td>
            <td class="muted" title="${esc(v.ip)}">${esc(v.device || '')}</td></tr>`).join('') : emptyRow(6, 'אין צפיות עדיין', 'fa-eye-slash')}
        </tbody></table></div></div>`;
}

function adCsv() {
    const { viewers } = S.adInsights;
    downloadCsv(`campaign-${S.adInsightsId}.csv`, [['שם', 'טלפון', 'צפיות', 'צפייה ראשונה', 'צפייה אחרונה', 'הקלקות', 'סגירות', 'מכשיר', 'IP'],
        ...viewers.map(v => [v.name, v.phone, v.views, v.firstView, v.lastView, v.clicks, v.closes, v.device, v.ip])]);
}

async function deleteAd(id) {
    const ad = S.ads.find(a => String(a.id) === String(id));
    if (!await confirmDanger('מחיקת קמפיין', `למחוק את "${ad ? ad.title : ''}"? הנתונים הסטטיסטיים יימחקו.`, 'מחיקה')) return;
    const r = await api('/admin/system-messages/delete', { id: Number(id) });
    if (!r.ok) { toast(r.error || 'שגיאה במחיקה', 'bad'); return; }
    toast('הקמפיין נמחק');
    closeDrawers();
    loadAds();
}

async function saveAdDesign() {
    const r = await dialog({ title: 'שמירת ערכת עיצוב', text: 'הצבעים, הצורה, האייקון והתגית יישמרו, ותוכל להחיל אותם על כל קמפיין.', icon: 'info', input: { placeholder: 'שם הערכה, למשל "מבצעים"' }, buttons: [{ label: 'ביטול' }, { label: 'שמירה', value: 'ok', cls: 'btn-primary' }] });
    if (!r || !r.input) return;
    const res = await api('/admin/system-messages/designs', { action: 'save', name: r.input, bgColor: $('#ad-bg').value, textColor: $('#ad-text').value, design: adDesignFromForm() });
    if (!res.ok) { toast(res.error || 'שגיאה', 'bad'); return; }
    S.adDesigns = res.data.designs;
    renderAdPresets();
    toast('ערכת העיצוב נשמרה');
}

function openDesigns() {
    renderDesigns();
    openDrawer('designs-drawer');
}

function renderDesigns() {
    const list = S.adDesigns || [];
    $('#designs-body').innerHTML = list.length ? list.map(p => `<div class="card design-row">
        <div class="preset" style="background:${adBackground(p.bgColor, p.design)}; color:${safeColor(p.textColor, '#1a202c')}; ${p.design.border ? `border-color:${p.design.border};` : ''}"><span>${p.design.icon ? `<i class="fa-solid ${esc(p.design.icon)}"></i>` : 'Aa'}</span></div>
        <div style="flex:1; min-width:0;"><b>${esc(p.name)}</b><small class="muted" style="display:block;">${p.design.gradient ? 'מעבר צבע · ' : ''}${p.design.radius === null ? 'פינות רגילות' : `פינות ${p.design.radius}px`}${p.design.badge ? ` · תגית "${esc(p.design.badge)}"` : ''}</small></div>
        <button class="btn btn-sm" data-action="design-rename" data-id="${esc(p.id)}"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn sm danger" data-action="design-delete" data-id="${esc(p.id)}" title="מחיקה"><i class="fa-solid fa-trash-can"></i></button>
    </div>`).join('') : '<div class="empty"><i class="fa-solid fa-swatchbook"></i>עוד אין ערכות עיצוב שמורות.<br>פתח קמפיין, עצב אותו בלשונית "עיצוב" ולחץ "שמירת העיצוב הנוכחי".</div>';
}

async function designAction(id, kind) {
    const p = (S.adDesigns || []).find(x => String(x.id) === String(id));
    if (!p) return;
    let res;
    if (kind === 'delete') {
        if (!await confirmDanger('מחיקת ערכת עיצוב', `למחוק את "${p.name}"? קמפיינים שכבר משתמשים בעיצוב לא ישתנו.`, 'מחיקה')) return;
        res = await api('/admin/system-messages/designs', { action: 'delete', id: p.id });
    } else {
        const r = await dialog({ title: 'שינוי שם', icon: 'info', input: { value: p.name }, buttons: [{ label: 'ביטול' }, { label: 'שמירה', value: 'ok', cls: 'btn-primary' }] });
        if (!r || !r.input) return;
        res = await api('/admin/system-messages/designs', { action: 'save', id: p.id, name: r.input, bgColor: p.bgColor, textColor: p.textColor, design: p.design });
    }
    if (!res.ok) { toast(res.error || 'שגיאה', 'bad'); return; }
    S.adDesigns = res.data.designs;
    renderDesigns();
}

// ---------- Mail ----------

const MAIL_STATUS = {
    draft: ['טיוטה', '', 'fa-pen'], scheduled: ['מתוזמן', 'info', 'fa-clock'], sending: ['בשליחה', 'warn', 'fa-spinner'],
    sent: ['נשלח', 'good', 'fa-check'], failed: ['נכשל', 'bad', 'fa-triangle-exclamation'],
};
const MAIL_FILTERS = [['all', 'הכל'], ['sent', 'נשלחו'], ['scheduled', 'מתוזמנים'], ['draft', 'טיוטות']];
const MAIL_DEFAULT_THEMES = {
    salamon: { label: 'סלומון', accent: '#16a34a', accent2: '#0ea5e9', page: '#eef1f7', card: '#ffffff' },
};

function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

async function loadMail() {
    $('#mail-body').innerHTML = loadingRows(8, 4);
    const r = await api('/admin/mail/list');
    if (!r.ok) { $('#mail-body').innerHTML = emptyRow(8, r.error, 'fa-circle-exclamation'); return; }
    S.mail = r.data.campaigns || [];
    S.mailSegments = r.data.segments || {};
    if (r.data.themes) S.mailThemes = r.data.themes;
    renderMail();
}

function audienceLabel(a = {}) {
    if (a.mode === 'segment') return `${esc((S.mailSegments || {})[a.segment] || 'קהל')}${['active', 'inactive', 'new', 'listeners'].includes(a.segment) ? ` · ${num(a.days)} ימים` : ''}`;
    if (a.mode === 'emails') return `${num((a.emails || []).length)} כתובות`;
    return `${num((a.phones || []).length)} אנשים`;
}

function renderMail() {
    const list = S.mail || [];
    const sent = list.filter(c => c.status === 'sent');
    const tot = sent.reduce((a, c) => a + c.sent, 0), op = sent.reduce((a, c) => a + c.opened, 0), cl = sent.reduce((a, c) => a + c.clicked, 0);
    $('#mail-kpis').innerHTML = [
        kpi('fa-paper-plane', '', 'מיילים שנשלחו', num(tot), `${num(sent.length)} דיוורים`),
        kpi('fa-envelope-open', 'good', 'שיעור פתיחה', pct(op, tot) + '%', `${num(op)} פתחו`, pct(op, tot)),
        kpi('fa-arrow-pointer', 'info', 'שיעור הקלקה', pct(cl, tot) + '%', `${num(cl)} לחצו על קישור`, pct(cl, tot)),
        kpi('fa-clock', 'warn', 'מתוזמנים וטיוטות', num(list.filter(c => c.status === 'scheduled').length), `${num(list.filter(c => c.status === 'draft').length)} טיוטות`),
    ].join('');
    const f = S.mailFilter || 'all';
    $('#mail-chips').innerHTML = MAIL_FILTERS.map(([k, l]) => `<button class="chip ${f === k ? 'active' : ''}" data-action="mail-filter" data-filter="${k}">${l}</button>`).join('');
    const rows = list.filter(c => f === 'all' || c.status === f || (f === 'sent' && ['sent', 'failed', 'sending'].includes(c.status)));
    if (!rows.length) {
        $('#mail-body').innerHTML = `<tr><td colspan="8"><div class="empty"><i class="fa-solid fa-envelope-open-text"></i>${list.length ? 'אין דיוורים בסינון הזה' : 'עוד לא נשלחו דיוורים'}<br><br><button class="btn btn-primary" data-action="new-mail"><i class="fa-solid fa-pen-to-square"></i> דיוור חדש</button></div></td></tr>`;
        return;
    }
    $('#mail-body').innerHTML = rows.map(c => {
        const [label, tone, icon] = MAIL_STATUS[c.status] || [c.status, '', 'fa-circle'];
        const t = (S.mailThemes || MAIL_DEFAULT_THEMES)[c.theme] || MAIL_DEFAULT_THEMES.salamon;
        const when = c.status === 'scheduled' ? c.scheduledAt : c.sentAt || c.updatedAt || c.createdAt;
        const isSent = ['sent', 'failed', 'sending'].includes(c.status);
        return `<tr class="clickable" data-action="${isSent ? 'mail-report' : 'edit-mail'}" data-id="${esc(c.id)}">
            <td><div class="cell-user"><span class="mail-dot" style="background:linear-gradient(135deg,${esc(t.accent)},${esc(t.accent2)})"></span><div><b>${esc(c.subject)}</b><small>${esc(c.layout === 'banner' ? 'באנר' : c.layout === 'letter' ? 'מכתב' : 'כרטיס')} · ${esc(t.label)}</small></div></div></td>
            <td><span class="badge ${tone}"><i class="fa-solid ${icon}"></i> ${label}</span></td>
            <td class="muted">${audienceLabel(c.audience)}</td>
            <td>${isSent ? `${num(c.sent)}${c.failed ? ` <span class="badge bad">${num(c.failed)} נכשלו</span>` : ''}` : `<span class="muted">${c.total ? num(c.total) : '—'}</span>`}</td>
            <td>${isSent ? `<div class="mini-bar" title="${num(c.opened)} פתחו"><i style="width:${pct(c.opened, c.sent)}%"></i></div><small>${pct(c.opened, c.sent)}%</small>` : '<span class="muted">—</span>'}</td>
            <td>${isSent ? `<div class="mini-bar info" title="${num(c.clicked)} לחצו"><i style="width:${pct(c.clicked, c.sent)}%"></i></div><small>${pct(c.clicked, c.sent)}%</small>` : '<span class="muted">—</span>'}</td>
            <td class="muted nowrap" title="${esc(fmtDate(when))}">${esc(relTime(when))}</td>
            <td><div class="row-actions">
                <button class="icon-btn sm" data-action="dup-mail" data-id="${esc(c.id)}" title="שכפול"><i class="fa-regular fa-copy"></i></button>
                <button class="icon-btn sm danger" data-action="delete-mail" data-id="${esc(c.id)}" title="מחיקה"><i class="fa-solid fa-trash-can"></i></button>
            </div></td>
        </tr>`;
    }).join('');
}

// --- composer state ---

function mcVal(id) { return $(id).value; }

function mcDesign() {
    return {
        theme: S.mc.theme, layout: S.mc.layout, align: S.mc.align, bodyMode: S.mc.bodyMode,
        accent: $('#mc-accent-on').checked ? $('#mc-accent').value : '',
        bannerUrl: mcVal('#mc-banner').trim(), eyebrow: mcVal('#mc-eyebrow'), title: mcVal('#mc-title'), highlight: mcVal('#mc-highlight'),
        body: mcVal('#mc-body'), ctaLabel: mcVal('#mc-cta-label'), ctaUrl: mcVal('#mc-cta-url').trim(), cta2Label: mcVal('#mc-cta2-label'), cta2Url: mcVal('#mc-cta2-url').trim(),
        signature: mcVal('#mc-signature'), footnote: mcVal('#mc-footnote'),
    };
}

function mcAudience() {
    const mode = $('input[name="mc-mode"]:checked').value;
    return { mode, phones: [...S.mc.picked.keys()], emails: mcVal('#mc-emails'), segment: mcVal('#mc-segment'), days: parseInt(mcVal('#mc-days'), 10) || 30, service: $('#mc-service').checked };
}

function switchMailTab(tab) {
    $$('#mc-tabs .drawer-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('#mail-form .tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
    if (tab === 'send') renderMailSummary();
}

async function openMail(prefill = {}) {
    if (S.view !== 'mail') go('mail');
    if (!S.users.length) loadUsers(true);
    const c = prefill.campaign || null;
    const d = (c && c.design) || {};
    const a = (c && c.audience) || prefill.audience || { mode: 'users' };
    S.mc = { theme: d.theme || 'salamon', layout: d.layout || 'card', align: d.align || 'right', bodyMode: d.bodyMode || 'text', picked: new Map(), editing: c && !prefill.duplicate ? c.id : null };
    $('#mail-form').reset();
    $('#mc-id').value = S.mc.editing || '';
    $('#mc-head').textContent = S.mc.editing ? 'עריכת דיוור' : prefill.duplicate ? 'דיוור חדש (העתק)' : 'דיוור חדש';
    $('#mc-subject').value = c ? c.subject : '';
    $('#mc-preheader').value = (c && c.preheader) || '';
    for (const [id, k] of [['#mc-eyebrow', 'eyebrow'], ['#mc-title', 'title'], ['#mc-highlight', 'highlight'], ['#mc-body', 'body'], ['#mc-cta-label', 'ctaLabel'], ['#mc-cta-url', 'ctaUrl'], ['#mc-cta2-label', 'cta2Label'], ['#mc-cta2-url', 'cta2Url'], ['#mc-signature', 'signature'], ['#mc-footnote', 'footnote'], ['#mc-banner', 'bannerUrl']]) $(id).value = d[k] || '';
    if (!c) { $('#mc-signature').value = 'בברכה,\nצוות עכשיו סלומון'; $('#mc-cta-label').value = 'למעבר לאתר'; $('#mc-cta-url').value = 'https://smti.uk/salamon'; }
    $('#mc-accent-on').checked = !!d.accent; if (d.accent) $('#mc-accent').value = d.accent;
    $(`input[name="mc-mode"][value="${a.mode || 'users'}"]`).checked = true;
    $('#mc-emails').value = (a.emails || []).join(', ');
    renderSegmentOptions(a.segment);
    $('#mc-days').value = a.days || 30;
    $('#mc-service').checked = !!a.service;
    for (const p of a.phones || []) S.mc.picked.set(p, mailPerson(p));
    if (c && c.status === 'scheduled' && c.scheduledAt) { $('input[name="mc-when"][value="schedule"]').checked = true; $('#mc-schedule').value = String(c.scheduledAt).replace(' ', 'T').slice(0, 16); }
    $('#mc-results').hidden = true;
    renderMcSegs();
    renderPicked();
    renderMcMode();
    switchMailTab(prefill.tab || 'to');
    openDrawer('mail-drawer');
    mailAudience();
    mailPreview();
}

function mailPerson(phone) {
    const u = S.users.find(x => x.phone === phone);
    return { phone, name: (u && u.name) || '', email: (u && u.email) || '' };
}

function renderSegmentOptions(sel) {
    const segs = Object.keys(S.mailSegments || {}).length ? S.mailSegments : { all: 'כל המשתמשים עם מייל', active: 'פעילים לאחרונה', inactive: 'לא נכנסו זמן מה', new: 'נרשמו לאחרונה', listeners: 'האזינו להודעות לאחרונה', staff: 'אנשי צוות' };
    $('#mc-segment').innerHTML = Object.entries(segs).map(([k, l]) => `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
}

function renderMcMode() {
    const mode = $('input[name="mc-mode"]:checked').value;
    $$('#mail-form .mc-mode').forEach(el => { el.hidden = el.dataset.mode !== mode; });
    $('#mc-days-wrap').hidden = !['active', 'inactive', 'new', 'listeners'].includes(mcVal('#mc-segment'));
}

function renderMcSegs() {
    $$('#mc-bodymode button').forEach(b => b.classList.toggle('active', b.dataset.mode === S.mc.bodyMode));
    $$('#mc-align button').forEach(b => b.classList.toggle('active', b.dataset.align === S.mc.align));
    $$('#mc-layouts .layout-opt').forEach(b => b.classList.toggle('active', b.dataset.layout === S.mc.layout));
    const themes = S.mailThemes || MAIL_DEFAULT_THEMES;
    $('#mc-themes').innerHTML = Object.entries(themes).map(([k, t]) => `<button type="button" class="theme-opt ${k === S.mc.theme ? 'active' : ''}" data-action="mc-theme" data-theme="${esc(k)}">
        <span class="th" style="background:${esc(t.page)};"><i style="background:linear-gradient(135deg,${esc(t.accent)},${esc(t.accent2)});"></i><em style="background:${esc(t.card)};"></em></span>${esc(t.label)}</button>`).join('');
}

function renderPicked() {
    const list = [...S.mc.picked.values()];
    $('#mc-picked').innerHTML = list.length ? list.map(p => `<span class="pick-chip ${p.email ? '' : 'warn'}" title="${esc(p.email || 'אין מייל למשתמש הזה')}">${avatarHtml(p.name || p.phone, null, 'xs')}<b>${esc(p.name || p.phone)}</b><small class="ltr">${esc(p.email || 'אין מייל')}</small><button type="button" class="icon-btn sm" data-action="mc-unpick" data-phone="${esc(p.phone)}" aria-label="הסרה"><i class="fa-solid fa-xmark"></i></button></span>`).join('')
        : '<div class="muted" style="padding:6px 2px;">עוד לא נבחרו נמענים. חפש למעלה ולחץ על שם כדי להוסיף.</div>';
}

function renderMailSearch() {
    const q = mcVal('#mc-search').trim().toLowerCase();
    const box = $('#mc-results');
    if (!q) { box.hidden = true; return; }
    const hits = S.users.filter(u => u.email && (String(u.phone).includes(q) || String(u.name || '').toLowerCase().includes(q) || String(u.email).toLowerCase().includes(q))).slice(0, 8);
    box.hidden = false;
    box.innerHTML = hits.length ? hits.map(u => `<button type="button" class="mc-hit ${S.mc.picked.has(u.phone) ? 'on' : ''}" data-action="mc-pick" data-phone="${esc(u.phone)}">${avatarHtml(u.name || u.phone, u.profilePictureUrl, 'xs')}<span><b>${esc(u.name || u.phone)}</b><small class="ltr">${esc(u.email)} · ${esc(u.phone)}</small></span><i class="fa-solid ${S.mc.picked.has(u.phone) ? 'fa-check' : 'fa-plus'}"></i></button>`).join('')
        : `<div class="muted" style="padding:10px;">${S.users.length ? 'לא נמצאו משתמשים עם מייל' : 'טוען משתמשים…'}</div>`;
}

const mailAudience = debounce(async () => {
    if (!S.mc) return;
    const box = $('#mc-audience');
    box.innerHTML = '<div class="muted"><i class="fa-solid fa-spinner fa-spin"></i> מחשב נמענים…</div>';
    const r = await api('/admin/mail/audience', { audience: mcAudience() });
    if (!r.ok) { box.innerHTML = `<div class="alert bad">${esc(r.error)}</div>`; return; }
    S.mc.count = r.data.count;
    const x = r.data.excluded || {};
    const parts = [x.optedOut && `${num(x.optedOut)} ביטלו קבלת עדכונים`, x.blocked && `${num(x.blocked)} חסומים`, x.noEmail && `${num(x.noEmail)} בלי מייל`, x.invalid && `${num(x.invalid)} כתובות לא תקינות`, x.duplicate && `${num(x.duplicate)} כפולים`].filter(Boolean);
    box.innerHTML = `<div class="aud-count"><b>${num(r.data.count)}</b><span>נמענים יקבלו את המייל</span></div>
        ${parts.length ? `<div class="muted"><i class="fa-solid fa-filter"></i> לא יקבלו: ${parts.join(' · ')}${x.optedOut && !$('#mc-service').checked ? ' (אפשר לכלול אותם בהודעת שירות)' : ''}</div>` : ''}
        ${(r.data.sample || []).length ? `<div class="aud-sample">${r.data.sample.map(p => `<span title="${esc(p.email)}">${esc(p.name || p.email)}</span>`).join('')}${r.data.count > r.data.sample.length ? `<span class="muted">ועוד ${num(r.data.count - r.data.sample.length)}</span>` : ''}</div>` : ''}`;
    $('#mc-count-tab').textContent = r.data.count ? num(r.data.count) : '';
    renderMailSummary();
}, 350);

const mailPreview = debounce(async () => {
    if (!S.mc) return;
    $('#mc-pv-subject').textContent = (mcVal('#mc-subject') || 'נושא המייל').replace(/\{\{\s*(first_name|name)\s*\}\}/g, 'ישראל');
    $('#mc-pv-pre').textContent = mcVal('#mc-preheader');
    const r = await api('/admin/mail/preview', { design: mcDesign(), subject: mcVal('#mc-subject'), preheader: mcVal('#mc-preheader') });
    if (!r.ok) return;
    if (r.data.themes && !S.mailThemes) { S.mailThemes = r.data.themes; renderMcSegs(); }
    // נטען ב-iframe מבודד (sandbox בלי סקריפטים), כך שה-HTML של המייל לא רץ בתוך מרכז השליטה
    $('#mc-preview').srcdoc = r.data.html;
}, 400);

function renderMailSummary() {
    if (!S.mc) return;
    const when = $('input[name="mc-when"]:checked').value;
    $('#mc-now-hint').textContent = S.mc.count ? `המייל ייצא מיד ל-${num(S.mc.count)} נמענים` : 'בחר נמענים בלשונית "נמענים"';
    $('#mc-send span').textContent = when === 'schedule' ? 'תזמון' : S.mc.count ? `שליחה ל-${num(S.mc.count)}` : 'שליחה';
    $('#mc-send i').className = when === 'schedule' ? 'fa-regular fa-clock' : 'fa-solid fa-paper-plane';
    const d = mcDesign();
    const issues = [!mcVal('#mc-subject').trim() && 'חסר נושא', !d.title.trim() && !d.body.trim() && 'המייל ריק', !S.mc.count && 'אין נמענים', d.ctaLabel && !/^https?:\/\//.test(d.ctaUrl) && 'לכפתור חסר קישור תקין'].filter(Boolean);
    $('#mc-summary').innerHTML = issues.length ? `<div class="alert warn"><i class="fa-solid fa-circle-exclamation"></i> ${issues.join(' · ')}</div>` : `<div class="alert good"><i class="fa-solid fa-circle-check"></i> הכל מוכן לשליחה</div>`;
}

function mailFormat(kind) {
    const ta = $('#mc-body');
    const [a, b] = [ta.selectionStart, ta.selectionEnd];
    const sel = ta.value.slice(a, b);
    let ins;
    if (kind === 'bold') ins = `**${sel || 'טקסט מודגש'}**`;
    else if (kind === 'list') ins = (a && ta.value[a - 1] !== '\n' ? '\n' : '') + (sel ? sel.split('\n').map(l => '- ' + l).join('\n') : '- פריט ראשון\n- פריט שני');
    else ins = '{{first_name}}';
    ta.setRangeText(ins, a, b, 'end');
    ta.focus();
    mailPreview();
}

async function mailSubmit(action) {
    const when = $('input[name="mc-when"]:checked').value;
    if (action === 'send' && when === 'schedule') action = 'schedule';
    const payload = { id: $('#mc-id').value || undefined, action, subject: mcVal('#mc-subject'), preheader: mcVal('#mc-preheader'), design: mcDesign(), audience: mcAudience(), scheduleAt: mcVal('#mc-schedule') };
    if (action === 'send') {
        if (!S.mc.count) { toast('אין נמענים', 'bad'); switchMailTab('to'); return; }
        if (!await confirmDanger('שליחת הדיוור', `המייל "${payload.subject}" יישלח עכשיו ל-${num(S.mc.count)} נמענים. אי אפשר לבטל אחרי השליחה.`, `שליחה ל-${num(S.mc.count)}`)) return;
    }
    const btn = action === 'draft' ? $('[data-action="mc-draft"]') : $('#mc-send');
    busy(btn, true);
    const r = await api('/admin/mail/send', payload);
    busy(btn, false);
    if (r.data && r.data.id) $('#mc-id').value = r.data.id;
    if (!r.ok) { toast(r.error || 'שגיאה', 'bad'); return; }
    if (action === 'draft') { S.mc.editing = r.data.id; toast('הטיוטה נשמרה'); loadMail(); return; }
    toast(action === 'schedule' ? `הדיוור תוזמן ל-${num(r.data.total)} נמענים` : r.data.status === 'failed' ? 'השליחה נכשלה' : `נשלח ל-${num(r.data.sent)} נמענים${r.data.failed ? ` (${num(r.data.failed)} נכשלו)` : ''}`, r.data.status === 'failed' ? 'bad' : 'good');
    closeDrawers();
    await loadMail();
    if (action === 'send') mailReport(r.data.id);
}

async function mailTest() {
    const btn = $('[data-action="mc-test"]');
    busy(btn, true);
    const r = await api('/admin/mail/test', { to: mcVal('#mc-test-to').trim(), subject: mcVal('#mc-subject') || 'מייל בדיקה', preheader: mcVal('#mc-preheader'), design: mcDesign() });
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה בשליחה', 'bad'); return; }
    toast(`מייל בדיקה נשלח ל-${r.data.to}`);
}

async function editMail(id, duplicate) {
    const r = await api('/admin/mail/get', { id: Number(id) });
    if (!r.ok) { toast(r.error, 'bad'); return; }
    if (!S.users.length) await loadUsers(true);
    openMail({ campaign: r.data.campaign, duplicate, tab: duplicate ? 'to' : 'content' });
}

async function mailReport(id) {
    $('#mr-body').innerHTML = '<div class="skeleton" style="height:120px;"></div>';
    $('#mr-foot').innerHTML = '';
    openDrawer('mailrep-drawer');
    const r = await api('/admin/mail/get', { id: Number(id) });
    if (!r.ok) { $('#mr-body').innerHTML = `<div class="empty">${esc(r.error)}</div>`; return; }
    S.mailRep = r.data;
    S.mailRepFilter = 'all';
    const c = r.data.campaign;
    const [label, tone, icon] = MAIL_STATUS[c.status] || [c.status, '', 'fa-circle'];
    $('#mr-title').textContent = c.subject;
    $('#mr-sub').innerHTML = `<span class="badge ${tone}"><i class="fa-solid ${icon}"></i> ${label}</span> ${esc(fmtDate(c.sentAt || c.scheduledAt || c.createdAt))} · ${audienceLabel(c.audience)}`;
    $('#mr-foot').innerHTML = `${c.status === 'scheduled' ? `<button class="btn" data-action="cancel-mail" data-id="${esc(c.id)}"><i class="fa-solid fa-ban"></i> ביטול התזמון</button>` : ''}
        <button class="btn btn-danger" data-action="delete-mail" data-id="${esc(c.id)}"><i class="fa-solid fa-trash-can"></i> מחיקה</button><div class="spacer"></div>
        <button class="btn" data-action="mail-csv"><i class="fa-solid fa-file-csv"></i> ייצוא</button>
        <button class="btn btn-primary" data-action="dup-mail" data-id="${esc(c.id)}"><i class="fa-regular fa-copy"></i> שכפול כדיוור חדש</button>`;
    renderMailReport();
}

const MR_FILTERS = [['all', 'כולם'], ['opened', 'פתחו'], ['unopened', 'לא פתחו'], ['clicked', 'לחצו'], ['failed', 'נכשלו']];

function renderMailReport() {
    const { campaign: c, recipients, links } = S.mailRep;
    const f = S.mailRepFilter;
    const rows = recipients.filter(x => f === 'all' || (f === 'opened' && x.opened_at) || (f === 'unopened' && !x.opened_at && x.status === 'sent') || (f === 'clicked' && x.clicked_at) || (f === 'failed' && x.status === 'failed'));
    const statusCell = x => x.status === 'failed' ? `<span class="badge bad" title="${esc(x.error || '')}">נכשל</span>` : x.status === 'pending' ? '<span class="badge">ממתין</span>'
        : x.clicked_at ? '<span class="badge info"><i class="fa-solid fa-arrow-pointer"></i> לחץ</span>' : x.opened_at ? '<span class="badge good"><i class="fa-solid fa-envelope-open"></i> פתח</span>' : '<span class="badge">נשלח</span>';
    $('#mr-body').innerHTML = `
        <div class="kpis" style="margin:0;">
            ${kpi('fa-paper-plane', '', 'נשלחו', num(c.sent), c.failed ? `${num(c.failed)} נכשלו` : `מתוך ${num(c.total)}`)}
            ${kpi('fa-envelope-open', 'good', 'פתחו', pct(c.opened, c.sent) + '%', `${num(c.opened)} אנשים`, pct(c.opened, c.sent))}
            ${kpi('fa-arrow-pointer', 'info', 'לחצו', pct(c.clicked, c.sent) + '%', `${num(c.clicked)} אנשים`, pct(c.clicked, c.sent))}
        </div>
        ${links.length ? `<div class="card"><div class="card-head"><h3>הקלקות לפי קישור</h3></div><table class="tbl"><tbody>${links.map(l => `<tr><td class="ltr mono" style="text-align:right; max-width:420px; overflow:hidden; text-overflow:ellipsis;">${esc(l.url)}</td><td class="nowrap"><b>${num(l.people)}</b> <span class="muted">אנשים · ${num(l.clicks)} הקלקות</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        <div class="card"><div class="card-head"><h3>נמענים</h3><div class="tools"><div class="chips">${MR_FILTERS.map(([k, l]) => `<button class="chip ${f === k ? 'active' : ''}" data-action="mr-filter" data-filter="${k}">${l}</button>`).join('')}</div></div></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>נמען</th><th>סטטוס</th><th>נפתח</th><th>פתיחות</th><th>מכשיר</th></tr></thead><tbody>
        ${rows.length ? rows.map(x => `<tr><td><div class="cell-user">${avatarHtml(x.name || x.email, null, 'sm')}<div><b>${esc(x.name || x.phone || x.email)}</b><small class="ltr">${esc(x.email)}</small></div></div></td>
            <td>${statusCell(x)}</td><td class="muted nowrap" title="${esc(fmtDate(x.opened_at))}">${x.opened_at ? esc(relTime(x.opened_at)) : '—'}</td>
            <td>${x.open_count ? num(x.open_count) : '—'}${x.click_count ? ` <span class="muted">· ${num(x.click_count)} הקלקות</span>` : ''}</td><td class="muted">${esc(x.last_device || '')}</td></tr>`).join('') : emptyRow(5, 'אין נמענים בסינון הזה', 'fa-filter')}
        </tbody></table></div></div>
        <div class="muted" style="font-size:12px;"><i class="fa-solid fa-circle-info"></i> פתיחה נמדדת כשהתמונות במייל נטענות. יש תוכנות דואר שחוסמות תמונות, ולכן המספר האמיתי יכול להיות גבוה יותר.</div>`;
}

async function deleteMail(id) {
    const c = (S.mail || []).find(x => String(x.id) === String(id));
    if (!await confirmDanger('מחיקת דיוור', `למחוק את "${c ? c.subject : ''}" עם כל נתוני הפתיחות וההקלקות? מיילים שכבר נשלחו לא יימחקו מתיבות הדואר.`, 'מחיקה')) return;
    const r = await api('/admin/mail/delete', { id: Number(id) });
    if (!r.ok) { toast(r.error || 'שגיאה', 'bad'); return; }
    toast('הדיוור נמחק');
    closeDrawers();
    loadMail();
}

async function cancelMail(id) {
    const r = await api('/admin/mail/cancel', { id: Number(id) });
    if (!r.ok) { toast(r.error || 'שגיאה', 'bad'); return; }
    toast('התזמון בוטל, הדיוור חזר לטיוטות');
    closeDrawers();
    loadMail();
}

function mailCsv() {
    const { campaign: c, recipients } = S.mailRep;
    downloadCsv(`mail-${c.id}.csv`, [['שם', 'טלפון', 'מייל', 'סטטוס', 'נשלח', 'נפתח', 'פתיחות', 'נלחץ', 'הקלקות', 'מכשיר'],
        ...recipients.map(x => [x.name, x.phone, x.email, x.status, x.sent_at, x.opened_at, x.open_count, x.clicked_at, x.click_count, x.last_device])]);
}

// ---------- Voice messages ----------

const VOICE_SOURCE = { phone: ['בטלפון', 'fa-phone'], web_record: ['הוקלט באתר', 'fa-microphone'], web_file: ['הועלה כקובץ', 'fa-file-audio'] };

async function loadVoice(page = S.voicePage || 1) {
    S.voicePage = page;
    $('#voice-body').innerHTML = loadingRows(7, 6);
    $('#voice-pager').innerHTML = '';
    const r = await api('/admin/voice/list', { page, limit: 25 });
    if (!r.ok) { $('#voice-body').innerHTML = emptyRow(7, r.error, 'fa-circle-exclamation'); return; }
    S.voice = r.data.messages || [];
    S.voiceHasMore = r.data.hasMore;
    S.voicePhone = S.voicePhone || {};
    renderVoice();
    // מספרי השומעים בטלפון נטענים ברקע, בקבוצות קטנות, כדי שהרשימה תופיע מיד
    const ids = S.voice.map(m => m.fileId).filter(id => !(id in S.voicePhone));
    for (let i = 0; i < ids.length; i += 10) {
        const res = await api('/admin/voice/phone-stats', { fileIds: ids.slice(i, i + 10) });
        if (!res.ok) break;
        Object.assign(S.voicePhone, res.data.stats);
        if (S.view === 'voice') renderVoice();
    }
}

function voiceTitle(m) {
    const d = parseDate(m.mtime);
    return `הודעה #${Number(m.fileId)}${d ? ` · ${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}` : ''}`;
}

function renderVoice() {
    const rows = S.voice || [];
    $('#voice-page-info').textContent = `עמוד ${num(S.voicePage)}`;
    $('#voice-pager').innerHTML = `<button class="btn btn-sm" data-action="voice-page" data-page="${S.voicePage - 1}" ${S.voicePage <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i> חדשות יותר</button><div class="spacer"></div>
        <button class="btn btn-sm" data-action="voice-page" data-page="${S.voicePage + 1}" ${S.voiceHasMore ? '' : 'disabled'}>ישנות יותר <i class="fa-solid fa-chevron-left"></i></button>`;
    if (!rows.length) { $('#voice-body').innerHTML = emptyRow(7, 'אין הודעות בשלוחה', 'fa-microphone-slash'); return; }
    $('#voice-body').innerHTML = rows.map(m => {
        const tel = S.voicePhone[m.fileId];
        const [srcLabel, srcIcon] = VOICE_SOURCE[m.recorder.source] || VOICE_SOURCE.phone;
        const telCell = !tel ? '<span class="skeleton" style="display:inline-block; width:34px;"></span>' : tel.available ? `<b>${num(tel.amount)}</b>` : '<span class="muted" title="ימות המשיח לא שמרה נתוני האזנה להודעה הזו">—</span>';
        return `<tr class="clickable" data-action="voice-open" data-id="${esc(m.fileId)}">
            <td><div class="cell-user"><div class="avatar sm voice-ic"><i class="fa-solid fa-microphone-lines"></i></div><div><b>${esc(voiceTitle(m))}</b><small>${esc(m.duration || '')}${m.mtime ? ` · ${esc(fmtDate(m.mtime))}` : ''}</small></div></div></td>
            <td><div><b style="font-weight:500;">${esc(m.recorder.name || m.recorder.phone || 'לא מזוהה')}</b><small class="muted" style="display:block;"><i class="fa-solid ${srcIcon}"></i> ${srcLabel}</small></div></td>
            <td><b>${num(m.site.viewers)}</b></td>
            <td><b>${num(m.site.listeners)}</b>${m.site.listens > m.site.listeners ? ` <span class="muted">· ${num(m.site.listens)} השמעות</span>` : ''}</td>
            <td>${telCell}</td>
            <td class="muted nowrap">${m.site.lastListen ? esc(relTime(m.site.lastListen)) : '—'}</td>
            <td><button class="btn btn-sm" data-action="voice-open" data-id="${esc(m.fileId)}"><i class="fa-solid fa-users-viewfinder"></i> מי ראה ושמע</button></td>
        </tr>`;
    }).join('');
}

const VA_FILTERS = [['all', 'כולם'], ['tel', 'שמעו בטלפון'], ['web', 'השמיעו באתר'], ['site', 'ראו באתר'], ['seen-only', 'ראו ולא שמעו'], ['not', 'לא שמעו']];

async function openVoice(fileId) {
    const m = (S.voice || []).find(x => x.fileId === fileId);
    $('#va-title').textContent = m ? voiceTitle(m) : `הודעה #${Number(fileId)}`;
    $('#va-sub').textContent = m ? `${m.duration || ''} · ${fmtDate(m.mtime)}` : '';
    $('#va-body').innerHTML = '<div class="skeleton" style="height:120px;"></div>';
    openDrawer('voice-drawer');
    const r = await api('/admin/voice/audience', { fileId });
    if (!r.ok) { $('#va-body').innerHTML = `<div class="empty">${esc(r.error)}</div>`; return; }
    S.va = r.data;
    S.vaFilter = 'all';
    S.vaSearch = '';
    renderVoiceAudience();
}

function vaChannel(icon, label, x, tone) {
    if (!x) return `<span class="ch off" title="${label}: לא"><i class="fa-solid ${icon}"></i></span>`;
    const times = x.count > 1 ? ` · ${num(x.count)} פעמים` : '';
    return `<span class="ch on ${tone}" title="${label}${times}${x.first ? `\nראשונה: ${fmtDate(x.first)}` : ''}${x.last ? `\nאחרונה: ${fmtDate(x.last)}` : ''}"><i class="fa-solid ${icon}"></i>${x.count > 1 ? `<b>${num(x.count)}</b>` : ''}</span>`;
}

function renderVoiceAudience() {
    const d = S.va;
    const f = S.vaFilter, q = S.vaSearch.trim().toLowerCase();
    const t = d.totals;
    const match = p => !q || String(p.phone).includes(q) || String(p.name || '').toLowerCase().includes(q);
    let rows;
    if (f === 'not') rows = d.notHeard.filter(match);
    else rows = d.people.filter(p => match(p) && (f === 'all' || (f === 'tel' && p.tel) || (f === 'web' && p.web) || (f === 'site' && p.site) || (f === 'seen-only' && p.site && !p.heard)));
    const counts = { all: d.people.length, tel: d.people.filter(p => p.tel).length, web: d.people.filter(p => p.web).length, site: d.people.filter(p => p.site).length, 'seen-only': d.people.filter(p => p.site && !p.heard).length, not: d.notHeard.length };
    const telNote = !d.phone.available
        ? `<div class="alert warn"><i class="fa-solid fa-phone-slash"></i> אין נתוני האזנה מהטלפון להודעה הזו. כדי שימות המשיח תשמור מי שמע, צריך להגדיר בשלוחה 1/2 <span class="mono ltr">save_listening_data=yes</span>.</div>`
        : !d.phone.detailed && d.phone.amount ? `<div class="alert info"><i class="fa-solid fa-circle-info"></i> ימות המשיח שמרה רק את מספר השומעים בטלפון (${num(d.phone.amount)}), בלי פירוט לפי מספר.</div>` : '';
    const isNot = f === 'not';
    $('#va-body').innerHTML = `
        <div class="va-rec"><i class="fa-solid fa-microphone"></i> הוקלט ע״י <b>${esc(d.recorder.displayName || 'לא מזוהה')}</b>${d.recorder.phone ? ` <span class="mono ltr muted">${esc(d.recorder.phone)}</span>` : ''}</div>
        <div class="kpis" style="margin:0;">
            ${kpi('fa-bullseye', '', 'הגיעה ל', num(t.reached), 'אנשים ששמעו בטלפון או באתר')}
            ${kpi('fa-phone', 'good', 'שמעו בטלפון', num(t.phoneListeners), d.phone.detailed ? 'לפי נתוני ימות המשיח' : 'סה״כ מימות המשיח')}
            ${kpi('fa-headphones', 'info', 'השמיעו באתר', num(t.webListeners), `${num(t.siteViewers)} ראו ברשימה`)}
            ${kpi('fa-user-clock', 'warn', 'עוד לא שמעו', num(d.notHeard.length), 'מספר הטלפונים ובעלי החשבון')}
        </div>
        ${telNote}
        ${d.raw !== undefined && d.phone.available ? `<details class="card raw-file"><summary><i class="fa-solid fa-file-lines"></i> הקובץ המקורי מימות המשיח (נתוני ההאזנה)</summary><pre class="ltr mono">${esc(d.raw || '(ריק)')}</pre></details>` : ''}
        <div class="card">
            <div class="card-head" style="flex-wrap:wrap; gap:8px;">
                <div class="chips">${VA_FILTERS.map(([k, l]) => `<button class="chip ${f === k ? 'active' : ''}" data-action="va-filter" data-filter="${k}">${l} <span class="n">${num(counts[k])}</span></button>`).join('')}</div>
                <div class="tools"><div class="search" style="min-width:180px;"><i class="fa-solid fa-magnifying-glass"></i><input class="input" id="va-search" placeholder="שם או טלפון" value="${esc(S.vaSearch)}"></div>
                <button class="icon-btn" data-action="va-csv" title="ייצוא"><i class="fa-solid fa-file-csv"></i></button></div>
            </div>
            <div class="table-wrap"><table class="tbl"><thead><tr><th>אדם</th>${isNot ? '<th>חשבון באתר</th><th>ראה באתר</th>' : '<th>ערוצים</th><th>שמע בטלפון</th><th>באתר</th><th>פעילות אחרונה</th>'}</tr></thead><tbody>
            ${rows.length ? rows.slice(0, 500).map(p => isNot
                ? `<tr><td>${vaPerson(p)}</td><td>${p.hasAccount ? '<span class="badge good">יש</span>' : '<span class="muted">רק טלפון</span>'}</td><td>${p.sawOnSite ? '<span class="badge warn"><i class="fa-solid fa-eye"></i> ראה ולא שמע</span>' : '—'}</td></tr>`
                : `<tr><td>${vaPerson(p)}</td>
                    <td><div class="channels">${vaChannel('fa-phone', 'שמע בטלפון', p.tel, 'good')}${vaChannel('fa-headphones', 'השמיע באתר', p.web, 'info')}${vaChannel('fa-eye', 'ראה ברשימה באתר', p.site, '')}</div></td>
                    <td class="nowrap">${p.tel ? (p.tel.last ? `<span title="${esc((p.tel.times || []).map(fmtDate).join('\n'))}">${esc(fmtDate(p.tel.last))}</span>${p.tel.count > 1 ? ` <span class="muted">(${num(p.tel.count)}×)</span>` : ''}` : `<span class="muted" title="${esc(p.tel.raw || '')}">שמע</span>`) : '<span class="muted">—</span>'}</td>
                    <td class="nowrap">${p.web ? `<span title="ראשונה: ${esc(fmtDate(p.web.first))}">השמיע ${esc(relTime(p.web.last))}</span>${p.web.count > 1 ? ` <span class="muted">(${num(p.web.count)}×)</span>` : ''}` : p.site ? `<span class="muted">ראה ${esc(relTime(p.site.last))}</span>` : '<span class="muted">—</span>'}</td>
                    <td class="muted nowrap">${p.last ? esc(relTime(p.last)) : '—'}</td></tr>`).join('')
            : emptyRow(isNot ? 3 : 5, q ? 'לא נמצאו תוצאות' : 'אין אנשים בקטגוריה הזו', 'fa-users-slash')}
            </tbody></table></div>
            ${rows.length > 500 ? `<div class="pager">מוצגים 500 מתוך ${num(rows.length)}. ייצוא הקובץ כולל את כולם.</div>` : ''}
        </div>`;
    const inp = $('#va-search');
    inp.addEventListener('input', debounce(() => { S.vaSearch = inp.value; renderVoiceAudience(); const el = $('#va-search'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 250));
}

function vaPerson(p) {
    return `<div class="cell-user">${avatarHtml(p.name || p.phone, null, 'sm')}<div><b>${esc(p.name || p.phone)}</b><small class="ltr">${esc(p.phone)}${p.hasAccount ? '' : ' · רק טלפון'}</small></div>${p.hasAccount ? `<button class="icon-btn sm" data-action="open-user-activity" data-phone="${esc(p.phone)}" title="פעילות המשתמש"><i class="fa-solid fa-wave-square"></i></button>` : ''}</div>`;
}

function voiceCsv() {
    const d = S.va;
    downloadCsv(`voice-${d.fileId}.csv`, [['שם', 'טלפון', 'חשבון באתר', 'שמע בטלפון', 'פעמים בטלפון', 'שמיעה אחרונה בטלפון', 'השמיע באתר', 'פעמים באתר', 'השמעה אחרונה באתר', 'ראה ברשימה'],
        ...d.people.map(p => [p.name, p.phone, p.hasAccount ? 'כן' : 'לא', p.tel ? 'כן' : 'לא', p.tel ? p.tel.count : '', p.tel ? p.tel.last : '', p.web ? 'כן' : 'לא', p.web ? p.web.count : '', p.web ? p.web.last : '', p.site ? 'כן' : 'לא']),
        ...d.notHeard.map(p => [p.name, p.phone, p.hasAccount ? 'כן' : 'לא', 'לא', '', '', 'לא', '', '', p.sawOnSite ? 'כן' : 'לא'])]);
}

// ---------- Activity ----------

const ACTIVITY_TYPES = {
    LOGIN: ['התחברות', 'fa-right-to-bracket', 'good'],
    LOGIN_MASTER: ['כניסת מאסטר', 'fa-user-secret', 'warn'],
    LOGIN_FAILED: ['ניסיון התחברות כושל', 'fa-triangle-exclamation', 'bad'],
    LOGOUT: ['התנתקות', 'fa-right-from-bracket', ''],
    REGISTER: ['הרשמה לאתר', 'fa-user-plus', 'accent'],
    PROFILE_UPDATE: ['עדכון פרופיל', 'fa-user-pen', 'info'],
    PASSWORD_CHANGE: ['שינוי סיסמה', 'fa-key', 'warn'],
    PASSWORD_RESET: ['איפוס סיסמה', 'fa-key', 'warn'],
    EMAIL_UNBLOCK: ['שחרור חסימת מייל', 'fa-envelope-open', 'info'],
    UPLOAD: ['העלאת הודעה', 'fa-upload', 'accent'],
    TZINTUK: ['שליחת צינתוק', 'fa-phone-volume', 'info'],
    DELETE_MESSAGE: ['מחיקת הודעה', 'fa-trash-can', 'bad'],
    LISTEN: ['האזנה להודעה', 'fa-headphones', ''],
    CHAT_SEND: ['הודעה בצ׳אט', 'fa-comment', 'accent'],
    NAME_RESTORED: ['שם שוחזר אוטומטית', 'fa-rotate', 'warn'],
    EMAIL_LINK_OPENED: ['פתח קישור מהמייל', 'fa-envelope-open-text', 'info'],
};
const ACTIVITY_FILTERS = [
    ['', 'הכל'],
    ['LOGIN,LOGIN_MASTER,LOGIN_FAILED,LOGOUT', 'התחברויות'],
    ['CHAT_SEND', 'צ׳אט'],
    ['UPLOAD,TZINTUK,DELETE_MESSAGE,LISTEN', 'הודעות'],
    ['REGISTER,PROFILE_UPDATE,PASSWORD_CHANGE,PASSWORD_RESET,EMAIL_UNBLOCK', 'חשבון'],
    ['NAME_RESTORED', 'נעילות'],
];

function activityDetails(e) {
    const m = e.meta || {};
    switch (e.action) {
        case 'LOGIN': return `${m.method === 'google' ? 'עם Google' : 'עם סיסמה'}${m.remember ? ' · זכור אותי' : ''}`;
        case 'LOGIN_FAILED': return m.reason || '';
        case 'NAME_RESTORED': return `"${m.from || 'ריק'}" ← "${m.to || ''}"`;
        case 'LISTEN': return e.details ? `קובץ #${e.details}` : '';
        case 'PROFILE_UPDATE': return e.details ? `שדות: ${e.details}` : '';
        default: return e.details || '';
    }
}

function activityIcon(action) {
    const [, icon, tone] = ACTIVITY_TYPES[action] || ['', 'fa-circle', ''];
    return `<div class="act-icon ${tone}"><i class="fa-solid ${icon}"></i></div>`;
}

async function loadOnline(silent = false) {
    const r = await api('/admin/activity/online');
    if (!r.ok) { if (!silent) toast(r.error || 'שגיאה בטעינת הנוכחות', 'bad'); return null; }
    S.activity = r.data;
    S.onlineSet = new Set((r.data.online || []).map(o => o.phone));
    return r.data;
}

async function loadActivity(more = false) {
    if (!more) {
        $('#act-body').innerHTML = loadingRows(6, 6);
        S.actEvents = [];
        const data = await loadOnline();
        if (data) renderActivityTop();
    }
    const before = more && S.actEvents.length ? S.actEvents[S.actEvents.length - 1].id : undefined;
    const r = await api('/admin/activity/feed', { action: S.actFilter || undefined, phone: S.actPhone || undefined, beforeId: before, limit: 100 });
    if (!r.ok) { $('#act-body').innerHTML = emptyRow(6, r.error, 'fa-circle-exclamation'); return; }
    S.actEvents = S.actEvents.concat(r.data.events || []);
    S.actHasMore = (r.data.events || []).length === 100;
    renderActivityFeed();
}

function renderActivityTop() {
    const a = S.activity || { stats: {}, online: [], recentLogins: [] };
    $('#act-kpis').innerHTML = [
        kpi('fa-signal', 'good', 'מחוברים עכשיו', num(a.stats.onlineNow), `${num(a.stats.activeNow || 0)} מול המסך · ${num(Math.max(0, a.stats.onlineNow - (a.stats.activeNow || 0)))} בכרטיסייה אחרת`),
        kpi('fa-users', 'info', 'פעילים ב-24 שעות', num(a.stats.active24h), 'משתמשים שנכנסו לאתר'),
        kpi('fa-right-to-bracket', '', 'התחברויות היום', num(a.stats.loginsToday), 'מאז חצות'),
    ].join('');
    $('#act-online-count').textContent = a.online.length ? `${num(a.online.length)} משתמשים` : '';
    $('#act-online').innerHTML = a.online.length ? a.online.map(o => `
        <li class="clickable" data-action="open-user-activity" data-phone="${esc(o.phone)}">
            ${avatarHtml(o.name, '', presenceClass(o.status, true))}
            <div class="f-body"><div class="f-title">${esc(o.name || o.phone)} ${o.status === 'background' ? '<span class="badge warn" style="height:20px;">בכרטיסייה אחרת</span>' : ''}</div><div class="f-sub">${esc(o.device || '')}${o.ip ? ` · <span class="ltr">${esc(o.ip)}</span>` : ''}</div></div>
            <div class="f-time">${esc(relTime(o.lastSeenAt))}</div>
        </li>`).join('') : '<li><div class="empty" style="padding:24px;width:100%;"><i class="fa-solid fa-moon"></i>אף אחד לא מחובר כרגע</div></li>';
    $('#act-logins').innerHTML = a.recentLogins.length ? a.recentLogins.map(e => `
        <li class="clickable" data-action="open-user-activity" data-phone="${esc(e.phone)}">
            ${activityIcon(e.action)}
            <div class="f-body"><div class="f-title">${esc(e.name || e.phone)} · ${esc((ACTIVITY_TYPES[e.action] || [e.action])[0])}</div><div class="f-sub">${esc(activityDetails(e))}${e.device ? ` · ${esc(e.device)}` : ''}</div></div>
            <div class="f-time">${esc(relTime(e.createdAt))}</div>
        </li>`).join('') : '<li><div class="empty" style="padding:24px;width:100%;">אין התחברויות עדיין</div></li>';
}

function renderActivityFeed() {
    $('#act-chips').innerHTML = ACTIVITY_FILTERS.map(([k, l]) => `<button class="chip ${(S.actFilter || '') === k ? 'active' : ''}" data-action="act-filter" data-filter="${k}">${l}</button>`).join('');
    const ev = S.actEvents || [];
    $('#act-body').innerHTML = ev.length ? ev.map(e => `
        <tr class="clickable" data-action="open-user-activity" data-phone="${esc(e.phone)}">
            <td class="muted nowrap">${esc(fmtDate(e.createdAt))}</td>
            <td><div class="cell-user" style="min-width:150px;">${avatarHtml(e.name, '', S.onlineSet && S.onlineSet.has(e.phone) ? 'online' : '')}<div><b>${esc(e.name || 'ללא שם')}</b><small class="ltr">${esc(e.phone)}</small></div></div></td>
            <td><div class="row" style="gap:8px;">${activityIcon(e.action)}<span class="nowrap">${esc((ACTIVITY_TYPES[e.action] || [e.action])[0])}</span></div></td>
            <td style="max-width:320px; white-space:normal; font-size:12.5px;">${esc(activityDetails(e))}</td>
            <td class="muted nowrap" style="font-size:12.5px;">${esc(e.device || '—')}</td>
            <td class="ltr mono muted" style="text-align:right;">${esc(e.ip || '—')}</td>
        </tr>`).join('') : emptyRow(6, 'אין פעולות תואמות', 'fa-wave-square');
    $('#act-more').hidden = !S.actHasMore;
}

async function loadUserActivity(phone) {
    $('#ud-presence').innerHTML = '<div class="skeleton" style="width:60%"></div>';
    $('#ud-timeline').innerHTML = '<li><div class="skeleton" style="width:70%"></div></li>'.repeat(3);
    $('#ud-totals').innerHTML = '';
    const r = await api('/admin/activity/user', { phone });
    if (S.editingUser !== phone) return;
    if (!r.ok) { $('#ud-presence').innerHTML = `<span class="muted">${esc(r.error)}</span>`; $('#ud-timeline').innerHTML = ''; return; }
    const p = r.data.presence || {};
    $('#ud-presence').innerHTML = `
        <div class="avatar lg ${p.online ? 'online' : ''}"><i class="fa-solid fa-${p.online ? 'signal' : 'moon'}"></i></div>
        <div style="flex:1; min-width:0;">
            <div class="p-state ${p.online ? 'online' : ''}">${p.status === 'background' ? 'באתר, בכרטיסייה אחרת' : p.online ? 'מחובר/ת עכשיו' : p.lastSeenAt ? `נראה/תה לאחרונה ${esc(relTime(p.lastSeenAt))}` : 'עדיין לא נרשמה פעילות'}</div>
            <div class="p-grid">
                ${p.lastLoginAt ? `<span>התחברות אחרונה</span><span>${esc(fmtDate(p.lastLoginAt))} · ${p.lastLoginMethod === 'google' ? 'Google' : p.lastLoginMethod === 'master' ? 'מאסטר' : 'סיסמה'}</span>` : ''}
                ${p.device ? `<span>מכשיר</span><span>${esc(p.device)}</span>` : ''}
                ${p.ip ? `<span>IP</span><span class="ltr mono" style="text-align:right;">${esc(p.ip)}</span>` : ''}
                <span>חיבורים פעילים</span><span>${num((r.data.sessions || []).length)}</span>
            </div>
        </div>`;
    const totals = r.data.totals || {};
    $('#ud-totals').innerHTML = Object.keys(totals).sort((a, b) => totals[b] - totals[a]).map(k =>
        `<span class="chip" style="cursor:default;">${esc((ACTIVITY_TYPES[k] || [k])[0])} <span class="n">${num(totals[k])}</span></span>`).join('');
    const ev = r.data.events || [];
    $('#ud-timeline').innerHTML = ev.length ? ev.map(e => `
        <li>${activityIcon(e.action)}
            <div class="f-body"><div class="f-title">${esc((ACTIVITY_TYPES[e.action] || [e.action])[0])}</div><div class="f-sub">${esc(activityDetails(e))}${e.device ? ` · ${esc(e.device)}` : ''}${e.ip ? ` · ${esc(e.ip)}` : ''}</div></div>
            <div class="f-time" title="${esc(e.createdAt)}">${esc(fmtDate(e.createdAt))}</div>
        </li>`).join('') : '<li><div class="empty" style="padding:24px;width:100%;">אין פעולות מתועדות</div></li>';
}

// ---------- Phonebook & name locks ----------

function namesAuth() { return S.mode === 'admin' ? 'admin' : 'user'; }

async function loadNames() {
    $('#names-body').innerHTML = loadingRows(6, 8);
    const r = await api('/admin/yemot-names', {}, namesAuth());
    if (!r.ok) { $('#names-body').innerHTML = emptyRow(6, r.error, 'fa-circle-exclamation'); return; }
    S.names = r.data.list || [];
    S.namesMain = !!r.data.isMainAdmin;
    renderNames();
}

function lockIsOn(lock) { return lock && (lock.status === 'active' || lock.status === 'scheduled'); }

function lockBadge(u) {
    const l = u.lock;
    if (!l) return u.isProtected ? '<span class="badge"><i class="fa-solid fa-shield"></i> מוגן</span>' : '<span class="muted">—</span>';
    const until = l.expiresAt ? `עד ${fmtDate(l.expiresAt)}` : 'ללא הגבלת זמן';
    if (l.status === 'scheduled') return `<span class="lock-badge"><span class="badge info"><i class="fa-regular fa-clock"></i> מתוזמן</span><small>מ-${esc(fmtDate(l.startsAt))} · ${esc(until)}</small></span>`;
    if (l.status === 'expired') return `<span class="lock-badge"><span class="badge"><i class="fa-solid fa-lock-open"></i> פג תוקף</span><small>${esc(fmtDate(l.expiresAt))}</small></span>`;
    return `<span class="lock-badge" title="${esc(l.reason || '')}"><span class="badge accent"><i class="fa-solid fa-${l.mode === 'enforce' ? 'rotate' : 'lock'}"></i> ${l.mode === 'enforce' ? 'נעול + שחזור' : 'נעול לצוות'}</span><small>${esc(until)}${l.reason ? ` · ${esc(l.reason)}` : ''}</small></span>`;
}

function filteredNames() {
    const q = S.namesSearch.toLowerCase();
    return S.names.filter(u => {
        if (S.namesFilter === 'missing' && String(u.name || '').trim()) return false;
        if (S.namesFilter === 'locked' && !lockIsOn(u.lock)) return false;
        return !q || String(u.phone).includes(q) || String(u.name || '').toLowerCase().includes(q);
    });
}

function renderNames() {
    const missing = S.names.filter(u => !String(u.name || '').trim()).length;
    const locked = S.names.filter(u => lockIsOn(u.lock)).length;
    const chip = (k, label, n, icon = '') => `<button class="chip ${S.namesFilter === k ? 'active' : ''}" data-action="names-filter" data-filter="${k}">${icon}${label} <span class="n">${num(n)}</span></button>`;
    $('#names-chips').innerHTML = chip('all', 'הכל', S.names.length) + chip('missing', 'ללא שם', missing, '<i class="fa-solid fa-triangle-exclamation"></i> ') + chip('locked', 'נעולים', locked, '<i class="fa-solid fa-lock"></i> ');

    const list = filteredNames();
    S.namesFiltered = list.map(u => String(u.phone));
    const LIMIT = 400;
    const isAdmin = S.mode === 'admin';
    const rows = list.slice(0, LIMIT).map(u => {
        const lockedForMe = !S.namesMain && ((u.isProtected) || (u.lock && u.lock.status === 'active'));
        const phone = esc(u.phone);
        const sel = S.namesSel.has(String(u.phone));
        return `<tr class="${sel ? 'selected' : ''}">
            <td class="col-check admin-only"><input type="checkbox" class="name-check" data-phone="${phone}" ${sel ? 'checked' : ''} aria-label="בחירה"></td>
            <td class="ltr mono" style="text-align:right; ${lockedForMe ? 'color:var(--text-3)' : ''}">${phone}</td>
            <td>${u.active ? '<span class="badge good">פעיל</span>' : '<span class="badge bad">חסום</span>'}</td>
            <td><input class="input name-input" data-phone="${phone}" value="${esc(u.name || '')}" placeholder="ללא שם…" ${lockedForMe ? 'disabled title="השם נעול"' : ''} style="height:34px; ${!u.name ? 'border-color:color-mix(in oklab, var(--bad) 40%, var(--border));' : ''}"></td>
            <td>${lockBadge(u)}</td>
            <td><div class="row" style="gap:2px;">
                ${lockedForMe ? '' : `<button class="icon-btn sm" data-action="save-name" data-phone="${phone}" title="שמירה"><i class="fa-solid fa-check"></i></button>`}
                ${isAdmin ? `<button class="icon-btn sm" data-action="lock-one" data-phone="${phone}" title="${u.lock ? 'עריכת נעילה' : 'נעילת השם'}"><i class="fa-solid fa-${u.lock ? 'lock' : 'lock-open'}"></i></button>` : ''}
            </div></td>
        </tr>`;
    }).join('');
    $('#names-body').innerHTML = list.length
        ? rows + (list.length > LIMIT ? `<tr><td colspan="6" class="muted" style="text-align:center;">מוצגות ${LIMIT} מתוך ${num(list.length)} — צמצם בחיפוש</td></tr>` : '')
        : emptyRow(6, 'לא נמצאו מנויים', 'fa-address-book');
    const all = $('#names-check-all');
    all.checked = list.length > 0 && list.every(u => S.namesSel.has(String(u.phone)));
    all.indeterminate = !all.checked && list.some(u => S.namesSel.has(String(u.phone)));
    $('#names-bulk').hidden = !S.namesSel.size;
    $('#names-bulk-count').textContent = `${num(S.namesSel.size)} נבחרו`;
}

async function saveName(phone) {
    const input = $(`.name-input[data-phone="${CSS.escape(phone)}"]`);
    if (!input || input.disabled) return;
    const newName = input.value.trim();
    const u = S.names.find(x => String(x.phone) === phone);
    if (u && (u.name || '') === newName) { toast('לא בוצע שינוי', 'info'); return; }
    input.disabled = true;
    const r = await api('/admin/update-yemot-name', { phone, newName }, namesAuth());
    input.disabled = false;
    if (!r.ok) { toast(r.error || 'שגיאה בעדכון השם', 'bad'); return; }
    if (u) { u.name = newName; if (u.lock) u.lock.lockedName = newName; }
    input.style.borderColor = 'var(--good)';
    input.style.background = 'var(--good-soft)';
    setTimeout(() => { input.style.borderColor = ''; input.style.background = ''; }, 1200);
    toast(`השם נשמר: ${newName || 'ללא שם'}`);
}

function toLocalInput(dbTime) { return dbTime ? String(dbTime).replace(' ', 'T').slice(0, 16) : ''; }
function inputPlusDays(days) {
    const d = new Date(Date.now() + days * 86400000);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setLockPreset(days) {
    $$('#lock-presets .chip').forEach(c => c.classList.toggle('active', Number(c.dataset.preset) === days));
    $('#lock-end').value = days ? inputPlusDays(days) : '';
}

function openLockDrawer(phones) {
    S.lockPhones = phones;
    const single = phones.length === 1 ? S.names.find(u => String(u.phone) === phones[0]) : null;
    const lock = single && single.lock;
    $('#lock-form').reset();
    $('#lock-title').textContent = phones.length === 1 ? (lock ? 'עריכת נעילת שם' : 'נעילת שם') : `נעילת ${num(phones.length)} מספרים`;
    $('#lock-sub').textContent = single ? `${single.phone} · ${single.name || 'ללא שם'}` : 'הנעילה תחול על כל המספרים שנבחרו';
    $('#lock-current-name').textContent = single ? (single.name ? `"${single.name}"` : 'כרגע אין שם') : 'השם הנוכחי של כל מספר יישמר כפי שהוא';
    $('#lock-remove').hidden = !lock;
    $('#lock-save').innerHTML = lock ? '<i class="fa-solid fa-check"></i> עדכון נעילה' : '<i class="fa-solid fa-lock"></i> נעילה';
    if (lock) {
        $(`#lock-form input[name="lock-mode"][value="${lock.mode}"]`).checked = true;
        $('#lock-start').value = toLocalInput(lock.startsAt);
        $('#lock-end').value = toLocalInput(lock.expiresAt);
        $('#lock-reason').value = lock.reason || '';
        $$('#lock-presets .chip').forEach(c => c.classList.toggle('active', !lock.expiresAt && c.dataset.preset === '0'));
    } else {
        setLockPreset(0);
    }
    openDrawer('lock-drawer');
}

async function saveLock(e) {
    e.preventDefault();
    const nameMode = $('#lock-form input[name="lock-name"]:checked').value;
    const name = $('#lock-custom-name').value.trim();
    if (nameMode === 'custom' && !name) { toast('יש להזין את השם לנעילה', 'bad'); $('#lock-custom-name').focus(); return; }
    const btn = $('#lock-save');
    busy(btn, true);
    const r = await api('/admin/name-locks/save', {
        phones: S.lockPhones, mode: $('#lock-form input[name="lock-mode"]:checked').value,
        nameMode, name, startsAt: $('#lock-start').value || null, expiresAt: $('#lock-end').value || null,
        reason: $('#lock-reason').value.trim(),
    });
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה בנעילה', 'bad'); return; }
    if (r.data.applied === false) toast('הנעילה נשמרה, אבל עדכון השם בימות נכשל. האכיפה תנסה שוב.', 'bad');
    else toast(r.data.message || 'הנעילה נשמרה');
    S.namesSel.clear();
    closeDrawers();
    loadNames();
}

async function removeLocks(phones) {
    if (!await confirmDanger('הסרת נעילה', phones.length === 1 ? 'להסיר את הנעילה מהמספר?' : `להסיר את הנעילה מ-${num(phones.length)} מספרים?`, 'הסרה')) return;
    const r = await api('/admin/name-locks/delete', { phones });
    if (!r.ok) { toast(r.error || 'שגיאה', 'bad'); return; }
    toast(r.data.message || 'הנעילה הוסרה');
    S.namesSel.clear();
    closeDrawers();
    loadNames();
}

async function enforceLocksNow(btn) {
    busy(btn, true);
    const r = await api('/admin/name-locks/enforce');
    busy(btn, false);
    if (!r.ok || r.data.error) { toast(r.error || r.data.error || 'שגיאה באכיפה', 'bad'); return; }
    toast(r.data.restored.length ? `שוחזרו ${num(r.data.restored.length)} שמות שהשתנו (מתוך ${num(r.data.checked)} נעולים)` : `כל ${num(r.data.checked)} השמות הנעולים תקינים`);
    if (r.data.restored.length) loadNames();
}

// ---------- SQL ----------

async function loadTables() {
    $('#sql-tables').innerHTML = '<div class="empty" style="padding:20px;"><i class="fa-solid fa-circle-notch spin"></i></div>';
    const r = await api('/admin/sql/tables');
    if (!r.ok) { $('#sql-tables').innerHTML = `<div class="empty" style="padding:20px;">${esc(r.error)}</div>`; return; }
    const tables = r.data.tables || [];
    $('#sql-tables').innerHTML = tables.map(t => `<button class="sql-table-btn ${t === S.sqlTable ? 'active' : ''}" data-action="pick-table" data-table="${esc(t)}"><i class="fa-solid fa-table"></i> ${esc(t)}</button>`).join('');
    renderSqlHistory();
}

function quoteIdent(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }
function quoteVal(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }

function sqlHistory() {
    try { return JSON.parse(getItem('controlSqlHistory') || '[]'); } catch (e) { return []; }
}

function renderSqlHistory() {
    const h = sqlHistory();
    $('#sql-history').innerHTML = h.map((q, i) => `<button class="btn btn-sm" data-action="sql-history" data-i="${i}" title="${esc(q)}">${esc(q)}</button>`).join('');
}

function pushSqlHistory(q) {
    const h = sqlHistory().filter(x => x !== q);
    h.unshift(q);
    setItem('controlSqlHistory', JSON.stringify(h.slice(0, 8)));
    renderSqlHistory();
}

function pickTable(t) {
    S.sqlTable = t;
    $$('.sql-table-btn').forEach(b => b.classList.toggle('active', b.dataset.table === t));
    $('#sql-editor').value = `SELECT * FROM ${quoteIdent(t)} LIMIT 100`;
    runSql();
}

async function runSql() {
    const q = $('#sql-editor').value.trim();
    if (!q) return;
    const first = q.replace(/^\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/)*/g, '').trim().split(/\s+/)[0].toUpperCase();
    if (['DELETE', 'UPDATE', 'DROP', 'ALTER', 'TRUNCATE', 'INSERT', 'REPLACE', 'CREATE'].includes(first)) {
        const noWhere = (first === 'DELETE' || first === 'UPDATE') && !/\bWHERE\b/i.test(q);
        const ok = await confirmDanger(
            noWhere ? `${first} ללא WHERE` : 'פקודה שמשנה נתונים',
            noWhere ? 'הפקודה תשפיע על כל השורות בטבלה! האם אתה בטוח לחלוטין?' : 'הפקודה תשנה את מסד הנתונים ואין אפשרות לבטל. להמשיך?',
            'הרצה');
        if (!ok) return;
    }
    const m = q.match(/\bFROM\s+["`[]?([A-Za-z0-9_]+)/i);
    if (m) S.sqlTable = m[1];

    const btn = $('#sql-run');
    busy(btn, true);
    $('#sql-error').hidden = true;
    $('#sql-meta').textContent = '';
    const t0 = performance.now();
    const r = await api('/admin/sql/execute', { query: q });
    const ms = Math.round(performance.now() - t0);
    busy(btn, false);
    if (!r.ok) {
        $('#sql-error').hidden = false;
        $('#sql-error').textContent = r.error || 'שגיאה בהרצת השאילתה';
        return;
    }
    pushSqlHistory(q);
    $('#sql-meta').textContent = `${ms}ms`;
    renderSqlResults(r.data.results || [], r.data.meta || {});
}

function renderSqlResults(rows, meta) {
    S.sqlRows = rows;
    S.sqlCols = rows.length ? Object.keys(rows[0]) : [];
    const info = [];
    if (rows.length) info.push(`${num(rows.length)} שורות`);
    if (meta.changes !== undefined && meta.changes !== null) info.push(`${num(meta.changes)} שורות הושפעו`);
    $('#sql-result-info').textContent = info.join(' · ');
    $('#sql-export').hidden = !rows.length;

    if (!rows.length) {
        $('#sql-results').innerHTML = `<div class="empty"><i class="fa-solid fa-${meta.changes !== undefined ? 'circle-check' : 'inbox'}"></i>${meta.changes !== undefined ? 'הפקודה בוצעה בהצלחה' : 'אין תוצאות'}</div>`;
        return;
    }
    const cols = S.sqlCols;
    const pk = cols.find(c => c.toLowerCase() === 'id') || cols.find(c => c.toLowerCase() === 'phone');
    let html = `<table class="tbl sql-result"><thead><tr>${cols.map(c => `<th>${esc(c)}${c === pk ? ' <i class="fa-solid fa-key" style="font-size:9px;"></i>' : ''}</th>`).join('')}</tr></thead><tbody>`;
    rows.forEach((row, ri) => {
        html += '<tr>' + cols.map(c => {
            const v = row[c];
            const content = v === null ? '<span class="null">NULL</span>' : esc(v);
            if (pk && c !== pk && S.sqlTable) return `<td class="editable" contenteditable="true" spellcheck="false" data-row="${ri}" data-col="${esc(c)}" title="לחץ לעריכה">${content}</td>`;
            return `<td class="${c === pk ? 'pk' : ''}">${content}</td>`;
        }).join('') + '</tr>';
    });
    html += '</tbody></table>';
    $('#sql-results').innerHTML = html;
    $('#sql-results').dataset.pk = pk || '';
}

async function saveSqlCell(td) {
    const row = S.sqlRows[+td.dataset.row];
    const col = td.dataset.col;
    const pk = $('#sql-results').dataset.pk;
    if (!row || !pk || !S.sqlTable) return;
    const orig = row[col];
    const newVal = td.innerText.replace(/\n$/, '');
    if ((orig === null && (newVal === 'NULL' || newVal === '')) || String(orig) === newVal) {
        td.innerHTML = orig === null ? '<span class="null">NULL</span>' : esc(orig);
        return;
    }
    const q = `UPDATE ${quoteIdent(S.sqlTable)} SET ${quoteIdent(col)} = ${quoteVal(newVal)} WHERE ${quoteIdent(pk)} = ${quoteVal(row[pk])}`;
    const r = await api('/admin/sql/execute', { query: q });
    if (!r.ok) {
        toast(r.error || 'שגיאה בעדכון', 'bad');
        td.innerHTML = orig === null ? '<span class="null">NULL</span>' : esc(orig);
        return;
    }
    row[col] = newVal;
    td.classList.add('saved');
    setTimeout(() => td.classList.remove('saved'), 1200);
    toast('הערך עודכן במסד');
}

function exportSql() {
    downloadCsv(`${S.sqlTable || 'query'}-${new Date().toISOString().slice(0, 10)}.csv`, [S.sqlCols, ...S.sqlRows.map(r => S.sqlCols.map(c => r[c]))]);
}

// ---------- Audit ----------

// ---------- Master ----------

const MASTER_LABELS = {
    LOGIN: ['כניסה', 'accent'], LOGOUT: ['יציאה', ''], LISTEN: ['האזנה להודעה', 'info'], CHAT_SEND: ['הודעה בצ׳אט', 'info'],
    FILE_OPEN: ['פתיחת קובץ', 'info'], UPLOAD: ['העלאת הקלטה', 'warn'], TZINTUK: ['צינתוק', 'warn'], DELETE_MESSAGE: ['מחיקת הודעה', 'bad'],
    PROFILE_UPDATE: ['עדכון פרופיל', 'warn'], PASSWORD_CHANGE: ['שינוי סיסמה', 'bad'], SETTINGS: ['שינוי הגדרות מאסטר', ''], SESSION_ENDED: ['חיבור נותק', ''],
};

async function loadMaster(more = false) {
    if (!more) { $('#master-log').innerHTML = loadingRows(6, 5); $('#master-sessions').innerHTML = loadingRows(5, 1); }
    const before = more && S.masterLog && S.masterLog.length ? S.masterLog[S.masterLog.length - 1].id : undefined;
    const r = await api('/admin/master', { phone: S.masterPhone || undefined, before });
    if (!r.ok) { $('#master-log').innerHTML = emptyRow(6, r.error, 'fa-circle-exclamation'); return; }
    S.master = r.data;
    S.masterLog = more ? (S.masterLog || []).concat(r.data.log || []) : (r.data.log || []);
    renderMaster();
}

function renderMaster() {
    const d = S.master || {}, c = d.config || {};
    const sessions = d.sessions || [];
    const week = Date.now() - 7 * 86400000;
    const logins = (S.masterLog || []).filter(l => l.action === 'LOGIN' && (parseDate(l.createdAt) || 0) >= week).length;
    $('#master-kpis').innerHTML = [
        kpi('fa-power-off', c.enabled ? 'good' : 'bad', 'מצב', c.enabled ? 'פעיל' : 'כבוי', c.hasPassword ? 'יש סיסמת מאסטר' : 'לא הוגדרה סיסמה'),
        kpi('fa-plug', sessions.length ? 'warn' : '', 'חיבורים פעילים', num(sessions.length), sessions.length ? 'מישהו מחובר כמאסטר עכשיו' : 'אין חיבורים'),
        kpi('fa-right-to-bracket', 'accent', 'כניסות ב-7 ימים', num(logins), `משך חיבור ${c.minutes || 10} דק'`),
    ].join('');
    if (!S.masterFormDirty) { $('#master-enabled').checked = !!c.enabled; $('#master-minutes').value = c.minutes || 10; }
    $('#master-pw-state').innerHTML = c.hasPassword ? '<i class="fa-solid fa-circle-check"></i> מוגדרת סיסמת מאסטר. אפשר להחליף אותה כאן.' : '<i class="fa-solid fa-circle-exclamation"></i> עדיין לא הוגדרה סיסמת מאסטר.';
    $('#master-sessions').innerHTML = sessions.length ? sessions.map(s => `<tr>
        <td><b>${esc(s.name || 'לקוח')}</b> <span class="ltr mono muted">${esc(s.phone)}</span></td>
        <td class="muted nowrap">${esc(fmtDate(s.createdAt))}</td>
        <td class="muted nowrap">${esc(relTime(s.lastUsedAt))}</td>
        <td class="muted nowrap">${esc(fmtDate(s.expiresAt))}</td>
        <td><button class="btn btn-sm btn-danger" data-action="master-end" data-handle="${esc(s.handle)}"><i class="fa-solid fa-power-off"></i> ניתוק</button></td>
    </tr>`).join('') : emptyRow(5, 'אין חיבורי מאסטר פעילים', 'fa-plug');
    const log = S.masterLog || [];
    $('#master-log').innerHTML = log.length ? log.map(l => {
        const [label, tone] = MASTER_LABELS[l.action] || [l.action, ''];
        return `<tr>
            <td class="muted nowrap">${esc(fmtDate(l.createdAt))}</td>
            <td><span class="badge ${tone}">${esc(label)}</span></td>
            <td>${l.phone ? `${esc(l.name || '')} <span class="ltr mono muted">${esc(l.phone)}</span>` : '<span class="muted">מרכז השליטה</span>'}</td>
            <td>${esc(l.details || '')}</td>
            <td class="muted">${esc(l.device || '')}</td>
            <td class="ltr mono muted">${esc(l.ip || '')}</td>
        </tr>`;
    }).join('') : emptyRow(6, S.masterPhone ? 'אין פעולות מאסטר בחשבון הזה' : 'עדיין לא היו כניסות מאסטר', 'fa-user-secret');
    $('#master-more').hidden = !d.hasMore;
}

async function saveMaster(e) {
    e.preventDefault();
    const enabled = $('#master-enabled').checked;
    if (!enabled && S.master && S.master.config.enabled && !(await confirmDanger('כיבוי התחברות מאסטר', 'סיסמת המאסטר תפסיק לעבוד, וכל החיבורים הפעילים ינותקו מיד.', 'כיבוי'))) return;
    const r = await api('/admin/master/save', { enabled, sessionMinutes: Number($('#master-minutes').value) });
    if (!r.ok) { toast(r.error || 'שגיאה בשמירה', 'bad'); return; }
    S.masterFormDirty = false;
    toast('ההגדרות נשמרו', 'good');
    loadMaster();
}

async function saveMasterPassword(e) {
    e.preventDefault();
    const pw = $('#master-pw').value, pw2 = $('#master-pw2').value;
    if (pw !== pw2) { toast('הסיסמאות אינן תואמות', 'bad'); return; }
    const r = await api('/admin/master/save', { newPassword: pw });
    if (!r.ok) { toast(r.error || 'שגיאה בהחלפת הסיסמה', 'bad'); return; }
    $('#master-pw').value = ''; $('#master-pw2').value = '';
    toast('סיסמת המאסטר הוחלפה וכל החיבורים נותקו', 'good');
    loadMaster();
}

async function endMaster(handle) {
    const r = await api('/admin/master/end', { handle });
    if (!r.ok) { toast(r.error || 'שגיאה בניתוק', 'bad'); return; }
    toast('החיבור נותק', 'good');
    loadMaster();
}

async function endAllMaster() {
    if (!(await confirmDanger('ניתוק כל חיבורי המאסטר', 'כל מי שמחובר כמאסטר יוצא מיד מהחשבון.', 'ניתוק הכל'))) return;
    const r = await api('/admin/master/save', { endAll: true });
    if (!r.ok) { toast(r.error || 'שגיאה בניתוק', 'bad'); return; }
    toast('כל חיבורי המאסטר נותקו', 'good');
    loadMaster();
}

async function loadAudit() {
    $('#audit-body').innerHTML = loadingRows(5, 6);
    const r = await api('/admin/audit-logs');
    if (!r.ok) { $('#audit-body').innerHTML = emptyRow(5, r.error, 'fa-circle-exclamation'); return; }
    S.audit = r.data.logs || [];
    renderAudit();
}

function renderAudit() {
    const q = S.auditSearch.toLowerCase();
    const list = S.audit.filter(l => !q || [l.admin_phone, l.target_phone, l.action_type].some(v => String(v || '').toLowerCase().includes(q)));
    $('#audit-body').innerHTML = list.length ? list.map(l => {
        let diff = '';
        try {
            const before = JSON.parse(l.details_before || '{}') || {}, after = JSON.parse(l.details_after || '{}') || {};
            for (const k in after) {
                if (after[k] !== before[k]) diff += `<div><span class="k">${esc(k)}:</span> <del>${esc(before[k] ?? '∅')}</del> → <ins>${esc(after[k] ?? '∅')}</ins></div>`;
            }
        } catch (e) { diff = '<span class="muted">לא ניתן לפענח</span>'; }
        return `<tr>
            <td class="muted nowrap">${esc(fmtDate(l.timestamp))}</td>
            <td class="ltr mono" style="text-align:right; color:var(--bad);">${esc(l.admin_phone)}</td>
            <td><span class="badge accent">${esc(AUDIT_LABELS[l.action_type] || l.action_type)}</span></td>
            <td class="ltr mono" style="text-align:right;">${esc(l.target_phone)}</td>
            <td><div class="diff">${diff || '<span class="muted">ללא שינוי בשדות</span>'}</div></td>
        </tr>`;
    }).join('') : emptyRow(5, 'אין פעולות מתועדות', 'fa-clipboard');
}

// ---------- Command palette ----------

let cmdItems = [], cmdSel = 0;

function openCmdk() {
    $('#cmdk').classList.add('open');
    $('#dialog-scrim').classList.add('open');
    $('#cmdk-input').value = '';
    renderCmdk();
    setTimeout(() => $('#cmdk-input').focus(), 30);
}
function closeCmdk() {
    $('#cmdk').classList.remove('open');
    if (!$('#dialog').classList.contains('open')) $('#dialog-scrim').classList.remove('open');
}

function renderCmdk() {
    const q = $('#cmdk-input').value.trim().toLowerCase();
    const views = availableViews().map(v => ({ group: 'מסכים', icon: v.icon, title: v.label, sub: `G ואז ${v.key.toUpperCase()}`, run: () => go(v.id) }));
    const acts = S.mode === 'admin' ? [
        { group: 'פעולות', icon: 'fa-plus', title: 'קמפיין חדש', run: () => { go('ads'); openAd(); } },
        { group: 'פעולות', icon: 'fa-comment-medical', title: 'שיחה חדשה', run: () => { go('chat'); newChat(); } },
        { group: 'פעולות', icon: 'fa-envelope', title: 'דיוור חדש במייל', run: () => openMail() },
        { group: 'פעולות', icon: 'fa-user-plus', title: 'פתיחת חשבון אתר', run: () => openCreate('') },
        { group: 'פעולות', icon: 'fa-circle-half-stroke', title: 'החלפת ערכת צבעים', run: toggleTheme },
        { group: 'פעולות', icon: 'fa-arrow-right-from-bracket', title: 'התנתקות', run: logout },
    ] : [
        { group: 'פעולות', icon: 'fa-circle-half-stroke', title: 'החלפת ערכת צבעים', run: toggleTheme },
        { group: 'פעולות', icon: 'fa-arrow-right-from-bracket', title: 'התנתקות', run: logout },
    ];
    const match = it => !q || it.title.toLowerCase().includes(q) || String(it.sub || '').toLowerCase().includes(q);
    let items = [...views, ...acts].filter(match);
    if (q && S.mode === 'admin') {
        const users = S.users.filter(u => String(u.phone).includes(q) || String(u.name || '').toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q)).slice(0, 8);
        items = items.concat(users.map(u => ({
            group: 'משתמשים', icon: 'fa-user', title: u.name || u.phone, sub: `${u.phone}${u.email ? ' · ' + u.email : ''}`,
            run: () => { if (S.view !== 'users') go('users'); u.hasWebAccount ? openUser(u.phone) : openCreate(u.phone); },
        })));
    }
    cmdItems = items;
    cmdSel = 0;
    let html = '', group = '';
    items.forEach((it, i) => {
        if (it.group !== group) { group = it.group; html += `<div class="cmdk-group">${esc(group)}</div>`; }
        html += `<div class="cmdk-item ${i === 0 ? 'sel' : ''}" data-i="${i}"><i class="fa-solid ${it.icon} lead"></i><div class="t">${esc(it.title)}${it.sub ? `<small class="ltr" style="text-align:right;">${esc(it.sub)}</small>` : ''}</div></div>`;
    });
    $('#cmdk-list').innerHTML = html || '<div class="empty" style="padding:24px;">לא נמצאו תוצאות</div>';
}

function moveCmdk(d) {
    if (!cmdItems.length) return;
    cmdSel = (cmdSel + d + cmdItems.length) % cmdItems.length;
    $$('.cmdk-item').forEach(el => el.classList.toggle('sel', +el.dataset.i === cmdSel));
    $(`.cmdk-item[data-i="${cmdSel}"]`)?.scrollIntoView({ block: 'nearest' });
}

function runCmdk(i) {
    const it = cmdItems[i];
    if (!it) return;
    closeCmdk();
    it.run();
}

// ---------- Shortcuts help ----------

function openHelp() {
    const k = (...keys) => `<span class="keys">${keys.map(x => `<span class="kbd">${esc(x)}</span>`).join('')}</span>`;
    const rows = [
        ['חיפוש מהיר ופקודות', k('Ctrl', 'K')],
        ['חיפוש בתוך המסך', k('/')],
        ['קיצורי מקלדת', k('?')],
        ['סגירת חלון / פאנל', k('Esc')],
        ...availableViews().map(v => [`מעבר ל${v.label}`, k('G', v.key.toUpperCase())]),
        ['הרצת שאילתת SQL', k('Ctrl', 'Enter')],
        ['שליחת הודעה בצ׳אט', k('Enter')],
        ['שורה חדשה בהודעה', k('Shift', 'Enter')],
    ];
    $('#help-grid').innerHTML = rows.map(([l, keys]) => `<div><span>${esc(l)}</span>${keys}</div>`).join('');
    closeCmdk();
    $('#dialog-scrim').classList.add('open');
    $('#help').classList.add('open');
}

function closeHelp() {
    if (!$('#help').classList.contains('open')) return;
    $('#help').classList.remove('open');
    if (!$('#dialog').classList.contains('open')) $('#dialog-scrim').classList.remove('open');
}

// ---------- Polling ----------

let pollTimers = [];

function startPolling() {
    stopPolling();
    pollTimers.push(setInterval(updateLive, 15000));
    if (S.mode !== 'admin') return;
    pollTimers.push(setInterval(() => reportPresence(true), 30000));
    pollTimers.push(setInterval(() => {
        if (document.hidden) return;
        if (S.view === 'chat' && S.activePhone) refreshThread();
    }, 2500));
    pollTimers.push(setInterval(() => {
        if (document.hidden || S.view !== 'activity' || (S.actEvents || []).length > 100) return;
        loadOnline(true).then(d => { if (d) renderActivityTop(); });
        api('/admin/activity/feed', { action: S.actFilter || undefined, phone: S.actPhone || undefined, limit: 100 }).then(r => {
            if (r.ok && S.view === 'activity' && (S.actEvents || []).length <= 100) { S.actEvents = r.data.events || []; S.actHasMore = S.actEvents.length === 100; renderActivityFeed(); }
        });
    }, 20000));
    let tick = 0;
    pollTimers.push(setInterval(() => {
        if (document.hidden) return;
        tick++;
        // Conversation list: every 6s while in the inbox, every 30s elsewhere (keeps the unread badge fresh).
        if (S.view !== 'chat' && tick % 5 !== 0) return;
        loadConvs(true).then(() => { if (S.view === 'overview') renderOverview(); });
    }, 6000));
}

function stopPolling() { pollTimers.forEach(clearInterval); pollTimers = []; }

// ---------- Events ----------

const ACTIONS = {
    'go': el => go(el.dataset.view),
    'logout': async () => { if (await confirmDanger('התנתקות', 'לצאת ממרכז השליטה?', 'התנתקות')) logout(); },
    'toggle-theme': toggleTheme,
    'toggle-sidebar': () => { const a = $('#app'); a.classList.toggle('collapsed'); setItem('controlSidebar', a.classList.contains('collapsed') ? 'collapsed' : ''); },
    'toggle-mobile-nav': () => $('#app').classList.toggle('mobile-nav'),
    'open-cmdk': openCmdk,
    'staff-login': () => tryStaff(false),
    'close-drawer': requestCloseDrawers,
    'toggle-density': () => { const on = document.body.classList.toggle('dense'); setItem('controlDensity', on ? 'dense' : ''); },
    'open-help': () => openHelp(),
    'close-help': () => closeHelp(),
    'toggle-notif': () => { if (togglePopover('notif-panel')) renderNotifs(); },

    'refresh-overview': () => loadOverview(),
    'refresh-users': () => loadUsers(),
    'users-filter': el => { S.usersFilter = el.dataset.filter; S.usersPage = 0; renderUsers(); },
    'users-page': el => { S.usersPage += +el.dataset.dir; renderUsers(); $('#content').scrollTop = 0; },
    'quick-toggle': (el, ev) => { ev.stopPropagation(); quickToggle(el); },
    'open-user': el => openUser(el.dataset.phone),
    'create-user': (el, ev) => { ev.stopPropagation(); openCreate(el.dataset.phone); },
    'export-users': exportUsers,
    'disconnect': el => disconnect(el.dataset.token),
    'disconnect-all': () => disconnect(''),
    'delete-user': deleteUser,
    'ud-chat': async () => { const p = S.editingUser; await requestCloseDrawers(); if (!$('#user-drawer').classList.contains('open')) openConv(p); },
    'bulk-set': el => bulkSet(el.dataset.value === '1'),
    'bulk-export': bulkExport,
    'bulk-clear': () => { S.selected.clear(); renderUsers(); },

    'refresh-security': () => loadSecurity(),
    'logs-filter': el => { S.logsLevel = el.dataset.filter; renderSecurity(); },
    'unblock': unblock,
    'quick-block': quickBlock,
    'clean-logs': cleanLogs,

    'open-conv': el => { closePopovers(); openConv(el.dataset.phone); },
    'attach-file': () => $('#composer-file').click(),
    'attach-cancel': () => setAttach(null),
    'chat-filter': el => { S.chatFilter = el.dataset.filter; renderConvs(); },
    'toggle-qr': () => { if (togglePopover('qr-panel')) renderQuickReplies(); },
    'qr-use': el => {
        const t = quickReplies()[+el.dataset.i]; if (!t) return;
        const input = $('#composer-input');
        input.value = input.value.trim() ? `${input.value.trim()} ${t}` : t;
        closePopovers(); input.focus(); input.dispatchEvent(new Event('input'));
    },
    'qr-del': (el, ev) => { ev.stopPropagation(); const l = quickReplies(); l.splice(+el.dataset.i, 1); setItem('controlQuickReplies', JSON.stringify(l)); renderQuickReplies(); },
    'qr-add': () => {
        const t = $('#composer-input').value.trim();
        if (!t) { toast('כתוב קודם את הטקסט בתיבת ההודעה', 'info'); return; }
        const l = quickReplies(); if (!l.includes(t)) l.unshift(t);
        setItem('controlQuickReplies', JSON.stringify(l.slice(0, 30))); renderQuickReplies(); toast('התשובה נשמרה');
    },
    'close-thread': closeThread,
    'thread-profile': () => {
        closePopovers();
        const u = S.users.find(x => x.phone === S.activePhone);
        if (u && u.hasWebAccount) openUser(u.phone);
        else if (u) openCreate(u.phone);
        else { loadUsers(true).then(() => { const x = S.users.find(y => y.phone === S.activePhone); x && x.hasWebAccount ? openUser(x.phone) : toast('למנוי זה אין חשבון אתר', 'info'); }); }
    },
    'delete-msg': el => deleteMsg(el.dataset.id),
    'file-limits': el => editFileLimits(el.dataset.id),
    'purge-msg': el => purgeMsg(el.dataset.id),
    'restore-msg': el => restoreMsg(el.dataset.id),
    'pick-msg': el => pickMsg(el.dataset.id),
    'select-mode': () => { closePopovers(); setSelectMode(!S.selectMode); },
    'select-cancel': () => setSelectMode(false),
    'select-soft': () => deleteSelected(false),
    'select-hard': () => deleteSelected(true),
    'thread-purge-deleted': () => purgeThread('deleted'),
    'thread-purge-all': () => purgeThread('all'),
    'reply-msg': el => startReply(el.dataset.id),
    'edit-msg': el => editMsg(el.dataset.id),
    'jump-msg': el => jumpToMessage(el.dataset.id),
    'cancel-reply': () => { S.replyTo = null; renderReplyBar(); },
    'open-hit': el => openConv(el.dataset.phone, el.dataset.id),
    'thread-pin': () => updateThreadMeta({ pinned: !(S.thread && S.thread.thread.pinned) }, S.thread && S.thread.thread.pinned ? 'ההצמדה בוטלה' : 'השיחה הוצמדה'),
    'thread-archive': () => { closePopovers(); const on = !(S.thread && S.thread.thread.archived); updateThreadMeta({ archived: on }, on ? 'השיחה הועברה לארכיון' : 'השיחה הוחזרה מהארכיון'); },
    'thread-note': () => { closePopovers(); editThreadNote(); },
    'thread-unread': () => { closePopovers(); markThreadUnread(); },
    'thread-activity': () => { closePopovers(); const p = S.activePhone; openUser(p).then(() => switchUserTab('activity')); switchUserTab('activity'); },
    'toggle-thread-menu': () => togglePopover('thread-menu'),
    'chat-settings': () => go('settings'),
    'sa-save': () => { const p = $('#sa-phone').value.replace(/[^\d]/g, ''); if (p.length < 9) { toast('מספר טלפון לא תקין', 'bad'); return; } setSuperAdmin(p); },
    'sa-remove': () => setSuperAdmin(''),
    'sess-revoke': el => revokeSessions(el.dataset.id),
    'sess-revoke-others': () => revokeSessions(''),
    'chat-test-email': chatTestEmail,

    'refresh-activity': () => loadActivity(),
    'act-filter': el => { S.actFilter = el.dataset.filter; loadActivity(); },
    'act-more': () => loadActivity(true),
    'open-user-activity': el => { const p = el.dataset.phone; openUser(p); switchUserTab('activity'); },
    'new-chat': newChat,
    'custom-email': () => { const p = S.view === 'chat' && S.activePhone; openMail(p ? { audience: { mode: 'users', phones: [p] }, tab: 'content' } : {}); },

    'refresh-ads': loadAds,
    'ads-filter': el => { S.adsFilter = el.dataset.filter; renderAds(); },
    'ads-designs': openDesigns,
    'ad-toggle': el => { const ad = S.ads.find(a => String(a.id) === el.dataset.id); adAction(el.dataset.id, ad && ad.is_paused ? 'resume' : 'pause', ad && ad.is_paused ? 'הקמפיין חזר לפעול' : 'הקמפיין הושהה'); },
    'ad-dup': el => adAction(el.dataset.id, 'duplicate', 'נוצר עותק (מושהה)').then(d => d && d.id && openAd(d.id)),
    'ad-reset': async el => { if (!await confirmDanger('איפוס נתונים', 'כל הצפיות, ההקלקות והסגירות של הקמפיין יימחקו. הקמפיין עצמו נשאר.', 'איפוס')) return; await adAction(el.dataset.id, 'reset-stats', 'הנתונים אופסו'); adLogs(el.dataset.id); },
    'ad-csv': adCsv,
    'ad-viewers': el => { S.adViewerFilter = el.dataset.filter; renderAdInsights(); },
    'ad-preset': el => { const p = AD_PRESETS[Number(el.dataset.i)]; applyAdDesign(p.bgColor, p.textColor, { ...p.design, badge: $('#ad-badge').value, icon: p.design.icon !== undefined ? p.design.icon : S.adIcon }); updateAdPreview(); },
    'ad-my-design': el => { const p = (S.adDesigns || []).find(x => String(x.id) === el.dataset.id); if (p) { applyAdDesign(p.bgColor, p.textColor, p.design); updateAdPreview(); } },
    'ad-save-design': saveAdDesign,
    'ad-icon': el => { S.adIcon = el.dataset.icon; renderAdIcons(); updateAdPreview(); },
    'design-delete': el => designAction(el.dataset.id, 'delete'),
    'design-rename': el => designAction(el.dataset.id, 'rename'),

    'refresh-mail': loadMail,
    'new-mail': () => openMail(),
    'mail-filter': el => { S.mailFilter = el.dataset.filter; renderMail(); },
    'edit-mail': el => editMail(el.dataset.id),
    'dup-mail': el => { closeDrawers(); editMail(el.dataset.id, true); },
    'delete-mail': el => deleteMail(el.dataset.id),
    'cancel-mail': el => cancelMail(el.dataset.id),
    'mail-report': el => mailReport(el.dataset.id),
    'mr-filter': el => { S.mailRepFilter = el.dataset.filter; renderMailReport(); },
    'mail-csv': mailCsv,
    'mc-theme': el => { S.mc.theme = el.dataset.theme; renderMcSegs(); mailPreview(); },
    'mc-pick': el => { const p = el.dataset.phone; S.mc.picked.has(p) ? S.mc.picked.delete(p) : S.mc.picked.set(p, mailPerson(p)); renderPicked(); renderMailSearch(); mailAudience(); },
    'mc-unpick': el => { S.mc.picked.delete(el.dataset.phone); renderPicked(); mailAudience(); },
    'mc-fmt': el => mailFormat(el.dataset.fmt),
    'mc-test': mailTest,
    'mc-draft': () => mailSubmit('draft'),
    'mc-send': () => mailSubmit('send'),

    'refresh-voice': () => { S.voicePhone = {}; loadVoice(); },
    'voice-page': el => loadVoice(Number(el.dataset.page)),
    'voice-open': el => openVoice(el.dataset.id),
    'va-filter': el => { S.vaFilter = el.dataset.filter; renderVoiceAudience(); },
    'va-csv': voiceCsv,
    'new-ad': () => { if (S.view !== 'ads') go('ads'); openAd(); },
    'edit-ad': el => openAd(el.dataset.id),
    'ad-logs': el => adLogs(el.dataset.id),
    'delete-ad': el => deleteAd(el.dataset.id),

    'refresh-names': loadNames,
    'names-filter': el => { S.namesFilter = el.dataset.filter; renderNames(); },
    'save-name': el => saveName(el.dataset.phone),
    'lock-one': el => openLockDrawer([el.dataset.phone]),
    'lock-selected': () => openLockDrawer([...S.namesSel]),
    'unlock-selected': () => removeLocks([...S.namesSel]),
    'lock-remove': () => removeLocks(S.lockPhones),
    'names-clear': () => { S.namesSel.clear(); renderNames(); },
    'enforce-locks': el => enforceLocksNow(el),

    'refresh-tables': loadTables,
    'pick-table': el => pickTable(el.dataset.table),
    'run-sql': runSql,
    'sql-history': el => { $('#sql-editor').value = sqlHistory()[+el.dataset.i] || ''; $('#sql-editor').focus(); },
    'export-sql': exportSql,

    'refresh-audit': loadAudit,
    'refresh-master': () => loadMaster(),
    'master-more': () => loadMaster(true),
    'master-end': el => endMaster(el.dataset.handle),
    'master-end-all': endAllMaster,
};

function bindEvents() {
    document.addEventListener('click', ev => {
        if (!ev.target.closest('.pop-wrap')) closePopovers();
        if (ev.target.closest('.col-check')) return;
        const el = ev.target.closest('[data-action]');
        if (!el || el.disabled) return;
        const fn = ACTIONS[el.dataset.action];
        if (fn) { ev.preventDefault(); fn(el, ev); }
    });

    $('#login-form').addEventListener('submit', login);
    $('#ud-form').addEventListener('submit', saveUser);
    $('#create-form').addEventListener('submit', createUser);
    $('#block-form').addEventListener('submit', submitBlock);
    $('#composer').addEventListener('submit', sendMsg);
    $('#ad-form').addEventListener('submit', saveAd);
    $('#v2-form').addEventListener('submit', saveV2);

    $('#scrim').addEventListener('click', requestCloseDrawers);
    $('#ud-form').addEventListener('input', () => { $('#ud-dirty').hidden = !userDirty(); });
    $('#ud-form').addEventListener('change', () => { $('#ud-dirty').hidden = !userDirty(); });

    $('#users-body').addEventListener('change', e => {
        if (!e.target.classList.contains('user-check')) return;
        const p = e.target.dataset.phone;
        e.target.checked ? S.selected.add(p) : S.selected.delete(p);
        renderUsers();
    });
    $('#users-check-all').addEventListener('change', e => {
        (S.usersPageList || []).forEach(p => e.target.checked ? S.selected.add(p) : S.selected.delete(p));
        renderUsers();
    });

    const nd = $('#notif-desktop');
    nd.checked = getItem('controlNotify') === '1';
    nd.addEventListener('change', async () => {
        if (nd.checked && 'Notification' in window && Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch (e) {}
        }
        setItem('controlNotify', nd.checked ? '1' : '');
        if (nd.checked) { playChime(); toast('התראות הופעלו: צליל, והתראת דפדפן כשהחלון ברקע'); }
    });
    $('#dialog-scrim').addEventListener('click', () => { closeCmdk(); closeHelp(); closeDialog(null); });

    $('#ud-tabs').addEventListener('click', ev => { const b = ev.target.closest('.drawer-tab'); if (b) switchUserTab(b.dataset.tab); });
    $('#ud-is-admin').addEventListener('change', e => { $('#ud-perms').hidden = !e.target.checked; });
    $('#cr-is-admin').addEventListener('change', e => { $('#cr-perms').hidden = !e.target.checked; });

    $$('#view-users th[data-sort]').forEach(th => th.addEventListener('click', () => {
        const k = th.dataset.sort;
        S.usersSort = S.usersSort.key === k ? { key: k, dir: -S.usersSort.dir } : { key: k, dir: 1 };
        renderUsers();
    }));

    $('#users-search').addEventListener('input', debounce(e => { S.usersSearch = e.target.value.trim(); S.usersPage = 0; renderUsers(); }, 150));
    $('#logs-search').addEventListener('input', debounce(e => { S.logsSearch = e.target.value.trim(); renderSecurity(); }, 150));
    $('#chat-search').addEventListener('input', debounce(e => { S.chatSearch = e.target.value.trim(); renderConvs(); searchMessages(S.chatSearch); }, 120));
    $('#act-phone').addEventListener('input', debounce(e => { S.actPhone = e.target.value.replace(/[^\d+]/g, ''); loadActivity(); }, 400));
    $('#chat-settings-form').addEventListener('submit', saveChatSettings);
    $('#master-form').addEventListener('submit', saveMaster);
    $('#master-form').addEventListener('input', () => { S.masterFormDirty = true; });
    $('#master-pw-form').addEventListener('submit', saveMasterPassword);
    $('#master-search').addEventListener('input', debounce(e => { S.masterPhone = e.target.value.replace(/\D/g, ''); loadMaster(); }, 350));
    $('#pw-form').addEventListener('submit', changeAdminPassword);
    $$('[data-setting]').forEach(i => i.addEventListener('change', () => savePrivacy(i)));
    document.addEventListener('visibilitychange', () => reportPresence(true));
    window.addEventListener('pagehide', presenceOffline);
    $('#lock-form').addEventListener('submit', saveLock);
    $('#lock-presets').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) setLockPreset(Number(c.dataset.preset)); });
    $('#lock-end').addEventListener('input', () => $$('#lock-presets .chip').forEach(c => c.classList.remove('active')));
    $('#lock-custom-name').addEventListener('focus', () => { $('#lock-form input[name="lock-name"][value="custom"]').checked = true; });
    $('#names-body').addEventListener('change', e => {
        if (!e.target.classList.contains('name-check')) return;
        const p = e.target.dataset.phone;
        e.target.checked ? S.namesSel.add(p) : S.namesSel.delete(p);
        renderNames();
    });
    $('#names-check-all').addEventListener('change', e => {
        (S.namesFiltered || []).forEach(p => e.target.checked ? S.namesSel.add(p) : S.namesSel.delete(p));
        renderNames();
    });
    $('#names-search').addEventListener('input', debounce(e => { S.namesSearch = e.target.value.trim(); renderNames(); }, 150));
    $('#audit-search').addEventListener('input', debounce(e => { S.auditSearch = e.target.value.trim(); renderAudit(); }, 150));

    $('#names-body').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.classList.contains('name-input')) { e.preventDefault(); saveName(e.target.dataset.phone); }
    });

    const composer = $('#composer-input');
    composer.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
    composer.addEventListener('input', () => {
        composer.style.height = 'auto'; composer.style.height = Math.min(160, composer.scrollHeight) + 'px';
        sendTyping(!!composer.value.trim());
    });
    composer.addEventListener('blur', () => sendTyping(false));
    composer.addEventListener('paste', e => { const f = [...((e.clipboardData && e.clipboardData.files) || [])][0]; if (f) { e.preventDefault(); setAttach(f); } });
    $('#composer-file').addEventListener('change', e => setAttach(e.target.files && e.target.files[0]));
    $('#attach-views').addEventListener('change', syncAttachOpts);
    $('#attach-expiry').addEventListener('change', syncAttachOpts);
    $('#thread-msgs').addEventListener('click', e => {
        const fo = !S.selectMode && e.target.closest('[data-file-open]');
        if (!fo) return;
        const m = (S.threadMsgs || []).find(x => String(x.id) === fo.dataset.fileOpen);
        if (m) F.open(m.id, m.file);
    });
    const thread = $('#thread');
    thread.addEventListener('dragover', e => { if (S.activePhone && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); thread.classList.add('drag'); } });
    thread.addEventListener('dragleave', e => { if (!thread.contains(e.relatedTarget)) thread.classList.remove('drag'); });
    thread.addEventListener('drop', e => { thread.classList.remove('drag'); const f = S.activePhone && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) { e.preventDefault(); setAttach(f); } });

    $('#ad-form').addEventListener('input', debounce(updateAdPreview, 120));
    $('#ad-form').addEventListener('change', e => { if (e.target.name === 'ad-aud' || e.target.id === 'ad-phones') renderAdAudience(); updateAdPreview(); });
    $('#ad-phones').addEventListener('input', renderAdAudience);
    $('#ad-tabs').addEventListener('click', e => { const b = e.target.closest('.drawer-tab'); if (b) switchAdTab(b.dataset.tab); });
    $('#ad-places').addEventListener('click', e => { const b = e.target.closest('.place-opt'); if (b) { S.adPlace = b.dataset.place; renderAdPlaces(); updateAdPreview(); } });
    ['ad-size', 'ad-align', 'ad-imgpos'].forEach(id => $(`#${id}`).addEventListener('click', e => { const b = e.target.closest('button'); if (b) { setSeg(id, b.dataset.v); updateAdPreview(); } }));
    $('#ad-device-pv').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.adPvDevice = b.dataset.device; $$('#ad-device-pv button').forEach(x => x.classList.toggle('active', x === b)); updateAdPreview(); });
    $('#ad-dur').addEventListener('click', e => {
        const c = e.target.closest('.chip'); if (!c) return;
        const days = Number(c.dataset.days);
        if (!days) { $('#ad-expires').value = ''; return; }
        const base = $('#ad-starts').value ? new Date($('#ad-starts').value) : new Date();
        const end = new Date(base.getTime() + days * 86400000);
        const pad = n => String(n).padStart(2, '0');
        $('#ad-expires').value = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    });

    // דיוור
    $('#mc-tabs').addEventListener('click', e => { const b = e.target.closest('.drawer-tab'); if (b) switchMailTab(b.dataset.tab); });
    $('#mail-form').addEventListener('submit', e => e.preventDefault());
    $('#mail-form').addEventListener('input', e => {
        if (e.target.id === 'mc-search') { renderMailSearch(); return; }
        if (['mc-emails', 'mc-days'].includes(e.target.id)) mailAudience();
        if (S.mc) { mailPreview(); renderMailSummary(); }
    });
    $('#mail-form').addEventListener('change', e => {
        if (['mc-mode', 'mc-when'].includes(e.target.name) || ['mc-segment', 'mc-service'].includes(e.target.id)) { renderMcMode(); if (e.target.name !== 'mc-when') mailAudience(); renderMailSummary(); }
        if (['mc-accent-on', 'mc-accent'].includes(e.target.id)) mailPreview();
    });
    $('#mc-bodymode').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.mc.bodyMode = b.dataset.mode; renderMcSegs(); mailPreview(); } });
    $('#mc-align').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.mc.align = b.dataset.align; renderMcSegs(); mailPreview(); } });
    $('#mc-layouts').addEventListener('click', e => { const b = e.target.closest('.layout-opt'); if (b) { S.mc.layout = b.dataset.layout; renderMcSegs(); mailPreview(); } });
    $('#mc-device').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('#mc-device button').forEach(x => x.classList.toggle('active', x === b)); $('#mc-frame-wrap').classList.toggle('mobile', b.dataset.device === 'mobile'); });

    $('#sql-editor').addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runSql(); }
        if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
    });
    $('#sql-results').addEventListener('focusout', e => { if (e.target.classList?.contains('editable')) saveSqlCell(e.target); });
    $('#sql-results').addEventListener('keydown', e => {
        if (!e.target.classList?.contains('editable')) return;
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); }
        if (e.key === 'Escape') {
            const row = S.sqlRows[+e.target.dataset.row]; const v = row?.[e.target.dataset.col];
            e.target.innerHTML = v === null ? '<span class="null">NULL</span>' : esc(v);
            e.target.blur();
        }
    });

    $('#cmdk-input').addEventListener('input', renderCmdk);
    $('#cmdk-input').addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); moveCmdk(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveCmdk(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); runCmdk(cmdSel); }
    });
    $('#cmdk-list').addEventListener('click', e => { const it = e.target.closest('.cmdk-item'); if (it) runCmdk(+it.dataset.i); });

    let gPending = false;
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if ($('#dialog').classList.contains('open')) closeDialog(null);
            else if ($('#help').classList.contains('open')) closeHelp();
            else if ($('#cmdk').classList.contains('open')) closeCmdk();
            else if ($$('.popover').some(p => !p.hidden)) closePopovers();
            else requestCloseDrawers();
            return;
        }
        if ($('#app').hidden) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(); return; }
        if ($('#dialog').classList.contains('open') && e.key === 'Enter' && document.activeElement === $('#dialog-input')) {
            e.preventDefault(); $('#dialog-actions').lastElementChild?.click(); return;
        }
        const t = e.target;
        if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === '?') { e.preventDefault(); openHelp(); return; }
        if (e.key === '/') {
            const s = $(`#view-${S.view} .search input`);
            if (s) { e.preventDefault(); s.focus(); }
            return;
        }
        if (gPending) {
            gPending = false;
            const v = availableViews().find(x => x.key === e.key.toLowerCase());
            if (v) { e.preventDefault(); go(v.id); }
            return;
        }
        if (e.key.toLowerCase() === 'g') { gPending = true; setTimeout(() => { gPending = false; }, 900); }
    });

    window.addEventListener('hashchange', () => {
        if ($('#app').hidden) return;
        const { view, arg } = parseHash();
        if (view && view !== S.view) go(view);
        if (view === 'chat' && arg && arg !== S.activePhone) openConv(arg);
    });
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => document.addEventListener(t, () => { S.lastInteraction = Date.now(); }, { passive: true, capture: true }));
    document.addEventListener('mousemove', () => { S.lastInteraction = Date.now(); }, { passive: true });
    window.addEventListener('resize', debounce(() => { if (S.view === 'overview') renderChart(); }, 200));
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (S.view === 'overview') renderChart(); });
}

document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    boot();
});

})();
