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
    injectChatFileStyles();
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
        const fo = e.target.closest('[data-file-open]'); if (fo) { const m = C.messages.find(x => String(x.id) === fo.dataset.fileOpen); if (m) F.open(m.id, m.file); return; }
        const r = e.target.closest('[data-reply]'); if (r) { reply(r.dataset.reply); return; }
        const f = e.target.closest('.c-row.failed'); if (f) { const p = C.pending.find(x => x.localId === f.dataset.local); if (p) deliver(p); return; }
        const t = e.target.closest('[data-topic]'); if (t) { input.value = t.dataset.topic + ' – '; grow(); input.focus(); $('#c-send').disabled = false; }
    });
}

function sendState() { $('#c-send').disabled = !$('#c-input').value.trim() && !C.attach; }

// ---------- קבצים בצ'אט ----------
// אין לקבצים קישור ציבורי: כל קובץ נטען בבקשה מאומתת (עם הטוקן של המחובר) ומוצג מתוך הזיכרון של הדף.
// כל הקבצים נפתחים בתוך הצ'אט (תמונה, וידאו, שמע, PDF, טקסט), ותמיד אפשר גם לשמור אותם.
// קובץ שהמנהל הגביל (צפייה חד-פעמית / מספר צפיות / תוקף) לא נטען אוטומטית, וכל פתיחה שלו נספרת.

// api: פונקציה שמחזירה את כתובת ה-API, auth: פונקציה שמחזירה את הטוקן לבקשה
function createChatFiles({ api, auth, esc, toast, onChange, viewer = 'user' }) {
    const cache = new Map();
    const loading = new Map();
    const PDFJS = '/salamon/vendor/pdf.min.js';
    const PDFJS_WORKER = '/salamon/vendor/pdf.worker.min.js';
    const kind = type => {
        const t = String(type || '');
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

    async function fetchBlob(id, type) {
        let res;
        try {
            res = await fetch(`${api()}/chat/file`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...auth(), messageId: Number(id) }) });
        } catch (e) { throw new Error('שגיאת תקשורת מול השרת'); }
        if (!res.ok) {
            let d = {};
            try { d = await res.json(); } catch (e) {}
            const err = new Error(d.error || 'לא ניתן לפתוח את הקובץ');
            err.status = res.status;
            throw err;
        }
        const b = await res.blob();
        // הסוג הנכון חשוב לנגן הווידאו (במיוחד באייפון)
        return type && b.type !== type ? new Blob([b], { type }) : b;
    }
    // קבצים בלי הגבלה נשמרים בזיכרון הדף, כדי שרענון השיחה לא יטען אותם שוב
    function load(id, type) {
        if (cache.has(id)) return Promise.resolve(cache.get(id));
        if (!loading.has(id)) {
            loading.set(id, fetchBlob(id, type).then(b => { const u = URL.createObjectURL(b); cache.set(id, { url: u, blob: b }); return cache.get(id); }).finally(() => loading.delete(id)));
        }
        return loading.get(id);
    }

    function card(cls, ic, name, sub, attrs = '', tail = '') {
        return `<div class="cf-card ${cls}" ${attrs}><i class="fa-solid ${ic}"></i><span><b>${esc(name)}</b><small>${sub}</small></span>${tail}</div>`;
    }

    // state: 'up' (עולה), 'failed' (ההעלאה נכשלה), או ריק להודעה שנשמרה
    function html(f, id, state) {
        if (!f) return '';
        const t = String(f.type || ''), k = kind(t), key = String(id);
        if (state) return card('', icon(t, f.name), f.name, state === 'failed' ? 'לא נשלח · לחץ לשליחה חוזרת' : '<i class="fa-solid fa-circle-notch fa-spin"></i> מעלה…');
        const lim = f.limited || (viewer === 'admin' && f.views) ? limitText(f) : '';
        const badge = viewer === 'admin' && lim ? `<div class="cf-limit ${f.blocked ? 'off' : ''}"><i class="fa-solid fa-${f.blocked ? 'ban' : 'eye'}"></i> ${esc(lim)}${f.blocked ? ` · ${esc(BLOCKED[f.blocked] || '')}` : ''}</div>` : '';
        const openAttrs = `role="button" tabindex="0" data-file-open="${esc(key)}"`;
        if (viewer === 'user' && !f.available) return card('off', 'fa-lock', f.name, esc(BLOCKED[f.blocked] || 'הקובץ אינו זמין'));
        if (viewer === 'user' && f.limited && !f.master) return card('locked', 'fa-lock', f.name, `${esc(lim)} · ${OPEN_TEXT[k]}`, openAttrs, '<i class="fa-solid fa-eye cf-act"></i>');
        if (k === 'img') {
            const c = cache.get(key);
            return `<button type="button" class="cf-img" data-file-open="${esc(key)}" aria-label="${esc(f.name)}">${c ? `<img src="${c.url}" alt="">` : `<img data-hydrate="${esc(key)}" data-type="${esc(t)}" alt="">`}</button>${badge}`;
        }
        return card(k === 'video' || k === 'audio' ? 'media' : '', OPEN_ICON[k] || icon(t, f.name), f.name, `${esc(size(f.size))} · ${OPEN_TEXT[k]}`, openAttrs, `<i class="fa-solid fa-${k === 'video' || k === 'audio' ? 'play' : 'eye'} cf-act"></i>`) + badge;
    }

    // טעינת תמונות (בלי הגבלה) אחרי ציור ההודעות
    function hydrate(root) {
        if (!root) return;
        root.querySelectorAll('img[data-hydrate]').forEach(el => {
            load(el.dataset.hydrate, el.dataset.type).then(c => { el.src = c.url; el.removeAttribute('data-hydrate'); })
                .catch(() => { el.closest('.cf-img')?.classList.add('broken'); });
        });
    }

    function saveBlob(url, name) {
        const a = document.createElement('a');
        a.href = url; a.download = name || 'file';
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
    async function renderPdf(blob, body, isOpen) {
        body.innerHTML = '<div class="cf-v-wait"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען מסמך…</div>';
        const lib = await loadPdfJs();
        const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), standardFontDataUrl: '/salamon/vendor/standard_fonts/' }).promise;
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

    function viewerOpen({ url, blob }, f, temp) {
        const k = kind(f.type);
        const ov = document.createElement('div');
        ov.className = 'cf-viewer';
        ov.innerHTML = `<div class="cf-v-bar"><b>${esc(f.name)}</b><small>${esc(size(f.size))}</small><button type="button" class="cf-v-btn" data-v="save" aria-label="שמירה" title="שמירה למכשיר"><i class="fa-solid fa-download"></i></button><button type="button" class="cf-v-btn" data-v="close" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="cf-v-body ${k === 'pdf' || k === 'text' ? 'doc' : ''}"></div>
            ${f.limited && viewer === 'user' && !f.master ? `<div class="cf-v-note"><i class="fa-solid fa-lock"></i> ${esc(limitText(f))}</div>` : ''}`;
        const body = ov.querySelector('.cf-v-body');
        let open = true;
        if (k === 'img') body.innerHTML = `<img src="${url}" alt="">`;
        else if (k === 'video') body.innerHTML = `<video src="${url}" controls autoplay playsinline></video>`;
        else if (k === 'audio') body.innerHTML = `<div class="cf-v-audio"><i class="fa-solid fa-music"></i><audio src="${url}" controls autoplay></audio></div>`;
        else if (k === 'text') blob.text().then(t => { body.innerHTML = `<pre class="cf-v-text">${esc(t.slice(0, 500000))}</pre>`; });
        else if (k === 'pdf') renderPdf(blob, body, () => open).catch(() => {
            if (open) body.innerHTML = `<div class="cf-v-file"><i class="fa-solid fa-file-pdf"></i><b>${esc(f.name)}</b><p>לא ניתן להציג את המסמך כאן.</p><button type="button" class="cf-v-dl" data-v="save"><i class="fa-solid fa-download"></i> שמירה למכשיר</button></div>`;
        });
        else body.innerHTML = `<div class="cf-v-file"><i class="fa-solid ${icon(f.type, f.name)}"></i><b>${esc(f.name)}</b><p>${esc(size(f.size))} · אין תצוגה מקדימה לסוג קובץ זה</p><button type="button" class="cf-v-dl" data-v="save"><i class="fa-solid fa-download"></i> שמירה למכשיר</button></div>`;
        if (k === 'video') body.querySelector('video').addEventListener('error', () => {
            if (open) body.innerHTML = `<div class="cf-v-file"><i class="fa-solid fa-file-video"></i><b>${esc(f.name)}</b><p>הדפדפן הזה לא מצליח להציג את הסרטון. אפשר לשמור אותו ולצפות בו במכשיר.</p><button type="button" class="cf-v-dl" data-v="save"><i class="fa-solid fa-download"></i> שמירה למכשיר</button></div>`;
        });

        const close = () => { open = false; ov.remove(); document.removeEventListener('keydown', onKey, true); if (temp) URL.revokeObjectURL(url); };
        const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        ov.addEventListener('click', e => {
            const b = e.target.closest('[data-v]');
            if (b && b.dataset.v === 'save') { saveBlob(url, f.name); return; }
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
            if (limited) {
                const blob = await fetchBlob(key, f.type);
                viewerOpen({ url: URL.createObjectURL(blob), blob }, f, true);
            } else viewerOpen(await load(key, f.type), f, false);
        } catch (e) {
            toast(e.message);
        }
        if (limited && onChange) onChange();
    }

    function clear() {
        for (const c of cache.values()) URL.revokeObjectURL(c.url);
        cache.clear();
    }

    return { html, hydrate, open, clear, size, icon, limitText };
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
    .cf-img img:not([src]) { width: 220px; height: 150px; background: rgba(127,127,127,.15); }
    .cf-img.broken img { width: 220px; height: 60px; }
    .cf-limit { font-size: .72rem; opacity: .85; margin: -1px 0 4px; }
    .cf-limit.off { color: #ef4444; opacity: 1; }
    .cf-viewer { position: fixed; inset: 0; z-index: 3000; display: flex; flex-direction: column; background: rgba(2,6,23,.97); color: #fff; direction: rtl; font-family: inherit; animation: cfFade .15s ease; }
    @keyframes cfFade { from { opacity: 0; } }
    .cf-v-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; flex-shrink: 0; }
    .cf-v-bar b { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: .95rem; }
    .cf-v-bar small { opacity: .6; font-size: .78rem; direction: ltr; }
    .cf-v-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(255,255,255,.12); color: #fff; cursor: pointer; font-size: 1rem; flex-shrink: 0; }
    .cf-v-btn:hover { background: rgba(255,255,255,.22); }
    .cf-v-body { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 10px; }
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
    api: () => App.API, auth: () => ({ userToken: App.token }), esc,
    toast: msg => App.toast(msg, 'bad'),
    onChange: () => { C.fetching = false; C.hash = ''; fetchChat(); },
});

function attach(file) {
    if (file && file.size > MAX_FILE) { App.toast(`הקובץ גדול מדי (עד ${MAX_FILE / 1024 / 1024}MB)`, 'bad'); file = null; }
    C.attach = file || null;
    const bar = $('#c-attachbar'); if (!bar) return;
    bar.hidden = !C.attach;
    $('#c-file').value = '';
    if (C.attach) {
        $('#c-ab-icon').className = `fa-solid ${F.icon(C.attach.type, C.attach.name)}`;
        $('#c-ab-name').textContent = C.attach.name;
        $('#c-ab-size').textContent = `${F.size(C.attach.size)} · אפשר להוסיף הודעה ולשלוח`;
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
        <div class="c-bub ${m.isDeleted ? 'deleted' : ''} ${m.file && !m.isDeleted ? 'has-file' : ''}">${quote}${!m.isDeleted ? F.html(m.file, m.id, m.failed ? 'failed' : m.pending ? 'up' : '') : ''}${m.isDeleted || m.text ? `<div class="c-text">${m.isDeleted ? '🚫 ההודעה נמחקה' : App.richText(m.text)}</div>` : ''}
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
    F.hydrate($('#c-msgs'));
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
document.addEventListener('logout', () => { F.clear(); Object.assign(C, { messages: [], pending: [], hash: '', baseline: null, visible: false, attach: null }); if (App.views.chat) App.views.chat._init = false; });
})();
