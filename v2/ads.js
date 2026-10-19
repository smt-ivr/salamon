// ads.js — קמפיינים ועדכונים בגרסה החדשה: פופאפ, פס עליון, הודעה צפה, כרטיס בראש ההודעות ומסך "עדכונים".
// אותם קמפיינים שמנוהלים במרכז השליטה, כולל ספירת הקלקות וסגירות.

(() => {
'use strict';
const { $, esc, api } = App;
const A = { list: [], popupQueue: [], showing: false, root: null };

const color = (c, fb) => /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : fb;
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
const closedKey = 'v2.adsClosed';
const isClosed = id => (App.store.get(closedKey, []) || []).includes(id);
const remember = id => { const l = App.store.get(closedKey, []) || []; if (!l.includes(id)) l.push(id); App.store.set(closedKey, l.slice(-60)); };

function style(m, { radius = true } = {}) {
    const d = m.design || {};
    const bg = color(m.bgColor, '#ffffff'), fg = color(m.textColor, '#1a202c');
    const img = safeUrl(m.imageUrl);
    const parts = [`color:${fg}`];
    if (d.imagePos === 'cover' && img) parts.push(`background:linear-gradient(${bg}cc, ${color(d.gradient, bg)}ee), url("${esc(img)}") center/cover`);
    else parts.push(`background:${d.gradient ? `linear-gradient(135deg, ${bg}, ${color(d.gradient, bg)})` : bg}`);
    if (radius && d.radius !== null && d.radius !== undefined) parts.push(`border-radius:${Number(d.radius) || 0}px`);
    if (d.align === 'center') parts.push('text-align:center');
    if (d.border) parts.push(`border:1px solid ${color(d.border, 'transparent')}`);
    if (d.size === 'sm') parts.push('font-size:.92em'); else if (d.size === 'lg') parts.push('font-size:1.08em');
    return parts.join(';');
}

function cta(m, extra = '') {
    if (!m.ctaLabel || !safeUrl(m.ctaUrl)) return '';
    const d = m.design || {};
    return `<button class="ann-cta" data-act="ad-cta" data-id="${esc(m.id)}" style="${extra}background:${color(d.ctaColor, color(m.textColor, '#1a202c'))};color:${color(d.ctaText, color(m.bgColor, '#fff'))};">${esc(m.ctaLabel)} <i class="fa-solid fa-arrow-left"></i></button>`;
}

function card(m, { closable = false } = {}) {
    const d = m.design || {};
    const img = safeUrl(m.imageUrl) && d.imagePos !== 'cover' ? `<img class="ann-img" src="${esc(m.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';
    return `<div class="ann" style="${style(m)}">
        ${closable ? `<button class="ann-x" data-act="ad-close" data-id="${esc(m.id)}" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button>` : ''}
        ${d.imagePos === 'bottom' ? '' : img}
        ${d.badge ? `<span class="ann-badge">${esc(d.badge)}</span>` : ''}
        <h4>${d.icon ? `<i class="fa-solid ${esc(d.icon)}"></i> ` : ''}${esc(m.title)}</h4>
        <div class="ann-body">${m.htmlContent || ''}</div>
        ${d.imagePos === 'bottom' ? img.replace('ann-img', 'ann-img" style="margin:10px -16px -14px;width:calc(100% + 32px)') : ''}
        ${cta(m)}
        ${m.showViewCount ? `<div style="font-size:.78rem;opacity:.7;margin-top:8px;"><i class="fa-solid fa-eye"></i> נצפה ${App.num(m.globalViews)} פעמים</div>` : ''}
    </div>`;
}

function event(id, ev) { api('/system-message/event', { id, event: ev }); }

async function load() {
    const r = await api('/system-message');
    if (!r.ok) return;
    A.list = r.data.messages || [];
    A.list.forEach(m => { m.placement = m.placement || (m.isMandatory ? 'popup' : 'sidebar'); });
    renderBanner();
    renderToast();
    App.renderFeedAnn($('#feed-ann'));
    if (A.root) renderUpdates();
    A.popupQueue = A.list.filter(m => m.placement === 'popup');
    if (!A.showing) nextPopup();
    App.setBadge('updates', A.list.filter(m => m.placement === 'sidebar' && !isClosed(m.id)).length);
}

function renderBanner() {
    const slot = $('#ad-banner-slot');
    const m = A.list.find(x => x.placement === 'banner' && !isClosed(x.id));
    if (!m) { slot.innerHTML = ''; return; }
    const d = m.design || {};
    slot.innerHTML = `<div class="ad-banner" style="${style(m, { radius: false })}">${d.icon ? `<i class="fa-solid ${esc(d.icon)}"></i>` : ''}<div class="t">${d.badge ? `<span class="ann-badge" style="margin:0 0 0 6px;">${esc(d.badge)}</span>` : ''}<b>${esc(m.title)}</b><span class="ann-body">${m.htmlContent || ''}</span></div>${cta(m, 'margin:0;white-space:nowrap;')}<button class="icon-btn sm" style="color:inherit;" data-act="ad-close" data-id="${esc(m.id)}" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button></div>`;
}

function renderToast() {
    document.querySelectorAll('.ad-toast').forEach(e => e.remove());
    const m = A.list.find(x => x.placement === 'toast' && !isClosed(x.id));
    if (!m) return;
    setTimeout(() => {
        if (!App.token || isClosed(m.id)) return;
        const el = document.createElement('div');
        el.className = 'ad-toast';
        el.setAttribute('role', 'status');
        el.style.cssText = style(m);
        el.innerHTML = card(m, { closable: true }).replace(/^<div class="ann" style="[^"]*">/, '').replace(/<\/div>\s*$/, '');
        document.body.appendChild(el);
    }, 1500);
}

// הודעה נעוצה בראש ההודעות (כמו "הודעה נעוצה" בוואטסאפ). לחיצה פותחת את מסך העדכונים
App.renderFeedAnn = box => {
    const list = A.list.filter(x => x.placement === 'sidebar');
    const m = list.find(x => !isClosed(x.id));
    const side = $('#side-ann');
    if (side) side.innerHTML = list.slice(0, 2).map(x => card(x)).join('');
    if (list.length) { const f = list[0]; App.setPreview('updates', { text: f.title, icon: 'fa-thumbtack' }); }
    else App.setPreview('updates', { text: 'אין עדכונים חדשים' });
    if (!box) return;
    if (!m) { box.innerHTML = ''; return; }
    const tmp = document.createElement('div'); tmp.innerHTML = m.htmlContent || '';
    box.innerHTML = `<div class="pinned" data-act="tab" data-tab="updates" role="button" tabindex="0"><i class="fa-solid fa-thumbtack"></i><div class="pin-text"><b>${esc(m.title)}</b><span>${esc(tmp.textContent.trim().slice(0, 120))}</span></div>${list.length > 1 ? `<span class="badge">+${list.length - 1}</span>` : ''}<button class="icon-btn sm" data-act="ad-close" data-id="${esc(m.id)}" aria-label="הסתרה"><i class="fa-solid fa-xmark"></i></button></div>`;
};

function renderUpdates() {
    const list = A.list;
    A.root.innerHTML = `<div class="wall-inner">
        <div class="day"><span>הודעות והכרזות מצוות עכשיו סלומון</span></div>
        <div class="upd-list">${list.length ? list.map(m => card(m)).join('') : '<div class="empty"><i class="fa-regular fa-bell"></i><b>אין עדכונים חדשים</b>כשיהיה משהו חדש, הוא יופיע כאן</div>'}</div>
    </div>`;
}

function nextPopup() {
    const m = A.popupQueue.shift();
    if (!m) { A.showing = false; return; }
    A.showing = true;
    let left = m.closeCooldownSeconds || 0;
    const el = App.openSheet({
        dialog: true, closable: left <= 0,
        onClose: () => { event(m.id, 'close'); setTimeout(nextPopup, 400); },
        body: `<div style="position:relative;">${card(m)}<button class="btn block" id="ad-pop-close" style="margin-top:10px;" ${left > 0 ? 'disabled' : ''}>${left > 0 ? `אפשר לסגור בעוד ${left}` : 'סגירה'}</button></div>`,
    });
    el.style.background = 'transparent'; el.style.boxShadow = 'none';
    el.querySelector('.ann').style.margin = '0';
    el.querySelector('.ann').style.boxShadow = 'var(--shadow-3)';
    const btn = el.querySelector('#ad-pop-close');
    btn.addEventListener('click', () => App.closeSheet());
    if (left > 0) {
        const t = setInterval(() => {
            left--;
            if (!btn.isConnected) { clearInterval(t); return; }
            if (left <= 0) { clearInterval(t); btn.disabled = false; btn.textContent = 'סגירה'; const top = App.topSheet(); if (top === el) { /* מעכשיו אפשר לסגור גם בלחיצה בחוץ */ } }
            else btn.textContent = `אפשר לסגור בעוד ${left}`;
        }, 1000);
    }
}

Object.assign(App.actions, {
    'ad-cta': el => {
        const m = A.list.find(x => String(x.id) === el.dataset.id);
        if (!m) return;
        event(m.id, 'click');
        window.open(m.ctaUrl, '_blank', 'noopener');
    },
    'ad-close': el => {
        const id = Number(el.dataset.id);
        remember(id);
        event(id, 'close');
        const t = el.closest('.ad-toast'); if (t) t.remove();
        renderBanner();
        App.renderFeedAnn($('#feed-ann'));
        App.setBadge('updates', A.list.filter(m => m.placement === 'sidebar' && !isClosed(m.id)).length);
    },
});

App.views.updates = {
    actions: () => App.mobileActions(['updates']),
    subtitle: () => A.list.length ? `${A.list.length} עדכונים` : '',
    init(root) { A.root = root; renderUpdates(); },
    enter() { renderUpdates(); A.list.filter(m => m.placement === 'sidebar').forEach(m => remember(m.id)); App.setBadge('updates', 0); App.renderFeedAnn($('#feed-ann')); },
};

document.addEventListener('login', () => {
    load();
    if (!A._timer) { A._timer = true; App.every(5 * 60000, load); }
});
document.addEventListener('logout', () => { A.list = []; $('#ad-banner-slot').innerHTML = ''; document.querySelectorAll('.ad-toast').forEach(e => e.remove()); if (App.views.updates) App.views.updates._init = false; });
})();
