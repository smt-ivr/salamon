// client-user-chat.js — צ'אט הלקוח עם ההנהלה

(() => {
'use strict';

const POLL_OPEN_MS = 3000;
const POLL_CLOSED_MS = 12000;
const PRESENCE_MS = 30000;
const LOGO_URL = 'https://smt-tel-manager.netlify.app/salamon-logo.png';
const MAX_LEN = 2000;
const MAX_FILE = 20 * 1024 * 1024;
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
    presence: '',
    presenceAt: 0,
    notifyBaseline: null,
    focusId: null,
    attach: null,
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

async function postFile(path, file, fields = {}) {
    const fd = new FormData();
    fd.append('userToken', state.userToken);
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) fd.append(k, v);
    fd.append('file', file, file.name);
    const res = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', body: fd });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok && data.success !== false, status: res.status, data };
}

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
    api: () => API_BASE_URL, auth: () => ({ userToken: state.userToken }), esc,
    toast: msg => { if (typeof showToast === 'function') showToast(msg, 'error'); },
    onChange: () => { C.fetching = false; C.hash = ''; fetchChat(); },
});

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

    .sc-notify-bar { display: none; align-items: center; gap: 10px; padding: 9px 14px; background: #ecfdf5; border-bottom: 1px solid #bbf7d0; font-size: .84rem; color: #166534; }
    .sc-notify-bar.show { display: flex; }
    .sc-notify-bar span { flex: 1; }
    .sc-notify-bar button { border: none; border-radius: 999px; padding: 6px 14px; font-size: .8rem; cursor: pointer; }
    .sc-notify-bar .sc-nb-on { background: #16a34a; color: #fff; font-weight: 600; }
    .sc-notify-bar .sc-nb-x { background: transparent; color: #166534; padding: 6px 8px; }
    .sc-pop { position: fixed; bottom: 18px; left: 18px; z-index: 1300; width: min(360px, calc(100vw - 36px)); display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 16px; background: #fff; box-shadow: 0 18px 50px rgba(15,23,42,.25); border: 1px solid #e2e8f0; cursor: pointer; font-family: inherit; animation: scRise .25s cubic-bezier(.2,.8,.2,1); direction: rtl; }
    .sc-pop img { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
    .sc-pop b { display: block; font-size: .92rem; color: #0f172a; margin-bottom: 2px; }
    .sc-pop p { margin: 0; font-size: .86rem; color: #475569; line-height: 1.45; max-height: 3.9em; overflow: hidden; }
    .sc-pop small { display: block; margin-top: 6px; color: #16a34a; font-weight: 600; font-size: .78rem; }
    .sc-pop-x { position: absolute; top: 8px; left: 8px; border: none; background: none; color: #94a3b8; cursor: pointer; font-size: .9rem; }
    .sc-preview { position: fixed; inset: 0; z-index: 1250; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,.5); backdrop-filter: blur(3px); padding: 16px; }
    .sc-preview-card { width: min(420px, 100%); background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 30px 80px rgba(0,0,0,.35); font-family: inherit; direction: rtl; text-align: right; }
    .sc-preview-card h4 { margin: 0 0 12px; font-size: 1.1rem; }
    .sc-preview-msg { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 12px 14px; white-space: pre-wrap; color: #0f172a; line-height: 1.6; }
    .sc-preview-card p { color: #64748b; font-size: .88rem; margin: 14px 0; }
    .sc-preview-card button { width: 100%; border: none; border-radius: 12px; padding: 12px; background: #16a34a; color: #fff; font-weight: 700; font-size: .95rem; cursor: pointer; font-family: inherit; }

    .sc-attachbar { display: none; align-items: center; gap: 10px; padding: 8px 12px; background: #f0f2f5; border-top: 1px solid #e2e8f0; }
    .sc-attachbar.show { display: flex; }
    .sc-attachbar > i { font-size: 1.5rem; color: #2563eb; }
    .sc-attachbar .sc-ab { flex: 1; min-width: 0; font-size: .84rem; line-height: 1.3; }
    .sc-attachbar .sc-ab b { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sc-attachbar .sc-ab small { color: #667781; }
    .sc-attachbar .sc-icon-btn { color: #54656f; width: 32px; height: 32px; }
    .sc-overlay.drag .sc-panel { outline: 3px dashed #16a34a; outline-offset: -8px; }

    .chat-badge-pulse { animation: badgePulse 1.5s infinite; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    @keyframes badgePulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
    @media (prefers-reduced-motion: reduce) { .sc-overlay *, .sc-overlay { animation: none !important; } }
    `;
    document.head.appendChild(css);
    injectChatFileStyles();
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
            <div class="sc-notify-bar" id="sc-notify-bar"><i class="fa-regular fa-bell"></i><span>לקבל התראה בדפדפן כשעונים לך?</span><button type="button" class="sc-nb-on" id="sc-nb-on">הפעלה</button><button type="button" class="sc-nb-x" id="sc-nb-x" aria-label="לא תודה"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="sc-body">
                <div class="sc-msgs" id="sc-msgs"></div>
                <button class="sc-fab" id="sc-fab" aria-label="לסוף השיחה"><i class="fa-solid fa-chevron-down"></i><b id="sc-fab-count" hidden></b></button>
            </div>
            <div class="sc-replybar" id="sc-replybar">
                <div class="sc-rb"><b id="sc-rb-who"></b><span id="sc-rb-text"></span></div>
                <button class="sc-icon-btn" id="sc-rb-cancel" aria-label="ביטול ציטוט"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="sc-attachbar" id="sc-attachbar">
                <i class="fa-solid fa-file" id="sc-ab-icon"></i>
                <div class="sc-ab"><b id="sc-ab-name"></b><small id="sc-ab-size"></small></div>
                <button class="sc-icon-btn" id="sc-ab-cancel" type="button" aria-label="הסרת הקובץ"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form class="sc-compose" id="sc-form">
                <div class="sc-emoji" id="sc-emoji">${EMOJIS.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('')}</div>
                <button type="button" class="sc-icon-btn" id="sc-emoji-btn" aria-label="אימוג׳י"><i class="fa-regular fa-face-smile"></i></button>
                <button type="button" class="sc-icon-btn" id="sc-attach-btn" aria-label="צירוף קובץ" title="צירוף קובץ"><i class="fa-solid fa-paperclip"></i></button>
                <input type="file" id="sc-file" hidden>
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
            ${!m.isDeleted ? F.html(m.file, m.id, m.failed ? 'failed' : m.pending ? 'up' : '') : ''}
            ${m.isDeleted || m.text ? `<div class="sc-text">${m.isDeleted ? '🚫 ההודעה נמחקה' : richText(m.text)}</div>` : ''}
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
    F.hydrate(box);

    if (keepPosition) box.scrollTop = box.scrollHeight - prevHeight + prevTop;
    else if (forceBottom || atBottom) box.scrollTop = box.scrollHeight;
    else box.scrollTop = prevTop;
    if (C.focusId && C.messages.some(m => String(m.id) === String(C.focusId))) { const id = C.focusId; C.focusId = null; setTimeout(() => jumpTo(id), 60); }
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
            const freshMsgs = C.messages.length ? msgs.filter(m => !before.has(m.id) && m.sender === 'admin' && !m.isDeleted) : [];
            const fresh = freshMsgs.length;
            if (fresh && document.hidden) notifyNewMessage(freshMsgs[freshMsgs.length - 1]);
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
        renderNotifyBar();
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
        if (!r.ok) return;
        updateBadge(r.data.unreadCount);
        const last = r.data.lastUnread;
        // הודעות שהגיעו לפני טעינת העמוד לא מקפיצות התראה, רק הודעות חדשות
        if (C.notifyBaseline === null) { C.notifyBaseline = last ? last.id : 0; return; }
        if (last && last.id > C.notifyBaseline) {
            C.notifyBaseline = last.id;
            if (!C.open || document.hidden) notifyNewMessage({ id: last.id, text: last.text });
        }
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
        const replyTo = p.replyTo ? p.replyTo.id : undefined;
        const r = p.upload
            ? await postFile('/chat/send-file', p.upload, { text: p.text, replyTo, ...(await F.prepare(p.upload)) })
            : await post('/chat/send', { text: p.text, replyTo });
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
    const upload = C.attach;
    if (!text && !upload) return;
    if (text.length > MAX_LEN) { if (typeof showToast === 'function') showToast(`ההודעה ארוכה מדי (עד ${MAX_LEN} תווים)`, 'error'); return; }
    const p = {
        localId: 'l' + Date.now(), id: 'local', sender: 'user', text, upload,
        file: upload ? { name: upload.name, type: upload.type, size: upload.size } : null,
        createdAt: new Date().toLocaleString('sv-SE').replace('T', ' '),
        replyTo: C.replyTo ? { id: C.replyTo.id, sender: C.replyTo.sender, text: C.replyTo.text } : null,
    };
    C.pending.push(p);
    input.value = '';
    setAttach(null);
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
    $('#sc-send').disabled = !t.value.trim() && !C.attach;
}

function setAttach(file) {
    if (file && file.size > MAX_FILE) {
        if (typeof showToast === 'function') showToast(`הקובץ גדול מדי (עד ${MAX_FILE / 1024 / 1024}MB)`, 'error');
        file = null;
    }
    C.attach = file || null;
    $('#sc-attachbar').classList.toggle('show', !!C.attach);
    $('#sc-file').value = '';
    if (C.attach) {
        $('#sc-ab-icon').className = `fa-solid ${F.icon(C.attach.type, C.attach.name)}`;
        $('#sc-ab-name').textContent = C.attach.name;
        $('#sc-ab-size').textContent = F.size(C.attach.size) + ' · אפשר להוסיף הודעה ולשלוח';
        $('#sc-input').focus();
    }
    autoGrow();
}

function startReply(id) {
    const m = C.messages.find(x => String(x.id) === String(id));
    if (!m) return;
    C.replyTo = { id: m.id, sender: m.sender, text: m.text || (m.file ? `📎 ${m.file.name}` : '') };
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
    $('#sc-attach-btn').addEventListener('click', () => $('#sc-file').click());
    $('#sc-file').addEventListener('change', e => setAttach(e.target.files && e.target.files[0]));
    $('#sc-ab-cancel').addEventListener('click', () => setAttach(null));
    input.addEventListener('paste', e => {
        const f = [...(e.clipboardData && e.clipboardData.files || [])][0];
        if (f) { e.preventDefault(); setAttach(f); }
    });
    // גרירת קובץ לחלון הצ'אט
    modal.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); modal.classList.add('drag'); } });
    modal.addEventListener('dragleave', e => { if (e.target === modal || !modal.contains(e.relatedTarget)) modal.classList.remove('drag'); });
    modal.addEventListener('drop', e => {
        modal.classList.remove('drag');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) { e.preventDefault(); setAttach(f); }
    });
    $('#sc-nb-on').addEventListener('click', enableNotifications);
    $('#sc-nb-x').addEventListener('click', () => { try { localStorage.setItem('salamonChatNotifyAsked', '1'); } catch (e) {} renderNotifyBar(); });
    $('#sc-fab').addEventListener('click', () => { const box = $('#sc-msgs'); box.scrollTop = box.scrollHeight; C.unreadBelow = 0; updateFab(); });
    $('#sc-msgs').addEventListener('scroll', updateFab, { passive: true });
    $('#sc-msgs').addEventListener('click', e => {
        const reply = e.target.closest('[data-reply]');
        if (reply) { startReply(reply.dataset.reply); return; }
        const file = e.target.closest('[data-file-open]');
        if (file) { const m = C.messages.find(x => String(x.id) === file.dataset.fileOpen); if (m) F.open(m.id, m.file); return; }
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

// ---------- Notifications ----------

function notifySupported() { return 'Notification' in window; }
function notifyEnabled() {
    try { return notifySupported() && Notification.permission === 'granted' && localStorage.getItem('salamonChatNotify') !== '0'; } catch (e) { return false; }
}

function renderNotifyBar() {
    let dismissed = false;
    try { dismissed = localStorage.getItem('salamonChatNotifyAsked') === '1'; } catch (e) {}
    const show = notifySupported() && Notification.permission === 'default' && !dismissed && C.messages.some(m => m.sender === 'user');
    $('#sc-notify-bar').classList.toggle('show', show);
}

async function enableNotifications() {
    if (!notifySupported()) return false;
    let perm = Notification.permission;
    if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch (e) {} }
    try { localStorage.setItem('salamonChatNotifyAsked', '1'); localStorage.setItem('salamonChatNotify', perm === 'granted' ? '1' : '0'); } catch (e) {}
    renderNotifyBar();
    if (perm === 'granted' && typeof showToast === 'function') showToast('מעכשיו תקבל התראה כשעונים לך בצ\'אט', 'success');
    return perm === 'granted';
}

function chime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const t = ctx.currentTime;
        [660, 990].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t + i * 0.13);
            g.gain.exponentialRampToValueAtTime(0.09, t + i * 0.13 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.13 + 0.28);
            o.connect(g).connect(ctx.destination);
            o.start(t + i * 0.13); o.stop(t + i * 0.13 + 0.3);
        });
    } catch (e) {}
}

// הודעה חדשה מההנהלה: התראת דפדפן כשהלשונית ברקע, חלונית קופצת כשהאתר פתוח והצ'אט סגור
function notifyNewMessage(m) {
    const text = String(m.text || '').slice(0, 160);
    if (document.hidden) {
        if (!notifyEnabled()) return;
        try {
            const n = new Notification('תשובה חדשה מצוות עכשיו סלומון', { body: text, icon: LOGO_URL, tag: 'salamon-chat', renotify: true });
            n.onclick = () => { window.focus(); C.focusId = m.id; openChat(); n.close(); };
        } catch (e) {}
        return;
    }
    if (C.open) return;
    chime();
    document.getElementById('sc-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'sc-pop';
    pop.id = 'sc-pop';
    pop.setAttribute('role', 'alert');
    pop.innerHTML = `<img src="${LOGO_URL}" alt=""><div><b>תשובה חדשה מצוות עכשיו סלומון</b><p>${esc(text)}</p><small>לחץ לפתיחת הצ'אט</small></div><button class="sc-pop-x" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button>`;
    pop.addEventListener('click', e => {
        pop.remove();
        if (e.target.closest('.sc-pop-x')) return;
        C.focusId = m.id;
        openChat();
    });
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 12000);
}

// ---------- Presence ----------
// מדווח להנהלה אם הלקוח מול המסך, בכרטיסייה אחרת, או שיצא מהאתר

function sendPresence(st, force) {
    if (!state.userToken) return;
    if (!force && st === C.presence) return;
    C.presence = st;
    C.presenceAt = Date.now();
    post('/chat/presence', { state: st }).catch(() => {});
}

function presenceOffline() {
    if (!state.userToken) return;
    try {
        navigator.sendBeacon(`${API_BASE_URL}/chat/presence`, new Blob([JSON.stringify({ userToken: state.userToken, state: 'offline' })], { type: 'text/plain' }));
    } catch (e) {}
}

// ---------- Email link ----------
// קישור חד-פעמי מהמייל (?ml=...) - פותח את הצ'אט, ואם צריך מחבר את הלקוח בחיבור זמני

async function handleEmailLink() {
    let token = null;
    try { token = sessionStorage.getItem('salamonChatLink'); sessionStorage.removeItem('salamonChatLink'); } catch (e) {}
    if (!token) return;
    let existing = null;
    try { existing = localStorage.getItem('userToken'); } catch (e) {}
    let r;
    try {
        const res = await fetch(`${API_BASE_URL}/chat/link`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, userToken: existing || undefined }) });
        r = { ok: res.ok, data: await res.json().catch(() => ({})) };
    } catch (e) { return; }

    const openAfterLogin = id => { try { sessionStorage.setItem('salamonOpenChat', '1'); } catch (e) {} C.focusId = id || null; };

    if (!r.ok) {
        openAfterLogin();
        if (!existing && typeof showToast === 'function') showToast(r.data.error || 'הקישור אינו תקין', 'error');
        return;
    }
    openAfterLogin(r.data.messageId);
    if (r.data.userToken) {
        try { localStorage.setItem('userToken', r.data.userToken); } catch (e) {}
        if (typeof silentLogin === 'function') silentLogin(r.data.userToken);
        return;
    }
    if (r.data.needLogin && r.data.preview) {
        const ov = document.createElement('div');
        ov.className = 'sc-preview';
        ov.innerHTML = `<div class="sc-preview-card"><h4>💬 הודעה מצוות עכשיו סלומון</h4><div class="sc-preview-msg">${esc(r.data.preview.text)}</div>
            <p>החשבון שלך מוגדר לכניסה עם Google בלבד. התחבר עם Google, והצ'אט ייפתח אוטומטית כדי שתוכל להשיב.</p><button type="button">הבנתי, להתחברות</button></div>`;
        ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('button')) ov.remove(); });
        document.body.appendChild(ov);
    }
}

// ---------- Groups link ----------
// קישור לצ'אט הקבוצתי מופיע בתפריט רק למי שיש לו קבוצות (או קבוצות שאפשר להצטרף אליהן)

async function checkGroups() {
    try {
        const r = await post('/groups/me');
        const nav = document.querySelector('.nav-menu');
        let item = document.getElementById('tab-btn-groups');
        const has = r.ok && ((r.data.groups || []).length || (r.data.discover || []).length);
        if (!has || !nav) { if (item) item.remove(); return; }
        const unread = (r.data.groups || []).reduce((n, g) => n + (g.unread || 0), 0);
        if (!item) {
            item = document.createElement('a');
            item.id = 'tab-btn-groups';
            item.className = 'nav-item';
            item.href = '/salamon/groups';
            item.style.textDecoration = 'none';
            nav.appendChild(item);
        }
        item.innerHTML = `<i class="fa-solid fa-people-group"></i> <span style="margin-right: 5px;">קבוצות</span>${unread ? `<span style="margin-inline-start:auto;background:var(--danger);color:#fff;border-radius:10px;padding:0 7px;font-size:12px;font-weight:700;">${unread > 99 ? '99+' : unread}</span>` : ''}`;
    } catch (e) {}
}

// ---------- Lifecycle ----------

function tick() {
    if (!state.userToken) return;
    const now = Date.now();
    if (!document.hidden && now - C.presenceAt > PRESENCE_MS) sendPresence('active', true);
    const interval = C.open && !document.hidden ? POLL_OPEN_MS : POLL_CLOSED_MS;
    if (now - C.lastPoll < interval) return;
    C.lastPoll = now;
    if (!document.hidden && now - (C.groupsAt || 0) > 60000) { C.groupsAt = now; checkGroups(); }
    if (C.open && !document.hidden) fetchChat();
    else checkUnread();
}

// קישור מהמייל: ?chat=open פותח את הצ'אט מיד אחרי ההתחברות
function captureOpenIntent() {
    try {
        const url = new URL(location.href);
        if (url.searchParams.get('chat') !== 'open' && !url.searchParams.get('ml')) return;
        sessionStorage.setItem('salamonOpenChat', '1');
        if (url.searchParams.get('ml')) sessionStorage.setItem('salamonChatLink', url.searchParams.get('ml'));
        url.searchParams.delete('chat');
        url.searchParams.delete('ml');
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
    handleEmailLink();

    let hadToken = false;
    setInterval(() => {
        const has = !!state.userToken;
        if (has && !hadToken) {
            hadToken = true;
            C.lastPoll = 0;
            C.notifyBaseline = null;
            sendPresence(document.hidden ? 'hidden' : 'active', true);
            checkUnread();
            checkGroups();
            setTimeout(consumeOpenIntent, 300);
        } else if (!has && hadToken) {
            hadToken = false;
            C.messages = []; C.pending = []; C.hash = '';
            document.getElementById('tab-btn-groups')?.remove();
            setAttach(null);
            F.clear();
            if (C.open) closeChat();
            updateBadge(0);
        }
        tick();
    }, 500);
    document.addEventListener('visibilitychange', () => {
        sendPresence(document.hidden ? 'hidden' : 'active');
        if (!document.hidden) { C.lastPoll = 0; tick(); }
    });
    window.addEventListener('pagehide', presenceOffline);
});

// נקודות כניסה שה-HTML של האתר קורא להן
window.openUserChatModal = openChat;
window.closeUserChatModal = closeChat;
window.checkUnreadMessages = checkUnread;
window.salamonChatNotifications = {
    supported: notifySupported,
    enabled: notifyEnabled,
    permission: () => (notifySupported() ? Notification.permission : 'unsupported'),
    enable: enableNotifications,
    disable: () => { try { localStorage.setItem('salamonChatNotify', '0'); } catch (e) {} },
};

})();
