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
    chatFilter: 'all',
    convsReady: false,
    lastSync: 0,
    offline: false,
};

const VIEWS = [
    { id: 'overview', label: 'סקירה', icon: 'fa-gauge-high', group: 'ראשי', key: 'o' },
    { id: 'users', label: 'משתמשים', icon: 'fa-users', group: 'ראשי', key: 'u' },
    { id: 'chat', label: 'תיבת תמיכה', icon: 'fa-comments', group: 'ראשי', key: 'c' },
    { id: 'security', label: 'אבטחה', icon: 'fa-shield-halved', group: 'ראשי', key: 's' },
    { id: 'ads', label: 'קמפיינים', icon: 'fa-bullhorn', group: 'תוכן', key: 'a' },
    { id: 'names', label: 'ספר טלפונים', icon: 'fa-address-book', group: 'תוכן', key: 'n' },
    { id: 'sql', label: 'מסוף נתונים', icon: 'fa-database', group: 'מערכת', key: 'd' },
    { id: 'audit', label: 'יומן צוות', icon: 'fa-clipboard-list', group: 'מערכת', key: 'l' },
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

function dialog({ title, text = '', icon = 'warn', buttons, input = null }) {
    return new Promise(resolve => {
        dialogResolve = resolve;
        $('#dialog-title').textContent = title;
        $('#dialog-text').textContent = text;
        const ic = $('#dialog-icon');
        ic.className = 'd-icon' + (icon === 'info' ? ' info' : '');
        ic.innerHTML = icon === 'info' ? '<i class="fa-solid fa-circle-info"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>';
        const inp = $('#dialog-input');
        inp.hidden = !input;
        inp.value = '';
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
                closeDialog(b.value ? { value: b.value, input: inp.value.trim() } : null);
            });
            actions.appendChild(btn);
        });
        $('#dialog-scrim').classList.add('open');
        $('#dialog').classList.add('open');
        setTimeout(() => (input ? inp : actions.firstElementChild)?.focus(), 50);
    });
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
    const r = await api('/admin/login', { username: $('#login-user').value.trim(), password: $('#login-pass').value }, 'none');
    busy(btn, false);
    if (!r.ok || !r.data.adminToken) {
        showLogin(`<i class="fa-solid fa-circle-exclamation"></i> ${esc(r.error || 'פרטי התחברות שגויים')}`);
        return;
    }
    S.adminToken = r.data.adminToken;
    if ($('#login-remember').checked) setItem('adminToken', S.adminToken);
    else { setItem('adminToken', S.adminToken, 'session'); delItem('adminToken'); }
    $('#login-pass').value = '';
    await enterAdmin();
    toast('ברוך הבא למרכז השליטה');
}

async function enterAdmin() {
    S.mode = 'admin';
    S.me = { name: 'מנהל ראשי' };
    loadPermList();
    // A staff user token on this device unlocks the phonebook, which runs on user tokens.
    if (S.userToken) {
        const r = await api('/user', {}, 'user');
        if (r.ok && r.data.user && r.data.user.isAdmin) S.canNames = true;
    }
    startApp();
}

async function tryStaff(silent = false) {
    S.userToken = getItem('userToken');
    if (!S.userToken) {
        if (!silent) showLogin('<i class="fa-solid fa-circle-info"></i> לא נמצא חיבור פעיל באתר. <a href="/salamon">התחבר קודם עם החשבון שלך</a> וחזור לכאן.');
        return false;
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
    if (S.mode === 'admin') {
        delItem('adminToken'); delItem('adminToken', 'session');
    }
    S.adminToken = null;
    S.mode = null;
    S.loaded = {};
    closeDrawers();
    location.hash = '';
    showLogin();
}

function availableViews() {
    if (S.mode === 'admin') return VIEWS.filter(v => v.id !== 'names' || S.canNames);
    return VIEWS.filter(v => v.id === 'names' && S.canNames);
}

function startApp() {
    $('#boot').hidden = true;
    $('#login').hidden = true;
    $('#app').hidden = false;

    $('#me-name').textContent = S.me.name || 'חבר צוות';
    $('#me-role').textContent = S.mode === 'admin' ? 'מנהל ראשי' : 'חבר צוות';
    $('#me-avatar').outerHTML = S.mode === 'admin'
        ? '<div class="avatar" id="me-avatar"><i class="fa-solid fa-user-shield"></i></div>'
        : avatarHtml(S.me.name, S.me.profilePictureUrl).replace('class="avatar', 'id="me-avatar" class="avatar');
    const h = new Date().getHours();
    $('#greet').textContent = (h < 12 ? 'בוקר טוב' : h < 18 ? 'צהריים טובים' : 'ערב טוב') + ' 👋';

    renderNav();
    const fromHash = location.hash.replace('#', '');
    const views = availableViews();
    go(views.some(v => v.id === fromHash) ? fromHash : views[0].id);
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

function go(id) {
    const v = availableViews().find(x => x.id === id);
    if (!v) return;
    S.view = id;
    $$('.view').forEach(el => el.classList.toggle('active', el.id === `view-${id}`));
    $$('#nav .nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === id));
    $('#crumb').textContent = v.label;
    updateTitle();
    if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
    $('#app').classList.remove('mobile-nav');
    $('#content').scrollTop = 0;
    if (!S.loaded[id]) { S.loaded[id] = true; loadView(id); }
}

function loadView(id) {
    switch (id) {
        case 'overview': return loadOverview();
        case 'users': return loadUsers();
        case 'security': return loadSecurity();
        case 'chat': return loadConvs();
        case 'ads': return loadAds();
        case 'names': return loadNames();
        case 'sql': return loadTables();
        case 'audit': return loadAudit();
    }
}

// ---------- Overview ----------

async function loadOverview() {
    $('#ov-kpis').innerHTML = Array.from({ length: 4 }, () => '<div class="card kpi"><div class="skeleton" style="width:50%"></div><div class="skeleton" style="height:28px;width:40%"></div><div class="skeleton" style="width:70%"></div></div>').join('');
    $('#ov-security').innerHTML = '<li><div class="skeleton" style="width:80%"></div></li>'.repeat(4);
    $('#ov-chats').innerHTML = '<li><div class="skeleton" style="width:70%"></div></li>'.repeat(3);
    await Promise.all([loadUsers(true), loadSecurity(true), loadConvs(true)]);
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
            <td><div class="cell-user">${avatarHtml(u.name, u.profilePictureUrl)}<div><b>${esc(u.name || 'ללא שם')}${u.isAdmin ? ' <span class="badge bad" style="height:20px;"><i class="fa-solid fa-user-shield"></i> צוות</span>' : ''}</b></div></div></td>
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

function renderConvs() {
    const q = S.chatSearch.toLowerCase();
    const unread = S.convs.filter(c => Number(c.unread_count) > 0).length;
    $('#chat-chips').innerHTML = `
        <button class="chip ${S.chatFilter === 'all' ? 'active' : ''}" data-action="chat-filter" data-filter="all">הכל <span class="n">${num(S.convs.length)}</span></button>
        <button class="chip ${S.chatFilter === 'unread' ? 'active' : ''}" data-action="chat-filter" data-filter="unread">לא נקראו <span class="n">${num(unread)}</span></button>`;
    const list = S.convs.filter(c => (S.chatFilter !== 'unread' || Number(c.unread_count) > 0 || c.user_phone === S.activePhone) &&
        (String(c.user_phone || '').includes(q) || String(c.user_name || '').toLowerCase().includes(q)));
    $('#conv-list').innerHTML = list.length ? list.map(c => `
        <div class="conv ${c.user_phone === S.activePhone ? 'active' : ''}" data-action="open-conv" data-phone="${esc(c.user_phone)}">
            ${avatarHtml(c.user_name)}
            <div class="c-main"><div class="c-name">${esc(c.user_name || c.user_phone)}</div><div class="c-sub"><span class="ltr">${esc(c.user_phone)}</span> · ${esc(relTime(c.last_message_time))}</div></div>
            ${Number(c.unread_count) > 0 ? `<span class="c-badge">${num(c.unread_count)}</span>` : ''}
        </div>`).join('') : `<div class="empty"><i class="fa-regular fa-comments"></i>${S.chatFilter === 'unread' ? 'אין שיחות שממתינות לתשובה 🎉' : 'אין שיחות'}</div>`;
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

async function openConv(phone) {
    if (S.view !== 'chat') go('chat');
    S.activePhone = phone;
    S.activeHash = '';
    const c = S.convs.find(x => x.user_phone === phone) || {};
    $('#inbox').classList.add('has-active');
    $('#thread-empty').hidden = true;
    $('#thread-head').hidden = false; $('#thread-msgs').hidden = false; $('#composer').hidden = false;
    $('#thread-name').textContent = c.user_name || phone;
    $('#thread-phone').textContent = phone;
    $('#thread-avatar').outerHTML = avatarHtml(c.user_name).replace('class="avatar', 'id="thread-avatar" class="avatar');
    $('#thread-msgs').innerHTML = '<div class="empty"><i class="fa-solid fa-circle-notch spin"></i></div>';
    closePopovers();
    renderConvs();
    renderThreadTags();
    if (!S.users.length) loadUsers(true).then(renderThreadTags);
    await refreshThread(false);
    $('#composer-input').focus();
}

function closeThread() {
    S.activePhone = null;
    $('#inbox').classList.remove('has-active');
    $('#thread-empty').hidden = false;
    $('#thread-head').hidden = true; $('#thread-msgs').hidden = true; $('#composer').hidden = true;
    renderConvs();
}

async function refreshThread(silent = true) {
    const phone = S.activePhone;
    if (!phone) return;
    const r = await api('/admin/chat/list', { targetPhone: phone });
    if (phone !== S.activePhone) return;
    if (!r.ok) { if (!silent) toast(r.error || 'שגיאה בטעינת השיחה', 'bad'); return; }
    if (r.data.userName) $('#thread-name').textContent = r.data.userName;
    const msgs = r.data.messages || [];
    const hash = JSON.stringify(msgs);
    if (hash === S.activeHash) return;
    const first = !S.activeHash;
    S.activeHash = hash;
    renderThread(msgs, first);
    api('/admin/chat/read', { targetPhone: phone }).then(() => loadConvs(true));
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
        const ticks = out && !deleted ? `<i class="fa-solid fa-check-double" style="${m.is_read ? 'color:#a5f3fc' : ''}"></i>` : '';
        html += `<div class="msg ${out ? 'out' : 'in'} ${deleted ? 'deleted' : ''}">
            <div class="m-text">${deleted ? '🚫 ההודעה נמחקה' : esc(m.message_text)}</div>
            <div class="m-meta"><span>${chatTime(m.created_at)}</span>${ticks}</div>
            ${!deleted ? `<button class="icon-btn sm danger m-del" data-action="delete-msg" data-id="${esc(m.id)}" title="מחיקה"><i class="fa-solid fa-trash-can"></i></button>` : ''}
        </div>`;
    });
    box.innerHTML = html;
    box.scrollTop = (atBottom || forceBottom) ? box.scrollHeight : prevTop;
}

async function sendMsg(e) {
    if (e) e.preventDefault();
    const input = $('#composer-input');
    const text = input.value.trim();
    if (!text || !S.activePhone) return;
    const box = $('#thread-msgs');
    const tmp = document.createElement('div');
    tmp.className = 'msg out pending';
    tmp.innerHTML = `<div class="m-text">${esc(text)}</div><div class="m-meta"><i class="fa-regular fa-clock"></i></div>`;
    box.querySelector('.empty')?.remove();
    box.appendChild(tmp);
    box.scrollTop = box.scrollHeight;
    input.value = ''; input.style.height = '';
    const btn = $('#composer-send');
    btn.disabled = true;
    const r = await api('/admin/chat/send', { targetPhone: S.activePhone, text, sendEmail: $('#composer-email').checked });
    btn.disabled = false;
    if (!r.ok) { tmp.remove(); input.value = text; toast(r.error || 'שגיאה בשליחת ההודעה', 'bad'); return; }
    S.activeHash = '';
    refreshThread();
}

async function deleteMsg(id) {
    const r = await dialog({
        title: 'מחיקת הודעה', text: 'מחיקה רכה מסמנת את ההודעה כנמחקת אצל הלקוח. מחיקה מלאה מסירה אותה מהמסד.',
        buttons: [{ label: 'ביטול' }, { label: 'מחיקה מלאה', value: 'hard', cls: 'btn-danger' }, { label: 'מחיקה רכה', value: 'soft', cls: 'btn-danger-solid' }],
    });
    if (!r) return;
    const res = await api('/admin/chat/delete', { messageId: Number(id), hardDelete: r.value === 'hard' });
    if (!res.ok) { toast(res.error || 'שגיאה במחיקה', 'bad'); return; }
    S.activeHash = '';
    refreshThread();
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

async function sendEmail(e) {
    e.preventDefault();
    const btn = $('#em-send');
    busy(btn, true);
    const r = await api('/admin/chat/custom-email', { email: $('#em-to').value.trim(), subject: $('#em-subject').value, content: $('#em-content').value });
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה בשליחה', 'bad'); return; }
    toast('המייל נשלח');
    closeDrawers();
}

// ---------- Ads ----------

async function loadAds() {
    $('#ads-grid').innerHTML = '<div class="card"><div class="card-body"><div class="skeleton" style="width:60%"></div></div></div>'.repeat(3);
    const r = await api('/admin/system-messages/list');
    if (!r.ok) { $('#ads-grid').innerHTML = `<div class="card"><div class="empty">${esc(r.error)}</div></div>`; return; }
    S.ads = r.data.messages || [];
    renderAds();
}

function adExpired(ad) {
    const d = ad.expires_at && new Date(String(ad.expires_at).replace(' ', 'T') + 'Z');
    return d && !isNaN(d) && d < new Date();
}

function safeColor(c, fallback) { return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : fallback; }

function renderAds() {
    if (!S.ads.length) {
        $('#ads-grid').innerHTML = '<div class="card" style="grid-column:1/-1;"><div class="empty"><i class="fa-solid fa-bullhorn"></i>עוד אין קמפיינים<br><br><button class="btn btn-primary" data-action="new-ad"><i class="fa-solid fa-plus"></i> יצירת קמפיין ראשון</button></div></div>';
        return;
    }
    $('#ads-grid').innerHTML = S.ads.map(ad => {
        const expired = adExpired(ad);
        const bg = safeColor(ad.bg_color, '#ffffff'), fg = safeColor(ad.text_color, '#1a202c');
        return `<div class="card ad-card">
            <div class="ad-swatch" style="background:${bg}; color:${fg};">
                ${ad.image_url && /^https?:\/\//i.test(ad.image_url) ? `<img src="${esc(ad.image_url)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : ''}
                <b>${esc(ad.title)}</b>
            </div>
            <div class="row" style="padding:10px 14px; gap:6px; flex-wrap:wrap;">
                ${expired ? '<span class="badge"><i class="fa-solid fa-clock"></i> פג תוקף</span>' : '<span class="badge good"><span class="dot"></span> פעיל</span>'}
                ${ad.is_mandatory ? '<span class="badge bad"><i class="fa-solid fa-window-maximize"></i> פופאפ</span>' : '<span class="badge info"><i class="fa-solid fa-table-columns"></i> מודעת צד</span>'}
                ${ad.expires_at ? `<span class="badge">עד ${esc(fmtDate(ad.expires_at))}</span>` : ''}
            </div>
            <div class="ad-stats">
                <div><b>${num(ad.total_impressions)}</b><small>חשיפות</small></div>
                <div><b>${num(ad.unique_viewers)}</b><small>צופים ייחודיים</small></div>
            </div>
            <div class="ad-foot">
                <button class="btn btn-sm" data-action="edit-ad" data-id="${esc(ad.id)}"><i class="fa-solid fa-pen"></i> עריכה</button>
                <button class="btn btn-sm" data-action="ad-logs" data-id="${esc(ad.id)}"><i class="fa-solid fa-eye"></i> צפיות</button>
                <div class="spacer"></div>
                <button class="icon-btn sm danger" data-action="delete-ad" data-id="${esc(ad.id)}" title="מחיקה"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>`;
    }).join('');
}

function openAd(id) {
    $('#ad-form').reset();
    $('#ad-id').value = '';
    $('#ad-bg').value = '#ffffff'; $('#ad-text').value = '#1a202c';
    $('#ad-title-head').textContent = 'קמפיין חדש';
    const ad = id ? S.ads.find(a => String(a.id) === String(id)) : null;
    if (ad) {
        $('#ad-title-head').textContent = ad.title;
        $('#ad-id').value = ad.id;
        $('#ad-title').value = ad.title || '';
        $('#ad-html').value = ad.html_content || '';
        $('#ad-image').value = ad.image_url || '';
        $('#ad-bg').value = safeColor(ad.bg_color, '#ffffff');
        $('#ad-text').value = safeColor(ad.text_color, '#1a202c');
        $('#ad-mandatory').checked = !!ad.is_mandatory;
        $('#ad-cooldown').value = ad.close_cooldown_seconds || 0;
        $('#ad-max-views').value = ad.max_views_per_user || 0;
        $('#ad-behavior').value = ad.behavior_after_limit || 'hide';
        $('#ad-expires').value = ad.expires_at ? String(ad.expires_at).replace(' ', 'T').slice(0, 16) : '';
        $('#ad-interval').value = ad.view_interval_minutes || 0;
        $('#ad-show-count').checked = !!ad.show_view_count;
    }
    updateAdPreview();
    openDrawer('ad-drawer');
}

function updateAdPreview() {
    const bg = safeColor($('#ad-bg').value, '#ffffff'), fg = safeColor($('#ad-text').value, '#1a202c');
    const img = $('#ad-image').value.trim();
    const mandatory = $('#ad-mandatory').checked;
    const card = `<div class="ad" style="background:${bg};color:${fg};">
        ${/^https?:\/\//i.test(img) ? `<img src="${esc(img)}" alt="">` : ''}
        <h3>${esc($('#ad-title').value || 'כותרת הקמפיין')}</h3>
        <div>${$('#ad-html').value || '<span style="opacity:.5">תוכן הקמפיין יופיע כאן</span>'}</div>
    </div>`;
    // Rendered inside a sandboxed iframe (no scripts, isolated origin), so admin-authored HTML is safe to preview.
    $('#ad-preview').srcdoc = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
        body{margin:0;font-family:Rubik,system-ui,sans-serif;background:${mandatory ? 'rgba(15,20,36,.55)' : '#eef0f6'};min-height:100vh;display:flex;align-items:${mandatory ? 'center' : 'flex-start'};justify-content:center;padding:16px;box-sizing:border-box}
        .ad{width:100%;max-width:${mandatory ? '280px' : '100%'};border-radius:14px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.15);box-sizing:border-box;overflow:hidden;word-wrap:break-word}
        .ad img{width:calc(100% + 32px);margin:-16px -16px 12px;display:block;max-height:160px;object-fit:cover}
        h3{margin:0 0 8px;font-size:16px}
    </style></head><body>${card}</body></html>`;
}

async function saveAd(e) {
    e.preventDefault();
    const exp = $('#ad-expires').value;
    const payload = {
        id: $('#ad-id').value, title: $('#ad-title').value, htmlContent: $('#ad-html').value,
        imageUrl: $('#ad-image').value.trim(), bgColor: $('#ad-bg').value, textColor: $('#ad-text').value,
        maxViewsPerUser: parseInt($('#ad-max-views').value, 10) || 0, behaviorAfterLimit: $('#ad-behavior').value,
        viewIntervalMinutes: parseInt($('#ad-interval').value, 10) || 0,
        isMandatory: $('#ad-mandatory').checked, closeCooldownSeconds: parseInt($('#ad-cooldown').value, 10) || 0,
        showViewCount: $('#ad-show-count').checked,
        expiresAt: exp ? exp.replace('T', ' ') + ':00' : null,
    };
    const btn = $('#ad-save');
    busy(btn, true);
    const r = await api('/admin/system-messages/save', payload);
    busy(btn, false);
    if (!r.ok) { toast(r.error || 'שגיאה בשמירה', 'bad'); return; }
    toast('הקמפיין נשמר ופורסם');
    closeDrawers();
    loadAds();
}

async function adLogs(id) {
    const ad = S.ads.find(a => String(a.id) === String(id));
    $('#adlogs-sub').textContent = ad ? ad.title : '';
    $('#adlogs-body').innerHTML = loadingRows(3, 5);
    openDrawer('adlogs-drawer');
    const r = await api('/admin/system-messages/logs', { messageId: Number(id) });
    if (!r.ok) { $('#adlogs-body').innerHTML = emptyRow(3, r.error, 'fa-circle-exclamation'); return; }
    const logs = r.data.logs || [];
    $('#adlogs-body').innerHTML = logs.length ? logs.map(l => `<tr><td class="ltr mono" style="text-align:right;">${esc(l.phone)}</td><td class="muted nowrap">${esc(fmtDate(l.viewed_at))}</td><td class="ltr mono muted" style="text-align:right;">${esc(l.ip_address)}</td></tr>`).join('') : emptyRow(3, 'אין צפיות עדיין', 'fa-eye-slash');
}

async function deleteAd(id) {
    const ad = S.ads.find(a => String(a.id) === String(id));
    if (!await confirmDanger('מחיקת קמפיין', `למחוק את "${ad ? ad.title : ''}"? הנתונים הסטטיסטיים יימחקו.`, 'מחיקה')) return;
    const r = await api('/admin/system-messages/delete', { id: Number(id) });
    if (!r.ok) { toast(r.error || 'שגיאה במחיקה', 'bad'); return; }
    toast('הקמפיין נמחק');
    loadAds();
}

// ---------- Phonebook ----------

async function loadNames() {
    $('#names-body').innerHTML = loadingRows(4, 8);
    const r = await api('/admin/yemot-names', {}, 'user');
    if (!r.ok) { $('#names-body').innerHTML = emptyRow(4, r.error, 'fa-circle-exclamation'); return; }
    S.names = r.data.list || [];
    S.namesMain = !!r.data.isMainAdmin;
    renderNames();
}

function renderNames() {
    const missing = S.names.filter(u => !String(u.name || '').trim()).length;
    $('#names-chips').innerHTML = `
        <button class="chip ${S.namesFilter === 'all' ? 'active' : ''}" data-action="names-filter" data-filter="all">הכל <span class="n">${num(S.names.length)}</span></button>
        <button class="chip ${S.namesFilter === 'missing' ? 'active' : ''}" data-action="names-filter" data-filter="missing"><i class="fa-solid fa-triangle-exclamation"></i> ללא שם <span class="n">${num(missing)}</span></button>`;
    const q = S.namesSearch.toLowerCase();
    const list = S.names.filter(u => (S.namesFilter !== 'missing' || !String(u.name || '').trim()) &&
        (!q || String(u.phone).includes(q) || String(u.name || '').toLowerCase().includes(q)));
    const LIMIT = 400;
    const rows = list.slice(0, LIMIT).map(u => {
        const locked = u.isProtected && !S.namesMain;
        const phone = esc(u.phone);
        return `<tr>
            <td class="ltr mono" style="text-align:right; ${locked ? 'color:var(--text-3)' : ''}">${phone}</td>
            <td>${u.active ? '<span class="badge good">פעיל</span>' : '<span class="badge bad">חסום</span>'}</td>
            <td>${locked ? `<span class="muted"><i class="fa-solid fa-lock"></i> ${esc(u.name || 'ללא שם')}</span>`
                : `<input class="input name-input" data-phone="${phone}" value="${esc(u.name || '')}" placeholder="ללא שם…" style="height:34px; ${!u.name ? 'border-color:color-mix(in oklab, var(--bad) 40%, var(--border));' : ''}">`}</td>
            <td>${locked ? '' : `<button class="icon-btn sm" data-action="save-name" data-phone="${phone}" title="שמירה"><i class="fa-solid fa-check"></i></button>`}</td>
        </tr>`;
    }).join('');
    $('#names-body').innerHTML = list.length
        ? rows + (list.length > LIMIT ? `<tr><td colspan="4" class="muted" style="text-align:center;">מוצגות ${LIMIT} מתוך ${num(list.length)} — צמצם בחיפוש</td></tr>` : '')
        : emptyRow(4, 'לא נמצאו מנויים', 'fa-address-book');
}

async function saveName(phone) {
    const input = $(`.name-input[data-phone="${CSS.escape(phone)}"]`);
    if (!input) return;
    const newName = input.value.trim();
    const u = S.names.find(x => String(x.phone) === phone);
    if (u && (u.name || '') === newName) { toast('לא בוצע שינוי', 'info'); return; }
    input.disabled = true;
    const r = await api('/admin/update-yemot-name', { phone, newName }, 'user');
    input.disabled = false;
    if (!r.ok) { toast(r.error || 'שגיאה בעדכון השם', 'bad'); return; }
    if (u) u.name = newName;
    input.style.borderColor = 'var(--good)';
    input.style.background = 'var(--good-soft)';
    setTimeout(() => { input.style.borderColor = ''; input.style.background = ''; }, 1200);
    toast(`השם נשמר: ${newName || 'ללא שם'}`);
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
        { group: 'פעולות', icon: 'fa-envelope', title: 'שליחת מייל חופשי', run: () => openDrawer('email-drawer') },
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
    pollTimers.push(setInterval(() => {
        if (document.hidden) return;
        if (S.view === 'chat' && S.activePhone) refreshThread();
    }, 4000));
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
        const u = S.users.find(x => x.phone === S.activePhone);
        if (u && u.hasWebAccount) openUser(u.phone);
        else if (u) openCreate(u.phone);
        else { loadUsers(true).then(() => { const x = S.users.find(y => y.phone === S.activePhone); x && x.hasWebAccount ? openUser(x.phone) : toast('למנוי זה אין חשבון אתר', 'info'); }); }
    },
    'delete-msg': el => deleteMsg(el.dataset.id),
    'new-chat': newChat,
    'custom-email': () => { $('#email-form').reset(); openDrawer('email-drawer'); },

    'refresh-ads': loadAds,
    'new-ad': () => { if (S.view !== 'ads') go('ads'); openAd(); },
    'edit-ad': el => openAd(el.dataset.id),
    'ad-logs': el => adLogs(el.dataset.id),
    'delete-ad': el => deleteAd(el.dataset.id),

    'refresh-names': loadNames,
    'names-filter': el => { S.namesFilter = el.dataset.filter; renderNames(); },
    'save-name': el => saveName(el.dataset.phone),

    'refresh-tables': loadTables,
    'pick-table': el => pickTable(el.dataset.table),
    'run-sql': runSql,
    'sql-history': el => { $('#sql-editor').value = sqlHistory()[+el.dataset.i] || ''; $('#sql-editor').focus(); },
    'export-sql': exportSql,

    'refresh-audit': loadAudit,
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
    $('#email-form').addEventListener('submit', sendEmail);

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
    $('#chat-search').addEventListener('input', debounce(e => { S.chatSearch = e.target.value.trim(); renderConvs(); }, 120));
    $('#names-search').addEventListener('input', debounce(e => { S.namesSearch = e.target.value.trim(); renderNames(); }, 150));
    $('#audit-search').addEventListener('input', debounce(e => { S.auditSearch = e.target.value.trim(); renderAudit(); }, 150));

    $('#names-body').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.classList.contains('name-input')) { e.preventDefault(); saveName(e.target.dataset.phone); }
    });

    const composer = $('#composer-input');
    composer.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
    composer.addEventListener('input', () => { composer.style.height = 'auto'; composer.style.height = Math.min(160, composer.scrollHeight) + 'px'; });

    ['ad-title', 'ad-html', 'ad-image', 'ad-bg', 'ad-text', 'ad-mandatory'].forEach(id => $(`#${id}`).addEventListener('input', debounce(updateAdPreview, 120)));
    $('#ad-mandatory').addEventListener('change', updateAdPreview);

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
        const id = location.hash.replace('#', '');
        if (!$('#app').hidden && id && id !== S.view) go(id);
    });
    window.addEventListener('resize', debounce(() => { if (S.view === 'overview') renderChart(); }, 200));
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (S.view === 'overview') renderChart(); });
}

document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    boot();
});

})();
