// auth.js — כניסה, הרשמה עם אימות בצינתוק, איפוס סיסמה במייל וכניסה עם Google.
// משתמש בדיוק באותם שירותים של האתר הוותיק, כך שהחשבון והחיבור משותפים לשתי הגרסאות.

(() => {
'use strict';
const { $, esc, api } = App;
const GOOGLE_CLIENT = '89500817024-tbvsuu4dci6bqh173l65ua9lc65pe24p.apps.googleusercontent.com';

const A = { identifier: '', phone: '', name: '', sessionId: null, resetToken: null, resendAt: 0, timer: null };

function alertBox(text, type = 'bad') {
    const box = $('#auth-alert');
    if (!text) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<div class="alert ${type}"><i class="fa-solid ${type === 'good' ? 'fa-circle-check' : type === 'info' ? 'fa-circle-info' : 'fa-circle-exclamation'}"></i><div>${esc(text)}</div></div>`;
}

function head(title, sub) {
    $('#auth-title').textContent = title;
    $('#auth-sub').textContent = sub || '';
}

function idChip() {
    return `<div class="auth-id">${App.avatar(A.name || A.identifier, A.identifier, '')}<b>${esc(A.identifier)}</b><button type="button" class="btn ghost sm" data-act="auth-back">החלפה</button></div>`;
}

const pinField = (id, label, auto = 'current-password') => `<div class="field"><label for="${id}">${label}</label>
    <div class="input-wrap"><input class="input ltr" id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="10" autocomplete="${auto}" required>
    <button type="button" class="icon-btn sm" data-act="auth-eye" data-for="${id}" aria-label="הצגת הסיסמה"><i class="fa-solid fa-eye"></i></button></div></div>`;

const STEPS = {
    id() {
        head('ברוכים הבאים', 'הכניסו מספר טלפון או מייל כדי להמשיך');
        return `<form class="auth-step" data-form="id" novalidate>
            <div class="field"><label for="a-id">טלפון או מייל</label><input class="input ltr" id="a-id" autocomplete="username" inputmode="email" placeholder="050-1234567" value="${esc(A.identifier)}" required></div>
            <button class="btn primary lg block" type="submit">המשך <i class="fa-solid fa-arrow-left"></i></button>
            <div class="or">או</div>
            <div class="google-slot" id="google-slot"><span class="muted">טוען כניסה עם Google…</span></div>
        </form>`;
    },
    password() {
        head('שמחים לראות אותך', 'הזינו את הסיסמה שלכם');
        return `<form class="auth-step" data-form="password" novalidate>
            ${idChip()}
            ${pinField('a-pass', 'סיסמה')}
            <div class="row-between">
                <label class="check"><input type="checkbox" id="a-remember" checked> להישאר מחובר</label>
                <button type="button" class="btn ghost sm" data-act="auth-forgot">שכחתי סיסמה</button>
            </div>
            <button class="btn primary lg block" type="submit"><i class="fa-solid fa-right-to-bracket"></i> כניסה</button>
        </form>`;
    },
    preverify() {
        head('פתיחת חשבון', 'המספר שלכם רשום במערכת הטלפונית');
        return `<div class="auth-step">
            <div class="auth-id">${App.avatar(A.name, A.phone)}<div style="flex:1;min-width:0;"><b style="direction:rtl;text-align:right;display:block;">${esc(A.name || 'משתמש')}</b><small class="muted ltr">${esc(A.phone)}</small></div><button type="button" class="btn ghost sm" data-act="auth-back">החלפה</button></div>
            <div class="alert info"><i class="fa-solid fa-phone-volume"></i><div>כדי לוודא שהמספר שלכם, נשלח אליו <b>צינתוק</b> (שיחה קצרה שמתנתקת). בשלב הבא תקלידו את <b>4 הספרות האחרונות</b> של המספר שהתקשר.</div></div>
            <button class="btn primary lg block" data-act="auth-send-code" type="button"><i class="fa-solid fa-phone-volume"></i> שלחו לי צינתוק</button>
        </div>`;
    },
    verify() {
        head('אימות המספר', `הקלידו את 4 הספרות האחרונות של המספר שהתקשר ל-${A.phone}`);
        return `<form class="auth-step" data-form="verify" novalidate>
            <div class="code-inputs" id="code-inputs">${[0, 1, 2, 3].map(i => `<input inputmode="numeric" pattern="[0-9]*" maxlength="1" aria-label="ספרה ${i + 1}" autocomplete="${i ? 'off' : 'one-time-code'}">`).join('')}</div>
            <button class="btn primary lg block" type="submit"><i class="fa-solid fa-shield-halved"></i> אימות</button>
            <button class="btn ghost block" type="button" data-act="auth-resend" id="a-resend"></button>
        </form>`;
    },
    register() {
        head('כמעט סיימנו', 'בחרו סיסמה לחשבון');
        return `<form class="auth-step" data-form="register" novalidate>
            <div class="alert good"><i class="fa-solid fa-circle-check"></i><div>המספר <b class="ltr">${esc(A.phone)}</b> אומת בהצלחה</div></div>
            <div class="field"><label for="a-email">מייל <span class="muted">(לא חובה, לאיפוס סיסמה ועדכונים)</span></label><input class="input ltr" id="a-email" type="email" autocomplete="email" placeholder="name@example.com"></div>
            ${pinField('a-pass1', 'סיסמה (4–10 ספרות)', 'new-password')}
            ${pinField('a-pass2', 'אימות סיסמה', 'new-password')}
            <button class="btn primary lg block" type="submit"><i class="fa-solid fa-check"></i> פתיחת החשבון</button>
        </form>`;
    },
    resetVerify() {
        head('איפוס סיסמה', 'שלחנו קוד למייל שמעודכן בחשבון');
        return `<form class="auth-step" data-form="reset-verify" novalidate>
            ${idChip()}
            <div class="field"><label for="a-rcode">קוד מהמייל</label><input class="input ltr" id="a-rcode" inputmode="numeric" maxlength="8" autocomplete="one-time-code" style="text-align:center;font-size:1.4rem;letter-spacing:.3em;" required></div>
            <button class="btn primary lg block" type="submit"><i class="fa-solid fa-shield-halved"></i> אימות הקוד</button>
        </form>`;
    },
    resetConfirm() {
        head('סיסמה חדשה', 'בחרו סיסמה חדשה לחשבון');
        return `<form class="auth-step" data-form="reset-confirm" novalidate>
            ${pinField('a-np1', 'סיסמה חדשה (4–10 ספרות)', 'new-password')}
            ${pinField('a-np2', 'אימות הסיסמה', 'new-password')}
            <button class="btn primary lg block" type="submit"><i class="fa-solid fa-floppy-disk"></i> שמירה</button>
        </form>`;
    },
};

function step(name, alert) {
    alertBox(alert ? alert[0] : '', alert ? alert[1] : 'bad');
    $('#auth-steps').innerHTML = STEPS[name]();
    A.step = name;
    const first = $('#auth-steps input');
    if (first && !('ontouchstart' in window)) setTimeout(() => first.focus(), 60);
    if (name === 'id') renderGoogle();
    if (name === 'verify') { bindCode(); tickResend(); }
}

App.showAuth = (msg) => {
    $('#splash').classList.add('out');
    $('#auth').hidden = false;
    $('#app').hidden = true;
    A.identifier = A.identifier || '';
    step('id', msg ? [msg, 'info'] : null);
};

// ---------- Google ----------

function renderGoogle() {
    const slot = $('#google-slot');
    if (!slot) return;
    const draw = () => {
        if (!window.google || !google.accounts) return false;
        slot.innerHTML = '';
        google.accounts.id.initialize({ client_id: GOOGLE_CLIENT, callback: onGoogle, ux_mode: 'popup' });
        google.accounts.id.renderButton(slot, { theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline', size: 'large', width: Math.min(380, slot.clientWidth || 360), text: 'continue_with', shape: 'pill', locale: 'he' });
        return true;
    };
    if (draw()) return;
    if (!document.getElementById('gsi')) {
        const s = document.createElement('script');
        s.id = 'gsi'; s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
        s.onload = () => draw();
        s.onerror = () => { slot.innerHTML = '<span class="muted">כניסה עם Google לא זמינה כרגע</span>'; };
        document.head.appendChild(s);
    } else setTimeout(renderGoogle, 400);
}

async function onGoogle(resp) {
    alertBox('מתחברים עם Google…', 'info');
    const r = await api('/login/google', { token: resp.credential }, { auth: false });
    if (!r.ok) { alertBox(r.error); return; }
    await finishLogin(r.data.token);
}

// ---------- שלבים ----------

async function submitId(form) {
    const id = $('#a-id').value.trim();
    if (!id) { alertBox('הזינו מספר טלפון או מייל'); return; }
    const btn = form.querySelector('[type=submit]');
    App.busy(btn, true);
    const r = await api('/check-identifier', { identifier: id }, { auth: false });
    App.busy(btn, false);
    if (r.data.isRegistered) {
        A.identifier = r.data.identifier || id;
        A.name = r.data.name || '';
        step('password');
    } else if (r.data.authorized) {
        A.identifier = id; A.phone = r.data.phone; A.name = r.data.name || '';
        step('preverify');
    } else {
        alertBox(r.data.message || r.error || 'לא נמצא חשבון');
    }
}

async function submitPassword(form) {
    const password = $('#a-pass').value;
    if (!password) { alertBox('הזינו סיסמה'); return; }
    const btn = form.querySelector('[type=submit]');
    App.busy(btn, true);
    const r = await api('/login', { identifier: A.identifier, password, rememberMe: $('#a-remember').checked }, { auth: false });
    if (!r.ok) { App.busy(btn, false); alertBox(r.error); App.haptic(30); $('#a-pass').select(); return; }
    await finishLogin(r.data.token);
    App.busy(btn, false);
}

async function sendCode(btn) {
    App.busy(btn, true, 'שולח…');
    const r = await api('/verify/send', { phone: A.phone, intent: 'register' }, { auth: false });
    App.busy(btn, false);
    if (!r.ok) { alertBox(r.error); return false; }
    A.sessionId = r.data.sessionId;
    A.resendAt = Date.now() + 45000;
    return true;
}

function bindCode() {
    const inputs = [...document.querySelectorAll('#code-inputs input')];
    inputs.forEach((inp, i) => {
        inp.addEventListener('input', () => {
            const digits = inp.value.replace(/\D/g, '');
            if (digits.length > 1) { digits.split('').slice(0, 4 - i).forEach((d, k) => { inputs[i + k].value = d; }); (inputs[Math.min(3, i + digits.length)] || inp).focus(); }
            else { inp.value = digits; if (digits && inputs[i + 1]) inputs[i + 1].focus(); }
            if (inputs.every(x => x.value)) document.querySelector('[data-form="verify"]').requestSubmit();
        });
        inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) { inputs[i - 1].focus(); inputs[i - 1].value = ''; } });
    });
    setTimeout(() => inputs[0].focus(), 80);
}

function tickResend() {
    clearInterval(A.timer);
    const upd = () => {
        const b = $('#a-resend');
        if (!b) { clearInterval(A.timer); return; }
        const left = Math.ceil((A.resendAt - Date.now()) / 1000);
        b.disabled = left > 0;
        b.innerHTML = left > 0 ? `<i class="fa-regular fa-clock"></i> אפשר לשלוח שוב בעוד ${left} שניות` : '<i class="fa-solid fa-rotate-right"></i> לא קיבלתי, שלחו שוב';
    };
    upd();
    A.timer = setInterval(upd, 1000);
}

async function submitVerify(form) {
    const code = [...document.querySelectorAll('#code-inputs input')].map(i => i.value).join('');
    if (code.length !== 4) { alertBox('הקלידו 4 ספרות'); return; }
    const btn = form.querySelector('[type=submit]');
    App.busy(btn, true);
    const r = await api('/verify/check', { sessionId: A.sessionId, phone: A.phone, code }, { auth: false });
    App.busy(btn, false);
    if (!r.ok) {
        alertBox(r.error); App.haptic(40);
        document.querySelectorAll('#code-inputs input').forEach(i => { i.value = ''; });
        document.querySelector('#code-inputs input').focus();
        return;
    }
    step('register');
}

function checkPins(a, b) {
    if (!/^\d{4,10}$/.test(a)) return 'הסיסמה צריכה להיות 4 עד 10 ספרות';
    if (a !== b) return 'הסיסמאות לא זהות';
    if (/^(\d)\1+$/.test(a) || '01234567890'.includes(a) || '09876543210'.includes(a)) return 'הסיסמה פשוטה מדי (כמו 1111 או 1234). בחרו משהו אחר';
    return null;
}

async function submitRegister(form) {
    const p1 = $('#a-pass1').value, p2 = $('#a-pass2').value;
    const bad = checkPins(p1, p2);
    if (bad) { alertBox(bad); return; }
    const btn = form.querySelector('[type=submit]');
    App.busy(btn, true);
    const r = await api('/register', { phone: A.phone, email: $('#a-email').value.trim(), password: p1, passwordConfirm: p2, sessionId: A.sessionId }, { auth: false });
    if (!r.ok) { App.busy(btn, false); alertBox(r.error); return; }
    const login = await api('/login', { identifier: A.phone, password: p1, rememberMe: true }, { auth: false });
    App.busy(btn, false);
    if (!login.ok) { A.identifier = A.phone; step('password', ['החשבון נפתח! התחברו עם הסיסמה החדשה', 'good']); return; }
    App.toast('החשבון נפתח בהצלחה 🎉');
    await finishLogin(login.data.token);
}

async function forgot(btn) {
    App.busy(btn, true);
    const r = await api('/verify/send', { identifier: A.identifier, intent: 'reset' }, { auth: false });
    App.busy(btn, false);
    if (!r.ok) { alertBox(r.error); return; }
    A.sessionId = r.data.sessionId;
    A.phone = r.data.phone;
    step('resetVerify', [r.data.message || 'שלחנו קוד למייל שלכם', 'good']);
}

async function submitResetVerify(form) {
    const code = $('#a-rcode').value.trim();
    if (!code) return;
    const btn = form.querySelector('[type=submit]');
    App.busy(btn, true);
    const r = await api('/verify/check', { sessionId: A.sessionId, phone: A.phone, code }, { auth: false });
    App.busy(btn, false);
    if (!r.ok) { alertBox(r.error); return; }
    A.resetToken = r.data.token;
    step('resetConfirm');
}

async function submitResetConfirm(form) {
    const p1 = $('#a-np1').value, p2 = $('#a-np2').value;
    const bad = checkPins(p1, p2);
    if (bad) { alertBox(bad); return; }
    const btn = form.querySelector('[type=submit]');
    App.busy(btn, true);
    const r = await api('/reset-password/confirm', { phone: A.phone, password: p1, passwordConfirm: p2, token: A.resetToken }, { auth: false });
    App.busy(btn, false);
    if (!r.ok) { alertBox(r.error); return; }
    step('password', [r.data.message || 'הסיסמה עודכנה. אפשר להתחבר', 'good']);
}

async function finishLogin(token) {
    try { localStorage.setItem('userToken', token); } catch (e) {}
    App.token = token;
    const ok = await App.enter();
    if (ok) { $('#auth').hidden = true; A.identifier = ''; }
}

document.addEventListener('submit', e => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    alertBox('');
    ({ id: submitId, password: submitPassword, verify: submitVerify, register: submitRegister, 'reset-verify': submitResetVerify, 'reset-confirm': submitResetConfirm })[form.dataset.form](form);
});

Object.assign(App.actions, {
    'auth-back': () => { A.sessionId = null; step('id'); },
    'auth-forgot': el => forgot(el),
    'auth-send-code': async el => { if (await sendCode(el)) step('verify', ['הצינתוק בדרך אליכם 📞', 'info']); },
    'auth-resend': async el => { if (await sendCode(el)) { alertBox('שלחנו צינתוק חדש', 'good'); tickResend(); } },
    'auth-eye': el => {
        const inp = document.getElementById(el.dataset.for);
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        el.innerHTML = `<i class="fa-solid ${show ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    },
});
})();
