// client-app-promo.js — פס קטן בתחתית האתר הוותיק שמזמין להוריד את האפליקציה (אנדרואיד)
// או להוסיף למסך הבית (אייפון). לא מוצג בתוך האפליקציה, במחשב, או אחרי סגירה (ל-14 יום).

document.addEventListener('DOMContentLoaded', () => {
    const ua = navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    const installed = /SalamonApp\//.test(ua) || navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    let closed = 0;
    try { closed = Number(localStorage.getItem('appPromoClosed')) || 0; } catch (e) {}
    if (installed || (!ios && !android) || Date.now() - closed < 14 * 86400000) return;

    const bar = document.createElement('div');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'אפליקציית עכשיו סלומון');
    bar.style.cssText = 'position:fixed;inset-inline:12px;bottom:12px;z-index:9999;display:flex;align-items:center;gap:10px;'
        + 'background:#0b1f3a;color:#fff;border-radius:16px;padding:10px 12px;box-shadow:0 10px 30px rgba(0,0,0,.25);'
        + 'font-family:inherit;direction:rtl;max-width:560px;margin:0 auto;';
    bar.innerHTML = `<img src="https://smt-tel-manager.netlify.app/salamon-logo.png" alt="" style="width:38px;height:38px;border-radius:10px;flex:none">`
        + `<div style="flex:1;font-size:14px;line-height:1.35"><b>${android ? 'אפליקציית סלומון לאנדרואיד' : 'סלומון במסך הבית'}</b><br>`
        + `<span style="opacity:.8">${android ? 'הקלטה והתראות ישירות לטלפון' : 'נפתח כמו אפליקציה, עם התראות'}</span></div>`
        + `<a href="/salamon/app" style="background:#ea580c;color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:8px 12px;white-space:nowrap;font-size:14px">${android ? 'להורדה' : 'איך?'}</a>`
        + `<button type="button" aria-label="סגירה" style="background:transparent;border:0;color:#fff;opacity:.7;font-size:20px;cursor:pointer;padding:4px 6px">×</button>`;
    bar.querySelector('button').onclick = () => {
        try { localStorage.setItem('appPromoClosed', String(Date.now())); } catch (e) {}
        bar.remove();
    };
    document.body.appendChild(bar);
});
