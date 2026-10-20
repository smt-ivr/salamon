// chat.js — צ'אט עם צוות עכשיו סלומון, כמסך מלא בגרסה החדשה.
// אותם שירותים כמו בצ'אט של האתר הוותיק: ציטוט, "מקליד/ה", אישורי קריאה, נוכחות, הודעות ממתינות ושליחה חוזרת.

(() => {
'use strict';
const { $, esc, api } = App;
const MAX_LEN = 2000;
const MAX_FILE = 20 * 1024 * 1024;
const EMOJIS = ['😊', '🙏', '👍', '❤️', '😂', '🙂', '😅', '🤔', '😮', '😢', '🎉', '✅', '❌', '🔥', '👏', '💪', '📞', '🎧', '⏳', '📩', '🙌', '😉', '🤝', '⭐'];
const TOPICS = ['יש לי בעיה עם הצינתוקים', 'שאלה על החשבון שלי', 'בעיה בהשמעת הודעות', 'משהו אחר'];

const C = { root: null, messages: [], pending: [], hash: '', hasMore: false, loadingOlder: false, fetching: false, adminTyping: false, admin: { online: false }, replyTo: null, typingAt: 0, baseline: null, visible: false, unread: 0, emoji: false, attach: null };

function shell() {
    C.root.innerHTML = `<div class="chat">
        <div class="chat-scroll wall" id="c-scroll"><div class="chat-inner" id="c-msgs"></div></div>
        <button class="c-fab" id="c-fab" data-act="c-bottom" aria-label="לסוף השיחה"><i class="fa-solid fa-chevron-down"></i></button>
        <div class="c-composer">
            <div class="c-replybar" id="c-replybar" hidden><div><b id="c-rb-who"></b><span id="c-rb-text"></span></div><button class="icon-btn sm" data-act="c-reply-cancel" aria-label="ביטול ציטוט"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="c-replybar c-attachbar" id="c-attachbar" hidden><i class="fa-solid fa-file" id="c-ab-icon"></i><div><b id="c-ab-name"></b><span id="c-ab-size"></span></div><button class="icon-btn sm" data-act="c-attach-cancel" aria-label="הסרת הקובץ"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="c-emoji" id="c-emoji" hidden>${EMOJIS.map(e => `<button type="button" data-act="c-emoji-pick" data-e="${e}">${e}</button>`).join('')}</div>
            <div class="c-composer-inner">
                <div class="c-field">
                    <button class="icon-btn" data-act="c-emoji" aria-label="סמלים"><i class="fa-regular fa-face-smile"></i></button>
                    <textarea class="c-input" id="c-input" rows="1" maxlength="${MAX_LEN}" placeholder="הקלד הודעה" aria-label="הודעה"></textarea>
                    <button class="icon-btn" data-act="c-attach" aria-label="צירוף קובץ" title="צירוף קובץ"><i class="fa-solid fa-paperclip"></i></button>
                    <input type="file" id="c-file" hidden>
                </div>
                <button class="c-send" id="c-send" data-act="c-send" aria-label="שליחה" disabled><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>
    </div>`;
    const input = $('#c-input');
    input.addEventListener('input', () => { grow(); sendState(); if (input.value.trim()) typing(true); });
    input.addEventListener('paste', e => { const f = [...((e.clipboardData && e.clipboardData.files) || [])][0]; if (f) { e.preventDefault(); attach(f); } });
    $('#c-file').addEventListener('change', e => attach(e.target.files && e.target.files[0]));
    const chat = C.root.querySelector('.chat');
    chat.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); chat.classList.add('drag'); } });
    chat.addEventListener('dragleave', e => { if (!chat.contains(e.relatedTarget)) chat.classList.remove('drag'); });
    chat.addEventListener('drop', e => { chat.classList.remove('drag'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) { e.preventDefault(); attach(f); } });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(); } });
    input.addEventListener('blur', () => typing(false));
    $('#c-scroll').addEventListener('scroll', () => {
        const box = $('#c-scroll');
        $('#c-fab').classList.toggle('on', box.scrollHeight - box.scrollTop - box.clientHeight > 200);
        if (box.scrollTop < 40 && C.hasMore && !C.loadingOlder) loadOlder();
    });
    $('#c-msgs').addEventListener('click', e => {
        const q = e.target.closest('[data-jump]'); if (q) { jump(q.dataset.jump); return; }
        const r = e.target.closest('[data-reply]'); if (r) { reply(r.dataset.reply); return; }
        const f = e.target.closest('.c-row.failed'); if (f) { const p = C.pending.find(x => x.localId === f.dataset.local); if (p) deliver(p); return; }
        const t = e.target.closest('[data-topic]'); if (t) { input.value = t.dataset.topic + ' – '; grow(); input.focus(); $('#c-send').disabled = false; }
    });
}

function sendState() { $('#c-send').disabled = !$('#c-input').value.trim() && !C.attach; }

function fileSize(n) {
    if (!n) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function fileIcon(type, name) {
    const t = String(type || ''), n = String(name || '').toLowerCase();
    if (t.startsWith('image/')) return 'fa-file-image';
    if (t.startsWith('audio/')) return 'fa-file-audio';
    if (t.startsWith('video/')) return 'fa-file-video';
    if (t === 'application/pdf') return 'fa-file-pdf';
    if (/\.(docx?|odt|rtf)$/.test(n)) return 'fa-file-word';
    if (/\.(xlsx?|ods|csv)$/.test(n)) return 'fa-file-excel';
    if (/\.(zip|rar|7z|gz)$/.test(n)) return 'fa-file-zipper';
    return 'fa-file-lines';
}
// קובץ מצורף בבועה: תמונה / נגן / כרטיס הורדה. local = קובץ שעדיין עולה ('failed' = ההעלאה נכשלה)
function fileHtml(f, local) {
    if (!f) return '';
    const t = String(f.type || '');
    if (!local && /^image\/(png|jpe?g|gif|webp|avif|bmp)$/.test(t)) return `<a class="c-img" href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.url)}" alt="${esc(f.name)}" loading="lazy"></a>`;
    if (!local && t.startsWith('audio/')) return `<audio class="c-audio" controls preload="none" src="${esc(f.url)}"></audio>`;
    if (!local && /^video\/(mp4|webm|ogg|quicktime)$/.test(t)) return `<video class="c-video" controls preload="metadata" src="${esc(f.url)}"></video>`;
    const inner = `<i class="fa-solid ${fileIcon(t, f.name)}"></i><span><b>${esc(f.name)}</b><small>${local ? (local === 'failed' ? 'לא נשלח · לחץ לשליחה חוזרת' : '<i class="fa-solid fa-circle-notch spin"></i> מעלה…') : esc(fileSize(f.size))}</small></span>${local ? '' : '<i class="fa-solid fa-download c-dl"></i>'}`;
    return local ? `<div class="c-file">${inner}</div>` : `<a class="c-file" href="${esc(f.url)}?dl=1" target="_blank" rel="noopener" download>${inner}</a>`;
}

function attach(file) {
    if (file && file.size > MAX_FILE) { App.toast(`הקובץ גדול מדי (עד ${MAX_FILE / 1024 / 1024}MB)`, 'bad'); file = null; }
    C.attach = file || null;
    const bar = $('#c-attachbar'); if (!bar) return;
    bar.hidden = !C.attach;
    $('#c-file').value = '';
    if (C.attach) {
        $('#c-ab-icon').className = `fa-solid ${fileIcon(C.attach.type, C.attach.name)}`;
        $('#c-ab-name').textContent = C.attach.name;
        $('#c-ab-size').textContent = `${fileSize(C.attach.size)} · אפשר להוסיף הודעה ולשלוח`;
        $('#c-input').focus();
    }
    sendState();
}

async function upload(path, file, fields) {
    const fd = new FormData();
    fd.append('userToken', App.token);
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) fd.append(k, v);
    fd.append('file', file, file.name);
    try {
        const res = await fetch(App.API + path, { method: 'POST', body: fd });
        let data = {};
        try { data = await res.json(); } catch (e) {}
        const ok = res.ok && data.success !== false;
        if (res.status === 401 && App.token) App.sessionExpired();
        return { ok, status: res.status, data, error: ok ? null : (data.message || data.error || 'הקובץ לא נשלח') };
    } catch (e) { return { ok: false, status: 0, data: {}, error: navigator.onLine ? 'אין תקשורת עם השרת' : 'אין חיבור לאינטרנט' }; }
}

function grow() { const i = $('#c-input'); i.style.height = 'auto'; i.style.height = Math.min(140, i.scrollHeight) + 'px'; }

function statusText() { return C.adminTyping ? 'מקליד/ה…' : C.admin.online ? 'מחובר/ת עכשיו' : 'נחזור אליך בהקדם האפשרי'; }
function status() {
    if (App.tab !== 'chat') return;
    App.setSubtitle(statusText());
    const sub = $('#tb-sub'); if (sub) sub.classList.toggle('typing', !!C.adminTyping);
    const av = $('#tb-avatar .avatar'); if (av) av.classList.toggle('online', !!C.admin.online);
}
function preview() {
    const all = C.messages;
    const last = all[all.length - 1];
    if (last) App.setPreview('chat', { text: `${last.sender === 'user' ? 'את/ה: ' : ''}${last.isDeleted ? 'ההודעה נמחקה' : last.text || (last.file ? `📎 ${last.file.name}` : '')}`, time: App.time(last.createdAt) });
    else App.setPreview('chat', { text: 'כתבו לנו, אנחנו כאן לעזור' });
}

function bubble(m, prev) {
    const me = m.sender === 'user';
    const same = prev && prev.sender === m.sender;
    const quote = m.replyTo && !m.isDeleted ? `<span class="c-quote" data-jump="${esc(m.replyTo.id)}"><b>${m.replyTo.sender === 'user' ? 'אתה' : 'צוות עכשיו סלומון'}</b>${esc(m.replyTo.text)}</span>` : '';
    let ticks = '';
    if (me && !m.isDeleted) ticks = m.failed ? '<i class="fa-solid fa-circle-exclamation" style="color:#fecaca" title="לא נשלח, לחצו לשליחה חוזרת"></i>' : m.pending ? '<i class="fa-regular fa-clock"></i>' : `<i class="fa-solid fa-check-double ${m.isRead ? 'read' : ''}"></i>`;
    return `<div class="c-row ${me ? 'me' : 'them'} ${same ? '' : 'gap'} ${m.failed ? 'failed' : ''}" data-id="${esc(m.id)}" ${m.localId ? `data-local="${esc(m.localId)}"` : ''}>
        <div class="c-bub ${m.isDeleted ? 'deleted' : ''} ${m.file && !m.isDeleted ? 'has-file' : ''}">${quote}${!m.isDeleted ? fileHtml(m.file, m.failed ? 'failed' : m.pending) : ''}${m.isDeleted || m.text ? `<div class="c-text">${m.isDeleted ? '🚫 ההודעה נמחקה' : App.richText(m.text)}</div>` : ''}
        <div class="c-meta">${m.edited ? '<span>נערך ·</span>' : ''}<span>${esc(App.time(m.createdAt))}</span>${ticks}</div></div>
        ${!m.isDeleted && !m.pending && !m.failed ? `<button class="c-reply" data-reply="${esc(m.id)}" aria-label="ציטוט"><i class="fa-solid fa-reply"></i></button>` : ''}
    </div>`;
}

function render({ keep = false, bottom = false } = {}) {
    const box = $('#c-scroll'); if (!box) return;
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    const ph = box.scrollHeight, pt = box.scrollTop;
    const all = C.messages.concat(C.pending);
    if (!all.length) {
        const welcome = App.config && App.config.chatWelcome;
        $('#c-msgs').innerHTML = `<div class="c-welcome"><div class="wave-hand">👋</div><h4>היי ${esc(String((App.user || {}).name || '').split(' ')[0])}! איך אפשר לעזור?</h4><p>${esc(welcome || 'כתבו לנו כאן וצוות עכשיו סלומון יחזור אליכם בהקדם.')}</p><div class="c-topics">${TOPICS.map(t => `<button class="chip" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>`;
        return;
    }
    let html = C.hasMore ? `<button class="btn sm c-older" data-act="c-older">${C.loadingOlder ? '<i class="fa-solid fa-circle-notch spin"></i>' : 'הודעות קודמות'}</button>` : '';
    let lastDay = '', prev = null;
    for (const m of all) {
        const d = App.parseDate(m.createdAt);
        const day = d ? d.toDateString() : lastDay;
        if (day !== lastDay) { lastDay = day; prev = null; html += `<div class="c-day">${esc(d ? App.dayLabel(d) : '')}</div>`; }
        html += bubble(m, prev);
        prev = m;
    }
    if (C.adminTyping) html += '<div class="c-row them gap"><div class="c-typing" aria-label="מקליד/ה"><i></i><i></i><i></i></div></div>';
    $('#c-msgs').innerHTML = html;
    if (keep) box.scrollTop = box.scrollHeight - ph + pt;
    else if (bottom || atBottom) box.scrollTop = box.scrollHeight;
    else box.scrollTop = pt;
}

async function fetchChat({ bottom = false } = {}) {
    if (!App.token || C.fetching) return;
    C.fetching = true;
    const r = await api('/chat/list');
    C.fetching = false;
    if (!r.ok) { if (!C.messages.length && $('#c-msgs')) $('#c-msgs').innerHTML = `<div class="empty"><i class="fa-solid fa-wifi"></i>${esc(r.error)}</div>`; return; }
    const msgs = r.data.messages || [];
    const typingChanged = C.adminTyping !== !!r.data.adminTyping;
    C.adminTyping = !!r.data.adminTyping;
    C.admin = r.data.admin || { online: false };
    status();
    const oldest = msgs.length ? msgs[0].id : Infinity;
    const merged = C.messages.filter(m => m.id < oldest).concat(msgs);
    const hash = JSON.stringify(merged);
    if (hash !== C.hash) {
        const before = new Set(C.messages.map(m => m.id));
        const fresh = C.messages.length ? msgs.filter(m => !before.has(m.id) && m.sender === 'admin' && !m.isDeleted) : [];
        if (fresh.length) { App.sound('msg'); App.haptic(15); const lf = fresh[fresh.length - 1]; if (document.hidden && App.prefs.notifyChat) App.notify('תשובה חדשה מצוות עכשיו סלומון', lf.text || (lf.file ? `📎 ${lf.file.name}` : ''), { tag: 'salamon-chat', onClick: () => App.go('chat') }); }
        C.hash = hash;
        C.messages = merged;
        preview();
        if (merged.length === msgs.length) C.hasMore = !!r.data.hasMore;
        render({ bottom });
    } else if (typingChanged) render();
    if (C.visible && !document.hidden && msgs.some(m => m.sender === 'admin' && !m.isRead)) markRead();
}

async function loadOlder() {
    if (C.loadingOlder || !C.messages.length) return;
    C.loadingOlder = true;
    render({ keep: true });
    const r = await api('/chat/list', { beforeId: C.messages[0].id });
    C.loadingOlder = false;
    if (r.ok) { C.messages = (r.data.messages || []).concat(C.messages); C.hasMore = !!r.data.hasMore; C.hash = JSON.stringify(C.messages); }
    render({ keep: true });
}

async function checkUnread() {
    const r = await api('/chat/unread');
    if (!r.ok) return;
    C.unread = r.data.unreadCount || 0;
    App.setBadge('chat', C.visible ? 0 : C.unread);
    if (r.data.lastUnread && !C.messages.length) App.setPreview('chat', { text: r.data.lastUnread.text });
    const last = r.data.lastUnread;
    if (C.baseline === null) { C.baseline = last ? last.id : 0; return; }
    if (last && last.id > C.baseline) {
        C.baseline = last.id;
        if (C.visible && !document.hidden) return;
        if (document.hidden) { if (App.prefs.notifyChat) App.notify('תשובה חדשה מצוות עכשיו סלומון', last.text, { tag: 'salamon-chat', onClick: () => App.go('chat') }); }
        else { App.sound('msg'); App.toast(`הצוות ענה: ${String(last.text).slice(0, 70)}`, 'info', { action: 'לצ׳אט', onAction: () => App.go('chat'), ms: 6000 }); }
    }
}

async function markRead() { const r = await api('/chat/read'); if (r.ok) { C.unread = 0; App.setBadge('chat', 0); } }

function typing(on) {
    if (on) { if (Date.now() - C.typingAt < 3500) return; C.typingAt = Date.now(); api('/chat/typing', { typing: true }); }
    else if (C.typingAt) { C.typingAt = 0; api('/chat/typing', { typing: false }); }
}

async function deliver(p) {
    p.pending = true; p.failed = false;
    render({ bottom: true });
    const replyTo = p.replyTo ? p.replyTo.id : undefined;
    const r = p.upload ? await upload('/chat/send-file', p.upload, { text: p.text, replyTo }) : await api('/chat/send', { text: p.text, replyTo });
    if (!r.ok) { p.pending = false; p.failed = true; render(); App.toast(r.error || 'ההודעה לא נשלחה', 'bad'); return; }
    App.sound('sent');
    C.pending = C.pending.filter(x => x !== p);
    C.fetching = false;
    await fetchChat({ bottom: true });
}

function send() {
    const input = $('#c-input');
    const text = input.value.trim();
    const file = C.attach;
    if (!text && !file) return;
    if (text.length > MAX_LEN) { App.toast(`ההודעה ארוכה מדי (עד ${MAX_LEN} תווים)`, 'bad'); return; }
    const p = { localId: 'l' + Date.now(), id: 'local', sender: 'user', text, upload: file, file: file ? { name: file.name, type: file.type, size: file.size } : null, createdAt: new Date().toLocaleString('sv-SE').replace('T', ' '), replyTo: C.replyTo };
    C.pending.push(p);
    input.value = ''; grow(); attach(null); $('#c-send').disabled = true;
    C.replyTo = null; replyBar();
    C.typingAt = 0;
    $('#c-emoji').hidden = true;
    App.haptic();
    deliver(p);
}

function reply(id) {
    const m = C.messages.find(x => String(x.id) === String(id));
    if (!m) return;
    C.replyTo = { id: m.id, sender: m.sender, text: m.text || (m.file ? `📎 ${m.file.name}` : '') };
    replyBar();
    $('#c-input').focus();
}
function replyBar() {
    const bar = $('#c-replybar');
    bar.hidden = !C.replyTo;
    if (!C.replyTo) return;
    $('#c-rb-who').textContent = C.replyTo.sender === 'user' ? 'ציטוט של ההודעה שלך' : 'ציטוט של הצוות';
    $('#c-rb-text').textContent = C.replyTo.text;
}
function jump(id) {
    const el = $(`#c-msgs [data-id="${CSS.escape(String(id))}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 500 });
}

function presence(state) { if (App.token) api('/chat/presence', { state }); }

Object.assign(App.actions, {
    'c-send': send,
    'c-older': loadOlder,
    'c-bottom': () => { const b = $('#c-scroll'); b.scrollTo({ top: b.scrollHeight, behavior: 'smooth' }); },
    'c-reply-cancel': () => { C.replyTo = null; replyBar(); },
    'c-attach': () => $('#c-file').click(),
    'c-attach-cancel': () => attach(null),
    'c-emoji': () => { C.emoji = !C.emoji; $('#c-emoji').hidden = !C.emoji; },
    'c-emoji-pick': el => { const i = $('#c-input'); i.setRangeText(el.dataset.e, i.selectionStart, i.selectionEnd, 'end'); i.focus(); $('#c-send').disabled = false; },
});

App.views.chat = {
    init(root) {
        C.root = root;
        shell();
        render();
        App.every(3000, () => { if (C.visible) fetchChat(); }, { hiddenMs: 15000 });
    },
    enter() {
        C.visible = true;
        App.setBadge('chat', 0);
        fetchChat({ bottom: true }).then(() => markRead());
        status();
    },
    leave() { C.visible = false; typing(false); },
    actions: () => App.mobileActions(['chat']),
    subtitle: () => statusText(),
};

// בדיקת תשובות חדשות גם כשהצ'אט לא פתוח, ודיווח נוכחות (כמו באתר הוותיק)
document.addEventListener('login', () => {
    C.baseline = null;
    checkUnread();
    presence('active');
    if (!C._timers) {
        C._timers = true;
        App.every(12000, () => { if (!C.visible) checkUnread(); }, { hiddenMs: 30000 });
        App.every(30000, () => { if (!document.hidden) presence('active'); }, { hiddenMs: 1e9 });
    }
});
document.addEventListener('visibilitychange', () => { if (App.token) presence(document.hidden ? 'hidden' : 'active'); if (!document.hidden && C.visible) fetchChat(); });
window.addEventListener('pagehide', () => {
    if (!App.token) return;
    try { navigator.sendBeacon(`${App.API}/chat/presence`, new Blob([JSON.stringify({ userToken: App.token, state: 'offline' })], { type: 'text/plain' })); } catch (e) {}
});
document.addEventListener('logout', () => { Object.assign(C, { messages: [], pending: [], hash: '', baseline: null, visible: false, attach: null }); if (App.views.chat) App.views.chat._init = false; });
})();
