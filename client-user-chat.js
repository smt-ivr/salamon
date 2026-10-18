// client-user-chat.js — צ'אט הלקוח עם ההנהלה

(() => {
'use strict';

const POLL_OPEN_MS = 3000;
const POLL_CLOSED_MS = 15000;
const MAX_LEN = 2000;
const EMOJIS = ['😊', '🙏', '👍', '❤️', '😂', '🙂', '😅', '🤔', '😮', '😢', '🎉', '✅', '❌', '🔥', '👏', '💪', '📞', '🎧', '⏳', '📩', '🙌', '😉', '🤝', '⭐'];
const TOPICS = ['יש לי בעיה עם הצינתוקים', 'שאלה על החשבון שלי', 'בעיה בהשמעת הודעות', 'משהו אחר'];

const C = {
    open: false,
    messages: [],
    hash: '',
    hasMore: false,
    loadingOlder: false,
    fetching: false,
    adminTyping: false,
    admin: { online: false },
    replyTo: null,
    pending: [],
    unreadBelow: 0,
    typingSentAt: 0,
    lastPoll: 0,
    lastUnread: 0,
};

const $ = sel => document.querySelector(sel);

function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// טקסט בטוח + קישורים לחיצים
function richText(text) {
    return esc(text).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

function parseDate(str) {
    if (!str) return null;
    const d = new Date(String(str).replace(' ', 'T'));
    return isNaN(d) ? null : d;
}

function timeOf(str) {
    const d = parseDate(str);
    return d ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';
}

function dayLabel(d) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diff = Math.round((today - day) / 86400000);
    if (diff === 0) return 'היום';
    if (diff === 1) return 'אתמול';
    return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function post(path, body = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: state.userToken, ...body }),
    });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok && data.success !== false, status: res.status, data };
}

// ---------- UI ----------

function injectStyles() {
    const css = document.createElement('style');
    css.textContent = `
    .sc-overlay { position: fixed; inset: 0; z-index: 1200; display: none; align-items: center; justify-content: center; background: rgba(15, 23, 42, .45); backdrop-filter: blur(3px); }
    .sc-overlay.active { display: flex; animation: scFade .18s ease; }
    @keyframes scFade { from { opacity: 0; } }
    .sc-panel { width: min(440px, 100vw); height: min(720px, 92vh); display: flex; flex-direction: column; background: #efeae2; border-radius: 20px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.35); animation: scRise .22s cubic-bezier(.2,.8,.2,1); font-family: inherit; color: #111b21; }
    @keyframes scRise { from { transform: translateY(16px) scale(.98); opacity: 0; } }
    @media (max-width: 560px) { .sc-panel { width: 100vw; height: 100dvh; border-radius: 0; } }

    .sc-head { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff; flex-shrink: 0; }
    .sc-logo { position: relative; width: 42px; height: 42px; border-radius: 50%; background: #fff; display: grid; place-items: center; flex-shrink: 0; }
    .sc-logo img { width: 36px; height: 36px; border-radius: 50%; }
    .sc-logo .sc-dot { position: absolute; bottom: 0; left: 0; width: 12px; height: 12px; border-radius: 50%; background: #94a3b8; box-shadow: 0 0 0 2px #0f172a; }
    .sc-logo .sc-dot.on { background: #22c55e; }
    .sc-title { flex: 1; min-width: 0; line-height: 1.25; }
    .sc-title b { display: block; font-size: 1rem; }
    .sc-title small { font-size: .78rem; opacity: .75; }
    .sc-title small.typing { color: #86efac; opacity: 1; }
    .sc-icon-btn { width: 38px; height: 38px; border-radius: 50%; border: none; background: transparent; color: inherit; cursor: pointer; display: grid; place-items: center; font-size: 1.05rem; transition: background .15s; flex-shrink: 0; }
    .sc-icon-btn:hover { background: rgba(255,255,255,.12); }

    .sc-body { position: relative; flex: 1; min-height: 0; }
    .sc-msgs { position: absolute; inset: 0; overflow-y: auto; padding: 14px 14px 8px; display: flex; flex-direction: column; gap: 3px;
        background-color: #efeae2; background-image: radial-gradient(rgba(0,0,0,.05) 1px, transparent 1px); background-size: 16px 16px; scroll-behavior: auto; }
    .sc-day { align-self: center; margin: 10px 0 6px; padding: 4px 12px; border-radius: 8px; background: rgba(255,255,255,.9); color: #54656f; font-size: .74rem; box-shadow: 0 1px 1px rgba(0,0,0,.06); }
    .sc-row { display: flex; position: relative; }
    .sc-row.me { justify-content: flex-start; }
    .sc-row.them { justify-content: flex-end; }
    .sc-row + .sc-row.gap { margin-top: 6px; }
    .sc-bubble { position: relative; max-width: 80%; padding: 6px 9px 4px; border-radius: 10px; box-shadow: 0 1px 1px rgba(0,0,0,.1); font-size: .94rem; line-height: 1.45; word-wrap: break-word; }
    .sc-row.me .sc-bubble { background: #d9fdd3; border-start-start-radius: 3px; }
    .sc-row.them .sc-bubble { background: #fff; border-start-end-radius: 3px; }
    .sc-row.cont .sc-bubble { border-radius: 10px; }
    .sc-text { white-space: pre-wrap; }
    .sc-text a { color: #027eb5; }
    .sc-bubble.deleted { background: rgba(255,255,255,.6) !important; color: #8696a0; font-style: italic; box-shadow: none; }
    .sc-meta { display: flex; gap: 4px; align-items: center; justify-content: flex-end; font-size: .68rem; color: #667781; margin-top: 1px; direction: ltr; }
    .sc-meta .sc-read { color: #53bdeb; }
    .sc-meta .sc-fail { color: #ef4444; }
    .sc-quote { display: block; padding: 4px 8px; margin: 1px 0 5px; border-radius: 6px; border-inline-start: 3px solid #16a34a; background: rgba(0,0,0,.05); font-size: .8rem; color: #54656f; cursor: pointer; max-height: 54px; overflow: hidden; }
    .sc-quote b { display: block; color: #16a34a; font-size: .75rem; }
    .sc-row.them .sc-quote { border-color: #6d4aff; }
    .sc-row.them .sc-quote b { color: #6d4aff; }
    .sc-reply-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border-radius: 50%; border: none; background: rgba(255,255,255,.95); color: #54656f; box-shadow: 0 1px 3px rgba(0,0,0,.15); cursor: pointer; opacity: 0; transition: opacity .15s; }
    .sc-row.me .sc-reply-btn { inset-inline-start: calc(80% + 6px); }
    .sc-row.them .sc-reply-btn { inset-inline-end: calc(80% + 6px); }
    .sc-row:hover .sc-reply-btn, .sc-row.show-actions .sc-reply-btn { opacity: 1; }
    .sc-row.failed .sc-bubble { cursor: pointer; }
    .sc-row.flash .sc-bubble { animation: scFlash 1.2s ease; }
    @keyframes scFlash { 0%, 40% { box-shadow: 0 0 0 3px #16a34a; } }

    .sc-typing { display: inline-flex; gap: 4px; padding: 10px 12px; border-radius: 10px; background: #fff; box-shadow: 0 1px 1px rgba(0,0,0,.1); border-start-end-radius: 3px; }
    .sc-typing i { width: 7px; height: 7px; border-radius: 50%; background: #8696a0; animation: scBounce 1.2s infinite; }
    .sc-typing i:nth-child(2) { animation-delay: .15s; } .sc-typing i:nth-child(3) { animation-delay: .3s; }
    @keyframes scBounce { 0%, 60%, 100% { transform: translateY(0); opacity: .5; } 30% { transform: translateY(-4px); opacity: 1; } }

    .sc-older { align-self: center; margin: 4px 0 10px; padding: 6px 14px; border-radius: 999px; border: none; background: rgba(255,255,255,.9); color: #54656f; font-size: .8rem; cursor: pointer; }
    .sc-welcome { margin: auto; text-align: center; max-width: 300px; padding: 24px 18px; background: rgba(255,255,255,.92); border-radius: 18px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .sc-welcome .sc-wave { font-size: 2.2rem; }
    .sc-welcome h4 { margin: 6px 0 4px; font-size: 1.05rem; }
    .sc-welcome p { margin: 0 0 14px; color: #54656f; font-size: .88rem; }
    .sc-topics { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .sc-topics button { border: 1px solid #d1d7db; background: #fff; border-radius: 999px; padding: 6px 12px; font-size: .82rem; cursor: pointer; color: #111b21; }
    .sc-topics button:hover { border-color: #16a34a; color: #16a34a; }

    .sc-fab { position: absolute; bottom: 12px; left: 14px; width: 42px; height: 42px; border-radius: 50%; border: none; background: #fff; color: #54656f; box-shadow: 0 2px 8px rgba(0,0,0,.2); cursor: pointer; display: none; place-items: center; font-size: 1rem; }
    .sc-fab.show { display: grid; }
    .sc-fab b { position: absolute; top: -6px; right: -4px; min-width: 20px; height: 20px; border-radius: 10px; background: #16a34a; color: #fff; font-size: .7rem; display: grid; place-items: center; padding: 0 5px; }

    .sc-replybar { display: none; align-items: center; gap: 10px; padding: 8px 12px; background: #f0f2f5; border-top: 1px solid #e2e8f0; }
    .sc-replybar.show { display: flex; }
    .sc-replybar .sc-rb { flex: 1; min-width: 0; border-inline-start: 3px solid #16a34a; padding: 3px 8px; background: #fff; border-radius: 6px; font-size: .82rem; color: #54656f; }
    .sc-replybar .sc-rb b { display: block; color: #16a34a; font-size: .75rem; }
    .sc-replybar .sc-rb span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sc-replybar .sc-icon-btn { color: #54656f; width: 32px; height: 32px; }
    .sc-replybar .sc-icon-btn:hover { background: #e2e8f0; }

    .sc-compose { position: relative; display: flex; align-items: flex-end; gap: 8px; padding: 8px 10px; background: #f0f2f5; flex-shrink: 0; }
    .sc-compose .sc-icon-btn { color: #54656f; width: 42px; height: 42px; font-size: 1.2rem; }
    .sc-compose .sc-icon-btn:hover { background: #e2e8f0; }
    .sc-field { flex: 1; min-width: 0; background: #fff; border-radius: 22px; padding: 9px 14px; display: flex; flex-direction: column; box-shadow: 0 1px 1px rgba(0,0,0,.06); }
    .sc-field textarea { border: none; outline: none; resize: none; font: inherit; font-size: .95rem; line-height: 1.4; max-height: 120px; min-height: 22px; height: 22px; background: transparent; color: #111b21; padding: 0; }
    .sc-count { font-size: .7rem; color: #8696a0; text-align: left; direction: ltr; display: none; }
    .sc-count.show { display: block; }
    .sc-count.over { color: #ef4444; }
    .sc-send { width: 46px; height: 46px; border-radius: 50%; border: none; background: #16a34a; color: #fff; display: grid; place-items: center; font-size: 1.05rem; cursor: pointer; flex-shrink: 0; box-shadow: 0 2px 6px rgba(22,163,74,.35); transition: transform .1s, background .15s; }
    .sc-send:hover { background: #15803d; }
    .sc-send:active { transform: scale(.94); }
    .sc-send:disabled { background: #94a3b8; box-shadow: none; cursor: default; }
    .sc-emoji { position: absolute; bottom: calc(100% + 6px); right: 10px; width: 270px; padding: 8px; display: none; grid-template-columns: repeat(8, 1fr); gap: 2px; background: #fff; border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,.18); }
    .sc-emoji.show { display: grid; }
    .sc-emoji button { border: none; background: none; font-size: 1.3rem; padding: 4px; border-radius: 8px; cursor: pointer; }
    .sc-emoji button:hover { background: #f0f2f5; }

    .chat-badge-pulse { animation: badgePulse 1.5s infinite; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    @keyframes badgePulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
    @media (prefers-reduced-motion: reduce) { .sc-overlay *, .sc-overlay { animation: none !important; } }
    `;
    document.head.appendChild(css);
}

function injectModal() {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div class="sc-overlay" id="userChatModal" role="dialog" aria-modal="true" aria-label="צ'אט עם ההנהלה">
        <div class="sc-panel">
            <div class="sc-head">
                <div class="sc-logo"><img src="https://smt-tel-manager.netlify.app/salamon-logo.png" alt=""><span class="sc-dot" id="sc-dot"></span></div>
                <div class="sc-title"><b>צוות עכשיו סלומון</b><small id="sc-status">מתחבר…</small></div>
                <button class="sc-icon-btn" id="sc-close" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="sc-body">
                <div class="sc-msgs" id="sc-msgs"></div>
                <button class="sc-fab" id="sc-fab" aria-label="לסוף השיחה"><i class="fa-solid fa-chevron-down"></i><b id="sc-fab-count" hidden></b></button>
            </div>
            <div class="sc-replybar" id="sc-replybar">
                <div class="sc-rb"><b id="sc-rb-who"></b><span id="sc-rb-text"></span></div>
                <button class="sc-icon-btn" id="sc-rb-cancel" aria-label="ביטול ציטוט"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form class="sc-compose" id="sc-form">
                <div class="sc-emoji" id="sc-emoji">${EMOJIS.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('')}</div>
                <button type="button" class="sc-icon-btn" id="sc-emoji-btn" aria-label="אימוג׳י"><i class="fa-regular fa-face-smile"></i></button>
                <div class="sc-field">
                    <textarea id="sc-input" rows="1" placeholder="הקלד הודעה…" maxlength="${MAX_LEN + 200}" aria-label="הודעה"></textarea>
                    <div class="sc-count" id="sc-count"></div>
                </div>
                <button type="submit" class="sc-send" id="sc-send" aria-label="שליחה"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
        </div>
    </div>`;
    document.body.appendChild(wrap.firstElementChild);
}

// ---------- Rendering ----------

function statusText() {
    if (C.adminTyping) return { text: 'מקליד/ה…', cls: 'typing' };
    if (C.admin.online) return { text: 'מחובר/ת עכשיו', cls: '' };
    return { text: 'נחזור אליך בהקדם האפשרי', cls: '' };
}

function renderHeader() {
    const st = statusText();
    const el = $('#sc-status');
    el.textContent = st.text;
    el.className = st.cls;
    $('#sc-dot').classList.toggle('on', !!C.admin.online);
}

function bubbleHtml(m, prev) {
    const mine = m.sender === 'user';
    const sameSide = prev && prev.sender === m.sender && !prev.isDeleted;
    const quote = m.replyTo && !m.isDeleted
        ? `<span class="sc-quote" data-jump="${esc(m.replyTo.id)}"><b>${m.replyTo.sender === 'user' ? 'אתה' : 'צוות עכשיו סלומון'}</b>${esc(m.replyTo.text)}</span>` : '';
    let ticks = '';
    if (mine && !m.isDeleted) {
        if (m.failed) ticks = '<i class="fa-solid fa-circle-exclamation sc-fail" title="לא נשלח — לחץ לשליחה חוזרת"></i>';
        else if (m.pending) ticks = '<i class="fa-regular fa-clock"></i>';
        else ticks = `<i class="fa-solid fa-check-double ${m.isRead ? 'sc-read' : ''}" title="${m.isRead ? 'נקרא' : 'נשלח'}"></i>`;
    }
    const cls = ['sc-row', mine ? 'me' : 'them', sameSide ? 'cont' : 'gap', m.failed ? 'failed' : ''].join(' ');
    return `<div class="${cls}" data-id="${esc(m.id)}" ${m.localId ? `data-local="${esc(m.localId)}"` : ''}>
        <div class="sc-bubble ${m.isDeleted ? 'deleted' : ''}">
            ${quote}
            <div class="sc-text">${m.isDeleted ? '🚫 ההודעה נמחקה' : richText(m.text)}</div>
            <div class="sc-meta">${ticks}<span>${esc(timeOf(m.createdAt))}</span>${m.edited ? '<span>· נערך</span>' : ''}</div>
        </div>
        ${!m.isDeleted && !m.pending && !m.failed ? `<button class="sc-reply-btn" data-reply="${esc(m.id)}" aria-label="ציטוט"><i class="fa-solid fa-reply"></i></button>` : ''}
    </div>`;
}

function render({ keepPosition = false, forceBottom = false } = {}) {
    const box = $('#sc-msgs');
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    const prevHeight = box.scrollHeight, prevTop = box.scrollTop;
    const all = C.messages.concat(C.pending);

    if (!all.length) {
        box.innerHTML = `<div class="sc-welcome">
            <div class="sc-wave">👋</div>
            <h4>שלום! איך אפשר לעזור?</h4>
            <p>כתוב לנו כאן וצוות עכשיו סלומון יחזור אליך. אם לא תהיה מחובר, נשלח לך גם מייל.</p>
            <div class="sc-topics">${TOPICS.map(t => `<button type="button" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        </div>`;
        return;
    }

    let html = C.hasMore ? `<button class="sc-older" id="sc-older">${C.loadingOlder ? 'טוען…' : 'טעינת הודעות קודמות'}</button>` : '';
    let lastDay = '';
    let prev = null;
    all.forEach(m => {
        const d = parseDate(m.createdAt);
        const day = d ? d.toDateString() : lastDay;
        if (day !== lastDay) { lastDay = day; prev = null; html += `<div class="sc-day">${esc(d ? dayLabel(d) : '')}</div>`; }
        html += bubbleHtml(m, prev);
        prev = m;
    });
    if (C.adminTyping) html += '<div class="sc-row them gap"><div class="sc-typing" aria-label="מקליד/ה"><i></i><i></i><i></i></div></div>';
    box.innerHTML = html;

    if (keepPosition) box.scrollTop = box.scrollHeight - prevHeight + prevTop;
    else if (forceBottom || atBottom) box.scrollTop = box.scrollHeight;
    else box.scrollTop = prevTop;
    updateFab();
}

function updateFab() {
    const box = $('#sc-msgs');
    const away = box.scrollHeight - box.scrollTop - box.clientHeight > 160;
    if (!away) C.unreadBelow = 0;
    $('#sc-fab').classList.toggle('show', away);
    const n = $('#sc-fab-count');
    n.hidden = !C.unreadBelow;
    n.textContent = C.unreadBelow;
}

function renderReplyBar() {
    const bar = $('#sc-replybar');
    bar.classList.toggle('show', !!C.replyTo);
    if (!C.replyTo) return;
    $('#sc-rb-who').textContent = C.replyTo.sender === 'user' ? 'ציטוט של ההודעה שלך' : 'ציטוט של צוות עכשיו סלומון';
    $('#sc-rb-text').textContent = C.replyTo.text;
}

function updateBadge(count) {
    const badge = document.getElementById('user-chat-badge');
    if (!badge) return;
    if (count > 0) {
        badge.innerText = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
        badge.classList.add('chat-badge-pulse');
        Object.assign(badge.style, { width: '22px', height: '22px', fontSize: '12px', top: '-6px', right: '-6px' });
    } else {
        badge.style.display = 'none';
        badge.classList.remove('chat-badge-pulse');
    }
}

// ---------- Data ----------

async function fetchChat({ forceBottom = false } = {}) {
    if (!state.userToken || C.fetching) return;
    C.fetching = true;
    try {
        const r = await post('/chat/list');
        if (!r.ok) {
            if (!C.messages.length) $('#sc-msgs').innerHTML = `<div class="sc-welcome"><p>${esc(r.data.error || 'לא ניתן לטעון את השיחה כרגע')}</p></div>`;
            return;
        }
        const msgs = r.data.messages || [];
        const typingChanged = C.adminTyping !== !!r.data.adminTyping;
        C.adminTyping = !!r.data.adminTyping;
        C.admin = r.data.admin || { online: false };
        renderHeader();

        // שומרים הודעות ישנות שנטענו ב"טעינת הודעות קודמות"
        const oldest = msgs.length ? msgs[0].id : Infinity;
        const older = C.messages.filter(m => m.id < oldest);
        const merged = older.concat(msgs);
        const hash = JSON.stringify(merged);
        if (hash !== C.hash) {
            const before = new Set(C.messages.map(m => m.id));
            const fresh = msgs.filter(m => !before.has(m.id) && m.sender === 'admin').length;
            C.hash = hash;
            C.messages = merged;
            if (!older.length) C.hasMore = !!r.data.hasMore;
            const box = $('#sc-msgs');
            const away = box.scrollHeight - box.scrollTop - box.clientHeight > 160;
            if (away && fresh && C.messages.length !== fresh) C.unreadBelow += fresh;
            render({ forceBottom });
        } else if (typingChanged) {
            render();
        }
        if (C.open && !document.hidden && msgs.some(m => m.sender === 'admin' && !m.isRead)) markRead();
    } catch (e) {
        renderHeader();
    } finally {
        C.fetching = false;
    }
}

async function loadOlder() {
    if (C.loadingOlder || !C.messages.length) return;
    C.loadingOlder = true;
    render({ keepPosition: true });
    const r = await post('/chat/list', { beforeId: C.messages[0].id });
    C.loadingOlder = false;
    if (r.ok) {
        C.messages = (r.data.messages || []).concat(C.messages);
        C.hasMore = !!r.data.hasMore;
        C.hash = JSON.stringify(C.messages);
    }
    render({ keepPosition: true });
}

async function checkUnread() {
    if (!state.userToken) return;
    try {
        const r = await post('/chat/unread');
        if (r.ok) updateBadge(r.data.unreadCount);
    } catch (e) {}
}

async function markRead() {
    const r = await post('/chat/read').catch(() => null);
    if (r && r.ok) updateBadge(0);
}

function sendTyping(on) {
    if (!state.userToken) return;
    if (on) {
        if (Date.now() - C.typingSentAt < 3500) return;
        C.typingSentAt = Date.now();
        post('/chat/typing', { typing: true }).catch(() => {});
    } else if (C.typingSentAt) {
        C.typingSentAt = 0;
        post('/chat/typing', { typing: false }).catch(() => {});
    }
}

async function deliver(p) {
    p.pending = true; p.failed = false;
    render({ forceBottom: true });
    try {
        const r = await post('/chat/send', { text: p.text, replyTo: p.replyTo ? p.replyTo.id : undefined });
        if (!r.ok) {
            p.pending = false; p.failed = true;
            render();
            if (typeof showToast === 'function') showToast(r.data.error || 'ההודעה לא נשלחה', 'error');
            return;
        }
        C.pending = C.pending.filter(x => x !== p);
        C.fetching = false;
        await fetchChat({ forceBottom: true });
    } catch (e) {
        p.pending = false; p.failed = true;
        render();
    }
}

function send() {
    const input = $('#sc-input');
    const text = input.value.trim();
    if (!text) return;
    if (text.length > MAX_LEN) { if (typeof showToast === 'function') showToast(`ההודעה ארוכה מדי (עד ${MAX_LEN} תווים)`, 'error'); return; }
    const p = {
        localId: 'l' + Date.now(), id: 'local', sender: 'user', text,
        createdAt: new Date().toLocaleString('sv-SE').replace('T', ' '),
        replyTo: C.replyTo ? { id: C.replyTo.id, sender: C.replyTo.sender, text: C.replyTo.text } : null,
    };
    C.pending.push(p);
    input.value = '';
    autoGrow();
    C.replyTo = null;
    renderReplyBar();
    C.typingSentAt = 0;
    deliver(p);
}

// ---------- Interaction ----------

function autoGrow() {
    const t = $('#sc-input');
    t.style.height = '22px';
    t.style.height = Math.min(120, t.scrollHeight) + 'px';
    const len = t.value.length;
    const count = $('#sc-count');
    count.classList.toggle('show', len > MAX_LEN - 300);
    count.classList.toggle('over', len > MAX_LEN);
    count.textContent = `${len}/${MAX_LEN}`;
    $('#sc-send').disabled = !t.value.trim();
}

function startReply(id) {
    const m = C.messages.find(x => String(x.id) === String(id));
    if (!m) return;
    C.replyTo = { id: m.id, sender: m.sender, text: m.text };
    renderReplyBar();
    $('#sc-input').focus();
}

function jumpTo(id) {
    const row = document.querySelector(`#sc-msgs .sc-row[data-id="${CSS.escape(String(id))}"]`);
    if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
}

function openChat() {
    if (!state.userToken) return;
    C.open = true;
    $('#userChatModal').classList.add('active');
    renderHeader();
    if (!C.messages.length) $('#sc-msgs').innerHTML = '<div class="sc-welcome"><p><i class="fa-solid fa-circle-notch fa-spin"></i> טוען שיחה…</p></div>';
    else render({ forceBottom: true });
    C.fetching = false;
    fetchChat({ forceBottom: true });
    autoGrow();
    setTimeout(() => { if (window.matchMedia('(min-width: 561px)').matches) $('#sc-input').focus(); }, 120);
}

function closeChat() {
    C.open = false;
    sendTyping(false);
    $('#userChatModal').classList.remove('active');
    $('#sc-emoji').classList.remove('show');
    checkUnread();
}

function bind() {
    const modal = $('#userChatModal');
    $('#sc-close').addEventListener('click', closeChat);
    modal.addEventListener('click', e => { if (e.target === modal) closeChat(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && C.open) closeChat(); });

    $('#sc-form').addEventListener('submit', e => { e.preventDefault(); send(); });
    const input = $('#sc-input');
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
    input.addEventListener('input', () => { autoGrow(); sendTyping(!!input.value.trim()); });
    input.addEventListener('blur', () => sendTyping(false));

    $('#sc-emoji-btn').addEventListener('click', () => $('#sc-emoji').classList.toggle('show'));
    $('#sc-emoji').addEventListener('click', e => {
        const b = e.target.closest('[data-emoji]');
        if (!b) return;
        const start = input.selectionStart ?? input.value.length;
        input.value = input.value.slice(0, start) + b.dataset.emoji + input.value.slice(input.selectionEnd ?? start);
        input.focus();
        input.selectionStart = input.selectionEnd = start + b.dataset.emoji.length;
        autoGrow();
    });
    document.addEventListener('click', e => { if (!e.target.closest('#sc-emoji, #sc-emoji-btn')) $('#sc-emoji').classList.remove('show'); });

    $('#sc-rb-cancel').addEventListener('click', () => { C.replyTo = null; renderReplyBar(); });
    $('#sc-fab').addEventListener('click', () => { const box = $('#sc-msgs'); box.scrollTop = box.scrollHeight; C.unreadBelow = 0; updateFab(); });
    $('#sc-msgs').addEventListener('scroll', updateFab, { passive: true });
    $('#sc-msgs').addEventListener('click', e => {
        const reply = e.target.closest('[data-reply]');
        if (reply) { startReply(reply.dataset.reply); return; }
        const jump = e.target.closest('[data-jump]');
        if (jump) { jumpTo(jump.dataset.jump); return; }
        const topic = e.target.closest('[data-topic]');
        if (topic) { input.value = topic.dataset.topic === 'משהו אחר' ? '' : topic.dataset.topic + ': '; input.focus(); autoGrow(); return; }
        if (e.target.closest('#sc-older')) { loadOlder(); return; }
        const row = e.target.closest('.sc-row');
        if (!row) return;
        if (row.classList.contains('failed')) {
            const p = C.pending.find(x => x.localId === row.dataset.local);
            if (p) deliver(p);
            return;
        }
        // מגע במובייל מציג את כפתור הציטוט
        document.querySelectorAll('#sc-msgs .show-actions').forEach(r => r !== row && r.classList.remove('show-actions'));
        row.classList.toggle('show-actions');
    });
}

// ---------- Lifecycle ----------

function tick() {
    if (!state.userToken) return;
    const now = Date.now();
    const interval = C.open && !document.hidden ? POLL_OPEN_MS : POLL_CLOSED_MS;
    if (now - C.lastPoll < interval) return;
    C.lastPoll = now;
    if (C.open && !document.hidden) fetchChat();
    else checkUnread();
}

// קישור מהמייל: ?chat=open פותח את הצ'אט מיד אחרי ההתחברות
function captureOpenIntent() {
    try {
        const url = new URL(location.href);
        if (url.searchParams.get('chat') !== 'open') return;
        sessionStorage.setItem('salamonOpenChat', '1');
        url.searchParams.delete('chat');
        history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
    } catch (e) {}
}

function consumeOpenIntent() {
    try {
        if (sessionStorage.getItem('salamonOpenChat') !== '1') return;
        sessionStorage.removeItem('salamonOpenChat');
    } catch (e) { return; }
    openChat();
}

document.addEventListener('DOMContentLoaded', () => {
    captureOpenIntent();
    injectStyles();
    injectModal();
    bind();

    let hadToken = false;
    setInterval(() => {
        const has = !!state.userToken;
        if (has && !hadToken) {
            hadToken = true;
            C.lastPoll = 0;
            checkUnread();
            setTimeout(consumeOpenIntent, 300);
        } else if (!has && hadToken) {
            hadToken = false;
            C.messages = []; C.pending = []; C.hash = '';
            if (C.open) closeChat();
            updateBadge(0);
        }
        tick();
    }, 500);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { C.lastPoll = 0; tick(); } });
});

// נקודות כניסה שה-HTML של האתר קורא להן
window.openUserChatModal = openChat;
window.closeUserChatModal = closeChat;
window.checkUnreadMessages = checkUnread;

})();
