// groups.js — צ'אט קבוצתי (כמו גוגל צ'אט), בכתובת /salamon/groups.
// נכנסים עם החיבור של האתר, כאורח מקישור הזמנה, או כמנהל מתוך מרכז השליטה.
// כל ההרשאות נבדקות בשרת; כאן רק מציגים את מה שמותר לכל אחד.

(() => {
'use strict';

const API = location.origin + '/salamon/api';
const EMOJIS = ['😊', '🙏', '👍', '❤️', '😂', '🙂', '😅', '🤔', '😮', '😢', '🎉', '✅', '❌', '🔥', '👏', '💪', '📞', '🎧', '⏳', '📩', '🙌', '😉', '🤝', '⭐'];
const ROLE_TAG = { admin: '<span class="tag admin">מנהל</span>', moderator: '<span class="tag mod">מפקח</span>' };
const DURATIONS = [[15, '15 דקות'], [60, 'שעה'], [1440, 'יום'], [10080, 'שבוע'], [43200, 'חודש'], [0, 'ללא הגבלה']];
const LOG_LABELS = { CREATE: 'יצירת הקבוצה', SETTINGS: 'שינוי הגדרות', JOIN: 'הצטרפות', JOIN_REQUEST: 'בקשת הצטרפות', LEAVE: 'עזיבה', APPROVE: 'אישור', REJECT: 'דחייה', REMOVE: 'הסרה', BAN: 'חסימה', UNBAN: 'ביטול חסימה', MUTE: 'השתקה', UNMUTE: 'ביטול השתקה', PROMOTE: 'מינוי למפקח', DEMOTE: 'הסרת מפקח', RENAME: 'שינוי שם', INVITE_CREATE: 'יצירת הזמנה', INVITE_REVOKE: 'ביטול הזמנה', PIN: 'הצמדה', UNPIN: 'ביטול הצמדה', DELETE_MESSAGE: 'מחיקת הודעה', ADD_MEMBERS: 'הוספת חברים', ARCHIVE: 'העברה לארכיון' };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function rich(t) { return esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`); }
function store(kind) { try { return kind === 's' ? sessionStorage : localStorage; } catch (e) { return null; } }
function getItem(k, kind) { try { return store(kind)?.getItem(k) || null; } catch (e) { return null; } }
function setItem(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

const S = { auth: {}, me: null, groups: [], discover: [], gid: null, info: null, messages: [], hash: '', hasMore: false, perms: {}, replyTo: null, editId: null, attach: null, panel: null, modTab: 'pending', search: '', typingAt: 0, loadingOlder: false, fetching: false };

async function api(path, body = {}) {
    try {
        const res = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...S.auth, ...body }) });
        let data = {};
        try { data = await res.json(); } catch (e) {}
        const ok = res.ok && data.success !== false;
        return { ok, status: res.status, data, error: ok ? null : (data.error || 'משהו השתבש, נסו שוב') };
    } catch (e) { return { ok: false, status: 0, data: {}, error: navigator.onLine ? 'אין תקשורת עם השרת' : 'אין חיבור לאינטרנט' }; }
}

async function upload(path, file, fields) {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ ...S.auth, ...fields })) if (v !== undefined && v !== null && v !== '') fd.append(k, v);
    fd.append('file', file, file.name);
    try {
        const res = await fetch(API + path, { method: 'POST', body: fd });
        let data = {};
        try { data = await res.json(); } catch (e) {}
        const ok = res.ok && data.success !== false;
        return { ok, data, error: ok ? null : (data.error || 'הקובץ לא נשלח') };
    } catch (e) { return { ok: false, data: {}, error: 'אין תקשורת עם השרת' }; }
}

function toast(msg, tone = '') {
    const el = document.createElement('div');
    el.className = `toast ${tone}`;
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3800);
}

// צבע קבוע לכל שם
function hue(str) { let h = 0; for (const c of String(str || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function avatar(name, { color, cls = '' } = {}) {
    const letter = String(name || '?').trim().charAt(0) || '?';
    const bg = color || `hsl(${hue(name)} 55% 45%)`;
    return `<span class="avatar ${cls}" style="background:${esc(bg)}">${esc(letter)}</span>`;
}
function parseDate(s) { const d = s ? new Date(String(s).replace(' ', 'T')) : null; return d && !isNaN(d) ? d : null; }
function hm(s) { const d = parseDate(s); return d ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''; }
function shortWhen(s) {
    const d = parseDate(s); if (!d) return '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return d >= today ? hm(s) : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}
function dayLabel(d) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    const diff = Math.round((t - x) / 86400000);
    return diff === 0 ? 'היום' : diff === 1 ? 'אתמול' : d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fullWhen(s) { const d = parseDate(s); return d ? d.toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''; }

// ---------- קבצים בצ'אט ----------
// הקובץ נטען ישירות מהקישור שהשרת נותן (לא דרך הזיכרון של הדף), כך שגם סינון כמו נטפרי רואה ומעביר אותו כרגיל.
// לפי ההגדרה במרכז השליטה: קישור קבוע שנבדק מול עוגיית החיבור (כמו גוגל), או קישור חתום ומוגבל בזמן.
// כל הקבצים נפתחים בתוך הצ'אט (תמונה, וידאו, שמע, PDF, טקסט), ותמיד אפשר גם לשמור אותם.
// קובץ שהמנהל הגביל (צפייה חד-פעמית / מספר צפיות / תוקף) לא נטען אוטומטית, וכל פתיחה שלו נספרת.

// api: פונקציה שמחזירה את כתובת ה-API, auth: פונקציה שמחזירה את הטוקן לבקשה
function createChatFiles({ api, auth, esc, toast, onChange, viewer = 'user', thumbPath = '/chat/file-thumb' }) {
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
        const m = /[?&]e=(\d+)/.exec(s) || /\/(?:chat|groups)\/f\/\d+\/[ft]\/(\d+)\//.exec(s);
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
        const r = await fetch(`${api()}${thumbPath}`, { method: 'POST', body: fd }).catch(() => null);
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
    api: () => API, auth: () => S.auth, esc, viewer: 'user', thumbPath: '/groups/file-thumb',
    toast: msg => toast(msg, 'bad'),
    onChange: () => { S.hash = ''; loadMessages(); },
});

// ---------- כניסה ----------

function pickAuth() {
    const hashAs = /(^|[#&])as=admin/.test(location.hash) || new URLSearchParams(location.search).get('as') === 'admin';
    const admin = getItem('salamonGroupsAdmin', 's') || getItem('adminToken');
    const user = getItem('userToken');
    const guest = getItem('salamonGuestToken');
    if (hashAs && admin) return { adminToken: admin };
    if (user) return { userToken: user };
    if (guest) return { guestToken: guest };
    return {};
}

function gate(html) {
    $('#splash').hidden = true;
    $('#app').hidden = true;
    $('#gate').hidden = false;
    $('#gate-body').innerHTML = html;
}

function gateLogin(note = '') {
    gate(`<h1>קבוצות · עכשיו סלומון</h1>
        <p>${note ? esc(note) + '<br>' : ''}כדי להיכנס לקבוצות צריך להיות מחובר/ת לאתר, או להצטרף דרך קישור הזמנה.</p>
        <a class="btn primary block" href="/salamon"><i class="fa-solid fa-right-to-bracket"></i> התחברות לאתר</a>
        <p class="muted" style="margin-top:14px;">אחרי ההתחברות חזרו לכתובת הזו.</p>`);
}

async function showInvite(code) {
    const r = await api('/groups/invite/info', { code });
    if (!r.ok) { gate(`<h1>קישור הזמנה</h1><p>${esc(r.error)}</p><a class="btn block" href="/salamon/groups">לקבוצות שלי</a>`); return; }
    const d = r.data, g = d.group;
    const head = `<h1>הוזמנת לקבוצה</h1><div class="gate-group">${avatar(g.name, { color: g.color, cls: 'lg group' })}<div><b>${esc(g.name)}</b><div class="muted">${esc(g.description || '')}</div></div></div>`;
    const accept = async extra => {
        const btn = $('#gate-go'); if (btn) btn.disabled = true;
        const a = await api('/groups/invite/accept', { code, ...extra });
        if (btn) btn.disabled = false;
        if (!a.ok) { toast(a.error, 'bad'); return; }
        if (a.data.guestToken) { setItem('salamonGuestToken', a.data.guestToken); S.auth = { guestToken: a.data.guestToken }; }
        setItem('salamonPendingInvite', null);
        history.replaceState(null, '', `/salamon/groups#g=${a.data.groupId}`);
        if (a.data.status === 'pending') { gate(`${head}<p><i class="fa-solid fa-hourglass-half"></i> הבקשה שלך נשלחה. אחרי שמפקח יאשר אותה, הקבוצה תופיע כאן.</p><a class="btn block" href="/salamon/groups">לקבוצות שלי</a>`); return; }
        enterApp();
    };
    if (S.auth.userToken || S.auth.guestToken) {
        if (S.auth.userToken && !d.allowUsers) { gate(`${head}<p>הקישור הזה מיועד לאורחים בלבד.</p>`); return; }
        gate(`${head}<p>${d.approval || (S.auth.guestToken && d.guestApproval) ? 'הבקשה תישלח לאישור מפקח.' : 'לחצו כדי להצטרף לקבוצה.'}</p><button class="btn primary block" id="gate-go">הצטרפות לקבוצה</button>`);
        $('#gate-go').onclick = () => accept({});
        return;
    }
    if (!d.allowGuests) {
        setItem('salamonPendingInvite', code);
        gateLogin('הקבוצה הזו פתוחה רק למשתמשי האתר.');
        return;
    }
    gate(`${head}
        <form id="guest-form">
            <div class="field"><label>השם שלך</label><input class="input" id="g-name" required minlength="2" maxlength="40" autocomplete="name"></div>
            <div class="field"><label>טלפון${d.guestPhoneRequired ? '' : ' (לא חובה)'}</label><input class="input ltr" id="g-phone" inputmode="tel" ${d.guestPhoneRequired ? 'required' : ''} autocomplete="tel"></div>
            <button class="btn primary block" id="gate-go">${d.guestApproval ? 'שליחת בקשה להצטרפות' : 'הצטרפות כאורח/ת'}</button>
        </form>
        ${d.allowUsers ? '<p class="muted" style="margin-top:14px;">יש לך חשבון באתר? <a href="/salamon" id="gate-login">התחברות לאתר</a> ואז חזרו לקישור הזה.</p>' : ''}`);
    $('#gate-login')?.addEventListener('click', () => setItem('salamonPendingInvite', code));
    $('#guest-form').addEventListener('submit', e => { e.preventDefault(); accept({ name: $('#g-name').value.trim(), phone: $('#g-phone').value.trim() }); });
}

async function enterApp() {
    const r = await api('/groups/me');
    if (!r.ok) {
        if (r.status === 401) {
            if (S.auth.guestToken) setItem('salamonGuestToken', null);
            gateLogin(S.auth.userToken ? 'החיבור לאתר פג תוקף.' : '');
            return;
        }
        gate(`<h1>קבוצות</h1><p>${esc(r.error)}</p><button class="btn block" onclick="location.reload()">ניסיון נוסף</button>`);
        return;
    }
    S.me = r.data.me;
    S.groups = r.data.groups;
    S.discover = r.data.discover || [];
    $('#splash').hidden = true;
    $('#gate').hidden = true;
    $('#app').hidden = false;
    renderMe();
    renderList();
    const m = /g=(\d+)/.exec(location.hash);
    if (m && (S.groups.some(g => String(g.id) === m[1]) || S.me.type === 'admin')) openGroup(Number(m[1]));
    else if (!S.gid && S.groups.length && window.matchMedia('(min-width: 901px)').matches) openGroup(S.groups.find(g => g.status === 'active')?.id);
    if (!S.timers) {
        S.timers = true;
        setInterval(() => { if (!document.hidden) refreshList(); }, 10000);
        setInterval(() => { if (S.gid && !document.hidden) loadMessages(); }, 3000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden && S.gid) loadMessages(); });
    }
}

function renderMe() {
    const m = S.me;
    const sub = m.type === 'admin' ? 'מנהל ראשי' : m.type === 'guest' ? 'אורח/ת' : m.master ? 'התחברות מאסטר' : 'משתמש/ת באתר';
    $('#me').innerHTML = `${avatar(m.name, { color: m.type === 'admin' ? '#c5221f' : undefined })}<div style="min-width:0"><b>${esc(m.name)}</b><small>${esc(sub)}</small></div>`;
}

async function refreshList() {
    const r = await api('/groups/me');
    if (!r.ok) return;
    S.groups = r.data.groups;
    S.discover = r.data.discover || [];
    renderList();
}

function renderList() {
    const q = S.search.toLowerCase();
    const match = g => !q || String(g.name).toLowerCase().includes(q);
    const mine = S.groups.filter(match);
    let html = mine.length ? '' : `<div class="empty">${S.groups.length ? 'לא נמצאו קבוצות' : 'עדיין אין לך קבוצות'}</div>`;
    for (const g of mine) {
        const tag = g.status === 'pending' ? '<span class="tag warn">ממתין לאישור</span>' : g.status === 'banned' ? '<span class="tag bad">חסום</span>' : g.announce ? '<i class="fa-solid fa-bullhorn" style="font-size:.75rem;color:var(--text-3)" title="ערוץ הודעות"></i>' : '';
        const closed = g.hours && !g.hours.open ? '<i class="fa-solid fa-moon" style="font-size:.75rem;color:var(--text-3)" title="מחוץ לשעות הפעילות"></i>' : '';
        const last = g.last ? `${g.last.sender ? esc(g.last.sender) + ': ' : ''}${esc(g.last.text)}` : esc(g.description || '');
        html += `<button class="gl-item ${S.gid === g.id ? 'on' : ''} ${g.unread ? 'unread' : ''}" data-act="open" data-id="${g.id}">
            ${avatar(g.name, { color: g.color, cls: 'group' })}
            <span class="gl-text"><b>${esc(g.name)} ${tag}${closed}</b><small>${last}</small></span>
            <span class="gl-meta">${g.last ? esc(shortWhen(g.last.at)) : ''}${g.unread ? `<span class="badge-n">${g.unread > 99 ? '99+' : g.unread}</span>` : ''}</span>
        </button>`;
    }
    const disc = S.discover.filter(match);
    if (disc.length) {
        html += '<div class="gl-title">קבוצות שאפשר להצטרף אליהן</div>';
        for (const g of disc) html += `<div class="gl-item">${avatar(g.name, { color: g.color, cls: 'group' })}<span class="gl-text"><b>${esc(g.name)}</b><small>${g.members} חברים${g.description ? ' · ' + esc(g.description) : ''}</small></span>
            <button class="btn sm ${g.join === 'open' ? 'primary' : ''}" data-act="join" data-id="${g.id}">${g.join === 'open' ? 'הצטרפות' : 'בקשה'}</button></div>`;
    }
    $('#group-list').innerHTML = html;
    document.title = `${S.groups.reduce((n, g) => n + (g.unread || 0), 0) ? '(' + S.groups.reduce((n, g) => n + (g.unread || 0), 0) + ') ' : ''}קבוצות · עכשיו סלומון`;
}

// ---------- חדר ----------

async function openGroup(id) {
    if (!id) return;
    const changed = S.gid !== id;
    S.gid = id;
    if (changed) {
        S.messages = []; S.hash = ''; S.hasMore = false; S.replyTo = null; S.editId = null; setAttach(null); bars();
        $('#msgs').innerHTML = '<div class="empty"><i class="fa-solid fa-circle-notch spin"></i></div>';
    }
    history.replaceState(null, '', `#g=${id}${S.auth.adminToken ? '&as=admin' : ''}`);
    $('#app').classList.add('in-room');
    $('#empty-main').hidden = true;
    $('#room').hidden = false;
    renderList();
    const r = await api('/groups/open', { groupId: id });
    if (S.gid !== id) return;
    if (!r.ok) {
        S.info = null;
        $('#room-name').textContent = (S.groups.find(g => g.id === id) || {}).name || '';
        $('#room-sub').textContent = '';
        $('#msgs').innerHTML = `<div class="empty"><i class="fa-solid fa-lock" style="font-size:2rem;opacity:.5"></i><p>${esc(r.error)}</p></div>`;
        $('#composer').hidden = true; $('#notice').hidden = true;
        ['btn-pinned', 'btn-members', 'btn-mod'].forEach(b => { $('#' + b).hidden = true; });
        return;
    }
    S.info = r.data;
    renderRoomHead();
    if (S.panel) renderPanel();
    await loadMessages({ bottom: true });
    if (window.matchMedia('(min-width: 901px)').matches) $('#input').focus();
}

function renderRoomHead() {
    const d = S.info, g = d.group, p = d.me.perms;
    $('#room-avatar').innerHTML = avatar(g.name, { color: g.color, cls: 'group' });
    $('#room-name').textContent = g.name;
    const online = d.members.filter(m => m.online).length;
    $('#room-sub').textContent = `${d.memberCount} חברים${online ? ` · ${online} מחוברים` : ''}${g.announce ? ' · ערוץ הודעות' : ''}`;
    $('#btn-pinned').hidden = false;
    $('#pinned-count').hidden = !d.pinned.length;
    $('#pinned-count').textContent = d.pinned.length;
    $('#btn-members').hidden = !p.seeMembers;
    $('#btn-mod').hidden = !p.moderator;
    $('#pending-count').hidden = !d.pendingCount;
    $('#pending-count').textContent = d.pendingCount;
    $('#btn-leave').hidden = d.me.role === 'admin';
    $('#btn-attach').hidden = !p.files;
    $('#composer').hidden = false;
    $('#input').maxLength = g.maxMessageLength || 2000;
}

async function loadMessages({ bottom = false } = {}) {
    const id = S.gid;
    if (!id || S.fetching || !S.info) return;
    S.fetching = true;
    const r = await api('/groups/messages', { groupId: id });
    S.fetching = false;
    if (S.gid !== id) return;
    if (!r.ok) { if (r.status === 403) { S.info = null; openGroup(id); } return; }
    const msgs = r.data.messages;
    S.perms = r.data.perms;
    renderNotice();
    const typing = r.data.typing || [];
    $('#typing').hidden = !typing.length;
    $('#typing').textContent = typing.length ? `${typing.slice(0, 3).join(', ')}${typing.length > 3 ? ' ועוד' : ''} ${typing.length > 1 ? 'מקלידים' : 'מקליד/ה'}…` : '';
    const oldest = msgs.length ? msgs[0].id : Infinity;
    const merged = S.messages.filter(m => m.id < oldest).concat(msgs);
    const hash = JSON.stringify(merged);
    if (hash !== S.hash) {
        const fresh = S.messages.length && msgs.length && msgs[msgs.length - 1].id > (S.messages[S.messages.length - 1] || {}).id;
        S.hash = hash;
        S.messages = merged;
        if (merged.length === msgs.length) S.hasMore = r.data.hasMore;
        renderMessages({ bottom: bottom || (fresh && msgs[msgs.length - 1].mine) });
    }
    const last = msgs[msgs.length - 1];
    const g = S.groups.find(x => x.id === id);
    if (last && !document.hidden && g && g.unread) { g.unread = 0; renderList(); }
    if (last && !document.hidden && S.lastRead !== last.id) { S.lastRead = last.id; api('/groups/read', { groupId: id, lastId: last.id }); }
}

async function loadOlder() {
    if (S.loadingOlder || !S.messages.length) return;
    S.loadingOlder = true;
    renderMessages({ keep: true });
    const r = await api('/groups/messages', { groupId: S.gid, beforeId: S.messages[0].id });
    S.loadingOlder = false;
    if (r.ok) { S.messages = r.data.messages.concat(S.messages); S.hasMore = r.data.hasMore; S.hash = JSON.stringify(S.messages); }
    renderMessages({ keep: true });
}

function renderNotice() {
    const p = S.perms || {}, d = S.info;
    let note = '';
    if (!p.post) {
        if (p.muted) note = `<i class="fa-solid fa-volume-xmark"></i> הושתקת בקבוצה עד ${esc(fullWhen(p.muted))}`;
        else if (p.hours && !p.hours.open) note = `<i class="fa-solid fa-moon"></i> הכתיבה סגורה עכשיו (שעות היום: ${esc(p.hours.today)})${p.hours.next ? ` · תיפתח ${esc(p.hours.next)}` : ''}`;
        else if (d && d.group.announce) note = '<i class="fa-solid fa-bullhorn"></i> רק המפקחים כותבים בקבוצה הזו';
        else note = '<i class="fa-solid fa-lock"></i> אין לך הרשאה לכתוב בקבוצה הזו';
    }
    $('#notice').hidden = !note;
    $('#notice').innerHTML = note;
    $('#composer').hidden = !p.post;
    $('#btn-attach').hidden = !p.files;
}

function senderTag(m) {
    if (m.senderRole === 'admin') return ROLE_TAG.admin;
    if (m.senderRole === 'moderator') return ROLE_TAG.moderator;
    if (String(m.senderKey).startsWith('g:')) return '<span class="tag guest">אורח</span>';
    return '';
}

function renderMessages({ bottom = false, keep = false } = {}) {
    const box = $('#msgs');
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    const ph = box.scrollHeight, pt = box.scrollTop;
    const d = S.info;
    let html = S.hasMore ? `<button class="btn sm older" data-act="older">${S.loadingOlder ? '<i class="fa-solid fa-circle-notch spin"></i>' : 'הודעות קודמות'}</button>` : '';
    if (!S.hasMore && d && d.group.welcome) html += `<div class="welcome">${rich(d.group.welcome)}</div>`;
    let lastDay = '', prev = null;
    const p = S.info ? S.info.me.perms : {};
    for (const m of S.messages) {
        const dt = parseDate(m.at);
        const day = dt ? dt.toDateString() : lastDay;
        if (day !== lastDay) { lastDay = day; prev = null; html += `<div class="day">${esc(dt ? dayLabel(dt) : '')}</div>`; }
        if (m.kind === 'system') { html += `<div class="sys">${esc(m.text)}</div>`; prev = null; continue; }
        const first = !prev || prev.senderKey !== m.senderKey || (parseDate(m.at) - parseDate(prev.at)) > 5 * 60000;
        prev = m;
        const quote = m.replyTo && !m.deleted ? `<span class="quote" data-act="jump" data-id="${m.replyTo.id}"><b>${esc(m.replyTo.sender || '')}</b>${esc(m.replyTo.text)}</span>` : '';
        const body = m.deleted ? `<div class="m-text">${m.deletedBy === 'mod' ? '🚫 ההודעה נמחקה על ידי מפקח' : '🚫 ההודעה נמחקה'}</div>`
            : `${quote}${m.file ? F.html(m.file, m.id) : ''}${m.text ? `<div class="m-text">${rich(m.text)}</div>` : ''}`;
        const foot = [m.edited ? 'נערך' : '', m.pinned ? '<i class="fa-solid fa-thumbtack"></i> מוצמד' : '', m.mine && m.readBy > 0 && !m.deleted ? `<i class="fa-solid fa-check-double"></i> נקרא ע״י ${m.readBy}` : ''].filter(Boolean).join(' · ');
        const acts = m.deleted ? '' : `<div class="m-actions">
            ${p.reply && p.post ? `<button data-act="reply" data-id="${m.id}" title="תגובה"><i class="fa-solid fa-reply"></i></button>` : ''}
            ${m.canEdit ? `<button data-act="edit" data-id="${m.id}" title="עריכה"><i class="fa-solid fa-pen"></i></button>` : ''}
            ${p.pin ? `<button data-act="pin" data-id="${m.id}" title="${m.pinned ? 'ביטול הצמדה' : 'הצמדה'}"><i class="fa-solid fa-thumbtack"></i></button>` : ''}
            ${m.text ? `<button data-act="copy" data-id="${m.id}" title="העתקה"><i class="fa-regular fa-copy"></i></button>` : ''}
            ${m.canDelete ? `<button class="danger" data-act="delete" data-id="${m.id}" title="מחיקה"><i class="fa-solid fa-trash-can"></i></button>` : ''}
        </div>`;
        html += `<div class="m ${first ? 'first' : ''} ${m.mine ? 'mine' : ''} ${m.deleted ? 'deleted' : ''} ${m.pinned ? 'pinned' : ''}" data-id="${m.id}">
            <div class="m-av">${first ? avatar(m.sender, { cls: 'sm', color: m.senderRole === 'admin' ? '#c5221f' : undefined }) : ''}</div>
            <div class="m-body">
                ${first ? `<div class="m-head"><span class="m-name" style="color:hsl(${hue(m.sender)} 55% 38%)">${esc(m.sender)}</span>${senderTag(m)}<span class="m-time">${esc(hm(m.at))}</span></div>` : ''}
                ${body}
                ${foot || (!first ? '' : '') ? `<div class="m-foot">${foot}</div>` : ''}
            </div>
            ${acts}
        </div>`;
    }
    if (!S.messages.length) html += '<div class="empty">אין עדיין הודעות</div>';
    box.innerHTML = html;
    F.hydrate(box);
    if (keep) box.scrollTop = box.scrollHeight - ph + pt;
    else if (bottom || atBottom) box.scrollTop = box.scrollHeight;
    else box.scrollTop = pt;
    $('#fab').classList.toggle('on', box.scrollHeight - box.scrollTop - box.clientHeight > 200);
}

function jump(id) {
    const el = $(`#msgs .m[data-id="${CSS.escape(String(id))}"]`);
    if (!el) { toast('ההודעה המקורית לא מוצגת'); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

// ---------- כתיבה ----------

function bars() {
    $('#replybar').hidden = !S.replyTo;
    if (S.replyTo) { $('#rb-who').textContent = `תגובה ל${S.replyTo.sender}`; $('#rb-text').textContent = S.replyTo.text; }
    $('#editbar').hidden = !S.editId;
    if (S.editId) { const m = S.messages.find(x => x.id === S.editId); $('#eb-text').textContent = m ? m.text : ''; }
    sendState();
}
function sendState() { $('#send').disabled = !$('#input').value.trim() && !S.attach; }
function grow() { const i = $('#input'); i.style.height = 'auto'; i.style.height = Math.min(160, i.scrollHeight) + 'px'; }

function setAttach(file) {
    const max = ((S.info && S.info.group.maxFileMb) || 20) * 1024 * 1024;
    if (file && file.size > max) { toast(`הקובץ גדול מדי (עד ${max / 1024 / 1024}MB בקבוצה הזו)`, 'bad'); file = null; }
    S.attach = file || null;
    $('#attachbar').hidden = !S.attach;
    $('#file').value = '';
    if (S.attach) {
        $('#ab-icon').className = `fa-solid ${F.icon(S.attach.type, S.attach.name)}`;
        $('#ab-name').textContent = S.attach.name;
        $('#ab-size').textContent = `${F.size(S.attach.size)} · אפשר להוסיף הודעה ולשלוח`;
        $('#input').focus();
    }
    sendState();
}

async function send() {
    const input = $('#input');
    const text = input.value.trim();
    if (!text && !S.attach) return;
    const btn = $('#send');
    btn.disabled = true;
    const sentFile = S.attach;
    let r;
    if (S.editId) r = await api('/groups/edit', { messageId: S.editId, text });
    else if (S.attach) r = await upload('/groups/send-file', S.attach, { groupId: S.gid, text, replyTo: S.replyTo ? S.replyTo.id : undefined, ...(await F.prepare(S.attach)) });
    else r = await api('/groups/send', { groupId: S.gid, text, replyTo: S.replyTo ? S.replyTo.id : undefined });
    btn.disabled = false;
    if (!r.ok) { toast(r.error, 'bad'); sendState(); return; }
    // מנקים רק את מה שנשלח, אם בינתיים התחילו לכתוב הודעה חדשה או צירפו קובץ אחר
    if (input.value.trim() === text) { input.value = ''; grow(); }
    if (S.attach === sentFile) setAttach(null);
    S.replyTo = null; S.editId = null; bars();
    S.typingAt = 0;
    S.fetching = false;
    await loadMessages({ bottom: true });
}

function typing() {
    if (Date.now() - S.typingAt < 3500 || !S.gid) return;
    S.typingAt = Date.now();
    api('/groups/typing', { groupId: S.gid });
}

// ---------- פאנל צד ----------

function openPanel(name) {
    S.panel = name;
    $('#panel').hidden = false;
    renderPanel();
}
function closePanel() { S.panel = null; $('#panel').hidden = true; }

async function renderPanel() {
    const d = S.info;
    if (!d || !S.panel) return;
    const body = $('#panel-body');
    const p = d.me.perms;
    if (S.panel === 'pinned') {
        $('#panel-title').textContent = 'הודעות מוצמדות';
        body.innerHTML = d.pinned.length ? d.pinned.map(m => `<div class="card-lite"><div class="muted">${esc(m.sender)} · ${esc(fullWhen(m.at))}</div><div style="white-space:pre-wrap;margin:6px 0">${rich(m.text)}</div>
            <button class="btn sm" data-act="jump" data-id="${m.id}">מעבר להודעה</button>${p.pin ? ` <button class="btn sm" data-act="pin-off" data-id="${m.id}">ביטול הצמדה</button>` : ''}</div>`).join('') : '<div class="empty">אין הודעות מוצמדות</div>';
        return;
    }
    if (S.panel === 'members') {
        $('#panel-title').textContent = `חברים (${d.memberCount})`;
        body.innerHTML = d.members.map(m => `<div class="row">${avatar(m.name, { cls: 'sm' })}<div class="r-text"><b>${esc(m.name)} ${m.role === 'moderator' ? ROLE_TAG.moderator : ''}${m.guest ? '<span class="tag guest">אורח</span>' : ''}${m.muted ? '<span class="tag warn">מושתק</span>' : ''}</b><small>${m.online ? '<span class="online-dot"></span> מחובר/ת' : ''}${m.phone ? ` <span class="ltr">${esc(m.phone)}</span>` : ''}</small></div></div>`).join('') || '<div class="empty">אין חברים להצגה</div>';
        return;
    }
    if (S.panel === 'info') {
        $('#panel-title').textContent = 'פרטי הקבוצה';
        const g = d.group, h = p.hours;
        body.innerHTML = `<div style="text-align:center;margin:8px 0 16px">${avatar(g.name, { color: g.color, cls: 'lg group' })}<h3 style="margin:10px 0 4px">${esc(g.name)}</h3><div class="muted">${esc(g.description || '')}</div></div>
            <div class="card-lite">
                <div class="row"><i class="fa-solid fa-user-tag"></i><div class="r-text"><b>התפקיד שלך</b><small>${d.me.role === 'admin' ? 'מנהל' : d.me.role === 'moderator' ? 'מפקח' : p.guest ? 'אורח' : 'חבר'}</small></div></div>
                <div class="row"><i class="fa-solid fa-pen-to-square"></i><div class="r-text"><b>כתיבה</b><small>${g.announce ? 'רק מפקחים' : 'כל החברים'}${g.slowModeSeconds ? ` · הודעה אחת כל ${g.slowModeSeconds} שניות` : ''}</small></div></div>
                ${h && h.today ? `<div class="row"><i class="fa-solid fa-clock"></i><div class="r-text"><b>שעות פעילות</b><small>היום: ${esc(h.today)}${h.open ? ' · פתוח עכשיו' : ' · סגור עכשיו'}</small></div></div>` : ''}
                <div class="row"><i class="fa-solid fa-paperclip"></i><div class="r-text"><b>קבצים</b><small>${p.files ? `מותר · עד ${g.maxFileMb}MB` : 'לא זמין לך'}</small></div></div>
            </div>`;
        return;
    }
    if (S.panel === 'mod') {
        $('#panel-title').textContent = 'ניהול הקבוצה';
        const tabs = [['pending', 'ממתינים'], ['members', 'חברים'], ['banned', 'חסומים'], ...(p.invites ? [['invites', 'הזמנות']] : []), ...(d.settings ? [['settings', 'הגדרות']] : []), ['log', 'יומן']];
        if (!tabs.some(t => t[0] === S.modTab)) S.modTab = 'pending';
        body.innerHTML = `<div class="tabs">${tabs.map(([k, l]) => `<button class="${S.modTab === k ? 'on' : ''}" data-act="mod-tab" data-tab="${k}">${l}</button>`).join('')}</div><div id="mod-body"><div class="empty"><i class="fa-solid fa-circle-notch spin"></i></div></div>`;
        renderModTab();
    }
}

async function renderModTab() {
    const box = $('#mod-body');
    if (!box) return;
    const p = S.info.me.perms;
    const tab = S.modTab;
    if (['pending', 'members', 'banned'].includes(tab)) {
        const r = await api('/groups/mod/members', { groupId: S.gid });
        if (!r.ok) { box.innerHTML = `<div class="empty">${esc(r.error)}</div>`; return; }
        const list = r.data.members.filter(m => tab === 'pending' ? m.status === 'pending' : tab === 'banned' ? m.status === 'banned' : m.status === 'active');
        box.innerHTML = list.length ? list.map(m => memberRow(m, p)).join('') : `<div class="empty">${tab === 'pending' ? 'אין בקשות שממתינות' : tab === 'banned' ? 'אין חסומים' : 'אין חברים'}</div>`;
        return;
    }
    if (tab === 'invites') return renderInvites(box);
    if (tab === 'settings') return renderSettings(box);
    if (tab === 'log') {
        const r = await api('/groups/mod/log', { groupId: S.gid });
        box.innerHTML = r.ok && r.data.log.length ? r.data.log.map(l => `<div class="row"><div class="r-text"><b>${esc(LOG_LABELS[l.action] || l.action)}</b><small>${esc(l.actor)} · ${esc(fullWhen(l.at))}${l.details ? ' · ' + esc(l.details) : ''}</small></div></div>`).join('') : '<div class="empty">היומן ריק</div>';
    }
}

function memberRow(m, p) {
    const status = m.status === 'banned' ? `<span class="tag bad">חסום${m.bannedUntil ? ' עד ' + esc(fullWhen(m.bannedUntil)) : ''}</span>` : m.mutedUntil ? `<span class="tag warn">מושתק עד ${esc(fullWhen(m.mutedUntil))}</span>` : '';
    const sub = [m.phone ? `<span class="ltr">${esc(m.phone)}</span>` : '', m.banReason ? esc(m.banReason) : '', m.lastSeenAt ? `נראה ${esc(fullWhen(m.lastSeenAt))}` : ''].filter(Boolean).join(' · ');
    const self = m.key === S.info.me.key;
    let acts = '';
    if (!self) {
        if (m.status === 'pending' && p.approve) acts = `<button class="btn sm primary" data-act="mod" data-a="approve" data-k="${esc(m.key)}">אישור</button><button class="btn sm" data-act="mod" data-a="reject" data-k="${esc(m.key)}">דחייה</button>`;
        else if (m.status === 'banned' && p.ban) acts = `<button class="btn sm" data-act="mod" data-a="unban" data-k="${esc(m.key)}">ביטול חסימה</button>`;
        else if (m.status === 'active' && (m.role !== 'moderator' || p.admin)) acts = `<button class="btn sm" data-act="member-menu" data-k="${esc(m.key)}"><i class="fa-solid fa-ellipsis"></i> פעולות</button>`;
    }
    return `<div class="row" data-k="${esc(m.key)}">${avatar(m.name, { cls: 'sm' })}<div class="r-text"><b>${esc(m.name)} ${m.role === 'moderator' ? ROLE_TAG.moderator : ''}${m.guest ? '<span class="tag guest">אורח</span>' : ''}${status}</b><small>${sub}</small></div>${acts}</div><div class="member-acts" data-for="${esc(m.key)}" hidden></div>`;
}

function memberMenu(key) {
    const box = $(`.member-acts[data-for="${CSS.escape(key)}"]`);
    if (!box) return;
    if (!box.hidden) { box.hidden = true; return; }
    const p = S.info.me.perms;
    const dur = `<select class="input" data-dur style="width:auto">${DURATIONS.map(([m, l]) => `<option value="${m}">${l}</option>`).join('')}</select>`;
    box.innerHTML = `<div class="card-lite" style="margin:0 0 8px">
        ${p.mute || p.ban ? `<div class="field"><label>משך</label>${dur}</div>` : ''}
        ${p.ban ? '<div class="field"><label>סיבה (לא חובה)</label><input class="input" data-reason maxlength="200"></div>' : ''}
        <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${p.mute ? `<button class="btn sm" data-act="mod" data-a="mute" data-k="${esc(key)}"><i class="fa-solid fa-volume-xmark"></i> השתקה</button><button class="btn sm" data-act="mod" data-a="unmute" data-k="${esc(key)}">ביטול השתקה</button>` : ''}
            ${p.ban ? `<button class="btn sm danger" data-act="mod" data-a="ban" data-k="${esc(key)}"><i class="fa-solid fa-ban"></i> חסימה</button>` : ''}
            ${p.remove ? `<button class="btn sm danger" data-act="mod" data-a="remove" data-k="${esc(key)}">הסרה מהקבוצה</button>` : ''}
            ${p.admin && !key.startsWith('g:') ? `<button class="btn sm" data-act="mod" data-a="promote" data-k="${esc(key)}">מינוי למפקח</button><button class="btn sm" data-act="mod" data-a="demote" data-k="${esc(key)}">הסרת מפקח</button>` : ''}
            ${p.admin ? `<button class="btn sm" data-act="mod" data-a="rename" data-k="${esc(key)}">שינוי שם</button>` : ''}
        </div></div>`;
    box.hidden = false;
}

async function modAction(el) {
    const key = el.dataset.k, action = el.dataset.a;
    const box = $(`.member-acts[data-for="${CSS.escape(key)}"]`);
    const extra = {};
    if (box && !box.hidden) {
        const d = box.querySelector('[data-dur]'); if (d) extra.minutes = Number(d.value);
        const r = box.querySelector('[data-reason]'); if (r) extra.reason = r.value.trim();
    }
    if (action === 'rename') { const n = prompt('השם החדש בקבוצה'); if (!n) return; extra.name = n; }
    if (['remove', 'ban', 'reject'].includes(action) && !confirm(action === 'ban' ? 'לחסום את החבר בקבוצה?' : action === 'remove' ? 'להסיר את החבר מהקבוצה?' : 'לדחות את הבקשה?')) return;
    const r = await api('/groups/mod/action', { groupId: S.gid, memberKey: key, action, ...extra });
    if (!r.ok) { toast(r.error, 'bad'); return; }
    toast('בוצע', 'good');
    const o = await api('/groups/open', { groupId: S.gid });
    if (o.ok) { S.info = o.data; renderRoomHead(); }
    renderModTab();
}

async function renderInvites(box) {
    const r = await api('/groups/mod/invites', { groupId: S.gid });
    if (!r.ok) { box.innerHTML = `<div class="empty">${esc(r.error)}</div>`; return; }
    const p = S.info.me.perms, s = S.info.settings;
    box.innerHTML = `<form class="card-lite" id="inv-form">
            <div class="field"><label>תיאור (למי ההזמנה)</label><input class="input" name="note" maxlength="80" placeholder="למשל: מתנדבים חדשים"></div>
            <div class="grid2">
                <div class="field"><label>תוקף</label><select class="input" name="hours"><option value="24">יום</option><option value="168" selected>שבוע</option><option value="720">חודש</option><option value="0">ללא הגבלה</option><option value="1">שעה</option></select></div>
                <div class="field"><label>מספר שימושים</label><select class="input" name="maxUses"><option value="0">ללא הגבלה</option><option value="1">1</option><option value="5">5</option><option value="10">10</option><option value="50">50</option></select></div>
            </div>
            <div class="switch-row"><span>אישור מפקח לכל מצטרף</span><label class="switch"><input type="checkbox" name="approval"><i></i></label></div>
            <div class="switch-row"><span>משתמשי האתר<small>יכולים להצטרף עם החשבון שלהם</small></span><label class="switch"><input type="checkbox" name="allowUsers" checked><i></i></label></div>
            <div class="switch-row"><span>אורחים מבחוץ<small>${!s || s.allowGuests ? 'נכנסים עם שם וטלפון' : 'כבוי בהגדרות הקבוצה'}</small></span><label class="switch"><input type="checkbox" name="allowGuests" ${!s || s.allowGuests ? 'checked' : 'disabled'}><i></i></label></div>
            ${p.admin ? '<div class="switch-row"><span>מצטרפים כמפקחים</span><label class="switch"><input type="checkbox" name="mod"><i></i></label></div>' : ''}
            <button class="btn primary block" style="margin-top:10px"><i class="fa-solid fa-link"></i> יצירת קישור הזמנה</button>
        </form>
        <div class="sec">הזמנות קיימות</div>
        ${r.data.invites.map(i => `<div class="card-lite">
            <b>${esc(i.note || 'הזמנה')}</b> ${i.active ? '<span class="tag good">פעילה</span>' : i.revoked ? '<span class="tag bad">בוטלה</span>' : '<span class="tag">לא פעילה</span>'}
            <div class="muted">${i.uses}${i.maxUses ? '/' + i.maxUses : ''} שימושים · ${i.expiresAt ? 'עד ' + esc(fullWhen(i.expiresAt)) : 'ללא תוקף'}${i.approval ? ' · באישור' : ''}${i.allowGuests ? ' · אורחים' : ''}${i.role === 'moderator' ? ' · כמפקחים' : ''}</div>
            ${i.active ? `<div class="invite-link"><input class="input ltr" readonly value="${esc(location.origin + '/salamon/groups?invite=' + i.code)}"><button class="btn sm" data-act="copy-invite">העתקה</button><button class="btn sm danger" data-act="revoke" data-id="${esc(i.id)}">ביטול</button></div>` : ''}
        </div>`).join('') || '<div class="empty">אין הזמנות</div>'}`;
    $('#inv-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        const r2 = await api('/groups/mod/invites', { groupId: S.gid, create: { note: f.note.value.trim(), hours: Number(f.hours.value), maxUses: Number(f.maxUses.value), approval: f.approval.checked, allowUsers: f.allowUsers.checked, allowGuests: f.allowGuests.checked, role: f.mod && f.mod.checked ? 'moderator' : 'member' } });
        if (!r2.ok) { toast(r2.error, 'bad'); return; }
        toast('קישור ההזמנה נוצר', 'good');
        renderInvites(box);
    });
}

// ---------- טופס הגדרות קבוצה (משותף במבנה עם מרכז השליטה) ----------

function settingsForm(s, { admin, name, description, color }) {
    const sw = (k, label, hint = '', val = s[k]) => `<div class="switch-row"><span>${label}${hint ? `<small>${hint}</small>` : ''}</span><label class="switch"><input type="checkbox" data-k="${k}" ${val ? 'checked' : ''}><i></i></label></div>`;
    const sel = (k, label, opts) => `<div class="field"><label>${label}</label><select class="input" data-k="${k}">${opts.map(([v, l]) => `<option value="${v}" ${String(s[k]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
    const days = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    return `<div class="card-lite">
        <div class="field"><label>שם הקבוצה</label><input class="input" data-g="name" maxlength="60" value="${esc(name)}"></div>
        <div class="field"><label>תיאור</label><input class="input" data-g="description" maxlength="300" value="${esc(description || '')}"></div>
        <div class="field"><label>צבע</label><input type="color" class="input" data-g="color" value="${esc(color || '#0b8043')}" style="height:40px;padding:4px"></div>
        <div class="field"><label>הודעת פתיחה (מוצגת בראש הקבוצה)</label><textarea class="input" data-k="welcome" rows="3" maxlength="1000">${esc(s.welcome || '')}</textarea></div>
    </div>
    <div class="sec">מי נכנס</div><div class="card-lite">
        ${sel('visibility', 'משתמשי האתר', [['private', 'רק מי שצורף או הוזמן'], ['request', 'רואים את הקבוצה ומבקשים להצטרף'], ['public', 'רואים ומצטרפים חופשי']])}
        ${sw('userApproval', 'אישור מפקח למשתמשי אתר', 'גם בהצטרפות דרך הזמנה')}
        ${sw('allowGuests', 'אורחים מבחוץ', 'רק דרך קישור הזמנה')}
        ${sw('guestApproval', 'אישור מפקח לאורחים')}
        ${sw('guestPhoneRequired', 'אורח חייב להזין טלפון')}
    </div>
    <div class="sec">כתיבה וקבצים</div><div class="card-lite">
        ${sel('whoCanPost', 'מי כותב', [['all', 'כל החברים'], ['moderators', 'רק מפקחים (ערוץ הודעות)']])}
        ${sw('guestsCanPost', 'אורחים יכולים לכתוב')}
        ${sw('allowFiles', 'שליחת קבצים')}
        ${sw('guestsCanSendFiles', 'אורחים יכולים לשלוח קבצים')}
        <div class="grid2">
            ${sel('maxFileMb', 'גודל קובץ מרבי', [[1, '1MB'], [5, '5MB'], [10, '10MB'], [20, '20MB']])}
            ${sel('slowModeSeconds', 'השהיה בין הודעות', [[0, 'ללא'], [5, '5 שניות'], [15, '15 שניות'], [30, '30 שניות'], [60, 'דקה'], [300, '5 דקות'], [900, '15 דקות'], [3600, 'שעה']])}
        </div>
        ${sel('maxMessageLength', 'אורך הודעה מרבי', [[200, '200 תווים'], [500, '500 תווים'], [1000, '1000 תווים'], [2000, '2000 תווים'], [4000, '4000 תווים']])}
        ${sw('allowReplies', 'תגובה לציטוט')}
        ${sw('allowEditOwn', 'עריכת הודעות שלי')}
        ${sw('allowDeleteOwn', 'מחיקת הודעות שלי')}
        ${sel('showMembers', 'מי רואה את רשימת החברים', [['all', 'כולם'], ['moderators', 'רק מפקחים']])}
        ${sw('showReadCount', 'הצגת "נקרא ע״י"')}
    </div>
    <div class="sec">שעות פעילות</div><div class="card-lite">
        <div class="switch-row"><span>הגבלה לפי שעות<small>שעון ישראל</small></span><label class="switch"><input type="checkbox" data-h="enabled" ${s.hours.enabled ? 'checked' : ''}><i></i></label></div>
        <div class="field"><label>מחוץ לשעות</label><select class="input" data-h="mode"><option value="readonly" ${s.hours.mode === 'readonly' ? 'selected' : ''}>אפשר לקרוא, אי אפשר לכתוב</option><option value="closed" ${s.hours.mode === 'closed' ? 'selected' : ''}>הקבוצה סגורה לגמרי</option></select></div>
        <div class="switch-row"><span>המפקחים לא מוגבלים</span><label class="switch"><input type="checkbox" data-h="exemptModerators" ${s.hours.exemptModerators ? 'checked' : ''}><i></i></label></div>
        ${s.hours.days.map((d, i) => `<div class="hours-day"><span>יום ${days[i]}</span><label class="switch"><input type="checkbox" data-day="${i}" data-f="on" ${d.on ? 'checked' : ''}><i></i></label><input type="time" class="input" data-day="${i}" data-f="from" value="${esc(d.from)}"><input type="time" class="input" data-day="${i}" data-f="to" value="${esc(d.to)}"></div>`).join('')}
    </div>
    ${admin ? `<div class="sec">הרשאות המפקחים</div><div class="card-lite">
        ${[['approve', 'אישור מצטרפים'], ['remove', 'הסרת חברים'], ['ban', 'חסימה'], ['mute', 'השתקה'], ['deleteMessages', 'מחיקת הודעות של אחרים'], ['pin', 'הצמדת הודעות'], ['invites', 'ניהול קישורי הזמנה'], ['editSettings', 'שינוי הגדרות הקבוצה'], ['seePhones', 'צפייה במספרי טלפון']]
            .map(([k, l]) => `<div class="switch-row"><span>${l}</span><label class="switch"><input type="checkbox" data-mp="${k}" ${s.moderatorPerms[k] ? 'checked' : ''}><i></i></label></div>`).join('')}
    </div>` : ''}`;
}

function readSettingsForm(root) {
    const out = { settings: { hours: { days: [] }, moderatorPerms: {} } };
    $$('[data-g]', root).forEach(el => { out[el.dataset.g] = el.value; });
    $$('[data-k]', root).forEach(el => { out.settings[el.dataset.k] = el.type === 'checkbox' ? el.checked : (/^\d+$/.test(el.value) && el.tagName === 'SELECT' ? Number(el.value) : el.value); });
    $$('[data-h]', root).forEach(el => { out.settings.hours[el.dataset.h] = el.type === 'checkbox' ? el.checked : el.value; });
    $$('[data-day]', root).forEach(el => { const i = Number(el.dataset.day); out.settings.hours.days[i] = out.settings.hours.days[i] || {}; out.settings.hours.days[i][el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; });
    $$('[data-mp]', root).forEach(el => { out.settings.moderatorPerms[el.dataset.mp] = el.checked; });
    return out;
}

function renderSettings(box) {
    const d = S.info;
    box.innerHTML = `<form id="set-form">${settingsForm(d.settings, { admin: d.me.perms.admin, name: d.group.name, description: d.group.description, color: d.group.color })}<button class="btn primary block" style="margin-top:12px">שמירת הגדרות</button></form>`;
    $('#set-form').addEventListener('submit', async e => {
        e.preventDefault();
        const r = await api('/groups/mod/settings', { groupId: S.gid, ...readSettingsForm(e.target) });
        if (!r.ok) { toast(r.error, 'bad'); return; }
        toast('ההגדרות נשמרו', 'good');
        const o = await api('/groups/open', { groupId: S.gid });
        if (o.ok) { S.info = o.data; renderRoomHead(); }
        refreshList();
    });
}

// ---------- פעולות ----------

const actions = {
    open: el => openGroup(Number(el.dataset.id)),
    back: () => { $('#app').classList.remove('in-room'); S.gid = null; history.replaceState(null, '', location.pathname + (S.auth.adminToken ? '#as=admin' : '')); renderList(); },
    join: async el => {
        const r = await api('/groups/join', { groupId: Number(el.dataset.id) });
        if (!r.ok) { toast(r.error, 'bad'); return; }
        toast(r.data.status === 'pending' ? 'הבקשה נשלחה לאישור' : 'הצטרפת לקבוצה', 'good');
        await refreshList();
        if (r.data.status === 'active') openGroup(Number(el.dataset.id));
    },
    leave: async () => {
        $('#room-menu').hidden = true;
        if (!confirm('לצאת מהקבוצה?')) return;
        const r = await api('/groups/leave', { groupId: S.gid });
        if (!r.ok) { toast(r.error, 'bad'); return; }
        S.gid = null; $('#room').hidden = true; $('#empty-main').hidden = false; $('#app').classList.remove('in-room');
        refreshList();
    },
    menu: () => { $('#room-menu').hidden = !$('#room-menu').hidden; },
    panel: el => { $('#room-menu').hidden = true; S.panel === el.dataset.panel ? closePanel() : openPanel(el.dataset.panel); },
    'panel-close': closePanel,
    'mod-tab': el => { S.modTab = el.dataset.tab; renderPanel(); },
    'member-menu': el => memberMenu(el.dataset.k),
    mod: el => modAction(el),
    revoke: async el => {
        if (!confirm('לבטל את קישור ההזמנה?')) return;
        const r = await api('/groups/mod/invites', { groupId: S.gid, revoke: el.dataset.id });
        if (!r.ok) { toast(r.error, 'bad'); return; }
        renderModTab();
    },
    'copy-invite': el => { const i = el.parentElement.querySelector('input'); navigator.clipboard?.writeText(i.value).then(() => toast('הקישור הועתק', 'good')).catch(() => { i.select(); document.execCommand('copy'); }); },
    older: loadOlder,
    bottom: () => { const b = $('#msgs'); b.scrollTo({ top: b.scrollHeight, behavior: 'smooth' }); },
    jump: el => { if (S.panel === 'pinned' && window.matchMedia('(max-width: 900px)').matches) closePanel(); jump(el.dataset.id); },
    reply: el => { const m = S.messages.find(x => String(x.id) === el.dataset.id); if (!m) return; S.editId = null; S.replyTo = { id: m.id, sender: m.sender, text: m.text || (m.file ? '📎 ' + m.file.name : '') }; bars(); $('#input').focus(); },
    'reply-cancel': () => { S.replyTo = null; bars(); },
    edit: el => { const m = S.messages.find(x => String(x.id) === el.dataset.id); if (!m) return; S.replyTo = null; S.editId = m.id; $('#input').value = m.text; grow(); bars(); $('#input').focus(); },
    'edit-cancel': () => { S.editId = null; $('#input').value = ''; grow(); bars(); },
    delete: async el => {
        const m = S.messages.find(x => String(x.id) === el.dataset.id);
        if (!m || !confirm(m.mine ? 'למחוק את ההודעה?' : `למחוק את ההודעה של ${m.sender}?`)) return;
        const r = await api('/groups/delete', { messageId: m.id });
        if (!r.ok) { toast(r.error, 'bad'); return; }
        S.hash = ''; loadMessages();
    },
    pin: async el => {
        const m = S.messages.find(x => String(x.id) === el.dataset.id); if (!m) return;
        const r = await api('/groups/pin', { messageId: m.id, pinned: !m.pinned });
        if (!r.ok) { toast(r.error, 'bad'); return; }
        const o = await api('/groups/open', { groupId: S.gid }); if (o.ok) { S.info = o.data; renderRoomHead(); if (S.panel) renderPanel(); }
        S.hash = ''; loadMessages();
    },
    'pin-off': async el => { await api('/groups/pin', { messageId: Number(el.dataset.id), pinned: false }); const o = await api('/groups/open', { groupId: S.gid }); if (o.ok) { S.info = o.data; renderRoomHead(); renderPanel(); } S.hash = ''; loadMessages(); },
    copy: el => { const m = S.messages.find(x => String(x.id) === el.dataset.id); if (m) navigator.clipboard?.writeText(m.text).then(() => toast('הועתק', 'good')); },
    emoji: () => { $('#emoji').hidden = !$('#emoji').hidden; },
    'emoji-pick': el => { const i = $('#input'); i.setRangeText(el.dataset.e, i.selectionStart, i.selectionEnd, 'end'); i.focus(); sendState(); },
    attach: () => $('#file').click(),
    'attach-cancel': () => setAttach(null),
};

function bind() {
    document.addEventListener('click', e => {
        const el = e.target.closest('[data-act]');
        if (!el) {
            if (!e.target.closest('.pop-wrap')) $('#room-menu').hidden = true;
            if (!e.target.closest('#emoji, [data-act="emoji"]')) $('#emoji').hidden = true;
            const fo = e.target.closest('[data-file-open]');
            if (fo) { const m = S.messages.find(x => String(x.id) === fo.dataset.fileOpen); if (m && m.file) F.open(m.id, m.file); }
            const row = e.target.closest('.m');
            if (row && 'ontouchstart' in window) { $$('#msgs .show-actions').forEach(r => r !== row && r.classList.remove('show-actions')); row.classList.toggle('show-actions'); }
            return;
        }
        const fn = actions[el.dataset.act];
        if (fn) { e.preventDefault(); fn(el); }
    });
    $('#emoji').innerHTML = EMOJIS.map(e => `<button type="button" data-act="emoji-pick" data-e="${e}">${e}</button>`).join('');
    $('#search').addEventListener('input', e => { S.search = e.target.value.trim(); renderList(); });
    const input = $('#input');
    input.addEventListener('input', () => { grow(); sendState(); if (input.value.trim()) typing(); });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !('ontouchstart' in window)) { e.preventDefault(); send(); }
        if (e.key === 'Escape') { S.replyTo = null; S.editId = null; bars(); }
        if (e.key === 'ArrowUp' && !input.value) { const m = [...S.messages].reverse().find(x => x.canEdit); if (m) { e.preventDefault(); actions.edit({ dataset: { id: String(m.id) } }); } }
    });
    input.addEventListener('paste', e => { const f = [...((e.clipboardData && e.clipboardData.files) || [])][0]; if (f && S.perms.files) { e.preventDefault(); setAttach(f); } });
    $('#composer').addEventListener('submit', e => { e.preventDefault(); send(); });
    $('#file').addEventListener('change', e => setAttach(e.target.files && e.target.files[0]));
    $('#msgs').addEventListener('scroll', () => {
        const b = $('#msgs');
        $('#fab').classList.toggle('on', b.scrollHeight - b.scrollTop - b.clientHeight > 200);
        if (b.scrollTop < 40 && S.hasMore && !S.loadingOlder) loadOlder();
    });
    const room = $('#room');
    room.addEventListener('dragover', e => { if (S.perms.files && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    room.addEventListener('drop', e => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f && S.perms.files) { e.preventDefault(); setAttach(f); } });
    window.addEventListener('hashchange', () => { const m = /g=(\d+)/.exec(location.hash); if (m && Number(m[1]) !== S.gid) openGroup(Number(m[1])); });
}

document.addEventListener('DOMContentLoaded', () => {
    injectChatFileStyles();
    bind();
    // מנהל שנכנס ממרכז השליטה: הטוקן עובר לזיכרון של הלשונית בלבד, ונמחק מהאחסון הקבוע
    const handoff = getItem('salamonGroupsAdmin');
    if (handoff) { try { sessionStorage.setItem('salamonGroupsAdmin', handoff); } catch (e) {} setItem('salamonGroupsAdmin', null); }
    S.auth = pickAuth();
    const params = new URLSearchParams(location.search);
    const invite = params.get('invite') || (S.auth.userToken && getItem('salamonPendingInvite'));
    if (invite) { if (params.get('invite')) history.replaceState(null, '', location.pathname); showInvite(invite); return; }
    if (!S.auth.adminToken && !S.auth.userToken && !S.auth.guestToken) { gateLogin(); return; }
    enterApp();
});
})();
