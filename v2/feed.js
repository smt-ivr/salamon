// feed.js — רשימת ההודעות הקוליות והנגן.
// נגן אחד לכל האתר: מהירות, דילוגים, השמעה רציפה של ההודעה הבאה, זכירת מיקום, שליטה ממסך הנעילה (Media Session)
// ותצוגת גל שאפשר ללחוץ ולגרור עליה. ההודעות מתרעננות ברקע בלי לקפוץ למעלה.

(() => {
'use strict';
const { $, $$, esc, api } = App;
const PAGE = 40;
const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

const F = {
    items: [], page: 1, hasMore: true, loading: false, loaded: false,
    filter: null, search: '', stats: {}, members: null,
    current: null, pendingNew: [], knownIds: new Set(), notifiedIds: new Set(),
    root: null, audio: null, lastPosSave: 0, statsQueue: [], statsBusy: false,
};

const idOf = m => m.name.replace(/\.(wav|mp3)$/i, '');
const sourceOf = m => m.fromWebType === 'file' ? 'file' : m.fromWebType ? 'web' : 'phone';
const SRC = { phone: ['fa-phone', 'הוקלט בטלפון'], web: ['fa-microphone', 'הוקלט באתר'], file: ['fa-paperclip', 'הועלה כקובץ'] };

function canDelete(m) {
    if (m.isOutgoing) return true;
    const u = App.user;
    if (!u || !u.isAdmin) return false;
    const perms = String(u.adminPermissions || '').split(',').map(s => s.trim());
    return perms.includes('all') || perms.includes('delete_messages');
}

// ---------- גל קול דקורטיבי (יציב לכל הודעה) ----------

function bars(id, n) {
    let seed = 0;
    for (const ch of String(id)) seed = (seed * 131 + ch.charCodeAt(0)) >>> 0;
    const out = [];
    for (let i = 0; i < n; i++) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        const r = (seed >>> 16) / 65535;
        const env = Math.sin((i / (n - 1)) * Math.PI) * 0.55 + 0.45;
        out.push(Math.round((0.18 + r * 0.82) * env * 100));
    }
    return out;
}
const waveHtml = (id, n = 44) => `<div class="wave" data-wave="${esc(id)}" role="slider" aria-label="מיקום בהודעה" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">${bars(id, n).map(h => `<i style="height:${Math.max(12, h)}%"></i>`).join('')}</div>`;

function paintWave(el, frac) {
    const kids = el.children;
    const upto = Math.round(frac * kids.length);
    for (let i = 0; i < kids.length; i++) kids[i].classList.toggle('done', i < upto);
    el.setAttribute('aria-valuenow', Math.round(frac * 100));
}

// ---------- נתונים ----------

async function loadMembers() {
    const r = await api('/stats/members');
    if (r.ok && r.data.stats) { F.members = r.data.stats; renderStats(); }
}

async function load({ more = false, silent = false } = {}) {
    if (F.loading) return;
    F.loading = true;
    const page = more ? F.page + 1 : 1;
    if (!silent && !more) renderSkeleton();
    if (more) { const b = $('#feed-more .older-btn'); if (b) b.innerHTML = '<i class="fa-solid fa-circle-notch spin"></i> טוען…'; }
    const r = await api('/messages/list', { filesLimit: PAGE, page });
    F.loading = false;
    if (!r.ok) {
        if (!silent && !F.items.length) $('#feed-list').innerHTML = `<div class="sys-note">לא הצלחנו לטעון הודעות: ${esc(r.error)}<br><button class="older-btn" data-act="feed-reload" style="margin-top:8px;"><i class="fa-solid fa-rotate-right"></i> נסו שוב</button></div>`;
        return;
    }
    const list = r.data.messages || [];
    if (more) {
        F.page = page;
        const have = new Set(F.items.map(idOf));
        F.items.push(...list.filter(m => !have.has(idOf(m))));
        F.hasMore = list.length > 0;
    } else if (silent && F.items.length) {
        mergeFresh(list);
    } else {
        F.items = list;
        F.page = 1;
        F.hasMore = list.length >= Math.min(PAGE, 10);
    }
    list.forEach(m => F.knownIds.add(idOf(m)));
    const first = !F.loaded;
    F.loaded = true;
    render(more ? { keep: true } : first ? { bottom: true } : {});
    queueStats(list.map(idOf));
}

// רענון ברקע: הודעות חדשות נכנסות בלי להזיז את מה שהמשתמש קורא
function mergeFresh(list) {
    const have = new Set(F.items.map(idOf));
    const fresh = list.filter(m => !have.has(idOf(m)));
    // עדכון נתונים של הודעות קיימות (למשל סימון "נשמע")
    const byId = Object.fromEntries(list.map(m => [idOf(m), m]));
    F.items = F.items.map(m => byId[idOf(m)] ? { ...m, ...byId[idOf(m)] } : m);
    // הודעות שנמחקו מהעמוד הראשון
    const firstIds = new Set(list.map(idOf));
    const oldestFirst = list.length ? idOf(list[list.length - 1]) : null;
    if (oldestFirst) F.items = F.items.filter(m => firstIds.has(idOf(m)) || Number(idOf(m)) < Number(oldestFirst));
    if (!fresh.length) return;
    const incoming = fresh.filter(m => !m.isOutgoing);
    if (!nearBottom() && App.tab === 'feed') {
        F.pendingNew = fresh.concat(F.pendingNew.filter(p => !fresh.some(f => idOf(f) === idOf(p))));
        const c = $('#fab-count'); if (c) { c.hidden = false; c.textContent = F.pendingNew.length; }
    } else {
        F.items = fresh.concat(F.items);
    }
    if (incoming.length) announceNew(incoming);
}

function announceNew(incoming) {
    const unseen = incoming.filter(m => !F.notifiedIds.has(idOf(m)));
    if (!unseen.length) return;
    unseen.forEach(m => F.notifiedIds.add(idOf(m)));
    const first = unseen[0];
    const text = unseen.length > 1 ? `${unseen.length} הודעות קוליות חדשות` : `הודעה חדשה מ${first.valName || 'המערכת'}`;
    if (document.hidden) {
        if (App.prefs.notifyNewMessages) App.notify('עכשיו סלומון', text, { tag: 'salamon-feed', onClick: () => { App.go('feed'); play(idOf(first)); } });
    } else {
        App.sound('msg');
        if (App.tab !== 'feed') App.toast(text, 'info', { action: 'להשמעה', onAction: () => { App.go('feed'); play(idOf(first)); } });
    }
    App.setBadge('feed', App.tab === 'feed' ? 0 : unheardCount());
}

function unheardCount() { return F.items.filter(m => !m.isOutgoing && !m.heardByMe).length; }

function queueStats(ids) {
    if (!App.prefs.showStats) return;
    ids.forEach(id => { if (!F.statsQueue.includes(id)) F.statsQueue.push(id); });
    pumpStats();
}
async function pumpStats() {
    if (F.statsBusy) return;
    F.statsBusy = true;
    while (F.statsQueue.length) {
        const batch = F.statsQueue.splice(0, 5);
        await Promise.all(batch.map(async id => {
            const r = await api('/messages/stats', { fileId: id });
            if (r.ok && r.data.stats) { F.stats[id] = r.data.stats; paintStats(id); }
        }));
    }
    F.statsBusy = false;
}

// ---------- תצוגה (בסגנון וואטסאפ: הישנות למעלה, החדשות למטה) ----------

function filtered() {
    const q = F.search.trim().toLowerCase();
    const f = F.filter || App.prefs.feedFilter || 'all';
    return F.items.filter(m => {
        if (q && !String(m.valName || '').toLowerCase().includes(q) && !idOf(m).includes(q)) return false;
        switch (f) {
            case 'unheard': return !m.isOutgoing && !m.heardByMe;
            case 'mine': return m.isOutgoing;
            case 'web': return !!m.fromWebType;
            case 'phone': return !m.fromWebType;
            default: return !(App.prefs.hideHeard && m.heardByMe && !m.isOutgoing && F.current !== idOf(m));
        }
    });
}
// סדר התצוגה: מהישנה לחדשה
const displayList = () => filtered().slice().reverse();

const nearBottom = () => !F.root || F.root.scrollHeight - F.root.scrollTop - F.root.clientHeight < 140;
const toBottom = (smooth) => { if (F.root) F.root.scrollTo({ top: F.root.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); };

function shell() {
    F.root.innerHTML = `<div class="feed-bar" id="feed-bar">
            <div class="search-row" id="search-row" hidden><div class="search"><i class="fa-solid fa-magnifying-glass"></i><input class="input" id="feed-search" type="search" placeholder="חיפוש לפי שם או מספר הודעה" autocomplete="off"></div></div>
            <div class="chips" id="feed-chips"></div>
            <div id="feed-ann"></div>
        </div>
        <div class="wall-inner">
            <div class="load-older" id="feed-more"></div>
            <div class="bubbles" id="feed-list"></div>
        </div>
        <button class="fab-down" id="fab-down" data-act="feed-bottom" aria-label="להודעות האחרונות" hidden><i class="fa-solid fa-chevron-down"></i><b id="fab-count" hidden></b></button>`;
    $('#feed-search').addEventListener('input', App.debounce(e => { F.search = e.target.value; render({ bottom: true }); }, 160));
    F.root.addEventListener('scroll', () => {
        const away = !nearBottom();
        $('#fab-down').hidden = !away;
        if (!away && F.pendingNew.length) App.actions['feed-show-new']();
        if (F.root.scrollTop < 300 && F.loaded && F.hasMore && !F.loading && !F.search) load({ more: true });
    }, { passive: true });
    renderComposer();
    App.renderFeedAnn && App.renderFeedAnn($('#feed-ann'));
}

function renderSkeleton() {
    $('#feed-list').innerHTML = [1, 0, 1, 0, 0].map(out => `<div class="bub ${out ? 'out' : 'in'} skel"><span class="skeleton" style="height:12px;width:40%;"></span><span class="skeleton" style="height:36px;margin-top:8px;"></span></div>`).join('');
}

function statsLine() {
    const s = F.members;
    return s ? `סה״כ ${App.num(s.total)} משתתפים · ${App.num(s.active)} מקבלים צינתוק · ${App.num(s.blocked)} מנותקים` : 'טוען משתתפים…';
}
function renderStats() {
    if (App.tab === 'feed') App.setSubtitle(statsLine());
    const last = F.items[0];
    if (last) App.setPreview('feed', { text: `${last.valName || 'מערכת'}: הודעה קולית (${last.durationStr || ''})`, icon: 'fa-microphone', time: App.time(last.mtime) });
}

function renderChips() {
    const f = F.filter || App.prefs.feedFilter || 'all';
    const c = { all: F.items.length, unheard: unheardCount(), mine: F.items.filter(m => m.isOutgoing).length, web: F.items.filter(m => m.fromWebType).length, phone: F.items.filter(m => !m.fromWebType).length };
    const chips = [['all', 'הכל'], ['unheard', 'לא שמעתי'], ['mine', 'שלי'], ['phone', 'מהטלפון'], ['web', 'מהאתר']];
    $('#feed-chips').innerHTML = chips.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="feed-filter" data-f="${k}">${l}${c[k] && k !== 'all' ? ` <span class="n">${App.num(c[k])}</span>` : ''}</button>`).join('');
}

function statHtml(id) {
    const s = F.stats[id];
    const admin = App.user && App.user.isSuperAdmin;
    const inner = s ? `<i class="fa-solid fa-globe"></i> ${App.num(s.webListens)}<span class="sep">|</span><i class="fa-solid fa-phone"></i> ${App.num(s.phoneListens)}` : '<i class="fa-solid fa-circle-notch spin"></i>';
    return `<button class="stat-btn ${admin ? 'clickable' : ''}" data-act="${admin ? 'audience' : 'stats-info'}" data-id="${esc(id)}" title="${admin ? 'מי שמע ומי ראה' : 'האזנות באתר ובטלפון'}">${inner}</button>`;
}

function paintStats(id) {
    const el = F.root && F.root.querySelector(`[data-stats="${CSS.escape(id)}"]`);
    if (el) el.innerHTML = statHtml(id);
    const tick = F.root && F.root.querySelector(`[data-tick="${CSS.escape(id)}"]`);
    const s = F.stats[id];
    if (tick && s) tick.classList.toggle('read', (s.webListens + s.phoneListens) > 0);
}

function cardHtml(m) {
    const id = idOf(m);
    const src = sourceOf(m);
    const unheard = !m.isOutgoing && !m.heardByMe;
    const name = m.valName || 'מערכת';
    const playing = F.current === id;
    const s = F.stats[id];
    return `<div class="bub ${m.isOutgoing ? 'out' : 'in'} ${unheard ? 'unheard' : ''} ${playing ? 'playing' : ''}" data-msg="${esc(id)}">
        <div class="b-head"><b class="b-name" style="color:${App.colorFor(name)}">${esc(name)}</b><span class="b-src" title="${SRC[src][1]}"><i class="fa-solid ${SRC[src][0]}"></i></span><span class="b-id">#${esc(Number(id))}</span>
            <button class="b-menu" data-act="msg-menu" data-id="${esc(id)}" aria-label="אפשרויות"><i class="fa-solid fa-chevron-down"></i></button></div>
        <div class="vn">
            <span class="vn-side">${playing ? `<button class="rate-pill" data-act="pl-rate" aria-label="מהירות">${App.prefs.playbackRate}×</button>` : `${App.avatar(name, name, 'vn-av')}<i class="fa-solid fa-microphone vn-mic"></i>`}</span>
            <button class="play" data-act="play" data-id="${esc(id)}" aria-label="השמעה"><i class="fa-solid ${playing && !F.audio.paused ? 'fa-pause' : 'fa-play'}"></i></button>
            <div class="vn-wave">${waveHtml(id, 34)}</div>
        </div>
        <div class="b-foot">
            <span class="vn-dur" data-dur="${esc(id)}">${esc(m.durationStr || '')}</span>
            ${App.prefs.showStats ? `<span data-stats="${esc(id)}">${statHtml(id)}</span>` : ''}
            <span class="b-time">${esc(App.time(m.mtime))}${m.isOutgoing ? ` <i class="fa-solid fa-check-double tick ${s && s.webListens + s.phoneListens > 0 ? 'read' : ''}" data-tick="${esc(id)}" title="כחול = מישהו כבר שמע"></i>` : ''}</span>
        </div>
    </div>`;
}

function render({ keep = false, bottom = false } = {}) {
    if (!F.root || !$('#feed-list')) return;
    renderChips();
    renderStats();
    const wasBottom = nearBottom();
    const prevH = F.root.scrollHeight, prevTop = F.root.scrollTop;
    const list = displayList();
    if (!list.length) {
        const f = F.filter || App.prefs.feedFilter || 'all';
        $('#feed-list').innerHTML = F.loaded ? `<div class="sys-note">${F.search ? '🔍 לא נמצאו הודעות לחיפוש הזה' : f === 'unheard' ? '🎉 שמעת את כל ההודעות' : 'אין הודעות כאן עדיין'}</div>` : '';
        $('#feed-more').innerHTML = '';
        return;
    }
    let html = '', lastDay = '';
    for (const m of list) {
        const d = App.parseDate(m.mtime);
        const key = d ? d.toDateString() : '';
        if (key && key !== lastDay) { lastDay = key; html += `<div class="day"><span>${esc(App.dayLabel(d))}</span></div>`; }
        html += cardHtml(m);
    }
    $('#feed-list').innerHTML = html;
    $('#feed-more').innerHTML = F.search ? '' : F.hasMore ? `<button class="older-btn" data-act="feed-older">${F.loading ? '<i class="fa-solid fa-circle-notch spin"></i> טוען…' : '<i class="fa-solid fa-clock-rotate-left"></i> טעינת הודעות קודמות'}</button>` : '<span class="sys-note">🔒 אלה כל ההודעות</span>';
    if (keep) F.root.scrollTop = F.root.scrollHeight - prevH + prevTop;
    else if (bottom || wasBottom) toBottom();
    else F.root.scrollTop = prevTop;
    if (F.current) syncProgress(true);
    App.setBadge('feed', App.tab === 'feed' ? 0 : unheardCount());
}

// שורת ההקלטה בתחתית, כמו באתר הרגיל
function renderComposer() {
    const u = App.user || {};
    const box = $('#composer');
    if (!u.canRecord && !u.canUpload) { box.innerHTML = '<div class="cmp-note"><i class="fa-solid fa-lock"></i> אין לך הרשאה להקליט או להעלות הודעות</div>'; box.hidden = App.tab !== 'feed'; return; }
    box.innerHTML = `<div class="cmp" id="cmp">
        <div class="cmp-pill"><span class="cmp-text">${u.canRecord ? 'הקלט או בחר קובץ להעלאה' : 'בחר קובץ שמע להעלאה'}</span>
            ${u.canUpload ? '<label class="cmp-ic" title="בחירת קובץ" aria-label="בחירת קובץ שמע"><i class="fa-solid fa-paperclip"></i><input type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm" id="cmp-file" hidden></label>' : ''}</div>
        ${u.canRecord ? '<button class="cmp-mic" data-act="rec-inline" aria-label="הקלטת הודעה"><i class="fa-solid fa-microphone"></i></button>' : ''}
    </div>`;
    box.hidden = App.tab !== 'feed';
    const f = $('#cmp-file');
    if (f) f.addEventListener('change', e => { const file = e.target.files[0]; e.target.value = ''; if (file && App.recordFile) App.recordFile(file); });
}
App.renderComposer = renderComposer;

// ---------- נגן ----------

function itemById(id) { return F.items.find(m => idOf(m) === id); }

function positions() { return App.store.get('v2.pos', {}); }
function savePos(id, t) {
    if (!App.prefs.rememberPosition) return;
    const p = positions();
    if (t > 3 && F.audio.duration && t < F.audio.duration - 3) p[id] = Math.round(t); else delete p[id];
    const keys = Object.keys(p);
    if (keys.length > 200) delete p[keys[0]];
    App.store.set('v2.pos', p);
}

function play(id, { from } = {}) {
    const a = F.audio;
    const m = itemById(id);
    if (!m) return;
    if (F.current === id) {
        if (a.paused) a.play().catch(err => playError(err)); else a.pause();
        return;
    }
    if (F.current) savePos(F.current, a.currentTime);
    F.current = id;
    App.haptic();
    a.src = `${App.API}/messages/stream?fileId=${encodeURIComponent(id)}&userToken=${encodeURIComponent(App.token)}`;
    a.playbackRate = App.prefs.playbackRate || 1;
    const resume = from !== undefined ? from : (App.prefs.rememberPosition ? positions()[id] || 0 : 0);
    if (resume) a.addEventListener('loadedmetadata', () => { try { a.currentTime = resume; } catch (e) {} }, { once: true });
    setButtons();
    a.play().then(() => {
        if (!m.isOutgoing && !m.heardByMe) {
            m.heardByMe = true; m.myListens = (m.myListens || 0) + 1;
            setTimeout(() => { queueStats([id]); }, 2500);
        }
        if (resume > 3) App.toast(`ממשיכים מ-${App.clock(resume)}`, 'info', { action: 'מההתחלה', onAction: () => { a.currentTime = 0; }, ms: 3000 });
    }).catch(err => playError(err));
    renderPlayer();
    mediaSession(m);
    // הבועה שמתנגנת: כפתור מהירות במקום התמונה (כמו בוואטסאפ)
    $$('.bub.playing').forEach(el => { el.classList.remove('playing'); const mm = itemById(el.dataset.msg); if (mm) el.outerHTML = cardHtml(mm); });
    const card = F.root.querySelector(`[data-msg="${CSS.escape(id)}"]`);
    if (card) card.outerHTML = cardHtml(m);
}

function playError(err) {
    if (err && err.name === 'AbortError') return;
    App.toast('לא ניתן להשמיע את ההודעה כרגע', 'bad');
    setButtons();
}

function next(dir = 1) {
    const list = displayList();
    const i = list.findIndex(m => idOf(m) === F.current);
    const n = list[i + dir];
    if (n) play(idOf(n), { from: 0 }); else if (dir > 0) App.toast('אין הודעות נוספות', 'info');
}

function setButtons() {
    const a = F.audio;
    $$('[data-act="play"]').forEach(b => {
        const on = b.dataset.id === F.current;
        const loading = on && a.readyState < 2 && !a.paused;
        b.innerHTML = `<i class="fa-solid ${loading ? 'fa-circle-notch spin' : on && !a.paused ? 'fa-pause' : 'fa-play'}"></i>`;
        b.setAttribute('aria-label', on && !a.paused ? 'השהיה' : 'השמעה');
    });
    $$('[data-act="pl-toggle"]').forEach(b => { b.innerHTML = `<i class="fa-solid ${a.paused ? 'fa-play' : 'fa-pause'}"></i>`; });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = a.paused ? 'paused' : 'playing';
}

function syncProgress(force) {
    const a = F.audio;
    if (!F.current) return;
    const dur = a.duration || App.parseDuration((itemById(F.current) || {}).durationStr) || 0;
    const frac = dur ? Math.min(1, a.currentTime / dur) : 0;
    $$(`[data-wave="${CSS.escape(F.current)}"]`).forEach(w => paintWave(w, frac));
    const fill = $('#pl-fill'); if (fill) fill.style.width = `${frac * 100}%`;
    const t = $('#pl-time'); if (t) t.textContent = `${App.clock(a.currentTime)} / ${App.clock(dur)}`;
    $$('[data-np-cur]').forEach(el => { el.textContent = App.clock(a.currentTime); });
    $$('[data-np-dur]').forEach(el => { el.textContent = App.clock(dur); });
    const durEl = F.root && F.root.querySelector(`[data-dur="${CSS.escape(F.current)}"]`);
    if (durEl && (force || !a.paused)) durEl.textContent = a.currentTime > 0 ? `${App.clock(a.currentTime)}` : (itemById(F.current) || {}).durationStr || '';
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && dur) {
        try { navigator.mediaSession.setPositionState({ duration: dur, position: Math.min(a.currentTime, dur), playbackRate: a.playbackRate }); } catch (e) {}
    }
}

function renderPlayer() {
    const box = $('#player');
    const m = F.current && itemById(F.current);
    document.body.classList.toggle('has-player', !!m);
    if (!m) { box.hidden = true; document.documentElement.style.setProperty('--player-h', '0px'); return; }
    const name = m.valName || 'מערכת';
    box.hidden = false;
    box.innerHTML = `<div class="pl-progress"><i id="pl-fill"></i></div>
        <div class="pl-row">
            <button class="pl-info" data-act="np-open" aria-label="פתיחת הנגן">${App.avatar(name, name)}<span class="pl-text"><b>${esc(name)}</b><small id="pl-time">0:00</small></span></button>
            <button class="pl-btn rate" data-act="pl-rate" aria-label="מהירות">${App.prefs.playbackRate}×</button>
            <button class="pl-btn" data-act="pl-skip" data-d="-1" aria-label="אחורה"><i class="fa-solid fa-rotate-right"></i></button>
            <button class="pl-btn main" data-act="pl-toggle" aria-label="השמעה/השהיה"><i class="fa-solid fa-pause"></i></button>
            <button class="pl-btn" data-act="pl-next" aria-label="הבאה"><i class="fa-solid fa-backward-step"></i></button>
            <button class="pl-btn" data-act="pl-close" aria-label="סגירת הנגן"><i class="fa-solid fa-xmark"></i></button>
        </div>`;
    document.documentElement.style.setProperty('--player-h', `${box.offsetHeight + 8}px`);
    setButtons();
    syncProgress(true);
}

function openNowPlaying() {
    const m = F.current && itemById(F.current);
    if (!m) return;
    const name = m.valName || 'מערכת';
    const sk = App.prefs.skipSeconds;
    App.openSheet({
        title: 'מתנגן עכשיו', className: 'np-sheet',
        body: `<div class="np">
            ${App.avatar(name, name)}
            <h3>${esc(name)}</h3>
            <div class="np-sub">${esc(App.dayLabel(App.parseDate(m.mtime) || new Date()))} · ${esc(App.time(m.mtime))} · הודעה #${esc(Number(idOf(m)))}</div>
            <div class="np-scrub">${waveHtml(idOf(m), 56)}<div class="np-times"><span data-np-cur>0:00</span><span data-np-dur>0:00</span></div></div>
            <div class="np-ctrls">
                <button class="pl-btn" data-act="pl-prev" aria-label="הקודמת"><i class="fa-solid fa-forward-step"></i></button>
                <button class="pl-btn np-skip" data-act="pl-skip" data-d="-1" aria-label="אחורה ${sk} שניות"><i class="fa-solid fa-rotate-right"></i><small>${sk}</small></button>
                <button class="pl-btn main" data-act="pl-toggle" aria-label="השמעה/השהיה"><i class="fa-solid fa-pause"></i></button>
                <button class="pl-btn np-skip" data-act="pl-skip" data-d="1" aria-label="קדימה ${sk} שניות"><i class="fa-solid fa-rotate-left"></i><small>${sk}</small></button>
                <button class="pl-btn" data-act="pl-next" aria-label="הבאה"><i class="fa-solid fa-backward-step"></i></button>
            </div>
            <div class="np-opts">
                <div class="seg" id="np-rates">${RATES.map(r => `<button data-act="np-rate" data-r="${r}" class="${App.prefs.playbackRate === r ? 'on' : ''}">${r}×</button>`).join('')}</div>
                <label class="row-between card" style="padding:12px 14px;"><span><i class="fa-solid fa-forward" style="color:var(--a)"></i> להמשיך אוטומטית להודעה הבאה</span><span class="switch"><input type="checkbox" id="np-auto" ${App.prefs.autoplayNext ? 'checked' : ''}><span></span></span></label>
            </div>
        </div>`,
    });
    $('#np-auto').addEventListener('change', e => App.setPref('autoplayNext', e.target.checked));
    setButtons();
    syncProgress(true);
}

function mediaSession(m) {
    if (!('mediaSession' in navigator)) return;
    try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: m.valName || 'הודעה קולית', artist: 'עכשיו סלומון', album: `הודעה #${Number(idOf(m))}`, artwork: [{ src: App.LOGO, sizes: '512x512', type: 'image/png' }] });
        const ms = navigator.mediaSession;
        ms.setActionHandler('play', () => F.audio.play());
        ms.setActionHandler('pause', () => F.audio.pause());
        ms.setActionHandler('nexttrack', () => next(1));
        ms.setActionHandler('previoustrack', () => next(-1));
        ms.setActionHandler('seekbackward', d => { F.audio.currentTime = Math.max(0, F.audio.currentTime - (d.seekOffset || App.prefs.skipSeconds)); });
        ms.setActionHandler('seekforward', d => { F.audio.currentTime = Math.min(F.audio.duration || 1e9, F.audio.currentTime + (d.seekOffset || App.prefs.skipSeconds)); });
        ms.setActionHandler('seekto', d => { F.audio.currentTime = d.seekTime; });
    } catch (e) {}
}

function bindAudio() {
    const a = F.audio = $('#audio');
    a.addEventListener('play', setButtons);
    a.addEventListener('pause', () => { setButtons(); if (F.current) savePos(F.current, a.currentTime); });
    a.addEventListener('waiting', setButtons);
    a.addEventListener('playing', setButtons);
    a.addEventListener('timeupdate', () => {
        syncProgress();
        if (Date.now() - F.lastPosSave > 4000 && F.current) { F.lastPosSave = Date.now(); savePos(F.current, a.currentTime); }
    });
    a.addEventListener('ended', () => {
        const id = F.current;
        savePos(id, 0);
        const p = positions(); delete p[id]; App.store.set('v2.pos', p);
        setButtons();
        if (App.prefs.autoplayNext) {
            const list = displayList();
            const i = list.findIndex(m => idOf(m) === id);
            if (list[i + 1]) { App.toast('ממשיכים להודעה הבאה', 'info', { ms: 2000 }); setTimeout(() => play(idOf(list[i + 1]), { from: 0 }), 600); }
        }
    });
    a.addEventListener('error', () => { if (F.current && a.src) playError(); });
}

// גרירה ולחיצה על הגל
function bindWaveSeek() {
    let dragging = null;
    const fracAt = (wave, x) => { const r = wave.getBoundingClientRect(); return Math.max(0, Math.min(1, (r.right - x) / r.width)); };
    const seekTo = (wave, x) => {
        const id = wave.dataset.wave;
        const frac = fracAt(wave, x);
        paintWave(wave, frac);
        if (id !== F.current) { const m = itemById(id); const dur = App.parseDuration(m && m.durationStr); play(id, { from: dur * frac }); return; }
        const dur = F.audio.duration || App.parseDuration((itemById(id) || {}).durationStr);
        if (dur) F.audio.currentTime = dur * frac;
    };
    document.addEventListener('pointerdown', e => {
        const wave = e.target.closest('.wave');
        if (!wave) return;
        dragging = wave;
        try { wave.setPointerCapture(e.pointerId); } catch (err) {}
        if (wave.dataset.wave === F.current) paintWave(wave, fracAt(wave, e.clientX));
    });
    document.addEventListener('pointermove', e => { if (dragging && dragging.dataset.wave === F.current) paintWave(dragging, fracAt(dragging, e.clientX)); });
    document.addEventListener('pointerup', e => { if (!dragging) return; const w = dragging; dragging = null; seekTo(w, e.clientX); });
    document.addEventListener('keydown', e => {
        const wave = e.target.closest && e.target.closest('.wave');
        if (wave && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && wave.dataset.wave === F.current) {
            e.preventDefault();
            F.audio.currentTime = Math.max(0, F.audio.currentTime + (e.key === 'ArrowLeft' ? 5 : -5));
        }
    });
}

// קיצורי מקלדת במחשב
document.addEventListener('keydown', e => {
    if (!App.user || App.topSheet() && !App.topSheet().classList.contains('np-sheet')) return;
    if (/input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.key === ' ' && F.current) { e.preventDefault(); play(F.current); }
    else if ((e.key === 'n' || e.key === 'מ') && F.current) next(1);
    else if (e.key === 'ArrowLeft' && F.current && !e.target.closest('.wave')) F.audio.currentTime += App.prefs.skipSeconds;
    else if (e.key === 'ArrowRight' && F.current && !e.target.closest('.wave')) F.audio.currentTime = Math.max(0, F.audio.currentTime - App.prefs.skipSeconds);
});

// ---------- קהל ההודעה (מנהל-העל) ----------

async function openAudience(id) {
    const m = itemById(id);
    const el = App.openSheet({ title: `מי שמע את הודעה #${Number(id)}`, body: '<div class="skeleton" style="height:120px;"></div>' });
    const r = await api('/v2/audience', { fileId: id });
    const body = el.querySelector('.sheet-body');
    if (!r.ok) { body.innerHTML = `<div class="alert bad"><i class="fa-solid fa-circle-exclamation"></i><div>${esc(r.error)}</div></div>`; return; }
    const d = r.data;
    const state = { f: 'heard' };
    const draw = () => {
        const list = state.f === 'not' ? d.notHeard : d.people.filter(p => state.f === 'all' || (state.f === 'heard' && p.heard) || (state.f === 'tel' && p.tel) || (state.f === 'web' && p.web) || (state.f === 'seen' && p.site && !p.heard));
        const counts = { heard: d.people.filter(p => p.heard).length, tel: d.people.filter(p => p.tel).length, web: d.people.filter(p => p.web).length, seen: d.people.filter(p => p.site && !p.heard).length, not: d.notHeard.length };
        const ch = (cls, icon, x, label) => `<span class="ch ${cls} ${x ? 'on' : ''}" title="${label}${x && x.last ? ` · ${App.dateTime(x.last)}` : ''}"><i class="fa-solid ${icon}"></i>${x && x.count > 1 ? `<sup>${x.count}</sup>` : ''}</span>`;
        body.innerHTML = `
            <div class="aud-kpis">
                <div class="stat"><b>${App.num(d.totals.phoneListeners)}</b><small><i class="fa-solid fa-phone"></i> שמעו בטלפון</small></div>
                <div class="stat"><b>${App.num(d.totals.webListeners)}</b><small><i class="fa-solid fa-headphones"></i> השמיעו באתר</small></div>
                <div class="stat"><b>${App.num(d.totals.siteViewers)}</b><small><i class="fa-solid fa-eye"></i> ראו באתר</small></div>
                <div class="stat"><b>${App.num(d.notHeard.length)}</b><small><i class="fa-solid fa-user-clock"></i> עוד לא שמעו</small></div>
            </div>
            ${!d.phone.available ? '<div class="alert warn" style="margin-bottom:12px;"><i class="fa-solid fa-phone-slash"></i><div>אין נתוני האזנה מהטלפון להודעה הזו.</div></div>' : !d.phone.detailed && d.phone.amount ? `<div class="alert info" style="margin-bottom:12px;"><i class="fa-solid fa-circle-info"></i><div>ימות המשיח שמרה רק את מספר השומעים בטלפון (${App.num(d.phone.amount)}).</div></div>` : ''}
            <div class="chips" style="margin-bottom:8px;">${[['heard', 'שמעו'], ['tel', 'בטלפון'], ['web', 'באתר'], ['seen', 'ראו ולא שמעו'], ['not', 'לא שמעו']].map(([k, l]) => `<button class="chip ${state.f === k ? 'on' : ''}" data-f="${k}">${l} <span class="n">${App.num(counts[k])}</span></button>`).join('')}</div>
            <div>${list.length ? list.slice(0, 400).map(p => `<div class="person">${App.avatar(p.name || p.phone, p.phone, 'sm')}<div class="person-main"><b>${esc(p.name || p.phone)}</b><small class="ltr">${esc(p.phone)}${p.last ? ` · ${esc(App.rel(p.last))}` : ''}</small></div>
                ${state.f === 'not' ? (p.sawOnSite ? '<span class="badge warn"><i class="fa-solid fa-eye"></i> ראה</span>' : '') : `<div class="ch-row">${ch('tel', 'fa-phone', p.tel, 'שמע בטלפון')}${ch('web', 'fa-headphones', p.web, 'השמיע באתר')}${ch('seen', 'fa-eye', p.site, 'ראה באתר')}</div>`}</div>`).join('') : '<div class="empty"><i class="fa-solid fa-users-slash"></i>אין אנשים ברשימה הזו</div>'}</div>`;
        body.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { state.f = b.dataset.f; draw(); }));
    };
    draw();
}

function openMenu(id) {
    const m = itemById(id);
    if (!m) return;
    const admin = App.user && App.user.isSuperAdmin;
    const el = App.openSheet({
        title: `הודעה #${Number(id)}`,
        body: `<div class="set-list">
            <button class="set-item" data-m="play"><span class="ic" style="background:var(--a)"><i class="fa-solid fa-play"></i></span><span class="tx"><b>השמעה</b><small>${esc(m.valName || '')} · ${esc(m.durationStr || '')}</small></span></button>
            ${admin ? '<button class="set-item" data-m="aud"><span class="ic" style="background:#2563eb"><i class="fa-solid fa-users-viewfinder"></i></span><span class="tx"><b>מי שמע ומי ראה</b><small>בטלפון ובאתר, עם שמות</small></span></button>' : ''}
            <button class="set-item" data-m="copy"><span class="ic" style="background:#64748b"><i class="fa-regular fa-copy"></i></span><span class="tx"><b>העתקת מספר ההודעה</b><small>#${esc(Number(id))}</small></span></button>
            <div class="set-item"><span class="ic" style="background:#0d9488"><i class="fa-regular fa-clock"></i></span><span class="tx"><b>${esc(App.dayLabel(App.parseDate(m.mtime) || new Date()))} · ${esc(App.time(m.mtime))}</b><small>${esc(SRC[sourceOf(m)][1])}</small></span></div>
            ${canDelete(m) ? '<button class="set-item danger" data-m="del"><span class="ic" style="background:var(--bad)"><i class="fa-solid fa-trash-can"></i></span><span class="tx"><b>מחיקת ההודעה</b><small>ההודעה תוסר מהמערכת</small></span></button>' : ''}
        </div>`,
    });
    el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', async () => {
        const k = b.dataset.m;
        App.closeSheet();
        if (k === 'play') play(id);
        else if (k === 'aud') setTimeout(() => openAudience(id), 340);
        else if (k === 'copy') { try { await navigator.clipboard.writeText(String(Number(id))); App.toast('הועתק'); } catch (e) { App.toast(`מספר ההודעה: ${Number(id)}`, 'info'); } }
        else if (k === 'del') setTimeout(() => deleteMsg(id), 340);
    }));
}

async function deleteMsg(id) {
    const m = itemById(id);
    const check = await api('/messages/check-delete', { fileName: m.name });
    if (!check.ok) { App.toast(check.error, 'bad'); return; }
    if (!await App.confirm({ title: 'למחוק את ההודעה?', text: 'ההודעה תוסר מהמערכת לצמיתות, גם מהטלפון.', ok: 'מחיקה', danger: true, icon: 'fa-trash-can' })) return;
    const r = await api('/messages/delete', { fileName: m.name });
    if (!r.ok) { App.toast(r.error, 'bad'); return; }
    if (F.current === id) { F.audio.pause(); F.current = null; renderPlayer(); }
    F.items = F.items.filter(x => idOf(x) !== id);
    render();
    App.toast('ההודעה נמחקה');
}

// ---------- רישום ----------

App.feed = { load, reload: () => load(), play, items: () => F.items };

Object.assign(App.actions, {
    'play': el => play(el.dataset.id),
    'feed-filter': el => { F.filter = el.dataset.f; App.setPref('feedFilter', el.dataset.f); render({ bottom: true }); App.haptic(); },
    'feed-older': () => load({ more: true }),
    'feed-bottom': () => { if (F.pendingNew.length) App.actions['feed-show-new'](); toBottom(true); },
    'feed-search': () => { const r = $('#search-row'); r.hidden = !r.hidden; if (!r.hidden) $('#feed-search').focus(); else if (F.search) { F.search = ''; $('#feed-search').value = ''; render({ bottom: true }); } },
    'feed-reload': () => load(),
    'feed-show-new': () => { F.items = F.pendingNew.concat(F.items); F.pendingNew = []; const c = $('#fab-count'); if (c) c.hidden = true; render({ bottom: true }); },
    'feed-refresh': async el => { App.busy(el, true); await Promise.all([load({ silent: true }), loadMembers()]); App.busy(el, false); F.pendingNew.length && App.actions['feed-show-new'](); },
    'msg-menu': el => openMenu(el.dataset.id),
    'audience': el => openAudience(el.dataset.id),
    'stats-info': el => { const s = F.stats[el.dataset.id]; if (s) App.toast(`${App.num(s.webListens)} האזנות באתר · ${App.num(s.phoneListens)} בטלפון`, 'info'); },
    'pl-toggle': () => F.current && play(F.current),
    'pl-skip': el => { const d = Number(el.dataset.d) * App.prefs.skipSeconds; F.audio.currentTime = Math.max(0, Math.min(F.audio.duration || 1e9, F.audio.currentTime + d)); App.haptic(); },
    'pl-next': () => next(1),
    'pl-prev': () => next(-1),
    'pl-rate': () => { const QUICK = [1, 1.5, 2]; const i = QUICK.indexOf(App.prefs.playbackRate); const r = QUICK[(i + 1) % QUICK.length]; App.setPref('playbackRate', r); F.audio.playbackRate = r; $$('[data-act="pl-rate"]').forEach(b => { b.textContent = `${r}×`; }); App.haptic(); },
    'np-rate': el => { const r = Number(el.dataset.r); App.setPref('playbackRate', r); F.audio.playbackRate = r; $$('#np-rates button').forEach(b => b.classList.toggle('on', b === el)); const pr = $('[data-act="pl-rate"]'); if (pr) pr.textContent = `${r}×`; },
    'pl-close': () => { F.audio.pause(); const was = F.current; if (was) savePos(was, F.audio.currentTime); F.current = null; F.audio.removeAttribute('src'); renderPlayer(); const el = F.root && F.root.querySelector(`[data-msg="${CSS.escape(was || '')}"]`); const mm = was && itemById(was); if (el && mm) el.outerHTML = cardHtml(mm); },
    'np-open': openNowPlaying,
});

App.views.feed = {
    init(root) {
        F.root = root;
        F.filter = App.prefs.feedFilter || 'all';
        shell();
        load();
        loadMembers();
        App.every(30000, () => load({ silent: true }), { hiddenMs: 60000 });
        App.every(120000, loadMembers);
    },
    enter() { App.setBadge('feed', 0); renderComposer(); if (F.loaded) render(); },
    actions: () => `<button class="icon-btn" data-act="feed-search" aria-label="חיפוש" title="חיפוש"><i class="fa-solid fa-magnifying-glass"></i></button>${App.mobileActions()}<button class="icon-btn" data-act="feed-refresh" aria-label="רענון" title="רענון"><i class="fa-solid fa-rotate-right"></i></button>`,
    subtitle: () => statsLine(),
};

document.addEventListener('DOMContentLoaded', () => { bindAudio(); bindWaveSeek(); });
document.addEventListener('prefs', e => {
    if (['showStats', 'hideHeard'].includes(e.detail.key) && F.loaded) { render(); if (e.detail.key === 'showStats' && e.detail.value) queueStats(F.items.map(idOf)); }
    if (e.detail.key === 'playbackRate' && F.audio) F.audio.playbackRate = e.detail.value;
});
document.addEventListener('logout', () => {
    if (F.audio) { F.audio.pause(); F.audio.removeAttribute('src'); }
    Object.assign(F, { items: [], loaded: false, current: null, pendingNew: [], stats: {}, members: null });
    if (App.views.feed) App.views.feed._init = false;
    renderPlayer();
});
document.addEventListener('uploaded', () => setTimeout(() => load({ silent: true }), 1500));
document.addEventListener('reconnect', () => F.loaded && load({ silent: true }));
})();
