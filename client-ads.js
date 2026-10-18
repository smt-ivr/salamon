// client-ads.js — קמפיינים באתר: מודעת צד, פופאפ, פס עליון והודעה צפה, עם כפתור פעולה ומעקב הקלקות

document.addEventListener('DOMContentLoaded', () => {
    const adStyles = document.createElement('style');
    adStyles.innerHTML = `
        .mad-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(12px);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            opacity: 0; visibility: hidden; transition: all 0.4s ease;
        }
        .mad-overlay.active { opacity: 1; visibility: visible; }
        .mad-modal {
            position: relative; width: 90%; max-width: 500px;
            border-radius: 20px; overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            transform: scale(0.9); transition: transform 0.4s ease;
        }
        .mad-overlay.active .mad-modal { transform: scale(1); }
        .mad-close-btn {
            position: absolute; top: 15px; left: 15px; /* צד שמאל כי עברית */
            background: rgba(0,0,0,0.1); color: inherit; border: none;
            padding: 8px 15px; border-radius: 50px; font-weight: bold; cursor: pointer;
            backdrop-filter: blur(4px); display: flex; align-items: center; gap: 8px;
            z-index: 10; transition: all 0.2s;
        }
        .mad-close-btn:hover:not(:disabled) { background: rgba(0,0,0,0.2); transform: scale(1.05); }
        .mad-close-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .mad-image { width: 100%; max-height: 200px; object-fit: cover; display: block; }
        .mad-body { padding: 40px 30px 30px; text-align: center; }
        .mad-title { font-size: 1.8rem; font-weight: 800; margin-bottom: 15px; }
        .mad-content { font-size: 1.1rem; line-height: 1.6; max-height: 40vh; overflow-y: auto; }

        .mad-stats-badge {
            display: inline-block; margin-top: 20px; padding: 5px 12px;
            background: rgba(0,0,0,0.05); border-radius: 50px; font-size: 0.85rem; font-weight: 600;
        }

        .regular-ad-box {
            padding: 15px; border-radius: 12px; margin-bottom: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08); position: relative; overflow: hidden;
        }
        .regular-ad-image { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; }

        /* עיצוב מתקדם */
        .sad-cover { background-size: cover !important; background-position: center !important; }
        .sad-cover > * { position: relative; }
        .sad-badge { display: inline-block; padding: 3px 10px; border-radius: 50px; font-size: .74rem; font-weight: 800; background: rgba(255,255,255,.25); border: 1px solid rgba(0,0,0,.08); margin-bottom: 8px; }
        .sad-icon { font-size: 1.5rem; margin-bottom: 8px; display: block; opacity: .9; }
        .sad-cta { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; padding: 10px 22px; border-radius: 12px; border: none; font: inherit; font-weight: 800; cursor: pointer; text-decoration: none; transition: transform .15s, filter .15s; }
        .sad-cta:hover { transform: translateY(-1px); filter: brightness(1.06); }
        .sad-anim-fade { animation: sadFade .45s ease both; }
        .sad-anim-slide { animation: sadSlide .5s cubic-bezier(.2,.8,.2,1) both; }
        .sad-anim-pop { animation: sadPop .45s cubic-bezier(.2,1.4,.4,1) both; }
        @keyframes sadFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sadSlide { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes sadPop { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: none; } }

        .sad-banner { position: fixed; top: 0; left: 0; right: 0; z-index: 9990; display: flex; align-items: center; gap: 14px; padding: 12px 18px; box-shadow: 0 6px 20px rgba(0,0,0,.15); animation: sadDown .45s cubic-bezier(.2,.8,.2,1) both; direction: rtl; }
        .sad-banner .sad-b-text { flex: 1; min-width: 0; line-height: 1.45; }
        .sad-banner .sad-b-text b { font-size: 1rem; margin-left: 8px; }
        .sad-banner .sad-b-text div { display: inline; font-size: .92rem; opacity: .92; }
        .sad-banner .sad-b-text div p { display: inline; margin: 0; }
        .sad-banner .sad-cta { margin: 0; padding: 8px 16px; white-space: nowrap; }
        .sad-banner .sad-icon { margin: 0; font-size: 1.2rem; }
        .sad-x { background: rgba(0,0,0,.12); color: inherit; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; flex-shrink: 0; display: grid; place-items: center; }
        .sad-x:hover { background: rgba(0,0,0,.22); }
        @keyframes sadDown { from { transform: translateY(-100%); } to { transform: none; } }
        .sad-toast { position: fixed; bottom: 96px; left: 22px; z-index: 9991; width: min(360px, calc(100vw - 28px)); padding: 18px 18px 16px; direction: rtl; }
        .sad-toast .sad-x { position: absolute; top: 10px; left: 10px; z-index: 2; }
        .sad-toast .regular-ad-image { margin-top: 4px; }
        @media (max-width: 640px) {
            .sad-banner { flex-wrap: wrap; padding: 10px 12px; gap: 8px; }
            .sad-banner .sad-b-text { flex-basis: calc(100% - 44px); }
            .sad-toast { left: 14px; bottom: 88px; }
        }
    `;
    document.head.appendChild(adStyles);
});

let mandatoryAdsQueue = [];
let isAdPlaying = false;

function adEsc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function adColor(c, fallback) { return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : fallback; }
function adSafeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }

function adDismissed(id) { try { return (sessionStorage.getItem('salamonAdsClosed') || '').split(',').includes(String(id)); } catch (e) { return false; } }
function adRemember(id) { try { const l = (sessionStorage.getItem('salamonAdsClosed') || '').split(',').filter(Boolean); l.push(String(id)); sessionStorage.setItem('salamonAdsClosed', l.slice(-50).join(',')); } catch (e) {} }

// דיווח הקלקה/סגירה לשרת, בלי לעכב את המשתמש
function adEvent(id, event) {
    const token = state.userToken || localStorage.getItem('userToken');
    if (!token) return;
    try {
        fetch(`${API_BASE_URL}/system-message/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userToken: token, id, event }), keepalive: true }).catch(() => {});
    } catch (e) {}
}

// סגנון הכרטיס לפי הגדרות העיצוב של הקמפיין
function adStyle(msg, base = {}) {
    const d = msg.design || {};
    const bg = adColor(msg.bgColor, '#ffffff'), fg = adColor(msg.textColor, '#1a202c');
    const img = adSafeUrl(msg.imageUrl);
    const parts = [`color:${fg}`];
    if (d.imagePos === 'cover' && img) parts.push(`background:linear-gradient(${bg}cc, ${(d.gradient ? adColor(d.gradient, bg) : bg)}ee), url("${adEsc(img)}")`);
    else parts.push(`background:${d.gradient ? `linear-gradient(135deg, ${bg}, ${adColor(d.gradient, bg)})` : bg}`);
    if (d.radius !== null && d.radius !== undefined && base.radius !== false) parts.push(`border-radius:${Number(d.radius) || 0}px`);
    if (d.align === 'center') parts.push('text-align:center');
    if (d.size === 'sm') parts.push('font-size:.92em'); else if (d.size === 'lg') parts.push('font-size:1.1em');
    if (d.border) parts.push(`border:1px solid ${adColor(d.border, 'transparent')}`);
    if (d.shadow === false) parts.push('box-shadow:none');
    return parts.join(';');
}

function adClasses(msg) {
    const d = msg.design || {};
    return `${d.animation && d.animation !== 'none' ? `sad-anim-${d.animation}` : ''} ${d.imagePos === 'cover' && adSafeUrl(msg.imageUrl) ? 'sad-cover' : ''}`;
}

function adHead(msg) {
    const d = msg.design || {};
    return `${d.badge ? `<span class="sad-badge">${adEsc(d.badge)}</span><br>` : ''}${d.icon ? `<i class="fa-solid ${adEsc(d.icon)} sad-icon"></i>` : ''}`;
}

function adCta(msg) {
    if (!msg.ctaLabel || !adSafeUrl(msg.ctaUrl)) return '';
    const d = msg.design || {};
    const bg = adColor(d.ctaColor, adColor(msg.textColor, '#1a202c')), fg = adColor(d.ctaText, adColor(msg.bgColor, '#ffffff'));
    return `<button type="button" class="sad-cta" data-ad-cta="${adEsc(msg.id)}" style="background:${bg};color:${fg};">${adEsc(msg.ctaLabel)} <i class="fa-solid fa-arrow-left"></i></button>`;
}

function adImage(msg, cls) {
    const img = adSafeUrl(msg.imageUrl);
    if (!img || (msg.design || {}).imagePos === 'cover') return '';
    return `<img src="${adEsc(img)}" class="${cls}" alt="">`;
}

const adById = {};

function bindAdCtas(root) {
    root.querySelectorAll('[data-ad-cta]').forEach(btn => {
        btn.onclick = () => {
            const msg = adById[btn.dataset.adCta];
            if (!msg) return;
            adEvent(msg.id, 'click');
            window.open(msg.ctaUrl, '_blank', 'noopener');
        };
    });
}

window.loadSystemMessage = async function() {
    try {
        const res = await fetch(`${API_BASE_URL}/system-message`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken || localStorage.getItem('userToken') })
        });
        const data = await res.json();
        if (res.ok && data.success && data.messages) processAdvancedAds(data.messages);
    } catch (e) { console.error('Ads failed', e); }
};

function processAdvancedAds(messages) {
    const desktopBox = document.getElementById('desktop-announcement');
    const mobileBox = document.getElementById('mobile-announcement-content');

    let regularHtml = '';
    mandatoryAdsQueue = [];
    const floating = [];

    messages.forEach(msg => {
        adById[msg.id] = msg;
        const placement = msg.placement || (msg.isMandatory ? 'popup' : 'sidebar');
        if (placement === 'popup') {
            mandatoryAdsQueue.push(msg);
        } else if (placement === 'banner' || placement === 'toast') {
            if (!adDismissed(msg.id)) floating.push(msg);
        } else {
            const d = msg.design || {};
            const imgHtml = adImage(msg, 'regular-ad-image');
            const statsHtml = msg.showViewCount ? `<div style="font-size:0.8rem; opacity:0.7; margin-top:8px;"><i class="fa-solid fa-eye"></i> נצפה ${Number(msg.globalViews) || 0} פעמים</div>` : '';
            regularHtml += `
                <div class="regular-ad-box ${adClasses(msg)}" style="${adStyle(msg)}">
                    ${d.imagePos === 'bottom' ? '' : imgHtml}
                    ${adHead(msg)}
                    <h4 style="margin-bottom: 8px; font-size: 1.1rem; font-weight: 800;">${adEsc(msg.title)}</h4>
                    <div style="font-size: 0.95rem; line-height: 1.5;">${msg.htmlContent}</div>
                    ${d.imagePos === 'bottom' ? `<div style="margin-top:10px;">${imgHtml}</div>` : ''}
                    ${adCta(msg)}
                    ${statsHtml}
                </div>
            `;
        }
    });

    if (desktopBox) { desktopBox.innerHTML = regularHtml; bindAdCtas(desktopBox); }
    if (mobileBox) { mobileBox.innerHTML = regularHtml; bindAdCtas(mobileBox); }
    const mobileBtn = document.getElementById('mobile-announcement-btn-id');
    if (mobileBtn) mobileBtn.classList.toggle('active-btn', !!regularHtml);

    renderFloatingAds(floating);
    if (mandatoryAdsQueue.length > 0 && !isAdPlaying) showNextMandatoryAd();
}

// פס עליון והודעה צפה: אחד מכל סוג בכל פעם (לפי העדיפות)
function renderFloatingAds(list) {
    document.querySelectorAll('.sad-banner, .sad-toast').forEach(el => el.remove());
    const banner = list.find(m => m.placement === 'banner');
    const toast = list.find(m => m.placement === 'toast');
    if (banner) {
        const el = document.createElement('div');
        el.className = 'sad-banner';
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', 'הודעה');
        el.style.cssText = adStyle(banner, { radius: false }) + ';border-radius:0';
        const d = banner.design || {};
        el.innerHTML = `${d.icon ? `<i class="fa-solid ${adEsc(d.icon)} sad-icon"></i>` : ''}
            <div class="sad-b-text">${d.badge ? `<span class="sad-badge" style="margin:0 0 0 8px;">${adEsc(d.badge)}</span>` : ''}<b>${adEsc(banner.title)}</b><div>${banner.htmlContent}</div></div>
            ${adCta(banner)}<button type="button" class="sad-x" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button>`;
        el.querySelector('.sad-x').onclick = () => { adEvent(banner.id, 'close'); adRemember(banner.id); el.remove(); document.body.style.paddingTop = ''; };
        document.body.appendChild(el);
        bindAdCtas(el);
        requestAnimationFrame(() => { document.body.style.paddingTop = el.offsetHeight + 'px'; });
    } else {
        document.body.style.paddingTop = '';
    }
    if (toast) {
        const el = document.createElement('div');
        el.className = `sad-toast regular-ad-box ${adClasses(toast)}`;
        el.setAttribute('role', 'status');
        el.style.cssText = adStyle(toast);
        const d = toast.design || {};
        el.innerHTML = `<button type="button" class="sad-x" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button>
            ${d.imagePos === 'bottom' ? '' : adImage(toast, 'regular-ad-image')}${adHead(toast)}
            <h4 style="margin: 0 0 6px; font-size: 1.05rem; font-weight: 800; padding-left: 30px;">${adEsc(toast.title)}</h4>
            <div style="font-size: 0.93rem; line-height: 1.5;">${toast.htmlContent}</div>
            ${d.imagePos === 'bottom' ? adImage(toast, 'regular-ad-image') : ''}${adCta(toast)}`;
        el.querySelector('.sad-x').onclick = () => { adEvent(toast.id, 'close'); adRemember(toast.id); el.remove(); };
        setTimeout(() => document.body.appendChild(el), 1200);
        bindAdCtas(el);
    }
}

function showNextMandatoryAd() {
    if (mandatoryAdsQueue.length === 0) { isAdPlaying = false; return; }
    isAdPlaying = true;
    const ad = mandatoryAdsQueue.shift();

    let modal = document.getElementById('mandatoryAdModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mandatoryAdModal';
        modal.className = 'mad-overlay';
        document.body.appendChild(modal);
    }

    const d = ad.design || {};
    const imgHtml = adImage(ad, 'mad-image');
    const statsHtml = ad.showViewCount ? `<div class="mad-stats-badge"><i class="fa-solid fa-fire"></i> נצפה על ידי ${Number(ad.globalViews) || 0} אנשים</div>` : '';

    modal.innerHTML = `
        <div class="mad-modal ${adClasses(ad)}" style="${adStyle(ad)}">
            <button id="mad-x-btn" class="mad-close-btn" disabled>
                <span id="mad-x-timer" style="width:15px; display:inline-block; text-align:center;"></span> <i class="fa-solid fa-xmark"></i>
            </button>
            ${d.imagePos === 'bottom' ? '' : imgHtml}
            <div class="mad-body" style="${d.align === 'right' ? 'text-align:right;' : ''}">
                ${adHead(ad)}
                <div class="mad-title">${adEsc(ad.title)}</div>
                <div class="mad-content">${ad.htmlContent}</div>
                ${adCta(ad)}
                ${statsHtml}
            </div>
            ${d.imagePos === 'bottom' ? imgHtml : ''}
        </div>
    `;
    bindAdCtas(modal);

    const closeBtn = document.getElementById('mad-x-btn');
    const timerSpan = document.getElementById('mad-x-timer');
    modal.classList.add('active');

    let timeLeft = ad.closeCooldownSeconds || 0;

    if (timeLeft > 0) {
        timerSpan.innerText = timeLeft;
        const timerInt = setInterval(() => {
            timeLeft--;
            timerSpan.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerInt);
                closeBtn.disabled = false;
                timerSpan.innerText = '';
            }
        }, 1000);
    } else {
        closeBtn.disabled = false;
        timerSpan.innerText = '';
    }

    closeBtn.onclick = () => {
        adEvent(ad.id, 'close');
        modal.classList.remove('active');
        setTimeout(showNextMandatoryAd, 500);
    };
}
